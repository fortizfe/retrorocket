import { screen, fireEvent, waitFor } from '@testing-library/react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from './Header';
import { render, mockUserContext } from '../../test/utils/test-utils';
import { useUser } from '../../contexts/UserContext';

// Mock dependencies
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: jest.fn(),
    useLocation: jest.fn(),
    Link: ({ children, to, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

jest.mock('../../contexts/UserContext');
jest.mock('../../utils/constants', () => ({
    APP_NAME: 'RetroRocket',
}));

// Mock child components
jest.mock('../ui/ThemeToggle', () => {
    return function ThemeToggle() {
        return <button data-testid="theme-toggle">Theme Toggle</button>;
    };
});

jest.mock('../ui/LanguageSelector', () => {
    return function LanguageSelector() {
        return <button data-testid="language-selector">Language Selector</button>;
    };
});

describe('Header', () => {
    const mockNavigate = jest.fn();
    const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
    const mockUseNavigate = useNavigate as jest.MockedFunction<typeof useNavigate>;
    const mockUseLocation = useLocation as jest.MockedFunction<typeof useLocation>;

    beforeEach(() => {
        mockNavigate.mockClear();
        mockUseNavigate.mockReturnValue(mockNavigate);
        mockUseLocation.mockReturnValue({
            pathname: '/mis-tableros',
            search: '',
            hash: '',
            state: null,
            key: 'test',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('when user is not authenticated', () => {
        beforeEach(() => {
            mockUseUser.mockReturnValue({
                ...mockUserContext,
                isAuthenticated: false,
                user: null,
                userProfile: null,
            });
        });

        it('should not render header for unauthenticated users', () => {
            render(<Header />);

            expect(screen.queryByRole('banner')).not.toBeInTheDocument();
            expect(screen.queryByText('RetroRocket')).not.toBeInTheDocument();
        });
    });

    describe('when user is authenticated', () => {
        beforeEach(() => {
            mockUseUser.mockReturnValue(mockUserContext);
        });

        it('should render header with logo and app name', () => {
            render(<Header />);

            expect(screen.getByRole('banner')).toBeInTheDocument();
            expect(screen.getByText('RetroRocket')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /retrorocket/i })).toHaveAttribute('href', '/mis-tableros');
        });

        it('should render navigation with active state', () => {
            render(<Header />);

            const navigation = screen.getByRole('navigation');
            expect(navigation).toBeInTheDocument();

            const myBoardsLink = screen.getByRole('link', { name: /mis tableros/i });
            expect(myBoardsLink).toBeInTheDocument();
            expect(myBoardsLink).toHaveClass('bg-primary-100'); // Active state
        });

        it('should render theme toggle and language selector', () => {
            render(<Header />);

            expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
            expect(screen.getByTestId('language-selector')).toBeInTheDocument();
        });

        it('should render user menu button with user info', () => {
            render(<Header />);

            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            expect(userMenuButton).toBeInTheDocument();
            expect(screen.getByText('Test User')).toBeInTheDocument();
        });

        it('should display user avatar when photo URL is available', () => {
            const userWithPhoto = {
                ...mockUserContext,
                userProfile: {
                    ...mockUserContext.userProfile,
                    photoURL: 'https://example.com/avatar.jpg',
                },
            };

            mockUseUser.mockReturnValue(userWithPhoto);
            render(<Header />);

            const avatar = screen.getByRole('img', { name: /avatar/i });
            expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
        });

        it('should show default avatar when no photo URL', () => {
            render(<Header />);

            // Should show default user icon (not an img element)
            expect(screen.queryByRole('img', { name: /avatar/i })).not.toBeInTheDocument();
            expect(screen.getByTestId('user-icon')).toBeInTheDocument();
        });

        it('should open user menu when clicking user button', async () => {
            render(<Header />);

            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            fireEvent.click(userMenuButton);

            await waitFor(() => {
                expect(screen.getByText('Perfil')).toBeInTheDocument();
                expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
            });
        });

        it('should close user menu when clicking backdrop', async () => {
            render(<Header />);

            // Open menu
            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            fireEvent.click(userMenuButton);

            await waitFor(() => {
                expect(screen.getByText('Perfil')).toBeInTheDocument();
            });

            // Click backdrop
            const backdrop = screen.getByLabelText(/cerrar menú/i);
            fireEvent.click(backdrop);

            await waitFor(() => {
                expect(screen.queryByText('Perfil')).not.toBeInTheDocument();
            });
        });

        it('should handle sign out correctly', async () => {
            const mockSignOut = jest.fn().mockResolvedValue(undefined);
            mockUseUser.mockReturnValue({
                ...mockUserContext,
                signOut: mockSignOut,
            });

            render(<Header />);

            // Open user menu
            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            fireEvent.click(userMenuButton);

            await waitFor(() => {
                expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
            });

            // Click sign out
            const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i });
            fireEvent.click(signOutButton);

            await waitFor(() => {
                expect(mockSignOut).toHaveBeenCalledTimes(1);
                expect(mockNavigate).toHaveBeenCalledWith('/');
            });
        });

        it('should handle sign out error gracefully', async () => {
            const mockSignOut = jest.fn().mockRejectedValue(new Error('Sign out failed'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

            mockUseUser.mockReturnValue({
                ...mockUserContext,
                signOut: mockSignOut,
            });

            render(<Header />);

            // Open user menu and click sign out
            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            fireEvent.click(userMenuButton);

            await waitFor(() => {
                expect(screen.getByText('Cerrar Sesión')).toBeInTheDocument();
            });

            const signOutButton = screen.getByRole('button', { name: /cerrar sesión/i });
            fireEvent.click(signOutButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', expect.any(Error));
                expect(mockNavigate).not.toHaveBeenCalled();
            });

            consoleSpy.mockRestore();
        });

        it('should show correct active state for different routes', () => {
            mockUseLocation.mockReturnValue({
                pathname: '/perfil',
                search: '',
                hash: '',
                state: null,
                key: 'test',
            });

            render(<Header />);

            const myBoardsLink = screen.getByRole('link', { name: /mis tableros/i });
            expect(myBoardsLink).not.toHaveClass('bg-primary-100'); // Not active
        });

        it('should display user email when no display name available', () => {
            const userWithoutDisplayName = {
                ...mockUserContext,
                userProfile: {
                    ...mockUserContext.userProfile,
                    displayName: '',
                },
                user: {
                    ...mockUserContext.user,
                    displayName: null,
                    email: 'test@example.com',
                },
            };

            mockUseUser.mockReturnValue(userWithoutDisplayName);
            render(<Header />);

            expect(screen.getByText('test')).toBeInTheDocument(); // Email prefix
        });

        it('should handle window resize while menu is open', async () => {
            render(<Header />);

            // Open user menu
            const userMenuButton = screen.getByRole('button', { name: /test user/i });
            fireEvent.click(userMenuButton);

            await waitFor(() => {
                expect(screen.getByText('Perfil')).toBeInTheDocument();
            });

            // Trigger window resize
            fireEvent(window, new Event('resize'));

            // Menu should still be visible
            expect(screen.getByText('Perfil')).toBeInTheDocument();
        });
    });
});
