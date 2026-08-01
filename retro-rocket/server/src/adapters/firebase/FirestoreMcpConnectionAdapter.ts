import type { Firestore } from 'firebase-admin/firestore';
import type {
    CreateAuthorizationRequestParams,
    McpAuthorizationCodeRecord,
    McpClientStorePort,
    McpConnectionStorePort,
} from '../../application/ports/mcp';
import { McpClientRegistration, type McpClientRegistrationData } from '../../domain/mcp/McpClientRegistration';
import { McpConnection, type McpConnectionData } from '../../domain/mcp/McpConnection';

const CLIENTS = 'mcpClients';
const CODES = 'mcpAuthorizationCodes';
const CONNECTIONS = 'mcpConnections';

/**
 * Connection documents written before feature 023 (origin/lastUsedAt tracking) shipped
 * don't have those fields at all — not `null`, simply absent from the Firestore document.
 * Backfilling them here (data-model.md: "Existing connections... default to 'unknown'...
 * no backfill required") keeps every read path returning a value that matches
 * `McpConnectionData`'s required (non-optional) fields, so callers never have to
 * special-case `undefined`. Without this, `lastUsedAt` being `undefined` (not `null`)
 * reached `new Date(undefined * 1000).toISOString()` in the connections route handler and
 * threw (`RangeError: Invalid time value`), 500ing GET /api/mcp/connections for any user
 * with a connection older than this feature.
 */
export function hydrateConnectionData(raw: FirebaseFirestore.DocumentData): McpConnectionData {
    return {
        ...(raw as McpConnectionData),
        origin: raw.origin ?? 'unknown',
        lastUsedAt: raw.lastUsedAt ?? null,
    };
}

/**
 * Read/write Admin SDK access to the three MCP connector-state collections. This is the
 * one Firestore write path this feature introduces — connection/DCR/code bookkeeping,
 * never retrospective data (that stays behind the read-only FirestoreRetrospectiveReadAdapter).
 */
export class FirestoreMcpConnectionAdapter implements McpClientStorePort, McpConnectionStorePort {
    constructor(private readonly db: Firestore) {}

    // --- McpClientStorePort ---------------------------------------------------

    async register(client: McpClientRegistration): Promise<void> {
        await this.db.collection(CLIENTS).doc(client.data.clientId).set(client.data);
    }

    async getById(clientId: string): Promise<McpClientRegistration | null> {
        const snap = await this.db.collection(CLIENTS).doc(clientId).get();
        if (!snap.exists) return null;
        return new McpClientRegistration(snap.data() as McpClientRegistrationData);
    }

    // --- McpConnectionStorePort: authorization requests / codes ---------------

    async createAuthorizationRequest(params: CreateAuthorizationRequestParams): Promise<void> {
        const record: McpAuthorizationCodeRecord = {
            code: params.code,
            clientId: params.clientId,
            clientName: params.clientName,
            uid: params.uid,
            redirectUri: params.redirectUri,
            codeChallenge: params.codeChallenge,
            state: params.state,
            connectionId: null,
            approved: null,
            expiresAt: params.nowSeconds + params.ttlSeconds,
            consumedAt: null,
        };
        await this.db.collection(CODES).doc(params.code).set(record);
    }

    async getAuthorizationRequest(code: string): Promise<McpAuthorizationCodeRecord | null> {
        const snap = await this.db.collection(CODES).doc(code).get();
        if (!snap.exists) return null;
        return snap.data() as McpAuthorizationCodeRecord;
    }

    async decideAuthorizationRequest(code: string, decision: { approved: boolean; connection?: McpConnection }): Promise<void> {
        const ref = this.db.collection(CODES).doc(code);
        await this.db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return;
            tx.update(ref, {
                approved: decision.approved,
                connectionId: decision.connection?.data.id ?? null,
            });
            if (decision.approved && decision.connection) {
                tx.set(this.db.collection(CONNECTIONS).doc(decision.connection.data.id), decision.connection.data);
            }
        });
    }

    async consumeAuthorizationCode(code: string, nowSeconds: number): Promise<McpAuthorizationCodeRecord | null> {
        const ref = this.db.collection(CODES).doc(code);
        return this.db.runTransaction(async (tx) => {
            const snap = await tx.get(ref);
            if (!snap.exists) return null;
            const record = snap.data() as McpAuthorizationCodeRecord;
            if (record.approved !== true) return null;
            if (record.consumedAt !== null) return null;
            if (record.expiresAt < nowSeconds) return null;
            tx.update(ref, { consumedAt: nowSeconds });
            return { ...record, consumedAt: nowSeconds };
        });
    }

    // --- McpConnectionStorePort: connections -----------------------------------

    async getConnectionById(connectionId: string): Promise<McpConnection | null> {
        const snap = await this.db.collection(CONNECTIONS).doc(connectionId).get();
        if (!snap.exists) return null;
        return new McpConnection(hydrateConnectionData(snap.data()!));
    }

    async saveConnection(connection: McpConnection): Promise<void> {
        await this.db.collection(CONNECTIONS).doc(connection.data.id).set(connection.data);
    }

    async listConnectionsForUser(uid: string): Promise<McpConnection[]> {
        const snap = await this.db.collection(CONNECTIONS).where('uid', '==', uid).get();
        return snap.docs.map((doc) => new McpConnection(hydrateConnectionData(doc.data())));
    }

    async getConnectionByRefreshTokenHash(hash: string): Promise<McpConnection | null> {
        const snap = await this.db.collection(CONNECTIONS).where('refreshTokenHash', '==', hash).limit(1).get();
        if (snap.empty) return null;
        return new McpConnection(hydrateConnectionData(snap.docs[0].data()));
    }
}
