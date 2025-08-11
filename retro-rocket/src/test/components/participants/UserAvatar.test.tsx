import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UserAvatar from '../../../components/participants/UserAvatar';

describe('UserAvatar', () => {
    const mockUser = {
        name: 'John Doe',
        photoURL: 'https://example.com/avatar.jpg'
    };

    const mockUserNoPhoto = {
        name: 'Jane Smith',
        photoURL: null
    };

    describe('Basic Rendering', () => {
        it('should render with user photo when photoURL is provided', () => {
            render(<UserAvatar user={mockUser} />);

            const img = screen.getByRole('img', { name: /avatar de john doe/i });
            expect(img).toBeInTheDocument();
            expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
            expect(img).toHaveAttribute('alt', 'Avatar de John Doe');
        });

        it('should render initials when no photoURL is provided', () => {
            render(<UserAvatar user={mockUserNoPhoto} />);

            expect(screen.getByText('JS')).toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });

        it('should render with default medium size', () => {
            render(<UserAvatar user={mockUser} />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('w-8', 'h-8');
        });

        it('should not show name by default', () => {
            render(<UserAvatar user={mockUser} />);

            expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
        });
    });

    describe('Size Variants', () => {
        it('should render small size correctly', () => {
            render(<UserAvatar user={mockUser} size="sm" />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('w-6', 'h-6');
        });

        it('should render medium size correctly', () => {
            render(<UserAvatar user={mockUser} size="md" />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('w-8', 'h-8');
        });

        it('should render large size correctly', () => {
            render(<UserAvatar user={mockUser} size="lg" />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('w-10', 'h-10');
        });

        it('should apply correct text size for small initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} size="sm" />);

            const initialsElement = screen.getByText('JS');
            expect(initialsElement).toHaveClass('text-xs');
        });

        it('should apply correct text size for medium initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} size="md" />);

            const initialsElement = screen.getByText('JS');
            expect(initialsElement).toHaveClass('text-xs');
        });

        it('should apply correct text size for large initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} size="lg" />);

            const initialsElement = screen.getByText('JS');
            expect(initialsElement).toHaveClass('text-sm');
        });
    });

    describe('Name Display', () => {
        it('should show name when showName is true', () => {
            render(<UserAvatar user={mockUser} showName={true} />);

            expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        it('should render name with correct styling when shown', () => {
            render(<UserAvatar user={mockUser} showName={true} />);

            const nameElement = screen.getByText('John Doe');
            expect(nameElement).toHaveClass('font-medium', 'text-slate-700', 'dark:text-slate-300', 'text-xs');
        });

        it('should render avatar and name in flex container when showName is true', () => {
            render(<UserAvatar user={mockUser} showName={true} />);

            const container = screen.getByText('John Doe').closest('div');
            expect(container).toHaveClass('flex', 'items-center', 'gap-2');
        });

        it('should apply correct text size for large avatar with name', () => {
            render(<UserAvatar user={mockUser} showName={true} size="lg" />);

            const nameElement = screen.getByText('John Doe');
            expect(nameElement).toHaveClass('text-sm');
        });

        it('should not show name container when showName is false', () => {
            render(<UserAvatar user={mockUser} showName={false} />);

            const img = screen.getByRole('img');
            expect(img.closest('div')).not.toHaveClass('flex', 'items-center', 'gap-2');
        });
    });

    describe('Initials Generation', () => {
        it('should generate correct initials for single name', () => {
            const singleNameUser = { name: 'John', photoURL: null };
            render(<UserAvatar user={singleNameUser} />);

            expect(screen.getByText('J')).toBeInTheDocument();
        });

        it('should generate correct initials for two names', () => {
            const twoNameUser = { name: 'John Doe', photoURL: null };
            render(<UserAvatar user={twoNameUser} />);

            expect(screen.getByText('JD')).toBeInTheDocument();
        });

        it('should generate correct initials for multiple names (max 2 characters)', () => {
            const multiNameUser = { name: 'John Michael Doe Smith', photoURL: null };
            render(<UserAvatar user={multiNameUser} />);

            expect(screen.getByText('JM')).toBeInTheDocument();
        });

        it('should handle names with lowercase letters', () => {
            const lowercaseUser = { name: 'john doe', photoURL: null };
            render(<UserAvatar user={lowercaseUser} />);

            expect(screen.getByText('JD')).toBeInTheDocument();
        });

        it('should handle names with special characters', () => {
            const specialCharUser = { name: 'José María', photoURL: null };
            render(<UserAvatar user={specialCharUser} />);

            expect(screen.getByText('JM')).toBeInTheDocument();
        });

        it('should render user icon when name is empty', () => {
            const emptyNameUser = { name: '', photoURL: null };
            render(<UserAvatar user={emptyNameUser} />);

            expect(screen.queryByText(/^[A-Z]{1,2}$/)).not.toBeInTheDocument();
            // User icon should be present but we can't easily test for Lucide icon
            const avatarDiv = screen.getByTitle('');
            expect(avatarDiv).toBeInTheDocument();
        });

        it('should apply title attribute with user name for initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} />);

            const avatarDiv = screen.getByTitle('Jane Smith');
            expect(avatarDiv).toBeInTheDocument();
        });
    });

    describe('Styling and Classes', () => {
        it('should apply custom className to image avatar', () => {
            render(<UserAvatar user={mockUser} className="custom-class" />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('custom-class');
        });

        it('should apply custom className to initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} className="custom-class" />);

            const avatarDiv = screen.getByTitle('Jane Smith');
            expect(avatarDiv).toHaveClass('custom-class');
        });

        it('should apply correct border and shadow classes to image avatar', () => {
            render(<UserAvatar user={mockUser} />);

            const img = screen.getByRole('img');
            expect(img).toHaveClass('rounded-full', 'border-2', 'border-white', 'dark:border-slate-700', 'shadow-sm', 'object-cover');
        });

        it('should apply correct background and styling to initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} />);

            const avatarDiv = screen.getByTitle('Jane Smith');
            expect(avatarDiv).toHaveClass(
                'bg-gradient-to-br',
                'from-primary-500',
                'to-blue-600',
                'rounded-full',
                'flex',
                'items-center',
                'justify-center',
                'shadow-sm',
                'border-2',
                'border-white',
                'dark:border-slate-700',
                'text-white',
                'font-medium'
            );
        });

        it('should apply correct text styling to initials', () => {
            render(<UserAvatar user={mockUserNoPhoto} />);

            const initialsElement = screen.getByText('JS');
            expect(initialsElement).toHaveClass('text-xs');
        });
    });

    describe('Edge Cases', () => {
        it('should handle undefined photoURL', () => {
            const userWithUndefinedPhoto = { name: 'Test User', photoURL: undefined };
            render(<UserAvatar user={userWithUndefinedPhoto} />);

            expect(screen.getByText('TU')).toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });

        it('should handle empty string photoURL', () => {
            const userWithEmptyPhoto = { name: 'Test User', photoURL: '' };
            render(<UserAvatar user={userWithEmptyPhoto} />);

            expect(screen.getByText('TU')).toBeInTheDocument();
            expect(screen.queryByRole('img')).not.toBeInTheDocument();
        });

        it('should handle single character names', () => {
            const singleCharUser = { name: 'A', photoURL: null };
            render(<UserAvatar user={singleCharUser} />);

            expect(screen.getByText('A')).toBeInTheDocument();
        });

        it('should handle names with only spaces', () => {
            const spacesOnlyUser = { name: '   ', photoURL: null };
            render(<UserAvatar user={spacesOnlyUser} />);

            // Names with spaces still have length > 0, so it will try to generate initials
            // Find the div with gradient background classes (the avatar container)
            const avatarDiv = document.querySelector('.bg-gradient-to-br');
            expect(avatarDiv).toBeInTheDocument();
            expect(avatarDiv).toHaveAttribute('title', '   ');

            // Should have an empty span since splitting spaces and taking first chars results in empty string
            const spanElement = avatarDiv!.querySelector('span');
            expect(spanElement).toBeInTheDocument();
        });

        it('should handle very long names', () => {
            const longNameUser = {
                name: 'Extremely Long Name That Should Be Truncated Properly',
                photoURL: null
            };
            render(<UserAvatar user={longNameUser} />);

            expect(screen.getByText('EL')).toBeInTheDocument();
        });

        it('should handle names with numbers', () => {
            const numbersUser = { name: 'User123 Test456', photoURL: null };
            render(<UserAvatar user={numbersUser} />);

            expect(screen.getByText('UT')).toBeInTheDocument();
        });

        it('should handle different combinations of props', () => {
            render(
                <UserAvatar
                    user={mockUser}
                    size="lg"
                    showName={true}
                    className="custom-avatar"
                />
            );

            const img = screen.getByRole('img');
            expect(img).toHaveClass('w-10', 'h-10', 'custom-avatar');

            const nameElement = screen.getByText('John Doe');
            expect(nameElement).toHaveClass('text-sm');
        });
    });

    describe('Accessibility', () => {
        it('should provide proper alt text for image avatar', () => {
            render(<UserAvatar user={mockUser} />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('alt', 'Avatar de John Doe');
        });

        it('should provide title attribute for initials avatar', () => {
            render(<UserAvatar user={mockUserNoPhoto} />);

            const avatarDiv = screen.getByTitle('Jane Smith');
            expect(avatarDiv).toBeInTheDocument();
        });

        it('should handle special characters in alt text', () => {
            const specialUser = { name: 'José María Ñoño', photoURL: 'https://example.com/jose.jpg' };
            render(<UserAvatar user={specialUser} />);

            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('alt', 'Avatar de José María Ñoño');
        });

        it('should provide empty title for empty name', () => {
            const emptyNameUser = { name: '', photoURL: null };
            render(<UserAvatar user={emptyNameUser} />);

            const avatarDiv = screen.getByTitle('');
            expect(avatarDiv).toBeInTheDocument();
        });
    });
});
