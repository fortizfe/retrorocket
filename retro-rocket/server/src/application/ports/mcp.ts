import type { McpConnection } from '../../domain/mcp/McpConnection';
import type { McpClientRegistration } from '../../domain/mcp/McpClientRegistration';

// ---------------------------------------------------------------------------
// McpTokenServicePort — issues/verifies the short-lived MCP access-token JWT.
// Implemented by adapters/session/JoseMcpTokenAdapter.ts (NOT domain/, since
// jose is forbidden there by server/test/architecture/domain-isolation.test.ts).
// ---------------------------------------------------------------------------

export interface McpAccessTokenClaims {
    sub: string; // uid
    connectionId: string;
    clientId: string;
}

export interface McpTokenServicePort {
    issue(claims: McpAccessTokenClaims, nowSeconds: number, ttlSeconds: number): Promise<string>;
    verify(token: string, nowSeconds: number): Promise<McpAccessTokenClaims | null>;
}

// ---------------------------------------------------------------------------
// McpClientStorePort — Dynamic Client Registration records (mcpClients).
// ---------------------------------------------------------------------------

export interface McpClientStorePort {
    register(client: McpClientRegistration): Promise<void>;
    getById(clientId: string): Promise<McpClientRegistration | null>;
}

// ---------------------------------------------------------------------------
// McpConnectionStorePort — authorization codes + connections
// (mcpAuthorizationCodes, mcpConnections).
// ---------------------------------------------------------------------------

/**
 * One record covers the whole authorize hand-off: created (unapproved) the moment a
 * signed-in user reaches the consent screen, decided when they Allow/Deny, and finally
 * consumed at token-exchange time. `code` doubles as both the consent-flow's request id
 * and — once approved — the OAuth authorization code exchanged at POST /api/mcp/token.
 */
export interface McpAuthorizationCodeRecord {
    code: string;
    clientId: string;
    clientName: string;
    uid: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    /** null until Allow/Deny; set at decision time. */
    connectionId: string | null;
    /** null = awaiting the user's decision; true/false once they Allow/Deny. */
    approved: boolean | null;
    expiresAt: number;
    consumedAt: number | null;
}

export interface CreateAuthorizationRequestParams {
    code: string;
    clientId: string;
    clientName: string;
    uid: string;
    redirectUri: string;
    codeChallenge: string;
    state: string;
    nowSeconds: number;
    ttlSeconds: number;
}

export interface McpConnectionStorePort {
    /** Creates the pending authorize-request record shown on the consent screen. */
    createAuthorizationRequest(params: CreateAuthorizationRequestParams): Promise<void>;
    getAuthorizationRequest(code: string): Promise<McpAuthorizationCodeRecord | null>;
    /** Records Allow/Deny; on approval also creates the `pending` McpConnection. */
    decideAuthorizationRequest(code: string, decision: { approved: boolean; connection?: McpConnection }): Promise<void>;
    /** Atomically fetches and marks the code consumed; returns null if missing/unapproved/already consumed. */
    consumeAuthorizationCode(code: string, nowSeconds: number): Promise<McpAuthorizationCodeRecord | null>;
    getConnectionById(connectionId: string): Promise<McpConnection | null>;
    getConnectionByRefreshTokenHash(hash: string): Promise<McpConnection | null>;
    saveConnection(connection: McpConnection): Promise<void>;
    listConnectionsForUser(uid: string): Promise<McpConnection[]>;
}

// ---------------------------------------------------------------------------
// RetrospectiveReadPort — read-only Firestore access for the MCP tool surface.
// No write methods are exposed here (FR-013): this interface is the compile-time
// enforcement of "every MCP-exposed operation is read-only".
// ---------------------------------------------------------------------------

export interface RetrospectiveAccessRecord {
    id: string;
    title: string;
    createdBy: string;
    createdAt: Date;
}

export interface RetrospectiveListEntry {
    id: string;
    title: string;
    createdAt: Date;
    role: 'facilitator' | 'participant';
}

export interface CardRecord {
    id: string;
    content: string;
    column: string;
    createdBy: string;
    createdAt: Date;
    votes?: number;
    reactions: Array<{ emoji: string; count: number }>;
}

export interface CardGroupRecord {
    id: string;
    title: string;
    cardIds: string[];
}

export interface ParticipantRecord {
    name: string;
    userId: string;
    joinedAt: Date;
}

export interface SentimentResultRecord {
    cardId: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
}

export interface ActionItemRecord {
    content: string;
    assignedToName: string | null;
    dueDate: Date | null;
}

export interface FacilitatorNoteRecord {
    content: string;
    timestamp: Date;
}

export interface RetrospectiveReadPort {
    getRetrospective(retrospectiveId: string): Promise<RetrospectiveAccessRecord | null>;
    listRetrospectivesForUser(uid: string): Promise<RetrospectiveListEntry[]>;
    listCards(retrospectiveId: string): Promise<CardRecord[]>;
    listGroups(retrospectiveId: string): Promise<CardGroupRecord[]>;
    listParticipants(retrospectiveId: string): Promise<ParticipantRecord[]>;
    /** 041, FR-004: takes the card ids the caller already fetched (e.g. via listCards())
     * instead of a retrospectiveId, so callers that already have the cards never trigger
     * a second, redundant read of the same collection to re-derive them. */
    listSentimentResults(cardIds: string[]): Promise<SentimentResultRecord[]>;
    listActionItems(retrospectiveId: string): Promise<ActionItemRecord[]>;
    listFacilitatorNotes(retrospectiveId: string): Promise<FacilitatorNoteRecord[]>;
}
