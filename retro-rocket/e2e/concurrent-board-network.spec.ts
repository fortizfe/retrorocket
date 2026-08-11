import { Redis } from 'ioredis';
import { test, expect } from '@playwright/test';
import { signInAs, createBoardViaApi } from './fixtures/auth-helpers';
import { addCardToFirstColumn, cardByContent } from './fixtures/board';
import { blockFirestoreRequests } from './fixtures/network';
import { getEmulatorFirestore } from './fixtures/firestoreAdmin';
import { RedisBoardCoordinationAdapter } from '../server/src/adapters/firebase/redis/RedisBoardCoordinationAdapter';
import { CoordinatedRealtimeGatewayAdapter } from '../server/src/adapters/firebase/redis/CoordinatedRealtimeGatewayAdapter';
import type { RealtimeConnection, RealtimeEvent } from '../server/src/application/ports/realtime';

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

/**
 * 040, US3 (Story 3): exactly one instance's Firestore listeners are active for a
 * board at a time, real-time updates relay across instances via Redis, and — the gap
 * `/speckit-analyze` found in the ownership hand-off protocol before this feature
 * shipped — a *graceful* release (not just a crash) still hands off cleanly. This test
 * exercises the coordination layer directly (two `CoordinatedRealtimeGatewayAdapter`
 * instances, each simulating a separate backend process with its own pair of Redis
 * connections and a fake `RealtimeConnection`, sharing the real Firestore emulator and
 * a real Redis) rather than spinning up two full HTTP+WS server processes: the
 * frontend has no way to route its single WebSocket connection to an arbitrary second
 * backend port (by design — no frontend changes are in scope for this feature, FR-010),
 * so a server-level integration check is the reliable way to prove the coordination
 * mechanism itself works against real infrastructure. Requires a local Redis instance
 * (quickstart.md) — skipped automatically when REDIS_URL isn't set, matching the CI
 * `e2e` job's dedicated Redis service container.
 */
test('040/US3: board-listener ownership is coordinated via Redis across two gateway instances, including a graceful hand-off', async () => {
    test.skip(!process.env.REDIS_URL, 'REDIS_URL not set — see quickstart.md for local Redis setup');
    const redisUrl = process.env.REDIS_URL!;
    const db = getEmulatorFirestore();

    // Two connections per simulated instance (commands + subscriber — Redis's
    // protocol puts a connection into subscriber-only mode once SUBSCRIBE is called,
    // so a single shared connection can't do both).
    const clientsA = [new Redis(redisUrl), new Redis(redisUrl)];
    const clientsB = [new Redis(redisUrl), new Redis(redisUrl)];
    const coordinatorA = new RedisBoardCoordinationAdapter(clientsA[0], clientsA[1], { leaseMs: 3000, instanceId: 'e2e-instance-a' });
    const coordinatorB = new RedisBoardCoordinationAdapter(clientsB[0], clientsB[1], { leaseMs: 3000, instanceId: 'e2e-instance-b' });
    const gatewayA = new CoordinatedRealtimeGatewayAdapter(db, coordinatorA, { leaseMs: 3000, recoveryRetryMs: 1000 });
    const gatewayB = new CoordinatedRealtimeGatewayAdapter(db, coordinatorB, { leaseMs: 3000, recoveryRetryMs: 1000 });

    const boardId = `e2e-redis-coord-${Date.now()}`;
    const ownerKey = `board-owner:${boardId}`;

    function fakeConnection(uid: string): RealtimeConnection & { received: RealtimeEvent[] } {
        const received: RealtimeEvent[] = [];
        return { retrospectiveId: boardId, uid, received, send: (event) => received.push(event) };
    }

    // A minimal seed doc is enough — the listener composition matches on
    // retrospectiveId, not the full card/board schema (contracts/redis-coordination-
    // protocol.md doesn't touch how boards/cards are written).
    await db.collection('retrospectives').doc(boardId).set({
        title: 'E2E Redis Coordination Board',
        createdBy: 'owner-uid',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 0,
        isActive: true,
        columnGroupingStates: {},
    });

    try {
        const connA = fakeConnection('user-a');
        const connB = fakeConnection('user-b');
        gatewayA.register(connA);
        gatewayB.register(connB);

        // Both instances reconcile within a tick; exactly one becomes owner.
        await expect.poll(async () => (await clientsA[0].get(ownerKey)) !== null, { timeout: 10_000 }).toBe(true);

        // The relay path must reach BOTH local connections regardless of which
        // instance owns the Firestore listeners.
        await db.collection('cards').add({
            retrospectiveId: boardId,
            content: 'redis relay check',
            column: 'went-well',
            createdBy: 'user-a',
            createdByName: 'A',
            color: 'blue',
            votes: 0,
            likes: [],
            reactions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await expect.poll(() => connA.received.some((e) => e.entity === 'card'), { timeout: 10_000 }).toBe(true);
        await expect.poll(() => connB.received.some((e) => e.entity === 'card'), { timeout: 10_000 }).toBe(true);

        // Gracefully release whichever instance currently owns the board (close only
        // its local connection, not a crash) while the other instance keeps its own
        // connection — the exact scenario trigger (a) alone left unhandled.
        const ownerIsA = coordinatorA.isOwner(boardId);
        const [ownerGateway, ownerConn, survivorClient, survivorConn] = ownerIsA
            ? [gatewayA, connA, clientsB[0], connB]
            : [gatewayB, connB, clientsA[0], connA];

        ownerGateway.unregister(ownerConn);

        // Within roughly one heartbeat/re-check interval, the surviving instance must
        // acquire ownership via trigger (b) — a periodic re-check, not a new
        // registration event, since its own connection was already registered before
        // the owner released.
        const ownerBefore = await survivorClient.get(ownerKey);
        await expect.poll(async () => survivorClient.get(ownerKey), { timeout: 10_000 }).not.toBe(ownerBefore);

        // Real-time delivery must still work for the survivor after the hand-off.
        survivorConn.received.length = 0;
        await db.collection('cards').add({
            retrospectiveId: boardId,
            content: 'post-handoff relay check',
            column: 'went-well',
            createdBy: 'user-b',
            createdByName: 'B',
            color: 'blue',
            votes: 0,
            likes: [],
            reactions: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await expect.poll(() => survivorConn.received.some((e) => e.entity === 'card'), { timeout: 10_000 }).toBe(true);

        (ownerIsA ? gatewayB : gatewayA).unregister(survivorConn);
    } finally {
        await db.collection('retrospectives').doc(boardId).delete().catch(() => undefined);
        await Promise.all([...clientsA, ...clientsB].map((client) => client.quit().catch(() => undefined)));
    }
});
