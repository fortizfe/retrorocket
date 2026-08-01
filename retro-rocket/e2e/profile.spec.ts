import { test, expect, type Page } from '@playwright/test';
import { signInWithGoogle, signInAs, TEST_USER_DISPLAY_NAME, TEST_USER_EMAIL } from './fixtures/auth-helpers';

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
    await expect(page.getByText(TEST_USER_EMAIL)).toBeVisible();
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
    await expect(page.getByText(email)).toBeVisible();
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

test('editing the display name persists after reload, via the backend only', async ({ page }) => {
    // A dedicated, unique identity (not the shared TEST_USER_EMAIL account): this test
    // permanently renames whoever it signs in as, and that account is reused by every
    // other spec in this suite's single shared emulator run (playwright.config.ts).
    const email = `e2e-profile-rename-${Date.now()}@example.com`;
    await signInAs(page, email, 'E2E Rename Target');
    const firestoreHits = trackFirestoreRequests(page);
    await page.goto('/perfil');

    const newName = `E2E Renamed ${Date.now()}`;
    const nameInput = page.getByLabel('Nombre a mostrar', { exact: false });
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

    const nameInput = page.getByLabel('Nombre a mostrar', { exact: false });
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

    const nameInput = page.getByLabel('Nombre a mostrar', { exact: false });
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

test('linked providers reflect the account and the connected-apps section renders, with no new Firebase calls', async ({ page, context }) => {
    const firestoreHits = trackFirestoreRequests(page);
    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    await expect(page.getByText('Métodos de Inicio de Sesión')).toBeVisible();
    await expect(page.getByText('Vinculado y activo').first()).toBeVisible();
    // GitHub is the only provider the test account hasn't linked — its "Vincular" button
    // is a full-page redirect to /api/auth/link/github (research.md §6, not re-tested
    // end-to-end here since it requires a real provider consent screen).
    await expect(page.getByRole('button', { name: 'Vincular' })).toBeVisible();

    // ConnectedAppsCard (feature 015) — connect/revoke's own full flow is covered by
    // mcp-connector.spec.ts; this only confirms the section still renders with no
    // regression now that userProfile is backend-sourced.
    await expect(page.getByText('Asistentes de IA conectados')).toBeVisible();

    expect(firestoreHits).toEqual([]);
});
