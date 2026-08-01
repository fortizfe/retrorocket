import { createHash, randomBytes } from 'node:crypto';
import type { Page } from '@playwright/test';

const REDIRECT_URI = 'http://localhost:3000/';

function pkcePair(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

/**
 * Registers a fresh MCP test client and drives it through the real consent screen and
 * token exchange, leaving one `active` connection for the currently signed-in user
 * (see mcp-connector.spec.ts for the full flow this mirrors). Used by other specs
 * (e.g. accessibility.spec.ts) that just need a populated Connected Apps list, not to
 * re-test the connector flow itself.
 */
export async function registerAndConnectMcpClient(page: Page, clientName: string): Promise<void> {
    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: clientName, redirect_uris: [REDIRECT_URI] },
    });
    if (!registerRes.ok()) throw new Error(`mcp register failed: ${registerRes.status()}`);
    const { client_id: clientId } = await registerRes.json();

    const { verifier, challenge } = pkcePair();
    const authorizeUrl =
        `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code_challenge=${challenge}&code_challenge_method=S256&state=a11y-seed-${Math.random()}`;
    await page.goto(authorizeUrl);
    await page.getByText(clientName).first().waitFor({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Permitir' }).click();
    await page.waitForURL(/code=/, { timeout: 10_000 });
    const code = new URL(page.url()).searchParams.get('code');

    const tokenRes = await page.request.post('/api/mcp/token', {
        data: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            code_verifier: verifier,
        },
    });
    if (!tokenRes.ok()) throw new Error(`mcp token exchange failed: ${tokenRes.status()}`);
}

/**
 * Revokes every connection matching `clientName` for the signed-in user. All E2E specs
 * share one Firestore Emulator instance and the same test-login identity (no per-spec
 * isolation), so a connection seeded by one spec (e.g. accessibility.spec.ts, to populate
 * the Connected Apps list for an axe scan) would otherwise persist and pollute specs that
 * run later in the same suite (e.g. mcp-connector.spec.ts's own connection-management
 * assertions, which assume a clean slate). Call this once a seeded connection's purpose
 * (rendering the UI for a scan) is served.
 */
export async function revokeMcpConnectionsForClient(page: Page, clientName: string): Promise<void> {
    const res = await page.request.get('/api/mcp/connections');
    if (!res.ok()) return;
    const { connections } = (await res.json()) as { connections: { id: string; clientName: string }[] };
    for (const connection of connections.filter((c) => c.clientName === clientName)) {
        await page.request.delete(`/api/mcp/connections/${connection.id}`);
    }
}
