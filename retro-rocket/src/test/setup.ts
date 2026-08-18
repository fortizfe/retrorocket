import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { createElement } from 'react';

// Node's own experimental `localStorage`/`sessionStorage` globals (unavailable without
// --localstorage-file) already exist on globalThis before Vitest's jsdom environment
// runs, so Vitest's global-key merge treats them as "already present" and skips copying
// over jsdom's real implementation — `window.localStorage` resolves through that same
// broken passthrough. The actual jsdom instance is reachable via `globalThis.jsdom`.
const realWindow = (globalThis as unknown as { jsdom?: { window: Window } }).jsdom?.window;
if (realWindow) {
    Object.defineProperty(globalThis, 'localStorage', {
        value: realWindow.localStorage,
        configurable: true,
        writable: true,
    });
    Object.defineProperty(globalThis, 'sessionStorage', {
        value: realWindow.sessionStorage,
        configurable: true,
        writable: true,
    });
}

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
        // 050-profile-redesign T018: ProfileDirectionB.tsx's IdentityPanel (the
        // selected direction's build reference for the T021 UserProfileForm rebuild)
        // wraps its reveal-on-Edit display-name form in `motion.form`/`AnimatePresence`.
        // Mapped to the plain host element like every other motion.* tag above so that
        // rebuild renders without crashing under this shared mock.
        form: 'form',
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    // Renders a real DOM marker (rather than a no-op passthrough) so tests can
    // assert the app root is actually wrapped in MotionConfig and inspect the
    // `reducedMotion` prop it was given (see src/App.tsx, spec 028). Uses
    // createElement, not JSX, because this file has a .ts (not .tsx) extension.
    MotionConfig: ({ children, reducedMotion }: { children: React.ReactNode; reducedMotion?: string }) =>
        createElement('div', { 'data-testid': 'motion-config', 'data-reduced-motion': reducedMotion }, children),
    // Stubs for the landing page's scroll-driven parallax (ParallaxLayer, feature 042).
    // jsdom has no real scroll/layout engine, so these return static, well-formed
    // values rather than reactive MotionValues — component logic under test
    // (computeParallaxRange) is unit-tested directly instead of through rendered DOM
    // transforms; these stubs only need to keep components that call them from
    // crashing during render.
    useScroll: vi.fn(() => ({ scrollYProgress: { get: () => 0, on: vi.fn(() => vi.fn()) } })),
    useTransform: vi.fn((_value: unknown, _input: unknown, output: unknown) =>
        Array.isArray(output) ? output[0] : output
    ),
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

// Mock global objects that might be needed. Guarded so this shared setup also loads
// under the `node` test environment (used by the gated model-eval harness, which has
// no `window`); behaviour under the default jsdom environment is unchanged.
if (typeof window !== 'undefined') {
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
}

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

// Console methods (jsdom only — under the node harness we want real console output)
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'console', {
        value: {
            ...console,
            error: vi.fn(),
            warn: vi.fn(),
            log: vi.fn(),
        },
    });
}

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
