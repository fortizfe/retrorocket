import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from '../../components/AuthGuard';

// Mock i18n instance
const mockI18n = {
    language: 'es',
    changeLanguage: vi.fn(),
    t: (key: string) => key,
};

// Mock UserContext
const mockUserContext = {
    user: null as any,
    userProfile: null as any,
    isAuthenticated: false,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    updateUserProfile: vi.fn(),
};

vi.mock('../../../contexts/UserContext', () => ({
    useUser: () => mockUserContext,
    UserProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom Navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Navigate: ({ to }: { to: string }) => {
            mockNavigate(to);
            return <div data-testid="navigate-mock">Redirecting to {to}</div>;
        },
    };
});

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <MemoryRouter>
            <I18nextProvider i18n={mockI18n as any}>
                {component}
            </I18nextProvider>
        </MemoryRouter>
    );
};

describe('AuthGuard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
    });

    it('should show loading when user context is loading', () => {
        mockUserContext.loading = true;
        mockUserContext.isAuthenticated = false;

        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        expect(screen.getByTestId('auth-guard-loading')).toBeInTheDocument();
        expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should redirect to login when user is not authenticated', () => {
        mockUserContext.loading = false;
        mockUserContext.isAuthenticated = false;

        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        expect(screen.getByTestId('navigate-mock')).toBeInTheDocument();
        expect(screen.getByText('Redirecting to /login')).toBeInTheDocument();
        expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
    });

    it('should render children when user is authenticated', () => {
        mockUserContext.loading = false;
        mockUserContext.isAuthenticated = true;
        mockUserContext.user = { uid: 'test-uid', email: 'test@example.com' };

        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        expect(screen.getByText('Protected content')).toBeInTheDocument();
        expect(screen.queryByTestId('auth-guard-loading')).not.toBeInTheDocument();
        expect(screen.queryByTestId('navigate-mock')).not.toBeInTheDocument();
    });

    it('should handle user profile loading state', () => {
        mockUserContext.loading = false;
        mockUserContext.isAuthenticated = true;
        mockUserContext.user = { uid: 'test-uid', email: 'test@example.com' };
        mockUserContext.userProfile = null;

        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        // Should still render children even without userProfile loaded
        expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should render children with complete user profile', () => {
        mockUserContext.loading = false;
        mockUserContext.isAuthenticated = true;
        mockUserContext.user = { uid: 'test-uid', email: 'test@example.com' };
        mockUserContext.userProfile = {
            uid: 'test-uid',
            displayName: 'Test User',
            email: 'test@example.com',
            createdAt: new Date(),
            linkedProviders: []
        };

        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        expect(screen.getByText('Protected content')).toBeInTheDocument();
    });
});
