// Mock import.meta for Vite environment variables
(global as any).import = (global as any).import || {};
(global as any).import.meta = (global as any).import.meta || {};
(global as any).import.meta.env = {
    VITE_FIREBASE_API_KEY: 'demo-api-key',
    VITE_FIREBASE_AUTH_DOMAIN: 'demo-project.firebaseapp.com',
    VITE_FIREBASE_PROJECT_ID: 'demo-project',
    VITE_FIREBASE_STORAGE_BUCKET: 'demo-project.appspot.com',
    VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
    VITE_FIREBASE_APP_ID: '1:123456789:web:abcdef',
    VITE_FIREBASE_MEASUREMENT_ID: 'G-XXXXXXXXXX',
    DEV: false,
    PROD: true,
    MODE: 'test'
};

// Mock localStorage only if window is available (jsdom environment)
if (typeof window !== 'undefined') {
    // Import @testing-library/jest-dom only in DOM environment
    require('@testing-library/jest-dom');
    const { configure } = require('@testing-library/react');

    // Configure testing library
    configure({ testIdAttribute: 'data-testid' });

    const mockStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        length: 0,
        key: jest.fn()
    };

    Object.defineProperty(window, 'localStorage', {
        value: mockStorage
    });

    Object.defineProperty(window, 'sessionStorage', {
        value: mockStorage
    });

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    });

    // Mock IntersectionObserver
    const mockIntersectionObserver = jest.fn();
    mockIntersectionObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null
    });
    (window as any).IntersectionObserver = mockIntersectionObserver;

    // Mock ResizeObserver
    const mockResizeObserver = jest.fn();
    mockResizeObserver.mockReturnValue({
        observe: () => null,
        unobserve: () => null,
        disconnect: () => null
    });
    (window as any).ResizeObserver = mockResizeObserver;

    // Suppress console warnings during tests unless explicitly needed
    const originalError = console.error;
    beforeAll(() => {
        console.error = (...args) => {
            if (
                typeof args[0] === 'string' &&
                args[0].includes('Warning: ReactDOM.render is no longer supported')
            ) {
                return;
            }
            originalError.call(console, ...args);
        };
    });

    afterAll(() => {
        console.error = originalError;
    });

    // Clean up after each test
    afterEach(() => {
        jest.clearAllMocks();
        mockStorage.getItem.mockClear();
        mockStorage.setItem.mockClear();
        mockStorage.removeItem.mockClear();
        mockStorage.clear.mockClear();
    });
}

// Always clean mocks
afterEach(() => {
    jest.clearAllMocks();
});
