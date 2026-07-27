import { createHash, randomBytes } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { signInWithGoogle } from './fixtures/auth-helpers';

/**
 * MCP connector critical flow (feature 015, User Story 1): register a client, authorize
 * it via the real consent screen, exchange the code for a token, see it listed on the
 * real Profile page, revoke it there, and confirm the connection is rejected immediately
 * afterward (Clarification 2026-07-27 Q1). The MCP JSON-RPC tool-calling protocol itself
 * is already exercised end-to-end (list/detail/summary, facilitator-notes gating, live
 * revocation check) by `server/test/http/routes/mcpTools.test.ts` using the real MCP SDK
 * client against a real HTTP server — this spec covers what that Vitest test cannot:
 * the actual browser UX (login, consent screen, Connected Apps card) wired to the real
 * backend.
 */

const REDIRECT_URI = 'http://localhost:3000/';

function pkcePair(): { verifier: string; challenge: string } {
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    return { verifier, challenge };
}

test('connect an AI client, see it in Connected Apps, revoke it, and confirm immediate rejection', async ({ page, context }) => {
    await signInWithGoogle(page, context);

    // 1. Dynamic Client Registration.
    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: 'E2E Test Client', redirect_uris: [REDIRECT_URI] },
    });
    expect(registerRes.ok()).toBe(true);
    const { client_id: clientId } = await registerRes.json();

    // 2. Authorize: navigate the real browser through GET /api/mcp/authorize, which
    // redirects (with a valid session already present) to the real consent screen.
    const { verifier, challenge } = pkcePair();
    const authorizeUrl =
        `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code_challenge=${challenge}&code_challenge_method=S256&state=e2e-state-xyz`;
    await page.goto(authorizeUrl);
    await expect(page.getByText('E2E Test Client').first()).toBeVisible({ timeout: 10_000 });

    // 3. Approve on the real consent screen.
    await page.getByRole('button', { name: 'Permitir' }).click();
    await page.waitForURL(/code=/, { timeout: 10_000 });
    const code = new URL(page.url()).searchParams.get('code');
    expect(code).toBeTruthy();

    // 4. Exchange the code for an access + refresh token.
    const tokenRes = await page.request.post('/api/mcp/token', {
        data: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            code_verifier: verifier,
        },
    });
    expect(tokenRes.ok()).toBe(true);
    const { refresh_token: refreshToken } = await tokenRes.json();
    expect(refreshToken).toBeTruthy();

    // 5. See it listed on the real Profile page.
    await page.goto('/perfil');
    const connectedAppRow = page.getByText('E2E Test Client').first();
    await expect(connectedAppRow).toBeVisible({ timeout: 10_000 });

    // 6. Revoke it via the real "Revocar" button.
    await page.getByRole('button', { name: /Revocar/ }).click();
    await expect(connectedAppRow).toHaveCount(0, { timeout: 10_000 });

    // 7. Confirm the connection is rejected immediately — the very next request using
    // its refresh token fails, not merely once some future expiry is reached.
    const refreshAfterRevoke = await page.request.post('/api/mcp/token', {
        data: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId },
    });
    expect(refreshAfterRevoke.ok()).toBe(false);
    const body = await refreshAfterRevoke.json();
    expect(body.error.code).toBe('invalid_grant');
});
