import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { AuthGuard } from '@/features/auth/components/AuthGuard';

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

vi.mock('@/lib/contexts/UserContext', () => ({
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

    it('should render children when provided', () => {
        renderWithProviders(
            <AuthGuard>
                <div>Protected content</div>
            </AuthGuard>
        );

        expect(screen.getByText('Protected content')).toBeInTheDocument();
    });

    it('should wrap children with UserProvider', () => {
        renderWithProviders(
            <AuthGuard>
                <div>Test children</div>
            </AuthGuard>
        );

        // The children should be rendered within the provider
        expect(screen.getByText('Test children')).toBeInTheDocument();
    });

    it('should handle multiple children', () => {
        renderWithProviders(
            <AuthGuard>
                <div>First child</div>
                <div>Second child</div>
            </AuthGuard>
        );

        expect(screen.getByText('First child')).toBeInTheDocument();
        expect(screen.getByText('Second child')).toBeInTheDocument();
    });

    it('should render without any props other than children', () => {
        renderWithProviders(
            <AuthGuard>
                <span>Simple content</span>
            </AuthGuard>
        );

        expect(screen.getByText('Simple content')).toBeInTheDocument();
    });

    it('should work with complex child components', () => {
        const ComplexChild = () => (
            <div>
                <h1>Title</h1>
                <p>Description</p>
                <button>Action</button>
            </div>
        );

        renderWithProviders(
            <AuthGuard>
                <ComplexChild />
            </AuthGuard>
        );

        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Description')).toBeInTheDocument();
        expect(screen.getByText('Action')).toBeInTheDocument();
    });
});
