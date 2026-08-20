import { test, expect, type APIRequestContext, type Page, type Locator } from '@playwright/test';
import { signInAs } from './fixtures/auth-helpers';

// 056-team-metrics-dashboard — Playwright E2E covering quickstart.md's User Story 1,
// User Story 2 and User Story 3 scenarios: Scenario 1 (activity figures —
// retrospectiveCount/averageParticipants — plus, since US2, the actionItemsCreated total,
// GET /api/teams/:id/metrics, contracts/team-metrics-api.md), Scenario 2 (mood evolution
// — US3, T034: chronological order, a numeric score for a retrospective with confident
// sentiment, an explicit "no data" state for one without), Scenario 3 (non-member denied,
// both via the UI and a direct API call), and Scenario 5 (a team with zero retrospectives
// shows a clear empty state).
//
// FirestoreTeamMetricsAdapter is explicitly documented as exempt from Vitest unit
// coverage ("verified end-to-end by the Playwright E2E suite against the emulator") —
// this file is that verification for the Firestore aggregation query itself, not just
// the frontend rendering.
//
// Setup mirrors e2e/team-management.spec.ts's and e2e/board-team-association.spec.ts's
// request-based, bypass-the-UI pattern: team creation (POST /api/teams, 054
// contracts/teams-api.md) and team-linked board creation (POST /api/boards with teamId,
// 055 contracts/boards-api-delta.md) happen directly via the API, since both are already
// covered by their own features' E2E suites. This file only drives the UI for the actual
// assertions this feature is about: what the metrics panel shows, and who can reach it.

/**
 * Establishes a session for `email` on the given request context without any page
 * navigation, then makes the follow-up GET /api/profile call so ensureUserProfile
 * writes the users/{uid} doc — required before this identity can be looked up as a team
 * member (findUserByEmail). Same helper as team-management.spec.ts /
 * board-team-association.spec.ts.
 */
async function loginViaApi(request: APIRequestContext, email: string, displayName: string): Promise<void> {
    const res = await request.post('/api/auth/test-login', { data: { email, displayName } });
    if (!res.ok()) {
        throw new Error(`test-login failed for ${email}: ${res.status()} ${await res.text()}`);
    }
    const profileRes = await request.get('/api/profile');
    if (!profileRes.ok()) {
        throw new Error(`GET /api/profile failed for ${email} after test-login: ${profileRes.status()} ${await profileRes.text()}`);
    }
}

/** Creates a team owned by `ownerEmail` via the API alone (POST /api/teams, 054 contracts/teams-api.md). */
async function createTeamViaApi(request: APIRequestContext, ownerEmail: string, ownerName: string, name: string): Promise<string> {
    await loginViaApi(request, ownerEmail, ownerName);
    const res = await request.post('/api/teams', { data: { name } });
    if (!res.ok()) {
        throw new Error(`create team failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { teamId: string };
    return body.teamId;
}

/** POST /api/teams/:id/members using `request`'s current (owner) session. */
async function addMemberViaApi(request: APIRequestContext, teamId: string, email: string) {
    return request.post(`/api/teams/${teamId}/members`, { data: { email } });
}

/**
 * Creates a retrospective linked to `teamId` via the API alone (POST /api/boards with
 * teamId, 055 contracts/boards-api-delta.md), using `request`'s current session as the
 * creator. A freshly created board's participantCount starts at 1 (the creator) —
 * FirestoreBoardsAdapter.createBoard.
 */
async function createLinkedBoardViaApi(request: APIRequestContext, teamId: string, title: string): Promise<string> {
    const res = await request.post('/api/boards', {
        data: { templateId: 'default', title, locale: 'es', teamId },
    });
    if (!res.ok()) {
        throw new Error(`create linked board failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { boardId: string };
    return body.boardId;
}

/**
 * Joins `boardId` as `request`'s current session (POST /api/boards/:id/join) —
 * increments the board's stored participantCount by 1 (FirestoreBoardsAdapter.joinBoard),
 * used to build a non-trivial averageParticipants figure across the team's retrospectives.
 */
async function joinBoardViaApi(request: APIRequestContext, boardId: string) {
    return request.post(`/api/boards/${boardId}/join`);
}

/**
 * Creates an action item directly on `boardId` via the API alone
 * (POST /api/retrospectives/:id/action-items — server/src/http/routes/retrospectives.ts),
 * using `request`'s current session as the creator. Any participant may create an action
 * item (FR-015, exercised the same way in e2e/retrospective-board.spec.ts); this feature's
 * `actionItemsCreated` metric only cares about the resulting count, not who created it.
 */
async function createActionItemViaApi(request: APIRequestContext, boardId: string, content: string): Promise<string> {
    const res = await request.post(`/api/retrospectives/${boardId}/action-items`, { data: { content } });
    if (!res.ok()) {
        throw new Error(`create action item failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { id: string };
    return body.id;
}

/**
 * The <p> immediately preceding a stat card's exact label text within `scope`
 * (ActivitySummary.tsx: `<p>{value}</p><p>{label}</p>` siblings inside one card `<div>`)
 * — pairs a displayed number with its own label rather than asserting both numbers are
 * merely present somewhere in the panel.
 */
function statCardValueLocator(scope: Locator, labelText: string): Locator {
    return scope.getByText(labelText, { exact: true }).locator('xpath=preceding-sibling::p[1]');
}

/** The Team Metrics panel itself, scoped by its own `<h2>` heading (teams.metrics.panel.title, "Actividad"). */
function metricsPanelLocator(page: Page): Locator {
    return page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Actividad' }) });
}

/**
 * The mood evolution list (User Story 3, `MoodEvolutionList.tsx`), scoped inside the
 * metrics panel by its own `<h3>` section heading (teams.metrics.mood.sectionLabel,
 * "Evolución del ánimo"). The list itself is the immediate following-sibling `<ul>` of
 * that heading — same xpath-sibling convention `statCardValueLocator` above uses to pair
 * a label with its own value rather than matching anything in the panel.
 */
function moodEvolutionListLocator(page: Page): Locator {
    return metricsPanelLocator(page)
        .getByRole('heading', { level: 3, name: 'Evolución del ánimo' })
        .locator('xpath=following-sibling::ul[1]');
}

/**
 * Creates a card on `retrospectiveId` via the API alone
 * (POST /api/retrospectives/:id/cards, same route e2e/team-mood.spec.ts's mobile test
 * seeds through directly rather than the UI composer) using `request`'s current session.
 */
async function createCardViaApi(request: APIRequestContext, retrospectiveId: string, content: string): Promise<string> {
    const res = await request.post(`/api/retrospectives/${retrospectiveId}/cards`, {
        data: { content, column: 'helped' },
    });
    if (!res.ok()) {
        throw new Error(`create card failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { id: string };
    return body.id;
}

/**
 * Drives real production behavior directly rather than the client-side ML pipeline:
 * PUT /api/cards/:id/sentiment (server/src/http/routes/retrospectives.ts) is the exact
 * endpoint the frontend's on-device sentiment analysis calls once it has computed a
 * result (saveSentimentResult, server/src/application/use-cases/retrospective/Sentiment.ts)
 * — it persists whatever {sentiment, confidence, contentHash} it is given without
 * re-running inference. e2e/team-mood.spec.ts deliberately avoids driving the real
 * on-device model through the UI (heavy/unreliable model download in headless CI) and
 * only asserts a "coherent state"; calling this save endpoint directly is the same
 * lighter-weight substitute, but here it lets the test assert an exact, deterministic
 * moodScore rather than merely "some coherent state" — confidence 0.95 clears every
 * DEFAULT_SENTIMENT_THRESHOLDS bucket (positive/negative 0.4, neutral 0.25;
 * FirestoreTeamMetricsAdapter.ts) so every result here counts as "confident".
 */
async function saveCardSentimentViaApi(
    request: APIRequestContext,
    cardId: string,
    sentiment: 'positive' | 'negative' | 'neutral',
): Promise<void> {
    const res = await request.put(`/api/cards/${cardId}/sentiment`, {
        data: { sentiment, confidence: 0.95, modelId: 'e2e-fixture', modelVersion: '1', contentHash: `e2e-${cardId}` },
    });
    if (!res.ok()) {
        throw new Error(`save sentiment failed: ${res.status()} ${await res.text()}`);
    }
}

/**
 * Seeds `count` cards on `retrospectiveId`, each with a confident `sentiment` result —
 * builds a retrospective whose `moodEvolution` entry has a real, non-null `moodScore`.
 * All-`sentiment` confident results hit `calculateMoodScore`'s documented anchors
 * (server/src/domain/teams/moodScore.ts): all-positive -> 10.0, all-negative -> 1.0.
 */
async function seedConfidentSentimentViaApi(
    request: APIRequestContext,
    retrospectiveId: string,
    sentiment: 'positive' | 'negative',
    count: number,
): Promise<void> {
    for (let i = 0; i < count; i += 1) {
        const cardId = await createCardViaApi(request, retrospectiveId, `E2E mood card ${sentiment} ${i} ${Date.now()}`);
        await saveCardSentimentViaApi(request, cardId, sentiment);
    }
}

async function assertActivityFigures(page: Page, expectedRetrospectiveCount: string, expectedAverageParticipants: string) {
    const panel = metricsPanelLocator(page);
    await expect(panel).toBeVisible();
    await expect(statCardValueLocator(panel, 'Retrospectivas')).toHaveText(expectedRetrospectiveCount);
    await expect(statCardValueLocator(panel, 'Media de participantes')).toHaveText(expectedAverageParticipants);
}

/**
 * Asserts the `ActionItemsSummary` stat card (User Story 2) — same
 * icon+number+label stat-card layout as `ActivitySummary`'s cards
 * (`<p>{value}</p><p>{label}</p>` siblings), so `statCardValueLocator` applies unchanged.
 */
async function assertActionItemsSummary(page: Page, expectedActionItemsCreated: string) {
    const panel = metricsPanelLocator(page);
    await expect(statCardValueLocator(panel, 'Acciones creadas')).toHaveText(expectedActionItemsCreated);
}

test.describe('User Story 1 — Owner and Member view the team activity summary (quickstart.md Scenario 1)', () => {
    test('retrospectiveCount and averageParticipants match the underlying retrospectives, identically for Owner and Member', async ({ page, request, browser }) => {
        const ownerEmail = `e2e-team-metrics-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Team Metrics Owner';
        const memberEmail = `e2e-team-metrics-member-${Date.now()}@example.com`;
        const memberName = 'E2E Team Metrics Member';
        const joinerEmail = `e2e-team-metrics-joiner-${Date.now()}@example.com`;
        const joinerName = 'E2E Team Metrics Joiner';
        const teamName = `E2E Metrics Team Alpha ${Date.now()}`;

        await loginViaApi(request, memberEmail, memberName); // Member's profile doc must exist before add-by-email
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, teamName); // `request` session -> Owner
        const addRes = await addMemberViaApi(request, teamId, memberEmail);
        expect(addRes.status()).toBe(201);

        // Retro A: created by Owner, nobody else joins -> participantCount stays 1.
        // Two action items created on it (still Owner's session).
        const retroATitle = `E2E Metrics Retro A ${Date.now()}`;
        const retroAId = await createLinkedBoardViaApi(request, teamId, retroATitle);
        await createActionItemViaApi(request, retroAId, 'E2E Metrics Retro A action item 1');
        await createActionItemViaApi(request, retroAId, 'E2E Metrics Retro A action item 2');

        // Retro B: created by Owner, one additional distinct account joins -> participantCount 2.
        // One action item created on it before the session switches to the Joiner.
        const retroBTitle = `E2E Metrics Retro B ${Date.now()}`;
        const retroBId = await createLinkedBoardViaApi(request, teamId, retroBTitle);
        await createActionItemViaApi(request, retroBId, 'E2E Metrics Retro B action item 1');
        await loginViaApi(request, joinerEmail, joinerName); // switches `request`'s session away from Owner
        const joinRes = await joinBoardViaApi(request, retroBId);
        expect(joinRes.status()).toBe(200);

        // retrospectiveCount = 2 (Retro A + Retro B); averageParticipants = (1 + 2) / 2 = 1.5
        // (domain/teams/activitySummary.ts rounds to one decimal place); actionItemsCreated =
        // 3 (2 on Retro A + 1 on Retro B), quickstart.md Scenario 1 step 4 (User Story 2).

        // --- Owner view (main `page` fixture) ---
        await signInAs(page, ownerEmail, ownerName);
        await page.goto(`/teams/${teamId}`);
        await expect(page.getByRole('heading', { level: 1, name: teamName })).toBeVisible();
        await assertActivityFigures(page, '2', '1.5');
        await assertActionItemsSummary(page, '3');

        // Cross-check against the API response the panel itself is backed by.
        const ownerMetricsRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(ownerMetricsRes.status()).toBe(200);
        const ownerMetrics = (await ownerMetricsRes.json()) as {
            retrospectiveCount: number;
            averageParticipants: number;
            actionItemsCreated: number;
        };
        expect(ownerMetrics.retrospectiveCount).toBe(2);
        expect(ownerMetrics.averageParticipants).toBe(1.5);
        expect(ownerMetrics.actionItemsCreated).toBe(3);

        // --- Member view (separate browser context/session — same values, same access) ---
        const memberContext = await browser.newContext();
        const memberPage = await memberContext.newPage();
        await signInAs(memberPage, memberEmail, memberName);
        await memberPage.goto(`/teams/${teamId}`);
        await expect(memberPage.getByRole('heading', { level: 1, name: teamName })).toBeVisible();
        await assertActivityFigures(memberPage, '2', '1.5');
        await assertActionItemsSummary(memberPage, '3');

        const memberMetricsRes = await memberPage.request.get(`/api/teams/${teamId}/metrics`);
        expect(memberMetricsRes.status()).toBe(200);
        const memberMetrics = (await memberMetricsRes.json()) as {
            retrospectiveCount: number;
            averageParticipants: number;
            actionItemsCreated: number;
        };
        expect(memberMetrics).toEqual(ownerMetrics);

        await memberContext.close();
    });
});

test.describe('User Story 3 — Owner observes mood evolution across retrospectives (quickstart.md Scenario 2)', () => {
    test('mood list renders in chronological order, with a numeric score where sentiment is confident and an explicit "no data" state where it is not', async ({ page, request }) => {
        const ownerEmail = `e2e-team-metrics-mood-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Team Metrics Mood Owner';
        const teamName = `E2E Metrics Mood Team ${Date.now()}`;
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, teamName);

        // Three team-linked retrospectives, created in sequence so `createdAt` orders them
        // oldest -> newest exactly as created below (FirestoreTeamMetricsAdapter sorts
        // moodEvolution ascending by createdAt). Confident/no-data is interleaved
        // (positive, no-data, negative) so the ordering assertion below can only pass if
        // the list is genuinely chronological, not merely grouped by data-availability.
        const retro1Title = `E2E Mood Retro 1 Positive ${Date.now()}`;
        const retro1Id = await createLinkedBoardViaApi(request, teamId, retro1Title);
        await seedConfidentSentimentViaApi(request, retro1Id, 'positive', 3); // confident -> moodScore 10.0

        const retro2Title = `E2E Mood Retro 2 NoData ${Date.now()}`;
        const retro2Id = await createLinkedBoardViaApi(request, teamId, retro2Title);
        await createCardViaApi(request, retro2Id, `E2E mood card unanalyzed ${Date.now()}`); // no sentiment saved -> moodScore null

        const retro3Title = `E2E Mood Retro 3 Negative ${Date.now()}`;
        const retro3Id = await createLinkedBoardViaApi(request, teamId, retro3Title);
        await seedConfidentSentimentViaApi(request, retro3Id, 'negative', 3); // confident -> moodScore 1.0

        await signInAs(page, ownerEmail, ownerName);
        await page.goto(`/teams/${teamId}`);
        await expect(page.getByRole('heading', { level: 1, name: teamName })).toBeVisible();

        const rows = moodEvolutionListLocator(page).locator('li');
        await expect(rows).toHaveCount(3);

        // Chronological order (oldest first), matching creation order above.
        await expect(rows.nth(0)).toContainText(retro1Title);
        await expect(rows.nth(1)).toContainText(retro2Title);
        await expect(rows.nth(2)).toContainText(retro3Title);

        // Retro 1: confident sentiment -> a real numeric score (all-positive anchor, 10.0
        // renders as "10" — MoodEvolutionList interpolates the raw number).
        await expect(rows.nth(0).getByText('10', { exact: true })).toBeVisible();

        // Retro 2: no analyzed sentiment -> the explicit "no data" state
        // (teams.metrics.mood.no data, "Sin datos de ánimo"), never a default/zero score.
        await expect(rows.nth(1).getByText('Sin datos de ánimo')).toBeVisible();
        await expect(rows.nth(1).getByText(/^\d+(\.\d+)?$/)).toHaveCount(0);
        await expect(rows.nth(1).getByText('0', { exact: true })).toHaveCount(0);

        // Retro 3: confident sentiment -> a real numeric score (all-negative anchor, 1.0).
        await expect(rows.nth(2).getByText('1', { exact: true })).toBeVisible();
        await expect(rows.nth(2).getByText('Sin datos de ánimo')).toHaveCount(0);

        // Cross-check against the API response the panel itself is backed by
        // (contracts/team-metrics-api.md's moodEvolution field) — same pattern Scenario 1's
        // test above uses for the activity figures.
        const metricsRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(metricsRes.status()).toBe(200);
        const metrics = (await metricsRes.json()) as {
            moodEvolution: { retrospectiveId: string; retrospectiveTitle: string; moodScore: number | null }[];
        };
        expect(metrics.moodEvolution.map((p) => p.retrospectiveId)).toEqual([retro1Id, retro2Id, retro3Id]);
        expect(metrics.moodEvolution[0].moodScore).toBe(10);
        expect(metrics.moodEvolution[1].moodScore).toBeNull();
        expect(metrics.moodEvolution[2].moodScore).toBe(1);
    });
});

test.describe('User Story 1 — Non-member is denied (quickstart.md Scenario 3, AC2)', () => {
    test('an outsider cannot reach the panel via the UI, and a direct GET /metrics call is rejected with 403 and leaks no metrics data', async ({ page, request }) => {
        const ownerEmail = `e2e-team-metrics-denied-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Team Metrics Denied Owner';
        const teamName = `E2E Metrics Denied Team Alpha ${Date.now()}`;
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, teamName);

        const outsiderEmail = `e2e-team-metrics-outsider-${Date.now()}@example.com`;
        const outsiderName = 'E2E Team Metrics Outsider';

        // --- UI path: direct navigation to the team detail page (which hosts the panel)
        // never reveals the team or the metrics panel to a non-member. GET /api/teams/:id
        // itself already 403s a non-member (054 behavior) — TeamDetail.tsx's error state
        // renders instead, with neither the team name nor the panel's own heading present.
        await signInAs(page, outsiderEmail, outsiderName);
        await page.goto(`/teams/${teamId}`);
        await expect(page.getByRole('alert')).toBeVisible();
        await expect(page.getByText('No se pudo cargar este equipo.')).toBeVisible();
        await expect(page.getByText(teamName)).not.toBeVisible();
        await expect(page.getByRole('heading', { level: 2, name: 'Actividad' })).toHaveCount(0);

        // --- Direct API path (bypassing the UI entirely): GET /api/teams/:id/metrics 403s
        // for the same outsider, with no metrics fields present in the error body
        // (contracts/team-metrics-api.md).
        const metricsRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(metricsRes.status()).toBe(403);
        const body = (await metricsRes.json()) as {
            error?: { code?: string };
            retrospectiveCount?: unknown;
            averageParticipants?: unknown;
            actionItemsCreated?: unknown;
            moodEvolution?: unknown;
        };
        expect(body.error?.code).toBe('forbidden');
        expect(body).not.toHaveProperty('retrospectiveCount');
        expect(body).not.toHaveProperty('averageParticipants');
        expect(body).not.toHaveProperty('actionItemsCreated');
        expect(body).not.toHaveProperty('moodEvolution');
    });
});

test.describe('Membership loss is enforced on next request, not live (quickstart.md Scenario 4, Clarifications 2026-08-19)', () => {
    test('a removed member keeps their already-open panel, but a fresh GET /metrics call 403s afterward', async ({ page, request }) => {
        const ownerEmail = `e2e-team-metrics-revoke-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Team Metrics Revoke Owner';
        const memberEmail = `e2e-team-metrics-revoke-member-${Date.now()}@example.com`;
        const memberName = 'E2E Team Metrics Revoke Member';
        const teamName = `E2E Metrics Revoke Team ${Date.now()}`;

        await loginViaApi(request, memberEmail, memberName); // Member's profile doc must exist before add-by-email
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, teamName); // `request` session -> Owner
        const addRes = await addMemberViaApi(request, teamId, memberEmail);
        expect(addRes.status()).toBe(201);
        const addedMember = (await addRes.json()) as { userId: string };

        // Member opens the panel in the actual browser session (`page`'s own cookie jar,
        // separate from the top-level `request` context used for the Owner's actions below).
        await signInAs(page, memberEmail, memberName);
        await page.goto(`/teams/${teamId}`);
        await expect(page.getByRole('heading', { level: 1, name: teamName })).toBeVisible();
        await assertActivityFigures(page, '0', '0');

        // Confirm the Member's access is genuinely live before removal (sanity check).
        const beforeRemovalRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(beforeRemovalRes.status()).toBe(200);

        // Owner removes Member from the team (054's existing endpoint) — `request`'s
        // session is still the Owner's from createTeamViaApi above.
        const removeRes = await request.delete(`/api/teams/${teamId}/members/${addedMember.userId}`);
        expect(removeRes.status()).toBe(204);

        // Step 3 (quickstart.md): the Member's already-rendered panel has no required
        // teardown behavior — it is not torn down live. No assertion either way here;
        // the contract is only about the *next request* (step 4), asserted below.

        // Step 4: a fresh request, on the same (still-authenticated) Member session,
        // now gets 403 — access is revoked on next request, not via live monitoring.
        const afterRemovalRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(afterRemovalRes.status()).toBe(403);
        const afterRemovalBody = (await afterRemovalRes.json()) as { error?: { code?: string } };
        expect(afterRemovalBody.error?.code).toBe('forbidden');
    });
});

test.describe('User Story 1 — Team with zero retrospectives shows an empty state (quickstart.md Scenario 5, FR-010/SC-004)', () => {
    test('a brand-new team with no retrospectives renders a clear empty state, not an error', async ({ page, request }) => {
        const ownerEmail = `e2e-team-metrics-empty-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Team Metrics Empty Owner';
        const teamName = `E2E Metrics Empty Team ${Date.now()}`;
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, teamName);

        await signInAs(page, ownerEmail, ownerName);
        await page.goto(`/teams/${teamId}`);
        await expect(page.getByRole('heading', { level: 1, name: teamName })).toBeVisible();

        // 200 OK with zeroed-out figures, not an error — the panel itself never enters its
        // role="alert" error state for this case.
        await expect(page.getByRole('alert')).toHaveCount(0);
        await assertActivityFigures(page, '0', '0');
        await expect(
            page.getByText('Todavía no hay retrospectivas: las métricas aparecerán en cuanto este equipo realice la primera.'),
        ).toBeVisible();

        const metricsRes = await page.request.get(`/api/teams/${teamId}/metrics`);
        expect(metricsRes.status()).toBe(200);
        const metrics = (await metricsRes.json()) as {
            retrospectiveCount: number;
            averageParticipants: number;
            actionItemsCreated: number;
            moodEvolution: unknown[];
        };
        expect(metrics.retrospectiveCount).toBe(0);
        expect(metrics.averageParticipants).toBe(0);
        expect(metrics.actionItemsCreated).toBe(0);
        expect(metrics.moodEvolution).toEqual([]);
    });
});
