import { describe, it, expect } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { toDate, toBoardSummary, FirestoreBoardsAdapter } from '../../../src/adapters/firebase/FirestoreBoardsAdapter';
import type { CreateBoardInput } from '../../../src/application/ports/boards';

// FirestoreBoardsAdapter's query/write composition (listBoardsForUser's owned+joined
// merge, createBoard's atomic WriteBatch, joinBoard's idempotency, rename/delete's
// ownership checks) is exercised end-to-end by the Playwright E2E suite against the
// Firestore emulator (e2e/dashboard-list.spec.ts, board-creation.spec.ts, board-join.spec.ts,
// dashboard-manage.spec.ts) and, at the business-logic level, by the boardsFakes.ts-backed
// use-case tests. Faithfully mocking firebase-admin's FieldValue sentinels (serverTimestamp,
// increment) at the Vitest level would be fragile and SDK-version-dependent, so — consistent
// with FirestoreRetrospectiveReadAdapter/FirestoreMcpConnectionAdapter having no dedicated
// Vitest unit test elsewhere in this codebase — only this adapter's pure mapping helpers are
// unit-tested directly here.

describe('toDate', () => {
    it('unwraps a Firestore Timestamp-like value via .toDate()', () => {
        const timestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
        expect(toDate(timestamp)).toEqual(new Date('2026-01-01T00:00:00Z'));
    });

    it('passes through a plain Date unchanged', () => {
        const date = new Date('2026-02-02T00:00:00Z');
        expect(toDate(date)).toBe(date);
    });

    it('coerces a string/other value via the Date constructor', () => {
        expect(toDate('2026-03-03T00:00:00Z')).toEqual(new Date('2026-03-03T00:00:00Z'));
    });
});

describe('toBoardSummary', () => {
    const data = {
        title: 'Sprint 12 Retro',
        description: 'Notes',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        participantCount: 3,
        isActive: true,
        createdBy: 'owner-uid',
    };

    it('sets isCreator=true when the requester is the board owner', () => {
        expect(toBoardSummary('b1', data, 'owner-uid')).toMatchObject({ id: 'b1', isCreator: true });
    });

    it('sets isCreator=false for a non-owner requester', () => {
        expect(toBoardSummary('b1', data, 'someone-else')).toMatchObject({ id: 'b1', isCreator: false });
    });

    it('defaults description to empty string and isActive to true when absent', () => {
        const { description: _d, isActive: _a, ...rest } = data;
        void _d;
        void _a;
        expect(toBoardSummary('b1', rest, 'owner-uid')).toMatchObject({ description: '', isActive: true });
    });

    // 055-retro-team-association, T002 (data-model.md "Derived read shapes",
    // contracts/boards-api-delta.md GET /api/boards): teamId is a raw passthrough of
    // the stored Firestore field, defaulting to null for boards created before this
    // feature shipped (FR-006) — mirrors the description/isActive default-handling
    // tests directly above.
    it('reads teamId from the Firestore document data when present', () => {
        const withTeam = { ...data, teamId: 'team-1' };
        expect(toBoardSummary('b1', withTeam, 'owner-uid')).toMatchObject({ id: 'b1', teamId: 'team-1' });
    });

    it('defaults teamId to null when absent from the Firestore document data', () => {
        expect(toBoardSummary('b1', data, 'owner-uid')).toMatchObject({ id: 'b1', teamId: null });
    });
});

// 051-anonymous-board-mode, T016: unlike the rest of this adapter, createBoard()'s
// isAnonymous default (data-model.md: "always persisted as a concrete boolean") is a
// piece of *write-composition* logic — not a pure mapping helper like toBoardSummary
// above — so it isn't covered by the E2E suite's existing assertions on other written
// fields. A minimal fake Firestore (collection/doc/batch.set/commit only — no real
// FieldValue/query behavior) captures exactly the board document's write payload,
// narrowly scoped to this one field rather than reintroducing a full Firestore mock.
describe('createBoard — isAnonymous default (051-anonymous-board-mode, data-model.md)', () => {
    function fakeDb() {
        const setCalls: Array<{ data: FirebaseFirestore.DocumentData }> = [];
        let autoId = 0;

        function collectionRef(path: string): FirebaseFirestore.CollectionReference {
            return {
                doc(id?: string) {
                    const docId = id ?? `auto-${++autoId}`;
                    return docRef(`${path}/${docId}`, docId);
                },
            } as unknown as FirebaseFirestore.CollectionReference;
        }

        function docRef(path: string, id: string): FirebaseFirestore.DocumentReference {
            return {
                id,
                collection(sub: string) {
                    return collectionRef(`${path}/${sub}`);
                },
            } as unknown as FirebaseFirestore.DocumentReference;
        }

        const db = {
            collection(name: string) {
                return collectionRef(name);
            },
            batch() {
                return {
                    set(_ref: unknown, data: FirebaseFirestore.DocumentData) {
                        setCalls.push({ data });
                    },
                    async commit() {},
                } as unknown as FirebaseFirestore.WriteBatch;
            },
        } as unknown as Firestore;

        return { db, setCalls };
    }

    function boardWriteOf(setCalls: Array<{ data: FirebaseFirestore.DocumentData }>) {
        // The top-level board document is the only batch.set() call whose payload has
        // a `title` — column and participant writes don't.
        const call = setCalls.find((c) => 'title' in c.data);
        if (!call) throw new Error('board document set() call not found');
        return call.data;
    }

    const baseInput: CreateBoardInput = {
        templateId: 'default',
        title: 'Sprint Retro',
        createdBy: 'u1',
        createdByName: 'User One',
        locale: 'en',
    };

    it('persists isAnonymous: false when input.isAnonymous is omitted', async () => {
        const { db, setCalls } = fakeDb();
        const adapter = new FirestoreBoardsAdapter(db);

        await adapter.createBoard(baseInput);

        expect(boardWriteOf(setCalls)).toMatchObject({ isAnonymous: false });
    });

    it('persists isAnonymous: true when input.isAnonymous is true', async () => {
        const { db, setCalls } = fakeDb();
        const adapter = new FirestoreBoardsAdapter(db);

        await adapter.createBoard({ ...baseInput, isAnonymous: true });

        expect(boardWriteOf(setCalls)).toMatchObject({ isAnonymous: true });
    });
});
