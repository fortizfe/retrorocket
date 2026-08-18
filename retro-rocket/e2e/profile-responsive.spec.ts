import { test, expect, type Page } from '@playwright/test';
import { signInWithGoogle, TEST_USER_DISPLAY_NAME, TEST_USER_EMAIL } from './fixtures/auth-helpers';
import { expectNoHorizontalOverflow } from './fixtures/board';

/**
 * Responsive-layout checks for the rebuilt Mi Perfil (spec 050-profile-redesign, T035,
 * FR-014, spec.md's User Story 4 edge case "very small (narrow mobile) and very large
 * (ultra-wide desktop) viewports"). Mirrors `board-responsive.spec.ts`'s established
 * pattern — same `expectNoHorizontalOverflow` helper, same "sign in at the default
 * viewport, resize afterward" sequencing for the narrow case (the shared
 * `signInWithGoogle()` fixture waits for a header element the app hides below the `md`
 * breakpoint, per that spec file's own comment).
 *
 * Every capability from User Stories 1-3 (identity display, linked providers, connected
 * AI assistants, account-action placeholders, sign-out) must remain visible and usable at
 * both extremes, not just present in the DOM — these assertions check visibility, not
 * merely existence.
 */

const NARROW_MOBILE_VIEWPORT = { width: 375, height: 812 };
const ULTRA_WIDE_VIEWPORT = { width: 2560, height: 1440 };

/**
 * Asserts every capability surfaced by Mi Perfil's User Stories 1-3 is visible.
 *
 * Scoped to `[data-testid="profile-content"]` (Profile.tsx's own root), not the bare
 * `page` — the app Header renders the same display name in its own user-menu trigger
 * (`hidden md:block` below the `md` breakpoint), so an unscoped `getByText(...).first()`
 * at the narrow mobile viewport resolves to that *hidden* Header span (first in DOM
 * order) instead of Mi Perfil's own visible one, failing a visibility assertion that
 * should actually pass.
 */
async function expectFullProfileVisible(page: Page): Promise<void> {
    const profile = page.getByTestId('profile-content');

    // US1 — identity: avatar/fallback, display name, read-only email, primary provider,
    // member-since date.
    await expect(page.getByRole('heading', { name: 'Mi Perfil' })).toBeVisible();
    await expect(profile.getByText(TEST_USER_DISPLAY_NAME).first()).toBeVisible();
    await expect(profile.getByText(TEST_USER_EMAIL).first()).toBeVisible();
    await expect(profile.getByText('Miembro desde')).toBeVisible();

    // US2 — the display-name edit affordance (Direction B gates the field behind a
    // persistent "Editar" control on Mi Perfil).
    await expect(profile.getByRole('button', { name: 'Editar' })).toBeVisible();

    // US3 — sign-out, linked providers (including the not-yet-available Apple row), and
    // connected AI assistants.
    await expect(profile.getByRole('button', { name: 'Cerrar Sesión' })).toBeVisible();
    await expect(profile.getByText('Google').first()).toBeVisible();
    await expect(profile.getByText('GitHub').first()).toBeVisible();
    await expect(profile.getByText('Apple').first()).toBeVisible();
    await expect(profile.getByText('Asistentes de IA conectados')).toBeVisible();

    // US3 — the corrected disabled account-action placeholders (FR-007) remain visible,
    // not clipped or pushed off-screen at either extreme.
    await expect(profile.getByRole('button', { name: 'Exportar Datos', exact: true })).toBeVisible();
    await expect(profile.getByRole('button', { name: 'Eliminar Cuenta', exact: true })).toBeVisible();
}

test('Mi Perfil remains fully usable, with no horizontal overflow, on a narrow mobile viewport', async ({ browser }) => {
    // Sign in at the default viewport first (signInWithGoogle's own constraint — see the
    // file-level comment), then resize down to the real narrow-phone width.
    const context = await browser.newContext();
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    await page.setViewportSize(NARROW_MOBILE_VIEWPORT);
    await page.goto('/perfil');

    await expectFullProfileVisible(page);
    // Let the identity/section entrance motion (opacity+y, ~0.24s) finish settling before
    // measuring overflow — same precedent as e2e/fixtures/landing-capture.ts's
    // "let entrance motion settle" wait. Without it, this check can catch a mid-transition
    // frame and intermittently read a few px of transient overflow (observed ~1/5 runs)
    // that isn't present once the animation completes — a test-timing flake, not a layout
    // bug (the real, deterministic 71px structural overflow this same check caught earlier
    // — a missing base `grid-cols-1` on Profile.tsx's identity/access-security grid — is
    // fixed and reproduces 0/5).
    await page.waitForTimeout(400);
    await expectNoHorizontalOverflow(page.locator('body'));

    await context.close();
});

test('Mi Perfil remains fully usable, with no horizontal overflow, on an ultra-wide desktop viewport', async ({ browser }) => {
    const context = await browser.newContext({ viewport: ULTRA_WIDE_VIEWPORT });
    const page = await context.newPage();

    await signInWithGoogle(page, context);
    await page.goto('/perfil');

    await expectFullProfileVisible(page);
    // Let the identity/section entrance motion (opacity+y, ~0.24s) finish settling before
    // measuring overflow — same precedent as e2e/fixtures/landing-capture.ts's
    // "let entrance motion settle" wait. Without it, this check can catch a mid-transition
    // frame and intermittently read a few px of transient overflow (observed ~1/5 runs)
    // that isn't present once the animation completes — a test-timing flake, not a layout
    // bug (the real, deterministic 71px structural overflow this same check caught earlier
    // — a missing base `grid-cols-1` on Profile.tsx's identity/access-security grid — is
    // fixed and reproduces 0/5).
    await page.waitForTimeout(400);
    await expectNoHorizontalOverflow(page.locator('body'));

    await context.close();
});
