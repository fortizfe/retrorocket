import { describe, it, expect } from 'vitest';
import { McpConnection, InvalidConnectionTransitionError } from '../../../src/domain/mcp/McpConnection';

const T0 = 1_000_000;

function pending() {
    return McpConnection.createPending({ id: 'c1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: T0 });
}

describe('McpConnection.createPending', () => {
    it('starts in pending status with no refresh token yet', () => {
        const c = pending();
        expect(c.data.status).toBe('pending');
        expect(c.data.refreshTokenHash).toBeNull();
        expect(c.data.revokedAt).toBeNull();
        expect(c.isActive).toBe(false);
    });
});

describe('McpConnection.activated', () => {
    it('transitions pending -> active, storing the refresh token hash', () => {
        const active = pending().activated('hash123');
        expect(active.data.status).toBe('active');
        expect(active.data.refreshTokenHash).toBe('hash123');
        expect(active.isActive).toBe(true);
    });

    it('rejects activating a connection that is already active', () => {
        const active = pending().activated('hash1');
        expect(() => active.activated('hash2')).toThrowError(InvalidConnectionTransitionError);
    });

    it('rejects activating a revoked connection (no path back from revoked)', () => {
        const revoked = pending().activated('hash1').revoked(T0 + 5);
        expect(() => revoked.activated('hash2')).toThrowError(InvalidConnectionTransitionError);
    });
});

describe('McpConnection.revoked', () => {
    it('transitions active -> revoked, recording revokedAt', () => {
        const revoked = pending().activated('hash1').revoked(T0 + 10);
        expect(revoked.data.status).toBe('revoked');
        expect(revoked.data.revokedAt).toBe(T0 + 10);
        expect(revoked.isActive).toBe(false);
    });

    it('allows revoking a still-pending connection (abandoned authorization)', () => {
        const revoked = pending().revoked(T0 + 1);
        expect(revoked.data.status).toBe('revoked');
    });

    it('is idempotent: revoking an already-revoked connection keeps the original revokedAt', () => {
        const first = pending().activated('hash1').revoked(T0 + 10);
        const second = first.revoked(T0 + 999);
        expect(second.data.status).toBe('revoked');
        expect(second.data.revokedAt).toBe(T0 + 10);
    });
});
