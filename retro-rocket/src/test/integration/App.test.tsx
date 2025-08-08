import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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
        render(
            <MemoryRouter initialEntries={['/']}>
                <App />
            </MemoryRouter>
        );

        expect(screen.getByTestId('user-provider')).toBeInTheDocument();
    });

    it('should render with different routes', () => {
        const routes = ['/login', '/dashboard', '/retrospective/test-id'];

        routes.forEach(route => {
            const { unmount } = render(
                <MemoryRouter initialEntries={[route]}>
                    <App />
                </MemoryRouter>
            );

            expect(screen.getByTestId('user-provider')).toBeInTheDocument();
            unmount();
        });
    });

    it('should handle unknown routes gracefully', () => {
        render(
            <MemoryRouter initialEntries={['/unknown-route']}>
                <App />
            </MemoryRouter>
        );

        expect(screen.getByTestId('user-provider')).toBeInTheDocument();
    });
});
