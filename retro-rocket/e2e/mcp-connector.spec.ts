import { createHash, randomBytes } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { signInWithGoogle, signInAs } from './fixtures/auth-helpers';
import { revokeMcpConnectionsForClient } from './fixtures/mcp';

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

// This E2E suite runs against the local Firebase Emulator Suite (playwright.config.ts):
// the frontend's Firestore client SDK is wired to localhost:8080
// (connectFirestoreEmulator, src/lib/services/firebase.ts), so a browser-side Firestore
// call shows up as a request to that port. 018 / SC-002: now that Mi Perfil's
// userProfile is backend-sourced, this list/revoke flow (driven from the Profile page)
// must still introduce no new direct Firestore calls.
const FIRESTORE_HOST_PATTERN = /firestore\.googleapis\.com|localhost:8080/;

test('connect an AI client, see it in Connected Apps, revoke it, and confirm immediate rejection', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    const firestoreHits: string[] = [];
    page.on('request', (req) => {
        if (FIRESTORE_HOST_PATTERN.test(req.url())) firestoreHits.push(req.url());
    });

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

    // 6a. Reload the page — regression check for the reported bug: a revoked
    // connection must not reappear as "connected" after a page reload.
    await page.reload();
    await expect(connectedAppRow).toHaveCount(0, { timeout: 10_000 });

    // 7. Confirm the connection is rejected immediately — the very next request using
    // its refresh token fails, not merely once some future expiry is reached.
    const refreshAfterRevoke = await page.request.post('/api/mcp/token', {
        data: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId },
    });
    expect(refreshAfterRevoke.ok()).toBe(false);
    const body = await refreshAfterRevoke.json();
    expect(body.error.code).toBe('invalid_grant');

    // 018 / SC-002 regression: listing and revoking from Mi Perfil introduced no new
    // direct browser-to-Firestore calls now that userProfile is backend-sourced.
    expect(firestoreHits).toEqual([]);
});

test('two different users connecting through the same AI client at the same apparent IP both succeed (025, US1)', async ({ page, context, browser }) => {
    await signInWithGoogle(page, context);

    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: 'E2E Concurrent Users Client', redirect_uris: [REDIRECT_URI] },
    });
    expect(registerRes.ok()).toBe(true);
    const { client_id: clientId } = await registerRes.json();

    // A genuinely distinct second identity, in its own browser context — both share this
    // test run's single IP, exactly like two RetroRocket users connecting through the
    // same hosted AI client's shared infrastructure (research.md §1).
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await signInAs(secondPage, 'e2e-mcp-second-user@example.com', 'E2E MCP Second User');

    async function authorizeAndExchange(p: import('@playwright/test').Page, state: string): Promise<boolean> {
        const { verifier, challenge } = pkcePair();
        const authorizeUrl =
            `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&code_challenge=${challenge}&code_challenge_method=S256&state=${state}`;
        await p.goto(authorizeUrl);
        await p.getByRole('button', { name: 'Permitir' }).click();
        await p.waitForURL(/code=/, { timeout: 10_000 });
        const code = new URL(p.url()).searchParams.get('code');
        const tokenRes = await p.request.post('/api/mcp/token', {
            data: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: clientId, code_verifier: verifier },
        });
        return tokenRes.ok();
    }

    // Both users complete their own authorize -> consent -> token-exchange sequence
    // concurrently, through the same registered client and the same test-runner IP — the
    // browser-level regression test for the reported "always rejected" bug.
    const [okA, okB] = await Promise.all([authorizeAndExchange(page, 'e2e-concurrent-a'), authorizeAndExchange(secondPage, 'e2e-concurrent-b')]);
    expect(okA).toBe(true);
    expect(okB).toBe(true);

    await revokeMcpConnectionsForClient(page, 'E2E Concurrent Users Client');
    await revokeMcpConnectionsForClient(secondPage, 'E2E Concurrent Users Client');
    await secondContext.close();
});

test('a failed authorization attempt (bad PKCE verifier) never appears in Connected Apps (024, US1)', async ({ page, context }) => {
    await signInWithGoogle(page, context);

    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: 'E2E Failed Attempt Client', redirect_uris: [REDIRECT_URI] },
    });
    expect(registerRes.ok()).toBe(true);
    const { client_id: clientId } = await registerRes.json();

    const { challenge } = pkcePair();
    const authorizeUrl =
        `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code_challenge=${challenge}&code_challenge_method=S256&state=e2e-failed-attempt`;
    await page.goto(authorizeUrl);
    await expect(page.getByText('E2E Failed Attempt Client').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Permitir' }).click();
    await page.waitForURL(/code=/, { timeout: 10_000 });
    const code = new URL(page.url()).searchParams.get('code');

    // Deliberately exchange with the wrong code_verifier so the token exchange fails —
    // the consent-approved connection is left as an incomplete attempt, never activated.
    const tokenRes = await page.request.post('/api/mcp/token', {
        data: {
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id: clientId,
            code_verifier: 'deliberately-wrong-verifier',
        },
    });
    expect(tokenRes.ok()).toBe(false);

    await page.goto('/perfil');
    await expect(page.getByText('E2E Failed Attempt Client')).toHaveCount(0, { timeout: 10_000 });

    // Regression check: still absent after a reload, not just on the current page load.
    await page.reload();
    await expect(page.getByText('E2E Failed Attempt Client')).toHaveCount(0, { timeout: 10_000 });
});

test('reconnecting after a revoke succeeds end-to-end and the new connection can make a real MCP tool call (024, US2)', async ({ page, context }) => {
    await signInWithGoogle(page, context);

    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: 'E2E Reconnect Client', redirect_uris: [REDIRECT_URI] },
    });
    expect(registerRes.ok()).toBe(true);
    const { client_id: clientId } = await registerRes.json();

    async function authorizeAndExchange(): Promise<{ accessToken: string }> {
        const { verifier, challenge } = pkcePair();
        const authorizeUrl =
            `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
            `&code_challenge=${challenge}&code_challenge_method=S256&state=e2e-reconnect-${Math.random()}`;
        await page.goto(authorizeUrl);
        await page.getByRole('button', { name: 'Permitir' }).click();
        await page.waitForURL(/code=/, { timeout: 10_000 });
        const code = new URL(page.url()).searchParams.get('code');
        const tokenRes = await page.request.post('/api/mcp/token', {
            data: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: clientId, code_verifier: verifier },
        });
        expect(tokenRes.ok()).toBe(true);
        const { access_token: accessToken } = await tokenRes.json();
        expect(accessToken).toBeTruthy();
        return { accessToken };
    }

    // 1. Connect, then revoke it via the real Profile page.
    await authorizeAndExchange();
    await page.goto('/perfil');
    const connectedAppRow = page.getByText('E2E Reconnect Client').first();
    await expect(connectedAppRow).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /Revocar/ }).click();
    await expect(connectedAppRow).toHaveCount(0, { timeout: 10_000 });

    // 025, T017/T018: simulate the same shared-IP contention (unrelated garbage token
    // requests from this apparent IP) that Phase 3/4's route-level tests proved no
    // longer blocks a legitimate reconnection — reproduced here at the browser/E2E level.
    for (let i = 0; i < 60; i++) {
        await page.request.post('/api/mcp/token', {
            data: { grant_type: 'authorization_code', code: 'bogus', redirect_uri: REDIRECT_URI, client_id: clientId, code_verifier: 'irrelevant' },
        });
    }

    // 2. Reconnect from scratch for the same client — the reported broken flow.
    const { accessToken } = await authorizeAndExchange();

    // 3. The new connection must be genuinely usable, not just accepted by /token.
    const transport = new StreamableHTTPClientTransport(new URL('/api/mcp', 'http://localhost:3000'), {
        requestInit: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const client = new Client({ name: 'e2e-test-client', version: '1.0.0' });
    await client.connect(transport);
    const result = await client.callTool({ name: 'list_retrospectives', arguments: {} });
    expect(result.isError).toBeFalsy();
    await client.close();

    // All E2E specs share one Firestore instance and the same test-login identity with no
    // per-test isolation (e2e/fixtures/mcp.ts) — the reconnected active connection this
    // test deliberately leaves behind would otherwise leak into and pollute later tests'
    // assertions against the same user's Connected Apps list (e.g. the origin-label test
    // below, which asserts exact-text uniqueness).
    await revokeMcpConnectionsForClient(page, 'E2E Reconnect Client');
});

const MOBILE_USER_AGENT =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

/**
 * Registers (if no clientId given) or reuses a client, drives the real consent screen to
 * approve a connection for it, and completes the token exchange so the connection
 * actually reaches `active` (024: `listConnections` now excludes anything short of that,
 * so a connection left merely `pending` — as this helper used to do — would no longer
 * appear in the Connected Apps list this test asserts against).
 */
async function authorizeAndApprove(page: import('@playwright/test').Page, clientId: string): Promise<void> {
    const { verifier, challenge } = pkcePair();
    const authorizeUrl =
        `/api/mcp/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code_challenge=${challenge}&code_challenge_method=S256&state=e2e-origin-${Math.random()}`;
    await page.goto(authorizeUrl);
    await page.getByRole('button', { name: 'Permitir' }).click();
    await page.waitForURL(/code=/, { timeout: 10_000 });
    const code = new URL(page.url()).searchParams.get('code');
    const tokenRes = await page.request.post('/api/mcp/token', {
        data: { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI, client_id: clientId, code_verifier: verifier },
    });
    if (!tokenRes.ok()) throw new Error(`mcp token exchange failed: ${tokenRes.status()}`);
}

test('two connections for the same AI client show distinct, automatically detected origin labels (US2)', async ({ page, context, browser }) => {
    await signInWithGoogle(page, context);

    const registerRes = await page.request.post('/api/mcp/register', {
        data: { client_name: 'E2E Multi-Origin Client', redirect_uris: [REDIRECT_URI] },
    });
    expect(registerRes.ok()).toBe(true);
    const { client_id: clientId } = await registerRes.json();

    // Connection 1: approved from the default (desktop-like) browser context.
    await authorizeAndApprove(page, clientId);

    // Connection 2: approved from a second context with a mobile-like User-Agent,
    // signed in as the same test user.
    const mobileContext = await browser.newContext({ userAgent: MOBILE_USER_AGENT });
    const mobilePage = await mobileContext.newPage();
    await signInWithGoogle(mobilePage, mobileContext);
    await authorizeAndApprove(mobilePage, clientId);

    await page.goto('/perfil');
    await expect(page.getByText('E2E Multi-Origin Client').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Web')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Móvil')).toBeVisible({ timeout: 10_000 });

    await mobileContext.close();
});
