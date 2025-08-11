import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { UserProvider } from '../../../contexts/UserContext';

// Mock dependencies with simple implementations
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

// Mock Firebase auth with simple mocks
const mockSignOut = vi.fn();

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({})),
    signOut: mockSignOut,
    onAuthStateChanged: vi.fn((auth, callback) => {
        // Simulate authenticated user
        const mockUser = {
            uid: 'test-uid',
            email: 'test@example.com',
            displayName: 'Test User',
            photoURL: null
        };
        callback(mockUser);
        return vi.fn(); // unsubscribe
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
        mockUseLocation.mockReturnValue({ pathname: '/mis-tableros' });

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
        it('should render without crashing', () => {
            renderWithProviders(<Header />);
            expect(screen.getByRole('banner')).toBeInTheDocument();
        });

        it('should show app name in logo', () => {
            renderWithProviders(<Header />);
            expect(screen.getByText('Retro Rocket')).toBeInTheDocument();
        });

        it('should show My Boards navigation link', () => {
            renderWithProviders(<Header />);
            expect(screen.getByText('My Boards')).toBeInTheDocument();
        });

        it('should show theme toggle component', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
        });

        it('should show language selector component', () => {
            renderWithProviders(<Header />);
            expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        });
    });

    describe('User Authentication', () => {
        it('should show user button when authenticated', () => {
            renderWithProviders(<Header />);
            expect(screen.getByRole('button', { name: /user/i })).toBeInTheDocument();
        });

        it('should display user initials', () => {
            renderWithProviders(<Header />);
            // Should show "TU" for "Test User"
            expect(screen.getByText('TU')).toBeInTheDocument();
        });
    });

    describe('User Menu', () => {
        it('should toggle user menu when button clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Profile')).toBeInTheDocument();
            expect(screen.getByText('Sign Out')).toBeInTheDocument();
        });

        it('should show user information in menu', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Test User')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });

        it('should handle sign out button click', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const signOutButton = screen.getByText('Sign Out');
            await user.click(signOutButton);

            expect(mockSignOut).toHaveBeenCalled();
        });
    });

    describe('Menu Interactions', () => {
        it('should close menu when backdrop clicked', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            expect(screen.getByText('Profile')).toBeInTheDocument();

            // Find and click backdrop
            const backdrop = screen.getByTestId('menu-backdrop');
            await user.click(backdrop);

            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });

        it('should handle profile link click', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const profileLink = screen.getByText('Profile');
            await user.click(profileLink);

            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });
    });

    describe('Navigation Integration', () => {
        it('should call navigate on sign out', async () => {
            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const signOutButton = screen.getByText('Sign Out');
            await user.click(signOutButton);

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });

        it('should handle navigation errors gracefully', async () => {
            mockSignOut.mockRejectedValueOnce(new Error('Network error'));

            const user = userEvent.setup();
            renderWithProviders(<Header />);

            const userButton = screen.getByRole('button', { name: /user/i });
            await user.click(userButton);

            const signOutButton = screen.getByText('Sign Out');
            await user.click(signOutButton);

            expect(mockSignOut).toHaveBeenCalled();
        });
    });

    describe('Responsive Features', () => {
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
});
