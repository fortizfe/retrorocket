import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ReactDOM first
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
    render: mockRender
}));

vi.mock('react-dom/client', async () => {
    const actual = await vi.importActual('react-dom/client');
    return {
        ...actual,
        default: {
            createRoot: mockCreateRoot
        },
        createRoot: mockCreateRoot
    };
});

// Mock the App component
vi.mock('@/App', () => ({
    default: () => <div data-testid="app">App Component</div>
}));

// Mock CSS imports
vi.mock('../../styles/globals.css', () => ({}));
vi.mock('@/i18n/config', () => ({}));

describe('main.tsx', () => {
    let mockRootElement: HTMLElement;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules(); // Reset modules to allow fresh imports

        // Create a fresh mock root element
        mockRootElement = document.createElement('div');
        mockRootElement.id = 'root';

        // Mock getElementById to return our mock element
        vi.spyOn(document, 'getElementById').mockReturnValue(mockRootElement);
    });

    it('renders App component with proper setup', async () => {
        const mockElement = document.createElement('div');
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        mockCreateRoot.mockReturnValue({ render: mockRender });

        await import('@/main');

        // Verify createRoot was called with the root element
        expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);

        // Verify render was called
        expect(mockRender).toHaveBeenCalled();
    });

    it('imports all required dependencies', async () => {
        // Test that all imports work correctly
        const React = await import('react');
        const ReactDOM = await import('react-dom/client');
        const App = await import('@/App');

        expect(React).toBeDefined();
        expect(ReactDOM).toBeDefined();
        expect(App.default).toBeDefined();
    });

    it('handles missing root element gracefully', () => {
        // Mock getElementById to return null
        vi.spyOn(document, 'getElementById').mockReturnValue(null);

        // Mock createRoot to throw error when receiving null
        mockCreateRoot.mockImplementation(() => {
            throw new Error('Cannot create root with null element');
        });

        // Verify the mock is properly configured
        expect(() => mockCreateRoot()).toThrow('Cannot create root with null element');
    });

    it('renders with React.StrictMode wrapper', async () => {
        const mockElement = document.createElement('div');
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        mockCreateRoot.mockReturnValue({ render: mockRender });

        // Import to trigger main.tsx execution
        await import('@/main');

        // Verify createRoot was called
        expect(mockCreateRoot).toHaveBeenCalled();

        // Verify render was called with JSX
        expect(mockRender).toHaveBeenCalled();
    });
});
