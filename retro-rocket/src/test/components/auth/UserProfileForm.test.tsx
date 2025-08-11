import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserProfileForm from '../../../components/auth/UserProfileForm';
import { UserProfile } from '../../../types/user';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock the hooks
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'auth.userProfileForm.welcome': 'Welcome!',
                'auth.userProfileForm.welcomeSubtitle': 'Let\'s set up your profile',
                'auth.userProfileForm.editProfile': 'Edit Profile',
                'auth.userProfileForm.editProfileSubtitle': 'Update your profile information',
                'auth.userProfileForm.email': 'Email',
                'auth.userProfileForm.emailNotEditable': 'Email cannot be changed',
                'auth.userProfileForm.displayName': 'Display Name',
                'auth.userProfileForm.displayNamePlaceholder': 'Enter your display name',
                'auth.userProfileForm.displayNameHelp': 'This is how others will see you',
                'auth.userProfileForm.saving': 'Saving...',
                'auth.userProfileForm.continue': 'Continue',
                'auth.userProfileForm.saveChanges': 'Save Changes',
                'auth.userProfileForm.editLaterNote': 'You can edit this later in settings',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock Lucide React icons
vi.mock('lucide-react', () => ({
    User: ({ className }: { className?: string }) => (
        <div className={className} data-testid="user-icon">User Icon</div>
    ),
    Mail: ({ className }: { className?: string }) => (
        <div className={className} data-testid="mail-icon">Mail Icon</div>
    ),
    Save: ({ className }: { className?: string }) => (
        <div className={className} data-testid="save-icon">Save Icon</div>
    ),
}));

// Mock Button component
vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, onClick, disabled, type, className, ...props }: any) => (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid="profile-button"
            {...props}
        >
            {children}
        </button>
    ),
}));

// Mock Input component
vi.mock('../../../components/ui/Input', () => ({
    default: ({ onChange, value, disabled, type, placeholder, required, className, ...props }: any) => (
        <input
            type={type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            className={className}
            data-testid="profile-input"
            {...props}
        />
    ),
}));

describe('UserProfileForm', () => {
    const mockUserProfile: UserProfile = {
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        providers: ['google'],
        primaryProvider: 'google',
        joinedBoards: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const defaultProps = {
        userProfile: mockUserProfile,
        onSave: vi.fn(),
        isFirstTime: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render user profile form', () => {
            render(<UserProfileForm {...defaultProps} />);

            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            expect(screen.getByText('Update your profile information')).toBeInTheDocument();
        });

        it('should render first time setup when isFirstTime is true', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={true} />);

            expect(screen.getByText('Welcome!')).toBeInTheDocument();
            expect(screen.getByText('Let\'s set up your profile')).toBeInTheDocument();
            expect(screen.getByText('Continue')).toBeInTheDocument();
        });

        it('should render edit mode when isFirstTime is false', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={false} />);

            expect(screen.getByText('Edit Profile')).toBeInTheDocument();
            expect(screen.getByText('Save Changes')).toBeInTheDocument();
        });

        it('should apply custom className', () => {
            const { container } = render(
                <UserProfileForm {...defaultProps} className="custom-class" />
            );

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('User Profile Display', () => {
        it('should display user email (disabled)', () => {
            render(<UserProfileForm {...defaultProps} />);

            const emailInputs = screen.getAllByTestId('profile-input');
            const emailInput = emailInputs.find(input =>
                (input as HTMLInputElement).value === 'test@example.com'
            );

            expect(emailInput).toBeInTheDocument();
            expect(emailInput).toBeDisabled();
        });

        it('should display user display name in input', () => {
            render(<UserProfileForm {...defaultProps} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).value === 'Test User'
            );

            expect(nameInput).toBeInTheDocument();
            expect(nameInput).not.toBeDisabled();
        });

        it('should display user photo when available', () => {
            render(<UserProfileForm {...defaultProps} />);

            const photo = screen.getByAltText('Avatar');
            expect(photo).toBeInTheDocument();
            expect(photo).toHaveAttribute('src', 'https://example.com/photo.jpg');
        });

        it('should not display photo section when photoURL is not available', () => {
            const userWithoutPhoto = { ...mockUserProfile, photoURL: null };
            render(<UserProfileForm {...defaultProps} userProfile={userWithoutPhoto} />);

            expect(screen.queryByAltText('Avatar')).not.toBeInTheDocument();
        });
    });

    describe('Form Interactions', () => {
        it('should update display name when user types', async () => {
            const user = userEvent.setup();
            render(<UserProfileForm {...defaultProps} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).value === 'Test User'
            ) as HTMLInputElement;

            await user.clear(nameInput);
            await user.type(nameInput, 'New Name');

            expect(nameInput.value).toBe('New Name');
        });

        it('should call onSave when form is submitted with valid name', async () => {
            const mockOnSave = vi.fn().mockResolvedValue(undefined);
            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const form = screen.getByTestId('profile-button').closest('form');
            expect(form).toBeInTheDocument();

            fireEvent.submit(form!);

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith('Test User');
            });
        });

        it('should not call onSave when display name is empty', async () => {
            const mockOnSave = vi.fn();
            const userWithoutName = { ...mockUserProfile, displayName: '' };
            render(<UserProfileForm {...defaultProps} userProfile={userWithoutName} onSave={mockOnSave} />);

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            expect(mockOnSave).not.toHaveBeenCalled();
        });

        it('should not call onSave when display name is only whitespace', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn();
            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).value === 'Test User'
            ) as HTMLInputElement;

            await user.clear(nameInput);
            await user.type(nameInput, '   ');

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            expect(mockOnSave).not.toHaveBeenCalled();
        });
    });

    describe('Loading State', () => {
        it('should show loading state during save', async () => {
            let resolvePromise: () => void;
            const savePromise = new Promise<void>((resolve) => {
                resolvePromise = resolve;
            });

            const mockOnSave = vi.fn().mockReturnValue(savePromise);
            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            // Should show loading text
            expect(screen.getByText('Saving...')).toBeInTheDocument();

            // Button should be disabled during loading
            const button = screen.getByTestId('profile-button');
            expect(button).toBeDisabled();

            // Resolve the promise
            resolvePromise!();

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalled();
            });
        });

        it('should disable button when display name is empty', () => {
            const userWithoutName = { ...mockUserProfile, displayName: '' };
            render(<UserProfileForm {...defaultProps} userProfile={userWithoutName} />);

            const button = screen.getByTestId('profile-button');
            expect(button).toBeDisabled();
        });

        it('should enable button when display name has content', () => {
            render(<UserProfileForm {...defaultProps} />);

            const button = screen.getByTestId('profile-button');
            expect(button).not.toBeDisabled();
        });
    });

    describe('Error Handling', () => {
        it('should handle save errors gracefully', async () => {
            const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalled();
            });

            expect(consoleSpy).toHaveBeenCalledWith('Error saving profile:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should reset loading state after error', async () => {
            const mockOnSave = vi.fn().mockRejectedValue(new Error('Save failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalled();
            });

            // Should not show loading text after error
            await waitFor(() => {
                expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
            });

            consoleSpy.mockRestore();
        });
    });

    describe('First Time Setup UI', () => {
        it('should show welcome message and user icon for first time setup', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={true} />);

            expect(screen.getByText('Welcome!')).toBeInTheDocument();
            expect(screen.getAllByTestId('user-icon')).toHaveLength(2); // One in welcome section, one in form label
        });

        it('should show "Continue" button for first time setup', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={true} />);

            expect(screen.getByText('Continue')).toBeInTheDocument();
        });

        it('should show edit later note for first time setup', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={true} />);

            expect(screen.getByText('You can edit this later in settings')).toBeInTheDocument();
        });

        it('should not show edit later note for regular edit mode', () => {
            render(<UserProfileForm {...defaultProps} isFirstTime={false} />);

            expect(screen.queryByText('You can edit this later in settings')).not.toBeInTheDocument();
        });
    });

    describe('Form Labels and Help Text', () => {
        it('should display email label and help text', () => {
            render(<UserProfileForm {...defaultProps} />);

            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.getByText('Email cannot be changed')).toBeInTheDocument();
            expect(screen.getByTestId('mail-icon')).toBeInTheDocument();
        });

        it('should display display name label and help text', () => {
            render(<UserProfileForm {...defaultProps} />);

            expect(screen.getByText('Display Name')).toBeInTheDocument();
            expect(screen.getByText('This is how others will see you')).toBeInTheDocument();
            expect(screen.getAllByTestId('user-icon')).toHaveLength(1);
        });

        it('should show save icon in button', () => {
            render(<UserProfileForm {...defaultProps} />);

            expect(screen.getByTestId('save-icon')).toBeInTheDocument();
        });
    });

    describe('Null User Profile', () => {
        it('should handle null user profile gracefully', () => {
            render(<UserProfileForm {...defaultProps} userProfile={null} />);

            const emailInputs = screen.getAllByTestId('profile-input');
            const emailInput = emailInputs.find(input =>
                (input as HTMLInputElement).type === 'email'
            );
            const nameInput = emailInputs.find(input =>
                (input as HTMLInputElement).type === 'text'
            );

            expect(emailInput).toHaveProperty('value', '');
            expect(nameInput).toHaveProperty('value', '');
        });

        it('should not display photo when user profile is null', () => {
            render(<UserProfileForm {...defaultProps} userProfile={null} />);

            expect(screen.queryByAltText('Avatar')).not.toBeInTheDocument();
        });
    });

    describe('Input Validation', () => {
        it('should require display name input', () => {
            render(<UserProfileForm {...defaultProps} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).type === 'text'
            );

            expect(nameInput).toHaveAttribute('required');
        });

        it('should have correct input types', () => {
            render(<UserProfileForm {...defaultProps} />);

            const inputs = screen.getAllByTestId('profile-input');
            const emailInput = inputs.find(input =>
                (input as HTMLInputElement).value === 'test@example.com'
            );
            const nameInput = inputs.find(input =>
                (input as HTMLInputElement).value === 'Test User'
            );

            expect(emailInput).toHaveAttribute('type', 'email');
            expect(nameInput).toHaveAttribute('type', 'text');
        });

        it('should show placeholder text for display name', () => {
            const userWithoutName = { ...mockUserProfile, displayName: '' };
            render(<UserProfileForm {...defaultProps} userProfile={userWithoutName} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).type === 'text'
            );

            expect(nameInput).toHaveAttribute('placeholder', 'Enter your display name');
        });
    });

    describe('Accessibility', () => {
        it('should have proper form structure', () => {
            render(<UserProfileForm {...defaultProps} />);

            const form = screen.getByTestId('profile-button').closest('form');
            expect(form).toBeInTheDocument();
        });

        it('should have proper label associations', () => {
            render(<UserProfileForm {...defaultProps} />);

            expect(screen.getByText('Email')).toBeInTheDocument();
            expect(screen.getByText('Display Name')).toBeInTheDocument();
        });

        it('should have submit button with proper type', () => {
            render(<UserProfileForm {...defaultProps} />);

            const button = screen.getByTestId('profile-button');
            expect(button).toHaveAttribute('type', 'submit');
        });
    });

    describe('Data Trimming', () => {
        it('should trim whitespace from display name before saving', async () => {
            const user = userEvent.setup();
            const mockOnSave = vi.fn().mockResolvedValue(undefined);
            render(<UserProfileForm {...defaultProps} onSave={mockOnSave} />);

            const nameInputs = screen.getAllByTestId('profile-input');
            const nameInput = nameInputs.find(input =>
                (input as HTMLInputElement).value === 'Test User'
            ) as HTMLInputElement;

            await user.clear(nameInput);
            await user.type(nameInput, '  Trimmed Name  ');

            const form = screen.getByTestId('profile-button').closest('form');
            fireEvent.submit(form!);

            await waitFor(() => {
                expect(mockOnSave).toHaveBeenCalledWith('Trimmed Name');
            });
        });
    });
});
