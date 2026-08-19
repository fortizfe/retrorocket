import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { signInAs } from './fixtures/auth-helpers';

// 054-team-management, T026 — Playwright E2E covering quickstart.md Scenarios 2
// (Owner manages membership, User Story 2) and 4 (ownership transfer and the
// ownerless edge case, FR-013/FR-014).
//
// Written against contracts/teams-api.md ahead of its backend endpoints
// (GET /api/teams/:id, POST /api/teams/:id/members, DELETE
// /api/teams/:id/members/:userId — tasks.md T032) as an intentional RED-state spec;
// those endpoints (and the AddMemberByEmailForm/TeamMemberList UI — T036-T038) are now
// implemented and every test below is verified GREEN against the emulator.
//
// Setup uses the same request-based, bypass-the-UI pattern as
// fixtures/auth-helpers.ts's createBoardViaApi (see board-join.spec.ts /
// dashboard-manage.spec.ts): team creation itself is already covered by User
// Story 1's own coverage, so this spec creates teams directly via
// POST /api/teams and focuses entirely on membership actions.

const OWNER_EMAIL = 'e2e-team-owner@example.com';
const OWNER_NAME = 'E2E Team Owner';
const INVITEE_EMAIL = 'e2e-team-invitee@example.com';
const INVITEE_NAME = 'E2E Team Invitee';

/**
 * Establishes a session for `email` on the given request context without any page
 * navigation — used to ensure a users/{uid} profile doc exists for an identity
 * (research.md item 2: findUserByEmail only matches profiles created by an actual
 * login) ahead of time, mirroring createBoardViaApi's login step.
 *
 * POST /api/auth/test-login alone does NOT create that profile doc — it only mints a
 * session (see FirestoreProfileAdapter / ensureUserProfile). The doc is only written by
 * ensureUserProfile, which the app normally triggers via GET /api/profile on first page
 * load (bootstrapSession). Since this helper drives the API directly with no page load,
 * it must make that GET /api/profile call itself, exactly like
 * retrospective-board.spec.ts's equivalent API-only login does — otherwise
 * findUserByEmail (used by POST /api/teams/:id/members) can never find this identity.
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

/** Creates a team owned by `ownerEmail` via the API alone (POST /api/teams, contracts/teams-api.md). */
async function createTeamViaApi(request: APIRequestContext, ownerEmail: string, ownerName: string, name: string): Promise<string> {
    await loginViaApi(request, ownerEmail, ownerName);
    const res = await request.post('/api/teams', { data: { name } });
    if (!res.ok()) {
        throw new Error(`create team failed: ${res.status()} ${await res.text()}`);
    }
    const body = (await res.json()) as { teamId: string };
    return body.teamId;
}

/** POST /api/teams/:id/members — adds `email` to `teamId` using `page`'s current session. */
async function addMemberViaApi(page: Page, teamId: string, email: string) {
    return page.request.post(`/api/teams/${teamId}/members`, { data: { email } });
}

/** DELETE /api/teams/:id/members/:userId using `page`'s current session. */
async function removeMemberViaApi(page: Page, teamId: string, userId: string) {
    return page.request.delete(`/api/teams/${teamId}/members/${userId}`);
}

/** GET /api/teams/:id using `page`'s current session. */
async function getTeamViaApi(page: Page, teamId: string) {
    return page.request.get(`/api/teams/${teamId}`);
}

test.describe('User Story 2 — Owner manages team membership (quickstart.md Scenario 2)', () => {
    test('owner adds Invitee by exact email and Invitee appears in the roster (AC1)', async ({ page, request }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME); // ensure Invitee's profile doc exists first
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Add Member ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);

        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(addRes.status()).toBe(201);
        const added = (await addRes.json()) as { userId: string; email: string; role: string };
        expect(added.email).toBe(INVITEE_EMAIL);
        expect(added.role).toBe('member');

        const teamRes = await getTeamViaApi(page, teamId);
        expect(teamRes.ok()).toBeTruthy();
        const team = (await teamRes.json()) as { members: Array<{ email: string; role: string }> };
        expect(team.members).toContainEqual(expect.objectContaining({ email: INVITEE_EMAIL, role: 'member' }));
    });

    test('adding the same person again is rejected as a duplicate (AC4, FR-007)', async ({ page, request }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Duplicate Member ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);

        const firstAdd = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(firstAdd.status()).toBe(201);

        const duplicateAdd = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(duplicateAdd.status()).toBe(409);

        const teamRes = await getTeamViaApi(page, teamId);
        const team = (await teamRes.json()) as { members: unknown[] };
        // Exactly Owner + one Invitee row — no duplicate.
        expect(team.members).toHaveLength(2);
    });

    test('looking up an email with no matching account reports not-found and adds no one (AC2, FR-006)', async ({ page, request }) => {
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E No Match ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);

        const res = await addMemberViaApi(page, teamId, `nobody-${Date.now()}@example.com`);
        expect(res.status()).toBe(404);
        const body = (await res.json()) as { error: { code: string } };
        // contracts/teams-api.md: unified `user_not_found` code (not distinguishable
        // from "team missing" by status code alone).
        expect(body.error.code).toBe('user_not_found');

        const teamRes = await getTeamViaApi(page, teamId);
        const team = (await teamRes.json()) as { members: unknown[] };
        expect(team.members).toHaveLength(1); // just the owner
    });

    test('a non-owner member cannot add or remove members (AC5, FR-008)', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Non Owner Denied ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(addRes.status()).toBe(201);

        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        const deniedAdd = await addMemberViaApi(inviteePage, teamId, `someone-else-${Date.now()}@example.com`);
        expect(deniedAdd.status()).toBe(403);

        // Invitee (non-owner) attempting to remove the owner — someone other than
        // themself — is forbidden (FR-008). Uses the owner's uid, resolved via the
        // team detail response rather than assumed.
        const teamState = (await (await getTeamViaApi(page, teamId)).json()) as { ownerId: string };
        const deniedRemove = await removeMemberViaApi(inviteePage, teamId, teamState.ownerId);
        expect(deniedRemove.status()).toBe(403);

        await inviteeContext.close();
    });

    test('owner removes Invitee from the roster (AC3, FR-005)', async ({ page, request }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Owner Removes ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        const invitee = (await addRes.json()) as { userId: string };

        const removeRes = await removeMemberViaApi(page, teamId, invitee.userId);
        expect(removeRes.status()).toBe(204);

        const teamRes = await getTeamViaApi(page, teamId);
        const team = (await teamRes.json()) as { members: Array<{ userId: string }> };
        expect(team.members.map((m) => m.userId)).not.toContain(invitee.userId);
    });

    test('Invitee, once re-added, leaves the team voluntarily without Owner action (AC6, FR-012)', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Voluntary Leave ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        const invitee = (await addRes.json()) as { userId: string };

        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        const leaveRes = await removeMemberViaApi(inviteePage, teamId, invitee.userId);
        expect(leaveRes.status()).toBe(204);

        const teamRes = await getTeamViaApi(page, teamId);
        const team = (await teamRes.json()) as { members: Array<{ userId: string }> };
        expect(team.members.map((m) => m.userId)).not.toContain(invitee.userId);

        await inviteeContext.close();
    });
});

test.describe('User Story 2 — Ownership transfer and the ownerless edge case (quickstart.md Scenario 4, FR-013/FR-014)', () => {
    test('owner leaving a team with Invitee still in it transfers ownership to Invitee (FR-013)', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Ownership Transfer ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        const invitee = (await addRes.json()) as { userId: string };

        const teamBefore = (await (await getTeamViaApi(page, teamId)).json()) as { ownerId: string };
        const ownerUid = teamBefore.ownerId;

        // Owner leaves via DELETE .../members/:userId with userId === self (case 3,
        // contracts/teams-api.md) — another member (Invitee) remains, so this is a
        // 204 with ownership silently transferred server-side.
        const leaveRes = await removeMemberViaApi(page, teamId, ownerUid);
        expect(leaveRes.status()).toBe(204);

        // `page` (the original Owner) just left the team, so it is no longer a current
        // member — GetTeamWithMembers.ts's "caller must be a current member" rule
        // (contracts/teams-api.md) means a GET on `page`'s own session would now 403
        // rather than return the team it just transferred away. Read the post-transfer
        // state through the new owner's own session instead, same pattern used by the
        // "voluntary leave" test above and the "team emptied" test below.
        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        const teamAfter = (await (await getTeamViaApi(inviteePage, teamId)).json()) as {
            ownerId: string;
            members: Array<{ userId: string; role: string }>;
        };
        expect(teamAfter.ownerId).toBe(invitee.userId);
        expect(teamAfter.members.map((m) => m.userId)).not.toContain(ownerUid);
        expect(teamAfter.members).toContainEqual(expect.objectContaining({ userId: invitee.userId, role: 'owner' }));

        await inviteeContext.close();
    });

    test('the new owner, now sole member, leaves and the team shows as emptied (FR-014, FR-015)', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Team Emptied ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        const invitee = (await addRes.json()) as { userId: string };
        const ownerUid = ((await (await getTeamViaApi(page, teamId)).json()) as { ownerId: string }).ownerId;

        // Original owner leaves — Invitee becomes the sole remaining member and new owner.
        const transferRes = await removeMemberViaApi(page, teamId, ownerUid);
        expect(transferRes.status()).toBe(204);

        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        // New owner (Invitee) leaves while being the team's only remaining member —
        // contracts/teams-api.md: 200 { teamEmptied: true }, distinct from the
        // ordinary 204, so the client can navigate away from a now-inert team.
        const emptyRes = await removeMemberViaApi(inviteePage, teamId, invitee.userId);
        expect(emptyRes.status()).toBe(200);
        const body = (await emptyRes.json()) as { teamEmptied: boolean };
        expect(body.teamEmptied).toBe(true);

        // The team document itself still exists (FR-015 — no deletion in this
        // iteration); it is not gone (not a 404). But by this point in the test
        // BOTH accounts that ever touched this team (original Owner via `page`,
        // then Invitee-turned-owner via `inviteePage`) have left it, so there is
        // no session left with an active membership on this now-ownerless team.
        // GetTeamWithMembers.ts enforces "caller must be a current member" for
        // GET /api/teams/:id (contracts/teams-api.md), so a former member —
        // even the one who just emptied it — correctly gets 403, not a body with
        // an empty members array. A 403 (not a 404) is exactly the proof FR-014/
        // FR-015 call for: the team persists and is frozen, but nobody can act on
        // it anymore.
        const teamAfter = await getTeamViaApi(page, teamId);
        expect(teamAfter.status()).toBe(403);
        const teamAfterBody = (await teamAfter.json()) as { error: { code: string } };
        expect(teamAfterBody.error.code).toBe('forbidden');

        await inviteeContext.close();
    });
});

// 054-team-management, T043 — Playwright E2E covering quickstart.md Scenario 3
// (View roster and personal teams overview, User Story 3). Unlike the User Story 2
// tests above (which bypass the UI and drive the API directly, since they're about
// membership-action outcomes), this scenario is specifically about what the UI shows —
// or, per FR-008/tasks.md Phase 5's Goal, deliberately does NOT show — to a non-owner
// member, plus the /teams empty state. So this spec drives real pages via `page.goto`
// and Playwright locators (mirroring e2e/dashboard-list.spec.ts's UI-driving
// conventions: text/role/label locators scoped to a row via
// `page.locator('li', { has: page.getByText(...) })`, no bespoke data-testids), while
// still using the API-only setup helpers above (createTeamViaApi/addMemberViaApi) to
// avoid re-driving the team-creation/add-member UI flows, which are User Story 1/2's
// own coverage.
//
// Text assertions are in Spanish (the emulator/e2e default locale, matching
// signInAs's own 'Nuevo Tablero'/'Siguiente' usage elsewhere and this file's
// src/locales/es.json `teams.*` keys) rather than raw i18n keys, since this drives the
// real rendered app, not a mocked-i18n component test.
test.describe('User Story 3 — View team roster and personal teams overview (quickstart.md Scenario 3)', () => {
    test('a non-owner member sees the roster read-only on the team detail screen, with only their own "leave" control', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME); // ensure Invitee's profile doc exists
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, `E2E Roster ReadOnly ${Date.now()}`);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(addRes.status()).toBe(201);

        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        await inviteePage.goto(`/teams/${teamId}`);

        // Scoped to the roster itself (TeamMemberList's `aria-label`, es.json
        // `teams.members.listLabel`) — the signed-in Invitee's own display name also
        // appears in the app header/account control, so an unscoped `getByText` hits a
        // Playwright strict-mode violation (two matches) rather than the roster row.
        const roster = inviteePage.getByRole('list', { name: 'Miembros del equipo' });

        // Full roster still visible read-only, including the owner (AC1).
        await expect(roster.getByText(OWNER_NAME)).toBeVisible();
        await expect(roster.getByText(INVITEE_NAME)).toBeVisible();

        // No add-member form (owner-only, FR-008) — its email field is the clearest
        // signal the whole AddMemberByEmailForm/section isn't mounted.
        await expect(inviteePage.getByLabel('Correo electrónico')).toHaveCount(0);
        await expect(inviteePage.getByText('Añadir miembro')).toHaveCount(0);

        // No "remove" control on the owner's (an OTHER member's) row.
        await expect(inviteePage.getByLabel(`Eliminar a ${OWNER_NAME} del equipo`)).toHaveCount(0);

        // But the Invitee's own row still has a "leave" control (FR-012).
        await expect(roster.getByLabel('Abandonar este equipo')).toBeVisible();

        await inviteeContext.close();
    });

    test('that same member sees the team on their own /teams overview with the "member" role badge (AC2)', async ({ page, request, browser }) => {
        await loginViaApi(request, INVITEE_EMAIL, INVITEE_NAME);
        const teamName = `E2E Overview Member Badge ${Date.now()}`;
        const teamId = await createTeamViaApi(request, OWNER_EMAIL, OWNER_NAME, teamName);
        await signInAs(page, OWNER_EMAIL, OWNER_NAME);
        const addRes = await addMemberViaApi(page, teamId, INVITEE_EMAIL);
        expect(addRes.status()).toBe(201);

        const inviteeContext = await browser.newContext();
        const inviteePage = await inviteeContext.newPage();
        await signInAs(inviteePage, INVITEE_EMAIL, INVITEE_NAME);

        await inviteePage.goto('/teams');

        const row = inviteePage.locator('li', { has: inviteePage.getByText(teamName, { exact: true }) });
        await expect(row).toBeVisible();
        await expect(row.getByText('Miembro', { exact: true })).toBeVisible();
        await expect(row.getByText('Propietario', { exact: true })).toHaveCount(0);

        await inviteeContext.close();
    });

    test('a brand-new account with zero team memberships sees the explicit empty state on /teams (AC3)', async ({ browser }) => {
        // A freshly minted identity (never added to any team by this or any other
        // test) — the emulator/test-login setup gives it a real profile doc but no
        // team-membership docs at all, so this is a genuine zero-teams case rather
        // than an assumption about shared-account state.
        const freshEmail = `e2e-team-empty-${Date.now()}@example.com`;
        const freshName = 'E2E Fresh No Teams';

        const context = await browser.newContext();
        const freshPage = await context.newPage();
        await signInAs(freshPage, freshEmail, freshName);

        await freshPage.goto('/teams');

        await expect(freshPage.getByText('Todavía no perteneces a ningún equipo.')).toBeVisible();
        await expect(freshPage.getByRole('listitem')).toHaveCount(0);

        await context.close();
    });
});
