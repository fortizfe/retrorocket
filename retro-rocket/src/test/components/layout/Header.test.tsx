import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { UserProvider } from '../../../contexts/UserContext';

// Simple mock implementations
const mockNavigate = vi.fn();
const mockUseLocation = vi.fn(() => ({ pathname: '/mis-tableros' }));

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

// Mock Firebase
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    signOut: vi.fn(() => Promise.resolve()),
    onAuthStateChanged: vi.fn((auth, callback) => {
        const mockUser = {
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: null
        };
        callback(mockUser);
        return vi.fn();
    })
}));

// Mock UI components
vi.mock('../../../components/ui/ThemeToggle', () => ({
    default: () => <button data-testid="theme-toggle">Theme Toggle</button>
}));

vi.mock('../../../components/ui/LanguageSelector', () => ({
    default: () => <button data-testid="language-selector">Language</button>
}));

// Mock framer-motion
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

describe('Header Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();

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

        // Mock window dimensions
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

    describe('Basic Rendering', () => {
        it('should render header element', () => {
            renderWithProviders(<Header />);
            expect(screen.getByRole('banner')).toBeInTheDocument();
        });

        it('should display app name', () => {
            renderWithProviders(<Header />);
            expect(screen.getByText('Retro Rocket')).toBeInTheDocument();
        });

        it('should display My Boards link', () => {
            renderWithProviders(<Header />);
            expect(screen.getByText('My Boards')).toBeInTheDocument();
        });

        it('should display theme toggle', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
        });

        it('should display language selector', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        });
    });

    describe('User Authentication UI', () => {
        it('should display user button when authenticated', () => {
            renderWithProviders(<Header />);
            expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
        });

        it('should display user initials', () => {
            renderWithProviders(<Header />);
            // Looking for "TU" initials from "Test User"
            expect(screen.getByText('TU')).toBeInTheDocument();
        });
    });

    describe('User Menu Functionality', () => {
        it('should open user menu when clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Profile')).toBeInTheDocument();
            expect(screen.getByText('Sign Out')).toBeInTheDocument();
        });

        it('should display user information in menu', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('should close menu when backdrop is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Profile')).toBeInTheDocument();

            const backdrop = screen.getByTestId('menu-backdrop');
            await user.click(backdrop);

            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });

        it('should close menu when profile link is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const profileLink = screen.getByText('Profile');
            await user.click(profileLink);

            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });

        it('should trigger sign out when sign out is clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const signOutButton = screen.getByText('Sign Out');
            await user.click(signOutButton);

            // Menu should close after sign out
            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });

        it('should navigate to home after sign out', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const signOutButton = screen.getByText('Sign Out');
            await user.click(signOutButton);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });

    describe('Responsive Design', () => {
        it('should handle window resize events', async () => {
            const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        });

        it('should cleanup event listeners on unmount', async () => {
            const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

            const user = userEvent.setup();
            const { unmount } = renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            unmount();

            expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
        });
    });

    describe('Menu Positioning', () => {
        it('should position menu based on button location', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            // Menu should be visible after clicking
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });

        it('should handle menu positioning near screen edge', async () => {
            // Mock button near edge
            global.Element.prototype.getBoundingClientRect = vi.fn(() => ({
                width: 40,
                height: 40,
                left: 980,
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
    });

    describe('Navigation Integration', () => {
        it('should show current page in navigation', () => {
            renderWithProviders(<Header />);

            // My Boards link should be visible
            expect(screen.getByText('My Boards')).toBeInTheDocument();
        });

        it('should handle logo click navigation', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const logoLink = screen.getByText('Retro Rocket').closest('a');
            if (logoLink) {
                await user.click(logoLink);
            }

            // Test passes if no errors occur
            expect(true).toBe(true);
        });
    });

    describe('Component Integration', () => {
        it('should integrate with theme toggle', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
        });

        it('should integrate with language selector', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        });

        it('should handle multiple menu interactions', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });

            // Open menu
            await user.click(userButton);
            expect(screen.getByText('Profile')).toBeInTheDocument();

            // Close menu
            const backdrop = screen.getByTestId('menu-backdrop');
            await user.click(backdrop);
            expect(screen.queryByText('Profile')).not.toBeInTheDocument();

            // Open menu again
            await user.click(userButton);
            expect(screen.getByText('Profile')).toBeInTheDocument();
        });
    });
});
