import { test, expect, type Page } from '@playwright/test';
import { signInWithGoogle, signInAs, TEST_USER_DISPLAY_NAME, TEST_USER_EMAIL } from './fixtures/auth-helpers';
import { getDisplayNameInput } from './fixtures/profile';

/**
 * "Mi Perfil" critical flow (feature 018): view profile (incl. first-sign-in creation),
 * update display name, sign out, and linked-providers/connected-apps regression — all
 * backend-mediated via /api/profile (FR-001). Zero-direct-Firestore access for this
 * screen is verified statically and deterministically by
 * src/test/architecture/profile-no-firestore.test.ts; this spec additionally asserts it
 * dynamically (no request to a Firebase endpoint while Mi Perfil is in use) and focuses
 * on functional correctness, which E2E is better suited to verify.
 */

// This E2E suite runs the real app against the local Firebase Emulator Suite
// (playwright.config.ts). Historically the frontend's Firestore client SDK was wired to
// localhost:8080 (connectFirestoreEmulator), so a browser-side Firestore call would show
// up as a request to that port rather than firestore.googleapis.com (production). As of
// 021 (research.md §3/§4), src/lib/services/firebase.ts no longer initializes a Firestore
// client at all — this pattern is kept broad (both hosts) as a standing regression guard
// in case one is ever reintroduced.
const FIRESTORE_HOST_PATTERN = /firestore\.googleapis\.com|localhost:8080/;

/** Collects request URLs matching a direct browser-to-Firestore call. */
function trackFirestoreRequests(page: Page): string[] {
    const hits: string[] = [];
    page.on('request', (req) => {
        if (FIRESTORE_HOST_PATTERN.test(req.url())) hits.push(req.url());
    });
    return hits;
}

// ─── User Story 1: view profile ────────────────────────────────────────────────

test('an existing user sees their correct profile fields, with zero direct Firebase calls', async ({ page, context }) => {
    const firestoreHits = trackFirestoreRequests(page);
    await signInWithGoogle(page, context);

    await page.goto('/perfil');
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();
    await expect(page.getByText(TEST_USER_DISPLAY_NAME).first()).toBeVisible();
    // .first() (050-profile-redesign T013): Direction B's Identity section shows the
    // read-only email as its own visible text row (data-model.md's parity requirement),
    // which may coexist with UserProfileForm's own (non-text, input-value) rendering of
    // the same email — .first() keeps this resilient to either structure without
    // weakening the visibility assertion itself.
    await expect(page.getByText(TEST_USER_EMAIL).first()).toBeVisible();
    await expect(page.getByText('Miembro desde')).toBeVisible();

    // 021, research.md §4: bootstrapSession() no longer calls signInWithCustomToken at
    // all — nothing on this screen should reach Firebase, full stop.
    expect(firestoreHits).toEqual([]);
});

test('a brand-new user sees a correctly-defaulted profile on first load', async ({ page }) => {
    const email = `e2e-profile-new-${Date.now()}@example.com`;
    const displayName = 'E2E Profile New User';
    await signInAs(page, email, displayName);

    await page.goto('/perfil');
    await expect(page.getByText(displayName).first()).toBeVisible();
    // .first() (050-profile-redesign T013) — see the matching comment above.
    await expect(page.getByText(email).first()).toBeVisible();
    await expect(page.getByText('Google').first()).toBeVisible(); // primaryProvider, test-login always uses google
});

test('a failed profile load shows a visible error, not a blank page or crash', async ({ page }) => {
    // Bootstrap fetches the profile once, at app load — intercept before signing in so
    // the very first GET /api/profile (during sign-in's redirect-triggered reload) fails.
    // Not using the signInWithGoogle/signInAs fixtures here: both wait for the display
    // name to appear, which never happens when the profile load itself fails.
    await page.route('**/api/profile', (route) => route.abort('failed'));
    const email = `e2e-profile-load-fail-${Date.now()}@example.com`;
    const res = await page.request.post('/api/auth/test-login', { data: { email, displayName: 'Load Fail User' } });
    expect(res.ok()).toBeTruthy();
    await page.goto('/');

    await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 30_000 });
});

// ─── User Story 2: update display name ─────────────────────────────────────────

// 040, US1/FR-003: this test's rename-then-immediate-reload sequence happens well
// within the profile lookup's 60-second per-instance cache TTL added by this feature
// (FirestoreProfileAdapter.ensureProfile()). It is the authoritative regression guard
// for FR-003's "still reflecting explicit profile updates promptly" requirement — a
// stale cache hit surviving updateDisplayName()'s invalidation would make this test
// see the pre-rename name after reload instead of newName.
test('editing the display name persists after reload, via the backend only', async ({ page }) => {
    // A dedicated, unique identity (not the shared TEST_USER_EMAIL account): this test
    // permanently renames whoever it signs in as, and that account is reused by every
    // other spec in this suite's single shared emulator run (playwright.config.ts).
    const email = `e2e-profile-rename-${Date.now()}@example.com`;
    await signInAs(page, email, 'E2E Rename Target');
    const firestoreHits = trackFirestoreRequests(page);
    await page.goto('/perfil');

    const newName = `E2E Renamed ${Date.now()}`;
    const nameInput = await getDisplayNameInput(page);
    await nameInput.fill(newName);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Nombre actualizado exitosamente')).toBeVisible({ timeout: 30_000 });

    await page.reload();
    await expect(page.getByText(newName).first()).toBeVisible();

    expect(firestoreHits).toEqual([]);
});

test('submitting a blank display name makes no network call', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    let patchFired = false;
    await page.route('**/api/profile', (route) => {
        if (route.request().method() === 'PATCH') patchFired = true;
        return route.continue();
    });

    const nameInput = await getDisplayNameInput(page);
    await nameInput.fill('   ');
    // The Save button is disabled while the trimmed value is empty (UserProfileForm.tsx) —
    // clicking it (if even possible) must not fire a request.
    await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
    expect(patchFired).toBe(false);
});

test('a failed display-name save leaves the prior name displayed with a visible error', async ({ page }) => {
    // Uses its own identity so an unexpectedly-succeeding save (bug) would not pollute
    // the shared TEST_USER_EMAIL account's name for later tests.
    const email = `e2e-profile-rename-fail-${Date.now()}@example.com`;
    const displayName = 'E2E Rename Fail Target';
    await signInAs(page, email, displayName);
    await page.goto('/perfil');

    await page.route('**/api/profile', (route) => {
        if (route.request().method() === 'PATCH') return route.abort('failed');
        return route.continue();
    });

    const nameInput = await getDisplayNameInput(page);
    await nameInput.fill('Should Not Persist');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText(/error/i).first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(displayName).first()).toBeVisible();
});

// ─── User Story 3: sign out ─────────────────────────────────────────────────────

test('signing out returns to a signed-out state and rejects a subsequent GET /api/profile with 401', async ({ page, context }) => {
    const firestoreHits = trackFirestoreRequests(page);
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
    await expect(page.getByText('Continuar con Google', { exact: true })).toBeVisible({ timeout: 10_000 });

    const res = await page.request.get('/api/profile');
    expect(res.status()).toBe(401);

    expect(firestoreHits).toEqual([]);
});

test('a failed sign-out shows a clear error, with no ambiguous half-signed-out state', async ({ page, context }) => {
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    await page.route('**/api/auth/logout', (route) => route.abort('failed'));
    await page.getByRole('button', { name: 'Cerrar Sesión' }).click();

    // react-hot-toast renders every toast (success and error alike) with role="status" —
    // only the failure path fires here, so its appearance is the visible-error signal
    // (no production change to this pre-existing catch/toast per research.md §5's
    // "no production code changes" call for User Story 3).
    await expect(page.locator('[role="status"]').first()).toBeVisible({ timeout: 30_000 });
    // Still recognizably signed in — the failed logout did not leave an ambiguous state.
    await expect(page.getByText(TEST_USER_DISPLAY_NAME).first()).toBeVisible();
});

// ─── User Story 4: linked providers / connected AI assistants (regression) ─────

/**
 * Updated per 050-profile-redesign T027, ahead of the T029 rebuild of
 * `LinkedProvidersCard.tsx` (per `ProfileDirectionB.tsx`'s `ProviderRow` — the
 * selected direction's build reference).
 *
 * The section heading assertion ('Métodos de Inicio de Sesión') is dropped in favor
 * of asserting the provider names themselves are visible: provider names are
 * rendered literally ("Google"/"GitHub"), not translated, in both the current
 * `LinkedProvidersCard.tsx` and `ProfileDirectionB.tsx` — durable across the
 * redesign, whereas the section's own heading copy is not (it's currently
 * hardcoded Spanish outside i18next at all — a gap tasks.md T005/data-model.md
 * flags — so T029 is expected to introduce a translation key here, which would
 * likely change or relocate this exact heading text; asserting on the provider
 * names verifies the same underlying fact — "the linked-providers section
 * rendered" — without depending on copy that's about to be authored for the
 * first time).
 *
 * Updated again per T029's actual rebuild: `LinkedProvidersCard.tsx` now sources this
 * section's copy through i18next (`linkedProviders.*`, es.json), as flagged above as
 * likely. The linked-status caption text changed from the old hardcoded
 * 'Vinculado y activo' to `linkedProviders.statusLinked` = 'Vinculado' (dropping
 * "y activo" — the caption's own row already conveys "this is a linked provider" via
 * its position/check icon, so the status text itself only needs to name the state, per
 * data-model.md's "explicit status text, never color-only" requirement, not restate
 * it twice). 'Vincular' (`linkedProviders.linkAction`) is unchanged — it's the same
 * literal string the pre-rebuild component already used, carried forward verbatim.
 */
test('linked providers reflect the account and the connected-apps section renders, with no new Firebase calls', async ({ page, context }) => {
    const firestoreHits = trackFirestoreRequests(page);
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    await expect(page.getByText('Google').first()).toBeVisible();
    await expect(page.getByText('GitHub').first()).toBeVisible();
    // Apple (spec 050 T029): previously entirely absent from the UI — now rendered as
    // its own not-yet-available row (data-model.md's Linked Provider Row, FR-005).
    await expect(page.getByText('Apple').first()).toBeVisible();

    await expect(page.getByText('Vinculado').first()).toBeVisible();
    // GitHub is the only provider the test account hasn't linked — its "Vincular" button
    // is a full-page redirect to /api/auth/link/github (research.md §6, not re-tested
    // end-to-end here since it requires a real provider consent screen). Scoped to
    // GitHub's own row (050 T029): Apple's not-yet-available row also renders a
    // (disabled) "Vincular" button — ProfileDirectionB.tsx's ProviderRow reuses the same
    // link-action label for both the linkable and unavailable states, by design (the
    // *disabled* attribute + its description communicate "not yet available", not a
    // different label) — so an unscoped role query now matches two elements.
    const githubRow = page.getByRole('listitem').filter({ hasText: 'GitHub' });
    await expect(githubRow.getByRole('button', { name: 'Vincular' })).toBeVisible();
    await expect(githubRow.getByRole('button', { name: 'Vincular' })).toBeEnabled();

    // ConnectedAppsCard (feature 015) already sources this heading from i18next
    // (`mcpConnector.connectedApps.title`), a key `ProfileDirectionB.tsx` reuses
    // verbatim — durable across the T030 rebuild, unlike LinkedProvidersCard's
    // currently-untranslated copy above. Connect/revoke's own full flow is covered by
    // mcp-connector.spec.ts; this only confirms the section still renders with no
    // regression now that userProfile is backend-sourced.
    await expect(page.getByText('Asistentes de IA conectados')).toBeVisible();

    expect(firestoreHits).toEqual([]);
});
