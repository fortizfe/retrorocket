import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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
