import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock all external dependencies
vi.mock('../services/firebase', () => ({
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

vi.mock('../contexts/UserContext', () => ({
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
}));

import App from '../../App';

describe('App Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the application', () => {
        render(<App />);

        // The app should render the loading state initially
        expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
    });

    it('should render with application structure', () => {
        render(<App />);

        // Check for the loading spinner and text
        expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();

        // The app should have the main layout structure
        const mainElement = document.querySelector('main');
        expect(mainElement).toBeTruthy();
    });

    it('should handle component rendering gracefully', () => {
        render(<App />);

        // App should render without errors
        expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
    });
});
