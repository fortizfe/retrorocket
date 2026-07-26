import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LinkedProvidersCard from '@/features/auth/components/LinkedProvidersCard';
import { useLinkedProviders } from '@/features/auth/hooks/useLinkedProviders';
import { startLinkProvider } from '@/features/auth/services/backendAuthClient';

// Mock dependencies
vi.mock('@/features/auth/hooks/useLinkedProviders', () => ({
    useLinkedProviders: vi.fn(),
    getProviderDisplayName: vi.fn((provider: string) => {
        if (provider === 'google.com') return 'Google';
        if (provider === 'github.com') return 'GitHub';
        return provider;
    })
}));
vi.mock('@/features/auth/services/backendAuthClient', () => ({
    startLinkProvider: vi.fn(),
}));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    }
}));

vi.mock('lucide-react', () => ({
    Link: ({ className }: any) => <div className={className} data-testid="link-icon">🔗</div>,
    Shield: ({ className }: any) => <div className={className} data-testid="shield-icon">🛡️</div>,
    Check: ({ className }: any) => <div className={className} data-testid="check-icon">✓</div>,
    Plus: ({ className }: any) => <div className={className} data-testid="plus-icon">+</div>,
    Github: ({ className }: any) => <div className={className} data-testid="github-icon">🐙</div>
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, className }: any) => (
        <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
    )
}));
vi.mock('@/lib/components/ui/Card', () => ({
    default: ({ children, className }: any) => <div className={className}>{children}</div>
}));
vi.mock('@/lib/components/ui/Loading', () => ({
    default: () => <div data-testid="loading">Loading...</div>
}));

const mockUseLinkedProviders = vi.mocked(useLinkedProviders);
const mockStartLinkProvider = vi.mocked(startLinkProvider);

describe('LinkedProvidersCard', () => {
    const mockRefreshLinkedProviders = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseLinkedProviders.mockReturnValue({
            linkedProviders: [],
            isLoading: false,
            error: null,
            refreshLinkedProviders: mockRefreshLinkedProviders,
        });
    });

    it('renders the heading and description', () => {
        render(<LinkedProvidersCard />);
        expect(screen.getByText('Métodos de Inicio de Sesión')).toBeInTheDocument();
    });

    it('shows the loading state', () => {
        mockUseLinkedProviders.mockReturnValue({ linkedProviders: [], isLoading: true, error: null, refreshLinkedProviders: mockRefreshLinkedProviders });
        render(<LinkedProvidersCard />);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('displays an error message when present', () => {
        mockUseLinkedProviders.mockReturnValue({ linkedProviders: [], isLoading: false, error: 'Test error', refreshLinkedProviders: mockRefreshLinkedProviders });
        render(<LinkedProvidersCard />);
        expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('lists available providers to link when none are linked', () => {
        render(<LinkedProvidersCard />);
        expect(screen.getByText('Google')).toBeInTheDocument();
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getAllByText('Vincular')).toHaveLength(2);
    });

    it('shows linked providers', () => {
        mockUseLinkedProviders.mockReturnValue({ linkedProviders: ['google.com'], isLoading: false, error: null, refreshLinkedProviders: mockRefreshLinkedProviders });
        render(<LinkedProvidersCard />);
        expect(screen.getByText('Vinculado y activo')).toBeInTheDocument();
        expect(screen.getByText('Métodos vinculados')).toBeInTheDocument();
    });

    it('redirects to the backend link flow when a provider is linked', () => {
        Object.defineProperty(window, 'location', { value: { pathname: '/settings' }, writable: true, configurable: true });
        render(<LinkedProvidersCard />);

        fireEvent.click(screen.getAllByText('Vincular')[0]); // Google is first
        expect(mockStartLinkProvider).toHaveBeenCalledWith('google', '/settings');
    });
});
