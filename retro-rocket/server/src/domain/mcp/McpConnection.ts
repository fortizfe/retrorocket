import { AppError } from '../errors';
import type { ConnectionOrigin } from './ConnectionOrigin';

export type McpConnectionStatus = 'pending' | 'active' | 'revoked' | 'failed';

export class InvalidConnectionTransitionError extends AppError {
    constructor(message: string) {
        super('invalid_connection_transition', message, 409);
        this.name = 'InvalidConnectionTransitionError';
    }
}

export interface McpConnectionData {
    id: string;
    uid: string;
    clientId: string;
    clientName: string;
    status: McpConnectionStatus;
    createdAt: number;
    revokedAt: number | null;
    failedAt: number | null;
    refreshTokenHash: string | null;
    origin: ConnectionOrigin;
    lastUsedAt: number | null;
}

/**
 * An AI client's authorized link to a RetroRocket user's account (data-model.md
 * "McpConnection"). Lifecycle: pending (consent given, code not yet exchanged) ->
 * active (token issued) -> revoked (terminal — Clarification Session 2026-07-27 Q1:
 * revocation must be checked live on every request, never re-activatable), or
 * pending -> failed (terminal — Clarification Session 2026-08-02: an explicit failure
 * signal or a timeout marks an attempt that never completed, feature 024).
 */
export class McpConnection {
    constructor(public readonly data: McpConnectionData) {}

    static createPending(params: {
        id: string;
        uid: string;
        clientId: string;
        clientName: string;
        nowSeconds: number;
        origin?: ConnectionOrigin;
    }): McpConnection {
        return new McpConnection({
            id: params.id,
            uid: params.uid,
            clientId: params.clientId,
            clientName: params.clientName,
            status: 'pending',
            createdAt: params.nowSeconds,
            revokedAt: null,
            failedAt: null,
            refreshTokenHash: null,
            origin: params.origin ?? 'unknown',
            lastUsedAt: null,
        });
    }

    /** pending -> active, on successful authorization-code exchange. */
    activated(refreshTokenHash: string | null): McpConnection {
        if (this.data.status !== 'pending') {
            throw new InvalidConnectionTransitionError(
                `Cannot activate a connection in status "${this.data.status}"`,
            );
        }
        return new McpConnection({ ...this.data, status: 'active', refreshTokenHash });
    }

    /**
     * pending|active -> revoked. Idempotent/terminal-safe: revoking an already-revoked
     * or already-failed connection returns it unchanged (preserving whichever terminal
     * state it already reached) rather than erroring or overwriting it.
     */
    revoked(nowSeconds: number): McpConnection {
        if (this.data.status === 'revoked' || this.data.status === 'failed') return this;
        return new McpConnection({ ...this.data, status: 'revoked', revokedAt: nowSeconds });
    }

    /**
     * pending -> failed (terminal): a connection attempt that failed an explicit signal
     * (ExchangeMcpToken.ts) or timed out (ListConnections.ts) without ever completing.
     * No-op for any other current status — mirrors .revoked()'s idempotent/terminal-safe
     * shape, so callers never need to check status before calling this.
     */
    failed(nowSeconds: number): McpConnection {
        if (this.data.status !== 'pending') return this;
        return new McpConnection({ ...this.data, status: 'failed', failedAt: nowSeconds });
    }

    get isActive(): boolean {
        return this.data.status === 'active';
    }

    /** Records a successful tool-call use, on an active connection (mcpAuthMiddleware.ts). */
    touched(nowSeconds: number): McpConnection {
        return new McpConnection({ ...this.data, lastUsedAt: nowSeconds });
    }
}
