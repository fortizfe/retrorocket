import { test, expect, type APIRequestContext, type Page, type Response } from '@playwright/test';
import { signInAs } from './fixtures/auth-helpers';

// 055-retro-team-association, T014 — Playwright E2E covering quickstart.md Scenarios 1
// and 2 (User Story 1): creating a board with/without a team association, the
// zero-teams facilitator never being blocked, and the 403 rejection of a manipulated
// request naming a team the requester doesn't belong to. Scenario 3 (User Story 2, the
// dashboard team filter) is added below by T022. Scenarios 4-5 (User Story 3) extend
// this same file below, by T030.
//
// Setup mirrors e2e/team-management.spec.ts's request-based, bypass-the-UI pattern
// for team creation (POST /api/teams, contracts/teams-api.md from 054) — this feature
// adds no team-management endpoints of its own, only a `teamId` on
// POST/GET /api/boards (contracts/boards-api-delta.md).

/**
 * Establishes a session for `email` on the given request context without any page
 * navigation, and (like team-management.spec.ts's loginViaApi) makes the follow-up
 * GET /api/profile call so ensureUserProfile writes the users/{uid} doc — required
 * before this identity can be looked up as a team member.
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

type BoardSummaryDTO = { id: string; title: string; teamId: string | null };

/** GET /api/boards using `page`'s (or an APIRequestContext's) current session. */
async function listBoardsViaApi(requester: Page | APIRequestContext): Promise<BoardSummaryDTO[]> {
    const request = 'request' in requester ? requester.request : requester;
    const res = await request.get('/api/boards');
    if (!res.ok()) {
        throw new Error(`GET /api/boards failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { boards: BoardSummaryDTO[] };
    return body.boards;
}

/** Opens the create-board flow from the dashboard and reaches the "details" step. */
async function openCreateBoardDetailsStep(page: Page): Promise<void> {
    await page.goto('/dashboard');
    await page.getByText('Nuevo Tablero', { exact: true }).click();
    await page.getByText('Siguiente', { exact: true }).click();
}

test.describe('User Story 1 — Create a retrospective linked to a team (quickstart.md Scenario 1)', () => {
    test('a board created with a team selected persists that teamId; a board created without one stays teamId: null and is otherwise unaffected', async ({ page, request }) => {
        const facilitatorEmail = `e2e-board-team-facilitator-${Date.now()}@example.com`;
        const facilitatorName = 'E2E Board Team Facilitator';
        const teamName = `E2E Board Team Alpha ${Date.now()}`;
        const teamId = await createTeamViaApi(request, facilitatorEmail, facilitatorName, teamName);

        await signInAs(page, facilitatorEmail, facilitatorName);

        // --- Board 1: select the team on the details step. ---
        await openCreateBoardDetailsStep(page);

        const teamLabel = page.getByText('Equipo', { exact: true });
        await expect(teamLabel).toBeVisible();
        const teamSelect = page.locator('#boardTeam');
        await expect(teamSelect).toBeVisible();
        // The facilitator's own team is listed as an option (step 2 of the scenario).
        await expect(teamSelect.locator('option', { hasText: teamName })).toHaveCount(1);

        const linkedTitle = `E2E Team Linked Board ${Date.now()}`;
        await page.locator('#boardTitle').fill(linkedTitle);
        await teamSelect.selectOption({ label: teamName });

        const [linkedCreateResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes('/api/boards') && res.request().method() === 'POST'),
            page.getByRole('button', { name: 'Crear', exact: true }).click(),
        ]);
        expect(linkedCreateResponse.status()).toBe(201);
        const { boardId: linkedBoardId } = (await linkedCreateResponse.json()) as { boardId: string };
        await page.waitForURL(/\/retro\//, { timeout: 30_000 });
        await expect(page.getByText(linkedTitle)).toBeVisible();

        // --- Board 2: leave the team select at its default ("no team") value. ---
        await openCreateBoardDetailsStep(page);
        const unlinkedTitle = `E2E No Team Board ${Date.now()}`;
        await page.locator('#boardTitle').fill(unlinkedTitle);
        await expect(page.locator('#boardTeam')).toHaveValue('');

        const [unlinkedCreateResponse] = await Promise.all([
            page.waitForResponse((res) => res.url().includes('/api/boards') && res.request().method() === 'POST'),
            page.getByRole('button', { name: 'Crear', exact: true }).click(),
        ]);
        expect(unlinkedCreateResponse.status()).toBe(201);
        const { boardId: unlinkedBoardId } = (await unlinkedCreateResponse.json()) as { boardId: string };
        await page.waitForURL(/\/retro\//, { timeout: 30_000 });
        // Behaves identically to a pre-feature board: it opens and its title renders.
        await expect(page.getByText(unlinkedTitle)).toBeVisible();

        // --- Confirm via GET /api/boards that teamId was persisted/omitted correctly. ---
        const boards = await listBoardsViaApi(page);
        const linked = boards.find((b) => b.id === linkedBoardId);
        const unlinked = boards.find((b) => b.id === unlinkedBoardId);
        expect(linked?.teamId).toBe(teamId);
        expect(unlinked?.teamId).toBeNull();
    });

    test('a request naming a team the requester does not belong to is rejected with 403 forbidden and creates no board', async ({ request }) => {
        const ownerEmail = `e2e-board-team-owner-${Date.now()}@example.com`;
        const ownerName = 'E2E Board Team Owner';
        const teamId = await createTeamViaApi(request, ownerEmail, ownerName, `E2E Outsider Target Team ${Date.now()}`);

        // Switch the same request context's session to a genuinely different identity
        // that is not a member of the team just created (single named session cookie —
        // re-calling test-login replaces the active identity, same pattern
        // team-management.spec.ts relies on for sequential logins on one context).
        const outsiderEmail = `e2e-board-team-outsider-${Date.now()}@example.com`;
        await loginViaApi(request, outsiderEmail, 'E2E Board Team Outsider');

        const boardsBefore = await listBoardsViaApi(request);

        const attemptedTitle = `E2E Should Not Be Created ${Date.now()}`;
        const res = await request.post('/api/boards', {
            data: { templateId: 'default', title: attemptedTitle, locale: 'es', teamId },
        });
        expect(res.status()).toBe(403);
        const body = (await res.json()) as { error: { code: string } };
        expect(body.error.code).toBe('forbidden');

        const boardsAfter = await listBoardsViaApi(request);
        expect(boardsAfter).toHaveLength(boardsBefore.length);
        expect(boardsAfter.some((b) => b.title === attemptedTitle)).toBe(false);
    });
});

test.describe('User Story 1 — Facilitator with zero teams is never blocked (quickstart.md Scenario 2)', () => {
    test('a brand-new user with no team memberships sees no team picker at all, and creates a board exactly as before this feature existed', async ({ page }) => {
        const freshEmail = `e2e-board-team-fresh-${Date.now()}@example.com`;
        const freshName = 'E2E Board Team Fresh No Teams';
        await signInAs(page, freshEmail, freshName);

        await openCreateBoardDetailsStep(page);

        // Omitted entirely — not present, not disabled (FR-012). Query by both the
        // control itself and its label to be sure it isn't just hidden.
        await expect(page.locator('#boardTeam')).toHaveCount(0);
        await expect(page.getByText('Equipo', { exact: true })).toHaveCount(0);

        const title = `E2E Fresh No-Team Board ${Date.now()}`;
        await page.locator('#boardTitle').fill(title);
        await page.getByRole('button', { name: 'Crear', exact: true }).click();
        await page.waitForURL(/\/retro\//, { timeout: 30_000 });
        await expect(page.getByText(title)).toBeVisible();

        const boards = await listBoardsViaApi(page);
        const created = boards.find((b) => b.title === title);
        expect(created?.teamId).toBeNull();
    });
});

// 055-retro-team-association, T022 — quickstart.md Scenario 3 (User Story 2): the
// dashboard's team-filter <select> (BoardControlsBar.tsx, added by T018) narrows the
// visible board list to board.teamId matches, is sourced from GET /api/teams (every
// team the user belongs to, not derived from the boards already on the dashboard —
// spec.md's Clarifications), and combines with the existing search box.
test.describe('User Story 2 — Filter the dashboard by team (quickstart.md Scenario 3)', () => {
    test('team filter lists every team the user belongs to, narrows by team/no-team, combines with search, and clears back to all', async ({ page, request }) => {
        const facilitatorEmail = `e2e-board-team-filter-${Date.now()}@example.com`;
        const facilitatorName = 'E2E Board Team Filter Facilitator';

        const teamAlphaName = `E2E Filter Team Alpha ${Date.now()}`;
        const teamBetaName = `E2E Filter Team Beta ${Date.now()}`;
        const teamAlphaId = await createTeamViaApi(request, facilitatorEmail, facilitatorName, teamAlphaName);
        // Team Beta is deliberately left with zero linked boards — proves step 2 of the
        // scenario: the filter's options come from GET /api/teams (useTeamsQuery()),
        // never from counting the boards currently loaded on the dashboard.
        await createTeamViaApi(request, facilitatorEmail, facilitatorName, teamBetaName);

        // createTeamViaApi's last call re-establishes `request`'s session as facilitator
        // (loginViaApi is called internally each time), so both boards below can be
        // created directly via the API on this same request context, bypassing the
        // create-board UI flow already covered by the Scenario 1 test above. Titles are
        // chosen with no shared substring across the "linked"/"no-team" halves so the
        // search-box combination step (below) can't accidentally match both.
        const linkedTitle = `E2E TeamFilterLinked Board ${Date.now()}`;
        const linkedRes = await request.post('/api/boards', {
            data: { templateId: 'default', title: linkedTitle, locale: 'es', teamId: teamAlphaId },
        });
        if (!linkedRes.ok()) {
            throw new Error(`create linked board failed: ${linkedRes.status()} ${await linkedRes.text()}`);
        }

        const unlinkedTitle = `E2E TeamFilterNoTeam Board ${Date.now()}`;
        const unlinkedRes = await request.post('/api/boards', {
            data: { templateId: 'default', title: unlinkedTitle, locale: 'es' },
        });
        if (!unlinkedRes.ok()) {
            throw new Error(`create unlinked board failed: ${unlinkedRes.status()} ${await unlinkedRes.text()}`);
        }

        await signInAs(page, facilitatorEmail, facilitatorName);
        await page.goto('/dashboard');
        await expect(page.getByText(linkedTitle)).toBeVisible();
        await expect(page.getByText(unlinkedTitle)).toBeVisible();

        // Step 2: the team filter (aria-label from dashboard.controls.team.label, "Filtrar
        // por equipo" in the default es locale these E2E tests run under) lists every team
        // the facilitator belongs to, including Team Beta which has zero visible boards.
        const teamFilterSelect = page.getByRole('combobox', { name: 'Filtrar por equipo' });
        await expect(teamFilterSelect).toBeVisible();
        await expect(teamFilterSelect.locator('option', { hasText: teamAlphaName })).toHaveCount(1);
        await expect(teamFilterSelect.locator('option', { hasText: teamBetaName })).toHaveCount(1);

        // Step 3: selecting "Team Alpha" narrows the list to only the team-linked board.
        await teamFilterSelect.selectOption({ label: teamAlphaName });
        await expect(page.getByText(linkedTitle)).toBeVisible();
        await expect(page.getByText(unlinkedTitle)).not.toBeVisible();

        // Step 4: selecting "no team" narrows the list to only the unlinked board.
        await teamFilterSelect.selectOption({ value: 'none' });
        await expect(page.getByText(unlinkedTitle)).toBeVisible();
        await expect(page.getByText(linkedTitle)).not.toBeVisible();

        // Step 5: combining the "Team Alpha" filter with the search box (typing part of
        // the linked board's title) still narrows correctly — both filters must agree.
        await teamFilterSelect.selectOption({ label: teamAlphaName });
        await expect(page.getByText(linkedTitle)).toBeVisible();
        const searchBox = page.getByPlaceholder(/buscar|search/i);
        await searchBox.fill('TeamFilterLinked');
        await expect(page.getByText(linkedTitle)).toBeVisible();
        await expect(page.getByText(unlinkedTitle)).not.toBeVisible();
        await searchBox.fill('');

        // Step 6: clearing the team filter back to "all" restores the full board list.
        await teamFilterSelect.selectOption({ value: 'all' });
        await expect(page.getByText(linkedTitle)).toBeVisible();
        await expect(page.getByText(unlinkedTitle)).toBeVisible();
    });
});

/**
 * Collects every response matching `urlPattern`+`method` from the moment it's called —
 * same rationale as e2e/retrospective-board.spec.ts's collectResponses (registering the
 * listener before navigation avoids racing page.goto()'s own internal steps), but this
 * variant retains the full Response objects (not just latest ok()) so their JSON bodies
 * can be inspected below. `urlPattern` is a RegExp rather than a plain substring so the
 * state-fetch match (`/api/retrospectives/{id}`) can be anchored with `$` and not
 * accidentally also swallow the `/api/retrospectives/{id}/live` WebSocket-upgrade
 * request, which shares that same prefix.
 */
function collectResponseBodies(page: Page, urlPattern: RegExp, method: string): { responses: () => Response[] } {
    const responses: Response[] = [];
    page.on('response', (res) => {
        if (urlPattern.test(res.url()) && res.request().method() === method) responses.push(res);
    });
    return { responses: () => responses };
}

// 055-retro-team-association, T030 — quickstart.md Scenarios 4-5 (User Story 3), the two
// negative checks: a team association must never gate who can join (FR-005) and must
// never be visible/fetchable from inside an *open* retrospective session (FR-011). Both
// scenarios share the same team-linked board and the same "Anyone" outsider identity (no
// relationship to the team at all — never a member, never was), so they're covered in
// one test rather than duplicating that setup across two.
test.describe('User Story 3 — Team association does not gate joining and never leaks inside an open session (quickstart.md Scenarios 4-5)', () => {
    test('an outsider with zero relationship to the team joins a team-linked board exactly as they would an unlinked one, and the open session reveals no team identity anywhere — UI or network', async ({ page, request }) => {
        const facilitatorEmail = `e2e-board-team-leak-facilitator-${Date.now()}@example.com`;
        const facilitatorName = 'E2E Board Team Leak Facilitator';
        const teamName = `E2E Leak Team Alpha ${Date.now()}`;
        const teamId = await createTeamViaApi(request, facilitatorEmail, facilitatorName, teamName);

        // A team-linked board (the Scenario 4/5 subject) plus a sibling unlinked board
        // from the same facilitator, created via the same request context that just
        // authenticated as the facilitator — gives Scenario 4 a real non-team-linked join
        // to diff against instead of just asserting the linked join "succeeded" in
        // isolation.
        const linkedTitle = `E2E Leak Linked Board ${Date.now()}`;
        const linkedRes = await request.post('/api/boards', {
            data: { templateId: 'default', title: linkedTitle, locale: 'es', teamId },
        });
        if (!linkedRes.ok()) {
            throw new Error(`create linked board failed: ${linkedRes.status()} ${await linkedRes.text()}`);
        }
        const { boardId: linkedBoardId } = (await linkedRes.json()) as { boardId: string };

        const unlinkedTitle = `E2E Leak Unlinked Board ${Date.now()}`;
        const unlinkedRes = await request.post('/api/boards', {
            data: { templateId: 'default', title: unlinkedTitle, locale: 'es' },
        });
        if (!unlinkedRes.ok()) {
            throw new Error(`create unlinked board failed: ${unlinkedRes.status()} ${await unlinkedRes.text()}`);
        }
        const { boardId: unlinkedBoardId } = (await unlinkedRes.json()) as { boardId: string };

        // --- Scenario 4 (FR-005, negative): "Anyone" — a genuinely distinct identity
        // that is not a member of Team Alpha, and never was — joins both boards through
        // the same endpoint the join UI itself calls (POST /api/boards/:id/join). ---
        const outsiderEmail = `e2e-board-team-leak-outsider-${Date.now()}@example.com`;
        const outsiderName = 'E2E Board Team Leak Outsider';
        await loginViaApi(request, outsiderEmail, outsiderName);

        const joinLinkedRes = await request.post(`/api/boards/${linkedBoardId}/join`);
        const joinUnlinkedRes = await request.post(`/api/boards/${unlinkedBoardId}/join`);

        // Same status for both — no extra gate, no membership check, no different code
        // path for the team-linked board (contracts/boards-api-delta.md's "Unchanged"
        // section: "join behavior is untouched — teamId plays no role in whether a join
        // succeeds").
        expect(joinLinkedRes.status()).toBe(200);
        expect(joinUnlinkedRes.status()).toBe(joinLinkedRes.status());

        const joinLinkedBody = (await joinLinkedRes.json()) as Record<string, unknown>;
        const joinUnlinkedBody = (await joinUnlinkedRes.json()) as Record<string, unknown>;

        // Identical *shape* (same set of keys) for both responses — the concrete form of
        // "byte-for-byte identical" the contract actually promises. A handful of fields
        // are expected to differ between the two purely because they identify *which*
        // board this is (id/title/createdAt/updatedAt — two distinct boards can never
        // share these) or, for teamId, because per the contract it "mirrors the stored
        // field" (each board's own real association, not a constant). Every other
        // key/value — in particular teamName, and everything describing the join
        // operation's own outcome (active state, creator flag, participant count,
        // template) — must match exactly, proving the team-linked board's join behaved
        // identically to the unlinked one's in every way that isn't just "different
        // board".
        expect(Object.keys(joinLinkedBody).sort()).toEqual(Object.keys(joinUnlinkedBody).sort());
        const boardIdentityKeys = new Set(['id', 'title', 'createdAt', 'updatedAt', 'teamId']);
        for (const key of Object.keys(joinLinkedBody)) {
            if (boardIdentityKeys.has(key)) continue;
            expect(joinLinkedBody[key]).toEqual(joinUnlinkedBody[key]);
        }

        // teamId does mirror each board's stored association — proving the outsider's
        // lack of membership was never even consulted, not that the field was silently
        // dropped.
        expect(joinLinkedBody.teamId).toBe(teamId);
        expect(joinUnlinkedBody.teamId).toBeNull();
        // teamName, unlike on GET /api/boards, is deliberately never resolved on this
        // endpoint regardless of team association (contract: "teamName is always null
        // there — team-name resolution is deliberately scoped to the listBoardsForUser
        // path only") — true for both boards here.
        expect(joinLinkedBody.teamName).toBeNull();
        expect(joinUnlinkedBody.teamName).toBeNull();

        // --- Scenario 5 (FR-011, negative — the most important check in this feature):
        // the same outsider opens the team-linked board's retrospective SESSION view
        // (/retro/{id}, not the dashboard) and the team's identity must not appear
        // anywhere — not in the rendered UI, not in the JSON bodies of the session
        // view's own network calls. ---
        await signInAs(page, outsiderEmail, outsiderName);

        // Registered before navigation (not raced against it) — same rationale as
        // e2e/retrospective-board.spec.ts's collectResponses. These are the session
        // view's own two load-time calls (RetrospectivePage.tsx ->
        // useRetrospectiveRealtimeSync -> backendRetrospectiveClient.ts): the bundled
        // board/cards/columns/participants/groups state
        // (GET /api/retrospectives/:id, serialized by serializeBoardState in
        // server/src/http/routes/retrospectives.ts, which has no teamId/teamName field in
        // its explicit whitelist) and the join call
        // (POST /api/retrospectives/:id/join, serialized by serializeParticipant, same
        // file — id/name/userId/retrospectiveId/joinedAt/photoURL only). Deliberately NOT
        // GET /api/boards — the dashboard's list endpoint — which per the contract (and
        // T025) correctly DOES carry teamName; that's the dashboard-only surface this
        // check must not conflate with the session view. The `$`-anchored patterns
        // exclude the `/api/retrospectives/:id/live` WebSocket-upgrade request, which
        // shares the same URL prefix as the state fetch.
        const stateResponses = collectResponseBodies(page, new RegExp(`/api/retrospectives/${linkedBoardId}$`), 'GET');
        const sessionJoinResponses = collectResponseBodies(page, new RegExp(`/api/retrospectives/${linkedBoardId}/join$`), 'POST');

        await page.goto(`/retro/${linkedBoardId}`);
        await expect(page.getByText(linkedTitle)).toBeVisible({ timeout: 30_000 });

        // UI check — narrow: the team's own name never renders as visible text anywhere
        // on the open session.
        await expect(page.getByText(teamName)).not.toBeVisible();
        // UI check — broad, belt-and-suspenders: scan the entire rendered body text for
        // the team name as a raw substring, in case some surface rendered it in a way a
        // narrower getByText query could miss.
        const bodyText = await page.locator('body').innerText();
        expect(bodyText).not.toContain(teamName);

        // Network check: both load-time calls must have actually fired (otherwise the
        // absence checks below would be vacuously true) before inspecting their bodies.
        await expect.poll(() => stateResponses.responses().length, { timeout: 15_000 }).toBeGreaterThan(0);
        await expect.poll(() => sessionJoinResponses.responses().length, { timeout: 15_000 }).toBeGreaterThan(0);

        for (const res of [...stateResponses.responses(), ...sessionJoinResponses.responses()]) {
            expect(res.ok()).toBeTruthy();
            // Read the raw body once (Playwright Response bodies are safe to read
            // multiple times, but there's no need to) — check both the parsed object's
            // own keys and the raw text, so a `teamId`/`teamName` key nested inside some
            // other object (not just at the top level) would still be caught.
            const rawText = await res.text();
            expect(rawText).not.toContain('teamId');
            expect(rawText).not.toContain('teamName');
            expect(rawText).not.toContain(teamName);
            const body = JSON.parse(rawText) as Record<string, unknown>;
            expect(Object.prototype.hasOwnProperty.call(body, 'teamId')).toBe(false);
            expect(Object.prototype.hasOwnProperty.call(body, 'teamName')).toBe(false);
        }
    });
});
