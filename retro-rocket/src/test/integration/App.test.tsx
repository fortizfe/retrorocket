import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Override the global react-i18next passthrough mock (setup.ts: t = key => key) with the
// real Spanish value for the auth-loading key AuthWrapper renders, so these integration
// assertions match production text rather than a raw i18n key. Must restate the full
// mock shape (I18nextProvider, initReactI18next) since a local vi.mock replaces the
// global one for this file entirely rather than extending it.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => (key === 'auth.wrapper.verifying' ? 'Verificando autenticación...' : key),
        i18n: { changeLanguage: vi.fn(), language: 'es' },
    }),
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
        type: '3rdParty',
        init: vi.fn(),
    },
}));

// Mock all external dependencies
vi.mock('@/lib/services/firebase', () => ({
    auth: {},
    db: {},
    onAuthStateChanged: vi.fn(),
    signOutUser: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    Toaster: vi.fn(() => null),
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

vi.mock('@/lib/contexts/UserContext', () => ({
    UserProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="user-provider">{children}</div>,
    useUser: () => ({
        user: null,
        userProfile: null,
        isAuthenticated: false,
        loading: false,
        signInWithGoogle: vi.fn(),
        signInWithGithub: vi.fn(),
        signOut: vi.fn(),
        updateDisplayName: vi.fn(),
        refreshUserProfile: vi.fn(),
    }),
    useAuthContext: () => ({
        loading: true,
        isAuthenticated: false,
        error: null,
        signInWithGoogle: vi.fn(),
        signInWithGithub: vi.fn(),
        signOut: vi.fn(),
    }),
    useUserProfileContext: () => ({
        user: null,
        userProfile: null,
        updateDisplayName: vi.fn(),
        refreshUserProfile: vi.fn(),
    }),
}));

import App from '@/App';

describe('App Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the application', async () => {
        render(<App />);

        // Wait for lazy-loaded Landing to resolve and AuthWrapper to show auth loading state
        await waitFor(() => {
            expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
        });
    });

    it('should render with application structure', async () => {
        render(<App />);

        // Wait for lazy-loaded Landing to resolve and AuthWrapper to show auth loading state
        await waitFor(() => {
            expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
        });

        // The app should have the main layout structure
        const mainElement = document.querySelector('main');
        expect(mainElement).toBeTruthy();
    });

    it('should handle component rendering gracefully', async () => {
        render(<App />);

        // App should render without errors
        await waitFor(() => {
            expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
        });
    });
});
