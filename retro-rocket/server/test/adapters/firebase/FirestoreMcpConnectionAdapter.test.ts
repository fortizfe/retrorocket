import { describe, it, expect } from 'vitest';
import { hydrateConnectionData } from '../../../src/adapters/firebase/FirestoreMcpConnectionAdapter';

describe('hydrateConnectionData', () => {
    const legacyDoc = {
        id: 'c1',
        uid: 'u1',
        clientId: 'client1',
        clientName: 'Claude',
        status: 'active',
        createdAt: 1_700_000_000,
        revokedAt: null,
        refreshTokenHash: 'hash',
        // No `origin`/`lastUsedAt` — a real document written before feature 023 shipped.
    };

    it('defaults origin to "unknown" for a document written before origin tracking existed', () => {
        expect(hydrateConnectionData(legacyDoc).origin).toBe('unknown');
    });

    it('defaults lastUsedAt to null (not undefined) for a document written before last-used tracking existed', () => {
        expect(hydrateConnectionData(legacyDoc).lastUsedAt).toBeNull();
    });

    it('preserves a present origin and lastUsedAt unchanged', () => {
        const data = hydrateConnectionData({ ...legacyDoc, origin: 'mobile', lastUsedAt: 1_700_000_500 });
        expect(data.origin).toBe('mobile');
        expect(data.lastUsedAt).toBe(1_700_000_500);
    });

    it('defaults failedAt to null (not undefined) for a document written before the failed/expired terminal state existed', () => {
        expect(hydrateConnectionData(legacyDoc).failedAt).toBeNull();
    });

    it('preserves a present failedAt unchanged', () => {
        const data = hydrateConnectionData({ ...legacyDoc, failedAt: 1_700_000_600 });
        expect(data.failedAt).toBe(1_700_000_600);
    });

    it('preserves every other field unchanged', () => {
        expect(hydrateConnectionData(legacyDoc)).toMatchObject({
            id: 'c1',
            uid: 'u1',
            clientId: 'client1',
            clientName: 'Claude',
            status: 'active',
            createdAt: 1_700_000_000,
            revokedAt: null,
            refreshTokenHash: 'hash',
        });
    });
});
