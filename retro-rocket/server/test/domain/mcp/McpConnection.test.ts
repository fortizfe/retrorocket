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

    it('stores a supplied origin', () => {
        const c = McpConnection.createPending({ id: 'c1', uid: 'u1', clientId: 'client1', clientName: 'Claude', nowSeconds: T0, origin: 'mobile' });
        expect(c.data.origin).toBe('mobile');
    });

    it('defaults origin to "unknown" when omitted', () => {
        const c = pending();
        expect(c.data.origin).toBe('unknown');
    });

    it('starts with lastUsedAt null', () => {
        const c = pending();
        expect(c.data.lastUsedAt).toBeNull();
    });
});

describe('McpConnection.touched', () => {
    it('returns a copy with lastUsedAt set to the given time', () => {
        const active = pending().activated('hash1');
        const touched = active.touched(T0 + 42);
        expect(touched.data.lastUsedAt).toBe(T0 + 42);
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

describe('McpConnection.failed', () => {
    it('transitions pending -> failed, recording failedAt', () => {
        const failed = pending().failed(T0 + 10);
        expect(failed.data.status).toBe('failed');
        expect(failed.data.failedAt).toBe(T0 + 10);
        expect(failed.isActive).toBe(false);
    });

    it('is a no-op on an active connection (leaves it unchanged, including a null failedAt)', () => {
        const active = pending().activated('hash1');
        const result = active.failed(T0 + 10);
        expect(result.data.status).toBe('active');
        expect(result.data.refreshTokenHash).toBe('hash1');
        expect(result.data.failedAt).toBeNull();
    });

    it('is a no-op on a revoked connection (leaves it unchanged, including its original revokedAt)', () => {
        const revoked = pending().activated('hash1').revoked(T0 + 5);
        const result = revoked.failed(T0 + 999);
        expect(result.data.status).toBe('revoked');
        expect(result.data.revokedAt).toBe(T0 + 5);
        expect(result.data.failedAt).toBeNull();
    });

    it('is idempotent: failing an already-failed connection keeps the original failedAt', () => {
        const first = pending().failed(T0 + 10);
        const second = first.failed(T0 + 999);
        expect(second.data.status).toBe('failed');
        expect(second.data.failedAt).toBe(T0 + 10);
    });
});
