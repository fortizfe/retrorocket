import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Profile from '@/pages/Profile';
import type { UserProfile } from '@/features/auth/types/user';

/**
 * Page-level test for Mi Perfil (spec 050-profile-redesign, tasks.md T012,
 * User Story 1 — "View My Profile"). No such test existed before this
 * feature: prior coverage was component-level only (UserProfileForm.test.tsx,
 * LinkedProvidersCard.test.tsx, ConnectedAppsCard.test.tsx), never asserting
 * on Profile.tsx's own identity header, read-only fields, or its handling of
 * the profile-data fetch's loading/error states (data-model.md's
 * `Profile View State` entity; FR-002, FR-010).
 *
 * Written BEFORE the T014-T017 rebuild (constitution Principle I, TDD). At
 * the time this file was written, `Profile.tsx` still has its pre-redesign
 * structure and does not yet branch on a missing/errored profile at all, so
 * several assertions below are EXPECTED TO FAIL until T014-T017 land — see
 * the per-`it` comments for which ones and why. Assertions favor semantic
 * queries (role, accessible text, rendered values) over CSS-class/structure
 * selectors so they keep holding across the Direction B rebuild
 * (retro-rocket/src/pages/__prototypes__/ProfileDirectionB.tsx, kept as the
 * build reference for T014-T017).
 */

// Subcomponents whose own behavior has (or will have, per tasks.md T018-T032)
// dedicated test files of their own — stubbed here so this page-level test
// stays scoped to what Profile.tsx itself owns (its identity header, the
// read-only email/provider/member-since fields, and the loading/error
// states for the profile fetch), not their internals.
vi.mock('@/features/auth/components/AuthWrapper', () => ({
    default: ({ children }: any) => <div data-testid="auth-wrapper">{children}</div>,
}));
vi.mock('@/features/auth/components/UserProfileForm', () => ({
    default: () => <div data-testid="user-profile-form-stub" />,
}));
vi.mock('@/features/auth/components/LinkedProvidersCard', () => ({
    default: () => <div data-testid="linked-providers-card-stub" />,
}));
vi.mock('@/features/auth/components/ConnectedAppsCard', () => ({
    default: () => <div data-testid="connected-apps-card-stub" />,
}));

// Mutable per-test state for the mocked context — mirrors the pattern
// Landing.test.tsx uses (factories are hoisted/module-scoped, so only
// "mock"-prefixed bindings may be referenced inside vi.mock).
let mockUserProfile: UserProfile | null = null;
let mockError: string | null = null;

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({
        userProfile: mockUserProfile,
        user: mockUserProfile ? { uid: mockUserProfile.uid, email: mockUserProfile.email } : null,
        error: mockError,
        loading: false,
        isAuthenticated: true,
        updateDisplayName: vi.fn().mockResolvedValue(undefined),
        signOut: vi.fn().mockResolvedValue(undefined),
        refreshUserProfile: vi.fn().mockResolvedValue(undefined),
        signInWithGoogle: vi.fn(),
        signInWithGithub: vi.fn(),
    }),
    useAuthContext: () => ({
        loading: false,
        error: mockError,
        isAuthenticated: true,
        signInWithGoogle: vi.fn(),
        signInWithGithub: vi.fn(),
        signOut: vi.fn(),
    }),
}));

const baseProfile: UserProfile = {
    uid: 'user-1',
    email: 'ada.lovelace@example.com',
    displayName: 'Ada Lovelace',
    photoURL: null,
    providers: ['google'],
    primaryProvider: 'google',
    joinedBoards: [],
    createdAt: new Date(2023, 0, 15),
    updatedAt: new Date(2023, 0, 15),
};

/**
 * Finds `value` anywhere on the page — as plain text content, or as a form
 * control's current value. The rebuild may render a read-only field (e.g.
 * email) as plain text (current Profile.tsx, ProfileDirectionB's Identity
 * section) or inside a disabled input (UserProfileForm) — this holds either
 * way, so the assertion doesn't have to be rewritten once the structure
 * changes.
 */
function findValueOnPage(container: HTMLElement, value: string): boolean {
    if (container.textContent?.includes(value)) return true;
    return Array.from(container.querySelectorAll('input, textarea')).some(
        (el) => (el as HTMLInputElement).value === value,
    );
}

beforeEach(() => {
    mockUserProfile = baseProfile;
    mockError = null;
});

describe('Profile page — identity display (spec 050 US1, FR-002)', () => {
    it('renders the display name from userProfile', () => {
        const { container } = render(<Profile />);
        expect(findValueOnPage(container, baseProfile.displayName)).toBe(true);
    });

    it('renders the read-only email from userProfile', () => {
        const { container } = render(<Profile />);
        expect(findValueOnPage(container, baseProfile.email)).toBe(true);
    });

    it('renders the primary provider badge', () => {
        render(<Profile />);
        // Provider names are rendered literally ("Google"/"GitHub"/"Apple"), never
        // through i18next — both current Profile.tsx's getProviderName() and
        // ProfileDirectionB's PROVIDER_LABELS agree on this, so the literal text is
        // stable across the rebuild.
        expect(screen.getAllByText('Google').length).toBeGreaterThan(0);
    });

    it('renders the member-since date, formatted', () => {
        const { container } = render(<Profile />);
        // Computed independently of Profile.tsx's own formatting code (rather than
        // importing/duplicating it) so this assertion doesn't just restate the
        // implementation. Current Profile.tsx hardcodes the 'es-ES' locale (a known
        // bug fixed by T015); react-i18next is globally mocked to language 'es'
        // (src/test/setup.ts) and both locales format this date identically, so this
        // passes both before and after the T015 locale fix.
        const expected = new Intl.DateTimeFormat('es', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        }).format(baseProfile.createdAt);
        expect(findValueOnPage(container, expected)).toBe(true);
    });

    it('renders the avatar image when photoURL is present', () => {
        const photoURL = 'https://example.com/avatar.png';
        mockUserProfile = { ...baseProfile, photoURL };
        render(<Profile />);

        const images = screen.getAllByRole('img');
        expect(images.some((img) => img.getAttribute('src') === photoURL)).toBe(true);
    });

    // EXPECTED TO FAIL against the pre-rebuild Profile.tsx: it renders no avatar
    // element at all when photoURL is absent (no <img>, no fallback) — the gap
    // FR-002's "with an appropriate fallback when absent" closes. ProfileDirectionB's
    // Avatar component (the build reference) renders a role="img" initials fallback
    // in this case, which is the bar T014 needs to hit.
    it('renders a fallback avatar (not a blank/broken image) when photoURL is absent', () => {
        mockUserProfile = { ...baseProfile, photoURL: null };
        render(<Profile />);

        expect(screen.getByRole('img')).toBeInTheDocument();
    });
});

describe('Profile page — Profile View State (spec 050 data-model.md, FR-010)', () => {
    // EXPECTED TO FAIL against the pre-rebuild Profile.tsx: today it doesn't branch
    // on a null userProfile at all — it renders the full page shell with blank
    // fields instead of an explicit loading state. ProfileDirectionB (the build
    // reference) treats `!userProfile` as loading and renders
    // `<Loading text={t('common.loading')} />`, which is the bar T016 needs to hit.
    it('shows a loading state while the profile is still being fetched, not blank fields', () => {
        mockUserProfile = null;
        mockError = null;
        render(<Profile />);

        expect(screen.getByText('common.loading')).toBeInTheDocument();
        expect(screen.queryByText(baseProfile.displayName)).not.toBeInTheDocument();
    });

    // EXPECTED TO FAIL against the pre-rebuild Profile.tsx: there is no error
    // handling in Profile.tsx today (a failed profile fetch is only ever surfaced
    // globally, via UserContext's toast + redirect-to-signed-out, before Profile.tsx
    // ever mounts with this combination of props). data-model.md's `Profile View
    // State.error` variant requires a visible, non-silent error be shown for the
    // profile-data region itself; role="alert" is this codebase's established
    // pattern for that (Dashboard.tsx's loadError block, RetrospectivePage.tsx),
    // which is the bar T016 needs to hit.
    it('shows a clear, visible error state — not a blank page — when the profile load fails', () => {
        mockUserProfile = null;
        mockError = 'network down';
        render(<Profile />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
    });
});

describe('Profile page — Account Action Placeholders (spec 050 US3, data-model.md Account Action Placeholder, FR-007)', () => {
    // EXPECTED TO FAIL against the pre-rebuild Profile.tsx (written before T031,
    // constitution Principle I, TDD): today the "Exportar mis datos"/"Eliminar
    // cuenta" buttons are `disabled` but have no `aria-describedby` at all — their
    // unavailable status is folded entirely into the button's own visible/accessible
    // name (`t('profile.accountActions.exportData.button')` = "Coming soon"/
    // "Próximamente"), which loses the actual action's name and gives assistive
    // technology no separate, persistently visible description to announce.
    // research.md §2 / data-model.md's `Account Action Placeholder` entity require a
    // native `disabled` attribute *and* a programmatic `aria-describedby` association
    // to a persistently visible, non-empty "not yet available" label — this is the
    // gap T031 closes (`ProfileDirectionB.tsx`'s `ActionPlaceholderRow`, the build
    // reference, pairs a `<span id=...>{unavailableLabel}</span>` with
    // `<Button disabled aria-describedby={labelId}>{title}</Button>`).
    //
    // UserProfileForm/LinkedProvidersCard/ConnectedAppsCard are stubbed above (no
    // real buttons of their own), so the only `disabled` controls Profile.tsx itself
    // renders in the loaded state are exactly these two placeholders — this doesn't
    // need to target them by copy/label text, which is free to change with the
    // rebuild, only by their `disabled` state.
    it('gives every disabled account-action placeholder control a resolvable, visible not-yet-available description', () => {
        render(<Profile />);

        const disabledButtons = screen
            .getAllByRole('button')
            .filter((button) => (button as HTMLButtonElement).disabled);

        // data-model.md: exactly two placeholders — `export-data`, `delete-account`.
        expect(disabledButtons).toHaveLength(2);

        for (const button of disabledButtons) {
            const describedBy = button.getAttribute('aria-describedby');
            expect(describedBy).toBeTruthy();

            const describedByIds = describedBy!.split(/\s+/).filter(Boolean);
            expect(describedByIds.length).toBeGreaterThan(0);

            for (const id of describedByIds) {
                const describedEl = document.getElementById(id);
                expect(describedEl).not.toBeNull();
                expect(describedEl).toBeVisible();
                expect(describedEl!.textContent?.trim()).not.toBe('');
            }
        }
    });
});
