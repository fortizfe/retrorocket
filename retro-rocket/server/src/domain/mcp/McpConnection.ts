import { AppError } from '../errors';

export type McpConnectionStatus = 'pending' | 'active' | 'revoked';

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
    refreshTokenHash: string | null;
}

/**
 * An AI client's authorized link to a RetroRocket user's account (data-model.md
 * "McpConnection"). Lifecycle: pending (consent given, code not yet exchanged) ->
 * active (token issued) -> revoked (terminal — Clarification Session 2026-07-27 Q1:
 * revocation must be checked live on every request, never re-activatable).
 */
export class McpConnection {
    constructor(public readonly data: McpConnectionData) {}

    static createPending(params: {
        id: string;
        uid: string;
        clientId: string;
        clientName: string;
        nowSeconds: number;
    }): McpConnection {
        return new McpConnection({
            id: params.id,
            uid: params.uid,
            clientId: params.clientId,
            clientName: params.clientName,
            status: 'pending',
            createdAt: params.nowSeconds,
            revokedAt: null,
            refreshTokenHash: null,
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
     * pending|active -> revoked. Idempotent: revoking an already-revoked connection
     * returns it unchanged (preserving the original revokedAt) rather than erroring.
     */
    revoked(nowSeconds: number): McpConnection {
        if (this.data.status === 'revoked') return this;
        return new McpConnection({ ...this.data, status: 'revoked', revokedAt: nowSeconds });
    }

    get isActive(): boolean {
        return this.data.status === 'active';
    }
}
