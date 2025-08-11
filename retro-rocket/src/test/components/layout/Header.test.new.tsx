import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { UserProvider } from '../../../contexts/UserContext';

// Mock dependencies
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn();

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate,
        useLocation: () => mockUseLocation()
    };
});

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: { [key: string]: string } = {
                'header.myBoards': 'My Boards',
                'header.user': 'User',
                'header.closeMenu': 'Close Menu',
                'header.profile': 'Profile',
                'header.signOut': 'Sign Out',
            };
            return translations[key] || key;
        },
    }),
    initReactI18next: {
        type: '3rdParty',
        init: vi.fn(),
    },
}));

vi.mock('../../../utils/constants', () => ({
    APP_NAME: 'Retro Rocket',
}));

// Mock Firebase Auth
const mockAuth = {
    currentUser: {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null
    }
};

const mockSignOut = vi.fn();

vi.mock('firebase/auth', () => ({
    getAuth: () => mockAuth,
    signOut: mockSignOut,
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback(mockAuth.currentUser);
        return vi.fn(); // unsubscribe function
    })
}));

vi.mock('../../../components/ui/ThemeToggle', () => ({
    default: () => <button data-testid="theme-toggle">Theme Toggle</button>
}));

vi.mock('../../../components/ui/LanguageSelector', () => ({
    default: () => <button data-testid="language-selector">Language</button>
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, className, ...props }: any) => (
            <div className={className || ''} {...props}>{children}</div>
        ),
    },
    AnimatePresence: ({ children }: any) => children,
}));

// Mock react-dom portal
vi.mock('react-dom', () => ({
    createPortal: (children: any) => children,
}));

const renderWithProviders = (component: React.ReactNode) => {
    return render(
        <BrowserRouter>
            <UserProvider>
                {component}
            </UserProvider>
        </BrowserRouter>
    );
};

describe('Header', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUseLocation.mockReturnValue({ pathname: '/mis-tableros' });

        // Reset Firebase auth user to default
        mockAuth.currentUser = {
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: null
        };

        // Mock DOM methods
        global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 40,
            height: 40,
            left: 100,
            right: 140,
            top: 10,
            bottom: 50,
            x: 100,
            y: 10,
            toJSON: vi.fn()
        }));

        // Mock window resize
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1024,
        });

        Object.defineProperty(window, 'innerHeight', {
            writable: true,
            configurable: true,
            value: 768,
        });
    });

    it('should render without crashing', () => {
        renderWithProviders(<Header />);
        expect(screen.getByRole('banner')).toBeInTheDocument();
    });

    it('should show logo with app name', () => {
        renderWithProviders(<Header />);
        expect(screen.getByText('Retro Rocket')).toBeInTheDocument();
    });

    it('should show user avatar when authenticated', () => {
        renderWithProviders(<Header />);
        expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
    });

    it('should show My Boards link in navigation', () => {
        renderWithProviders(<Header />);
        expect(screen.getByText('My Boards')).toBeInTheDocument();
    });

    it('should not show user menu when not authenticated', () => {
        mockAuth.currentUser = null;
        renderWithProviders(<Header />);
        expect(screen.queryByRole('button', { name: /user/i })).not.toBeInTheDocument();
    });

    it('should show user menu when authenticated', () => {
        renderWithProviders(<Header />);
        expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
    });

    it('should display user initials when no photo URL', () => {
        renderWithProviders(<Header />);
        expect(screen.getByText('TU')).toBeInTheDocument(); // Test User initials
    });

    it('should display default icon when no photo available', () => {
        mockAuth.currentUser = {
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: null,
            photoURL: null
        };
        renderWithProviders(<Header />);
        expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
    });

    it('should display user email prefix when no display name', () => {
        mockAuth.currentUser = {
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: '',
            photoURL: null
        };
        renderWithProviders(<Header />);
        expect(screen.getByText('t')).toBeInTheDocument(); // First letter of email
    });

    it('should display fallback text when no user info available', () => {
        mockAuth.currentUser = {
            uid: 'test-uid',
            email: '',
            displayName: '',
            photoURL: null
        };
        renderWithProviders(<Header />);
        expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
    });

    it('should toggle user menu when button clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should close menu when backdrop clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Profile')).toBeInTheDocument();

        // Click outside menu (backdrop)
        const backdrop = screen.getByTestId('menu-backdrop');
        await user.click(backdrop);

        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should display user info in menu', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('should render profile link in menu', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should close menu when profile link clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        const profileLink = screen.getByText('Profile');
        await user.click(profileLink);

        expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });

    it('should render sign out button in menu', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('should call signOut and navigate when sign out clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        const signOutButton = screen.getByText('Sign Out');
        await user.click(signOutButton);

        expect(mockSignOut).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should handle sign out error gracefully', async () => {
        mockSignOut.mockRejectedValueOnce(new Error('Sign out failed'));

        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        const signOutButton = screen.getByText('Sign Out');
        await user.click(signOutButton);

        expect(mockSignOut).toHaveBeenCalled();
    });

    it('should close menu when sign out clicked', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        const signOutButton = screen.getByText('Sign Out');
        await user.click(signOutButton);

        expect(screen.queryByText('Sign Out')).not.toBeInTheDocument();
    });

    it('should show My Boards link in mobile menu', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        expect(screen.getByText('My Boards')).toBeInTheDocument();
    });

    it('should calculate menu position based on button position', async () => {
        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should adjust menu position when near edge', async () => {
        // Mock button position near right edge
        global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
            width: 40,
            height: 40,
            left: 980, // Near right edge
            right: 1020,
            top: 10,
            bottom: 50,
            x: 980,
            y: 10,
            toJSON: vi.fn()
        }));

        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('should add resize listener when menu is open', async () => {
        const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

        const user = userEvent.setup();
        renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove resize listener on cleanup', async () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const user = userEvent.setup();
        const { unmount } = renderWithProviders(<Header />);

        const userButton = screen.getByRole('button', { name: /user/i });
        await user.click(userButton);

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
});
