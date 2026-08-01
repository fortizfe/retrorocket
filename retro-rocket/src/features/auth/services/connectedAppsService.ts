/**
 * Client for the MCP connector's connection-management endpoints (feature 015). These
 * are ordinary session-cookie-authenticated REST calls made by the SPA — not the MCP
 * tool surface itself, which is consumed by AI clients, not the browser.
 */

export interface ConnectedApp {
    id: string;
    clientName: string;
    createdAt: string;
    status: 'pending' | 'active';
    origin: 'desktop' | 'mobile' | 'web' | 'unknown';
    lastUsedAt: string | null;
}

const API = '/api/mcp';

/** GET /api/mcp/connections — every AI client connection the signed-in user has authorized. */
export async function fetchConnectedApps(): Promise<ConnectedApp[]> {
    const res = await fetch(`${API}/connections`, { credentials: 'include' });
    if (!res.ok) throw new Error(`Failed to fetch connected apps: ${res.status}`);
    const body = (await res.json()) as { connections: ConnectedApp[] };
    return body.connections;
}

/** DELETE /api/mcp/connections/:id — revoke one connection; takes effect immediately. */
export async function revokeConnectedApp(connectionId: string): Promise<void> {
    const res = await fetch(`${API}/connections/${encodeURIComponent(connectionId)}`, {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!res.ok && res.status !== 404) throw new Error(`Failed to revoke connection: ${res.status}`);
}

export interface ConsentDecisionResult {
    redirectUrl: string;
}

/** POST /api/mcp/authorize/decision — the consent screen's Allow/Deny submission. */
export async function decideMcpAuthorization(requestCode: string, approve: boolean): Promise<ConsentDecisionResult> {
    const res = await fetch(`${API}/authorize/decision`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestCode, approve }),
    });
    if (!res.ok) throw new Error(`Failed to submit authorization decision: ${res.status}`);
    return (await res.json()) as ConsentDecisionResult;
}
