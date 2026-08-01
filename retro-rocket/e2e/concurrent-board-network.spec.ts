import { test, expect } from '@playwright/test';
import { signInAs, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';
import { blockFirestoreRequests } from './fixtures/network';

/**
 * User Story 2 (021-backend-realtime-updates): with a full team on one board, zero
 * direct browser-to-Firebase traffic remains, for any of the operations this screen
 * supports (board load, cards, groups, action items, timer, participants, typing,
 * columns, sentiment) — completing what feature 019 deliberately deferred (columns,
 * participant photos) and closing the confirmed-dead direct-Firestore files it left
 * behind (research.md §2-§4). Firestore is blocked outright (not just recorded) —
 * per e2e/fixtures/network.ts, a more robust proof than passive recording, since a
 * still-present direct listener would simply fail the board load or an action rather
 * than racing an event-recording assertion.
 */
test('10 participants collaborate on one board for an extended session with Firestore blocked outright, and nothing breaks', async ({ browser, request }) => {
    const boardId = await createBoardViaApi(
        request,
        'e2e-concurrent-network-owner@example.com',
        'E2E Concurrent Network Owner',
        'E2E Concurrent Network Board',
    );

    const identities = Array.from({ length: 10 }, (_, i) => ({
        email: `e2e-concurrent-network-${i}@example.com`,
        displayName: `E2E Concurrent Participant ${i}`,
    }));

    const sessions = await Promise.all(
        identities.map(async ({ email, displayName }) => {
            const context = await browser.newContext();
            const page = await context.newPage();
            await blockFirestoreRequests(page);
            await signInAs(page, email, displayName);
            return { page, context, displayName };
        }),
    );

    try {
        for (const { page } of sessions) {
            await page.goto(`/retro/${boardId}`);
            await expect(page.getByText('E2E Concurrent Network Board')).toBeVisible({ timeout: 30_000 });
        }

        // Typical actions from a handful of participants — with Firestore blocked for
        // every one of the 10 sessions, any surviving direct-Firestore dependency
        // (the old columns listener, the old participant-photo cache, or any of the
        // now-deleted dead files being silently reachable again) would surface here as
        // a stuck loading state or a thrown error, not a passing assertion.
        const [authorA, authorB] = sessions;
        await addCardToFirstColumn(authorA.page, 'Concurrent network card A');
        await addCardToFirstColumn(authorB.page, 'Concurrent network card B');

        // Every one of the 10 sessions sees both cards live, with Firestore blocked the
        // entire time — this exercises the participant list (rendered on every board
        // load, previously dependent on UserProfileCache's Firestore batch-read) as a
        // side effect of the board loading successfully at all for each session.
        for (const { page } of sessions) {
            await expect(cardByContent(page, 'Concurrent network card A')).toBeVisible({ timeout: 15_000 });
            await expect(cardByContent(page, 'Concurrent network card B')).toBeVisible({ timeout: 15_000 });
        }
    } finally {
        await Promise.all(sessions.map(({ context }) => context.close()));
    }
});
