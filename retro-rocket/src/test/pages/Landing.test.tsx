import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Landing from '@/pages/Landing';

const mockSignInWithGoogle = vi.fn().mockResolvedValue(undefined);
const mockSignInWithGithub = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/contexts/UserContext', () => ({
    useUser: () => ({
        signInWithGoogle: mockSignInWithGoogle,
        signInWithGithub: mockSignInWithGithub,
        loading: false,
        user: null,
        userProfile: null,
        updateDisplayName: vi.fn(),
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
