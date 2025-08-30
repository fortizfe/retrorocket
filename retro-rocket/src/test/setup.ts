import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock react-hot-toast with simple mock
vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
    Toaster: vi.fn(() => null),
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        loading: vi.fn(),
        dismiss: vi.fn(),
    },
}));

// Mock Firebase
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({
        name: 'test-app',
        options: {},
    })),
    getApps: vi.fn(() => []),
    getApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        currentUser: null,
        onAuthStateChanged: vi.fn(),
        signOut: vi.fn(),
    })),
    onAuthStateChanged: vi.fn(),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    GithubAuthProvider: vi.fn(),
    signOut: vi.fn(),
    User: {},
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(() => Promise.resolve({
        exists: () => false,
        data: () => ({}),
        id: 'test-id'
    })),
    getDocs: vi.fn(() => Promise.resolve({
        docs: [],
        empty: true,
        size: 0
    })),
    addDoc: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onSnapshot: vi.fn((query, callback) => {
        // Mock onSnapshot should return an unsubscribe function
        const unsubscribe = vi.fn();
        // Optionally call the callback with empty data
        setTimeout(() => {
            callback({
                docs: [],
                empty: true,
                size: 0
            });
        }, 0);
        return unsubscribe;
    }),
    serverTimestamp: vi.fn(() => ({ __type: 'server_timestamp' })),
    Timestamp: {
        now: vi.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
        fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
    },
}));

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: vi.fn(),
            language: 'es',
        },
    }),
    I18nextProvider: ({ children }: { children: React.ReactNode }) => children,
    initReactI18next: {
        type: '3rdParty',
        init: vi.fn(),
    },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: 'div',
        button: 'button',
        span: 'span',
        p: 'p',
        h1: 'h1',
        h2: 'h2',
        h3: 'h3',
        section: 'section',
        article: 'article',
        nav: 'nav',
        header: 'header',
        footer: 'footer',
        main: 'main',
        aside: 'aside',
        ul: 'ul',
        li: 'li',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useLocation: () => ({
            pathname: '/',
            search: '',
            hash: '',
            state: null,
        }),
        useParams: () => ({}),
    };
});

// Note: optimization services are not mocked here to allow individual tests to test the actual implementation

// Mock card services
// Note: cardService is not mocked here to allow individual tests to test the actual implementation

// Mock card interaction service
// Note: cardInteractionService is not mocked here to allow individual tests to test the actual implementation

// Mock global objects that might be needed
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
}));

// Console methods
Object.defineProperty(window, 'console', {
    value: {
        ...console,
        error: vi.fn(),
        warn: vi.fn(),
        log: vi.fn(),
    },
});

// Polyfill for Blob.text() method that jsdom doesn't provide
if (typeof Blob !== 'undefined' && !Blob.prototype.text) {
    Blob.prototype.text = function () {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsText(this);
        });
    };
}
