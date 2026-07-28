import { describe, it, expect } from 'vitest';
import { toDate, toProfileRecord, unionMissingProviders } from '../../../src/adapters/firebase/FirestoreProfileAdapter';

// FirestoreProfileAdapter's query/write composition (ensureProfile's get-or-create and
// provider-union, updateDisplayName's targeted field update, and the "other fields
// including legacy joinedBoards are left byte-for-byte untouched" guarantee — FR-009/
// SC-004) is exercised end-to-end by the Playwright E2E suite against the Firestore
// emulator (e2e/profile.spec.ts). Faithfully mocking firebase-admin's FieldValue
// sentinels (serverTimestamp) at the Vitest level would be fragile and SDK-version-
// dependent, so — consistent with FirestoreBoardsAdapter.test.ts and
// FirestoreRetrospectiveReadAdapter/FirestoreMcpConnectionAdapter having no dedicated
// Vitest unit test elsewhere in this codebase — only this adapter's pure mapping/union
// helpers are unit-tested directly here.

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

describe('toProfileRecord', () => {
    const data = {
        email: 'u1@example.com',
        displayName: 'U1',
        photoURL: 'https://x/y.png',
        providers: ['google'],
        primaryProvider: 'google',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-02T00:00:00Z'),
        // A legacy field this feature never reads/writes (research.md §7) — confirms
        // toProfileRecord tolerates its presence without surfacing it in the DTO.
        joinedBoards: ['board-1'],
    };

    it('maps a Firestore document into a ProfileRecord', () => {
        expect(toProfileRecord('u1', data)).toEqual({
            uid: 'u1',
            email: 'u1@example.com',
            displayName: 'U1',
            photoURL: 'https://x/y.png',
            providers: ['google'],
            primaryProvider: 'google',
            createdAt: new Date('2026-01-01T00:00:00Z'),
            updatedAt: new Date('2026-01-02T00:00:00Z'),
        });
    });

    it('defaults photoURL to null and providers to [] when absent', () => {
        const { photoURL: _p, providers: _pr, ...rest } = data;
        void _p;
        void _pr;
        expect(toProfileRecord('u1', rest)).toMatchObject({ photoURL: null, providers: [] });
    });
});

describe('unionMissingProviders', () => {
    it('appends providers missing from the existing list', () => {
        expect(unionMissingProviders(['google'], ['google', 'github'])).toEqual(['google', 'github']);
    });

    it('returns the existing list unchanged (same reference) when nothing is missing', () => {
        const existing: ('google' | 'github' | 'apple')[] = ['google', 'github'];
        expect(unionMissingProviders(existing, ['google'])).toBe(existing);
    });

    it('preserves the existing order and appends new providers at the end', () => {
        expect(unionMissingProviders(['github'], ['google', 'github'])).toEqual(['github', 'google']);
    });
});
