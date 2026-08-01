import { test, expect, type Response } from '@playwright/test';
import { signInAs, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';

/**
 * User Story 3 (021-backend-realtime-updates): a full-team session survives live-
 * connection reconnects — a routine occurrence once a session runs long enough for the
 * hosting Function's maxDuration to be reached (research.md §5) — with zero "too many
 * requests" errors and a correct final board state.
 *
 * A literal 30+ minute wall-clock session isn't practical for an automated suite; this
 * spec instead exercises the same *mechanism* real time would trigger — a forced
 * WebSocket close per participant (the exact reconnect-with-backoff + resync path
 * described in contracts/realtime-protocol.md), deterministically forced via
 * page.routeWebSocket exactly as the existing "board deleted mid-session" spec in
 * retrospective-board.spec.ts already does — across all 10 participants at once, which
 * is the higher-signal case (a single dropped connection reconnecting alone was never
 * at risk; a *simultaneous* team-wide reconnect, e.g. an office network blip, is the
 * scenario spec.md's edge cases call out explicitly).
 */
test('10 participants each survive a forced live-connection reconnect with zero 429s and a correct final board state', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(
        request,
        'e2e-concurrent-session-owner@example.com',
        'E2E Concurrent Session Owner',
        'E2E Concurrent Session Board',
    );

    const identities = Array.from({ length: 10 }, (_, i) => ({
        email: `e2e-concurrent-session-${i}@example.com`,
        displayName: `E2E Session Participant ${i}`,
    }));

    const rateLimitedResponses: Response[] = [];
    const sessions = await Promise.all(
        identities.map(async ({ email, displayName }) => {
            const context = await browser.newContext();
            const page = await context.newPage();

            let forceReconnect: (() => void) | undefined;
            await page.routeWebSocket(/\/live$/, (ws) => {
                ws.connectToServer(); // pass every frame straight through — only the close is injected
                forceReconnect = () => ws.close();
            });
            page.on('response', (res) => {
                if (res.status() === 429) rateLimitedResponses.push(res);
            });

            await signInAs(page, email, displayName);
            return { page, context, displayName, forceReconnect: () => forceReconnect?.() };
        }),
    );

    try {
        for (const { page } of sessions) {
            await page.goto(`/retro/${boardId}`);
            await expect(page.getByText('E2E Concurrent Session Board')).toBeVisible({ timeout: 30_000 });
        }

        // One participant adds a card before the team-wide reconnect, so the reconnect's
        // resync (not just the live relay) is what every other session depends on to
        // still show it correctly afterward.
        const [author, ...rest] = sessions;
        await addCardToFirstColumn(author.page, 'Pre-reconnect card');
        for (const { page } of sessions) {
            await expect(cardByContent(page, 'Pre-reconnect card')).toBeVisible({ timeout: 15_000 });
        }

        // Force every one of the 10 sessions' live connections closed at (as close to)
        // the same moment as possible — the team-wide-blip scenario.
        for (const { forceReconnect } of sessions) forceReconnect();

        // After reconnecting, add a second card and confirm it still propagates —
        // proves the resync-then-resume-events sequence completed correctly for every
        // participant, not just that the socket reopened.
        await addCardToFirstColumn(rest[0].page, 'Post-reconnect card');
        for (const { page } of sessions) {
            await expect(cardByContent(page, 'Pre-reconnect card')).toBeVisible({ timeout: 15_000 });
            await expect(cardByContent(page, 'Post-reconnect card')).toBeVisible({ timeout: 15_000 });
        }

        expect(rateLimitedResponses).toEqual([]);
    } finally {
        await Promise.all(sessions.map(({ context }) => context.close()));
    }
});
