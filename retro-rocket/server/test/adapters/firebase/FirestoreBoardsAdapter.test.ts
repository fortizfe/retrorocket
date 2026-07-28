import { describe, it, expect } from 'vitest';
import { toDate, toBoardSummary } from '../../../src/adapters/firebase/FirestoreBoardsAdapter';

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
});
