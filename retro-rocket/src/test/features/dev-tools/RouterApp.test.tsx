import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import RouterApp from '@/features/dev-tools/RouterApp';

// Mock React Router components
vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: any) => <div data-testid="browser-router">{children}</div>,
    Routes: ({ children }: any) => <div data-testid="routes">{children}</div>,
    Route: ({ element }: any) => <div data-testid="route">{element}</div>,
    Link: ({ children, to, className }: any) => (
        <a href={to} className={className} data-testid="link">
            {children}
        </a>
    )
}));

// Mock all route components
vi.mock('@/features/dev-tools/components/ColorSystemTest', () => ({
    default: () => <div data-testid="color-system-test">Color System Test</div>
}));

vi.mock('@/pages/RetrospectivePage', () => ({
    default: () => <div data-testid="retrospective-page">Retrospective Page</div>
}));

// Mock AuthGuard component
// Not used in RouterApp

// Mock contexts
// Not used in RouterApp

// Mock third-party libraries
// Not used in RouterApp

describe('RouterApp', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        render(<RouterApp />);

        expect(screen.getByText('🚀 RetroRocket con Router')).toBeInTheDocument();
        expect(screen.getByTestId('browser-router')).toBeInTheDocument();
    });

    it('includes navigation links', () => {
        render(<RouterApp />);

        // Use more specific queries to avoid duplicates
        expect(screen.getAllByText('Home')).toHaveLength(2); // One in nav, one in content
        expect(screen.getAllByText('Color System Test')).toHaveLength(2); // One in nav, one in mock
        expect(screen.getByText('Demo Retrospective')).toBeInTheDocument();

        // Check navigation specifically
        const nav = screen.getByRole('navigation');
        expect(nav).toBeInTheDocument();
    });

    it('sets up routing structure correctly', () => {
        render(<RouterApp />);

        expect(screen.getByTestId('routes')).toBeInTheDocument();
        // Routes should be wrapped in BrowserRouter
        const browserRouter = screen.getByTestId('browser-router');
        expect(browserRouter).toContainElement(screen.getByTestId('routes'));
    });

    it('displays main heading and navigation', () => {
        render(<RouterApp />);

        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toHaveTextContent('🚀 RetroRocket con Router');
        expect(heading).toHaveClass('text-4xl', 'font-bold', 'text-gray-900', 'mb-4');
    });

    it('applies correct styling classes', () => {
        render(<RouterApp />);

        // Check if the outer container has the correct classes
        const heading = screen.getByText('🚀 RetroRocket con Router');
        const outerContainer = heading.closest('div.min-h-screen');
        expect(outerContainer).toHaveClass('min-h-screen', 'bg-gray-50', 'p-8');
    });
});
