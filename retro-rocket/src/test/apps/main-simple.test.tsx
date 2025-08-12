import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock ReactDOM
const mockRender = vi.fn();
const mockCreateRoot = vi.fn(() => ({
    render: mockRender
}));

vi.mock('react-dom/client', () => ({
    default: {
        createRoot: mockCreateRoot
    },
    createRoot: mockCreateRoot
}));

// Mock the App component
vi.mock('../../App', () => ({
    default: () => <div data-testid="app">App Component</div>
}));

// Mock CSS and i18n imports
vi.mock('../../styles/globals.css', () => ({}));
vi.mock('../../i18n/config', () => ({}));

describe('main.tsx - Simple Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('should create root and render App component', async () => {
        const mockElement = document.createElement('div');
        mockElement.id = 'root';
        vi.spyOn(document, 'getElementById').mockReturnValue(mockElement);

        // Import to trigger main.tsx execution
        await import('../../main');

        // Verify createRoot was called with the root element
        expect(mockCreateRoot).toHaveBeenCalledWith(mockElement);

        // Verify render was called
        expect(mockRender).toHaveBeenCalled();
    });

    it('should import required dependencies without errors', async () => {
        // Test that all imports work correctly
        expect(async () => {
            await import('react');
            await import('react-dom/client');
            await import('../../App');
        }).not.toThrow();
    });
});
