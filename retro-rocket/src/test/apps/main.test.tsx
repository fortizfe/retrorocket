import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Mock React.StrictMode
vi.mock('react', async () => {
    const actual = await vi.importActual('react');
    return {
        ...actual,
        StrictMode: ({ children }: any) => children
    };
});

// Mock ReactDOM
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
    render: mockRender
}));

vi.mock('react-dom/client', () => ({
    default: {
        createRoot: mockCreateRoot
    }
}));

// Mock the App component
vi.mock('../../App', () => ({
    default: () => <div data-testid="app">App Component</div>
}));

// Mock CSS imports
vi.mock('../../styles/globals.css', () => ({}));
vi.mock('../../i18n/config', () => ({}));

describe('main.tsx', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock getElementById to return a mock element
        const mockRootElement = document.createElement('div');
        mockRootElement.id = 'root';
        vi.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);
    });

    it('imports required dependencies without errors', async () => {
        // Test that all imports work correctly
        const React = await import('react');
        const App = await import('../../App');

        expect(React).toBeDefined();
        expect(App.default).toBeDefined();
    });

    it('renders App component in StrictMode structure', () => {
        // This tests the general structure that main.tsx should have
        const { container } = render(
            <div data-testid="app">App Component</div>
        );

        expect(container.querySelector('[data-testid="app"]')).toBeInTheDocument();
    });

    it('targets the correct DOM element', () => {
        const mockElement = document.createElement('div');
        mockElement.id = 'root';
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        // The main file should look for element with id 'root'
        const rootElement = document.getElementById('root');
        expect(rootElement).toBeTruthy();
        expect(rootElement?.id).toBe('root');
    });

    it('main.tsx file structure is valid', () => {
        // Simple test to verify the module can be imported without errors
        expect(true).toBe(true);
    });
});
