import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import Landing from '@/pages/Landing';

const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);
const mockSignInWithGithub = vi.fn().mockResolvedValue(undefined);
const mockUpdateDisplayName = vi.fn().mockResolvedValue(undefined);
// Mutable so US3 tests (T030) can opt into the post-sign-in, first-time
// profile-setup branch without a second vi.mock (factories are hoisted and
// module-scoped — only "mock"-prefixed bindings may be referenced inside).
let mockUser: { uid: string } | null = null;
let mockUserProfile: { displayName: string } | null = null;

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({
        signInWithGoogle: mockSignInWithGoogle,
        signInWithGithub: mockSignInWithGithub,
        loading: false,
        user: mockUser,
        userProfile: mockUserProfile,
        updateDisplayName: mockUpdateDisplayName,
    }),
    useAuthContext: () => ({
        loading: false,
        error: null,
        isAuthenticated: false,
        signInWithGoogle: mockSignInWithGoogle,
        signInWithGithub: mockSignInWithGithub,
        signOut: vi.fn(),
    }),
}));

beforeEach(() => {
    mockUser = null;
    mockUserProfile = null;
});

function renderAt(path: string) {
    // Landing.tsx reads window.location.search directly (matching the existing
    // auth_error handling pattern), not React Router's location — pushState is what
    // actually needs to change here, BrowserRouter is only along for components that
    // do rely on router context (e.g. AuthWrapper's useLocation).
    window.history.pushState({}, '', path);
    return render(
        <BrowserRouter>
            <Landing />
        </BrowserRouter>,
    );
}

/**
 * Regression coverage for the MCP connector's not-logged-in flow (024 follow-up): a user
 * arriving via GET /api/mcp/authorize's `needs_login` redirect (server/src/http/routes/
 * mcp.ts) lands here with `?returnTo=<the original authorize URL>`. Sign-in MUST thread
 * that value through to `startLogin`, or the post-login redirect silently defaults to '/'
 * (sanitizeReturnTo, server/src/domain/auth/OAuthState.ts) and the user never reaches the
 * consent screen — which is exactly what made the AI client report "unable to connect."
 */
describe('Landing — returnTo threading for sign-in', () => {
    beforeEach(() => {
        mockSignInWithGoogle.mockClear();
        mockSignInWithGithub.mockClear();
    });

    it('passes a returnTo query param through to signInWithGoogle', async () => {
        const returnTo = '/api/mcp/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcallback';
        renderAt(`/?returnTo=${encodeURIComponent(returnTo)}`);

        fireEvent.click(screen.getByRole('button', { name: /google/i }));

        expect(mockSignInWithGoogle).toHaveBeenCalledWith(returnTo);
    });

    it('passes a returnTo query param through to signInWithGithub', async () => {
        const returnTo = '/api/mcp/authorize?client_id=abc&redirect_uri=https%3A%2F%2Fclaude.ai%2Fcallback';
        renderAt(`/?returnTo=${encodeURIComponent(returnTo)}`);

        fireEvent.click(screen.getByRole('button', { name: /github/i }));

        expect(mockSignInWithGithub).toHaveBeenCalledWith(returnTo);
    });

    it('calls signInWithGoogle with undefined when there is no returnTo param', async () => {
        renderAt('/');

        fireEvent.click(screen.getByRole('button', { name: /google/i }));

        expect(mockSignInWithGoogle).toHaveBeenCalledWith(undefined);
    });
});

/**
 * Feature 029 (landing redesign) T014: this behavior already existed
 * pre-redesign (Landing.tsx surfaces ?auth_error=<code> as a toast — 024
 * follow-up) but had no direct test coverage. Added before the T016-T019
 * rebuild so the rebuild can't silently drop it (constitution Principle I).
 */
describe('Landing — hero renders sign-in and surfaces auth errors', () => {
    beforeEach(() => {
        vi.mocked(toast.error).mockClear();
    });

    it('renders both sign-in provider buttons', () => {
        renderAt('/');

        expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
    });

    it('surfaces a toast for a known auth_error code and strips it from the URL', async () => {
        renderAt('/?auth_error=access_denied');

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledTimes(1);
        });
        expect(window.location.search).not.toContain('auth_error');
    });

    it('falls back to the generic error message for an unknown auth_error code', async () => {
        renderAt('/?auth_error=something_unrecognized');

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledTimes(1);
        });
    });
});

/**
 * Feature 029 hero follow-up (post-implementation product-owner feedback,
 * 2026-08-08): the hero's abstract grid mark shipped as 4 empty decorative
 * blocks, which read as unfinished rather than intentional once seen live.
 * Fixed to preview 4 real capabilities instead (still no product
 * screenshots — just icon + short label, FR-001).
 */
describe('Landing — hero previews key capabilities (not empty decoration)', () => {
    it('shows a real capability label in each of the 4 hero grid cells (appears once in the hero teaser + once in the full capabilities section)', () => {
        renderAt('/');

        // >= 2 is the real signal: 1 occurrence would just be the existing
        // capabilities-section item, proving the hero teaser is still empty.
        expect(screen.getAllByText('landing.capabilities.items.realTimeCollab.title').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('landing.capabilities.items.cardSystem.title').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('landing.capabilities.items.smartGrouping.title').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('landing.capabilities.items.export.title').length).toBeGreaterThanOrEqual(2);
    });
});

/**
 * Feature 029 US2 (T022): regression net for the content-inventory contract
 * (specs/029-landing-redesign/contracts/content-inventory-contract.md) — the
 * `mainFeatures`/`features` → `capabilities` i18n key merge (T011's
 * migration mapping) must not silently drop a capability or the folded-in
 * quick-pitch messaging. `react-i18next` is globally mocked to `t: (key) =>
 * key` in src/test/setup.ts (matching every other test in this codebase),
 * so assertions target the key path itself, not translated prose. The
 * `capabilities.*` assertions are a genuine pre-T024 "red" case: those key
 * paths don't exist yet under the current `mainFeatures.*`/`features.*` code.
 */
describe('Landing — supporting sections preserve all content-inventory categories', () => {
    it('renders the merged capabilities subtitle (folds in the former quick-pitch items)', () => {
        renderAt('/');

        expect(screen.getByText('landing.capabilities.subtitle')).toBeInTheDocument();
    });

    it('renders all 6 detailed capability items', () => {
        // 4 of the 6 also preview in the hero grid mark (see "hero previews
        // key capabilities" below) — getAllByText tolerates the duplicate.
        renderAt('/');

        expect(screen.getByText('landing.capabilities.items.auth.title')).toBeInTheDocument();
        expect(screen.getAllByText('landing.capabilities.items.realTimeCollab.title').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('landing.capabilities.items.cardSystem.title').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('landing.capabilities.items.smartGrouping.title').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('landing.capabilities.items.export.title').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('landing.capabilities.items.modernUI.title')).toBeInTheDocument();
    });

    it('renders the how-it-works walkthrough', () => {
        renderAt('/');

        expect(screen.getByText('landing.howItWorks.title')).toBeInTheDocument();
        expect(screen.getByText('landing.howItWorks.step1.title')).toBeInTheDocument();
        expect(screen.getByText('landing.howItWorks.step2.title')).toBeInTheDocument();
        expect(screen.getByText('landing.howItWorks.step3.title')).toBeInTheDocument();
    });

    it('renders the technology/trust-signals section', () => {
        renderAt('/');

        expect(screen.getByText('landing.technology.title')).toBeInTheDocument();
        expect(screen.getByText('landing.technology.openSource')).toBeInTheDocument();
    });

    it('renders the closing message and footer', () => {
        renderAt('/');

        expect(screen.getByText('landing.finalMessage.title')).toBeInTheDocument();
    });
});

/**
 * Feature 029 US3 (T030): the first-time profile-setup view (the
 * `showProfileForm` branch, reached right after a first sign-in) must be
 * restyled onto the new design system — no leftover legacy gradient
 * background — while reusing `UserProfileForm` unchanged in behavior
 * (FR-002, US3 Acceptance Scenario 1).
 */
describe('Landing — first-time profile setup uses the new design system', () => {
    it('renders UserProfileForm instead of the hero once user/userProfile are set', async () => {
        // showProfileForm is local state, flipped true only after a successful
        // sign-in (Landing.tsx handleProviderSignIn) — mocking user/userProfile
        // truthy alone isn't enough, matching the real post-OAuth sequence.
        mockUser = { uid: 'new-user-1' };
        mockUserProfile = { displayName: '' };
        renderAt('/');
        fireEvent.click(screen.getByRole('button', { name: /google/i }));

        await waitFor(() => {
            expect(screen.queryByText('landing.hero.cta.title')).not.toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'auth.userProfileForm.continue' })).toBeInTheDocument();
    });

    it('wraps the profile form in the new bg-surface container, not the old gradient background', async () => {
        mockUser = { uid: 'new-user-1' };
        mockUserProfile = { displayName: '' };
        const { container } = renderAt('/');
        fireEvent.click(screen.getByRole('button', { name: /google/i }));

        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'auth.userProfileForm.continue' })).toBeInTheDocument();
        });
        const wrapper = container.firstElementChild as HTMLElement;
        expect(wrapper.className).toContain('bg-surface');
        expect(wrapper.className).not.toContain('bg-gradient-to-br');
    });
});

/**
 * Feature 029 US3 (T031): en/es key-parity check for the `landing.*`
 * namespace, per contracts/i18n-key-migration-contract.md's verification
 * procedure — every key in one locale must exist in the other, so no
 * `landing.*` string ever falls back to a raw key at runtime (FR-003).
 */
describe('Landing — locale key parity', () => {
    function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
        return Object.entries(obj).flatMap(([key, value]) => {
            const path = prefix ? `${prefix}.${key}` : key;
            return value && typeof value === 'object' && !Array.isArray(value)
                ? flattenKeys(value as Record<string, unknown>, path)
                : [path];
        });
    }

    it('has the same set of landing.* keys in en.json and es.json', async () => {
        const en = (await import('@/locales/en.json')).default as { landing: Record<string, unknown> };
        const es = (await import('@/locales/es.json')).default as { landing: Record<string, unknown> };

        const enKeys = flattenKeys(en.landing).sort();
        const esKeys = flattenKeys(es.landing).sort();

        expect(esKeys).toEqual(enKeys);
    });
});
