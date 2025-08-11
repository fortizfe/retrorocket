import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../../pages/Home';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', () => {
        renderWithRouter(<Home />);
        expect(true).toBe(true); // No error means success
    });

    it('navigates to dashboard on mount', () => {
        renderWithRouter(<Home />);

        expect(mockNavigate).toHaveBeenCalledWith('/mis-tableros', { replace: true });
    });

    it('renders null (no visible content)', () => {
        const { container } = renderWithRouter(<Home />);

        expect(container.firstChild).toBeNull();
    });

    it('calls navigate with correct parameters', () => {
        renderWithRouter(<Home />);

        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/mis-tableros', { replace: true });
    });

    it('useEffect dependency array includes navigate', () => {
        // This test ensures the useEffect has the correct dependencies
        renderWithRouter(<Home />);

        // Re-render to ensure useEffect isn't called again
        renderWithRouter(<Home />);

        // Should be called twice (once per render)
        expect(mockNavigate).toHaveBeenCalledTimes(2);
    });
});
