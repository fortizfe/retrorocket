import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CompactAvatarGroup from '@/features/boards/participants/components/CompactAvatarGroup';
import { Participant } from '@/features/boards/types/participant';

// Mock UserAvatar component
vi.mock('@/features/boards/participants/components/UserAvatar', () => ({
    default: ({ user, size, className }: any) => (
        <div
            data-testid="user-avatar"
            data-user-name={user.name}
            data-size={size}
            className={className}
        >
            {user.name.substring(0, 2).toUpperCase()}
        </div>
    )
}));

describe('CompactAvatarGroup', () => {
    const mockParticipants: Participant[] = [
        {
            id: '1',
            name: 'John Doe',
            photoURL: 'https://example.com/john.jpg',
            userId: 'user1',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        },
        {
            id: '2',
            name: 'Jane Smith',
            photoURL: null,
            userId: 'user2',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        },
        {
            id: '3',
            name: 'Bob Johnson',
            photoURL: 'https://example.com/bob.jpg',
            userId: 'user3',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        },
        {
            id: '4',
            name: 'Alice Brown',
            photoURL: null,
            userId: 'user4',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        },
        {
            id: '5',
            name: 'Charlie Wilson',
            photoURL: 'https://example.com/charlie.jpg',
            userId: 'user5',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        },
        {
            id: '6',
            name: 'Diana Davis',
            photoURL: null,
            userId: 'user6',
            retrospectiveId: 'retro1',
            joinedAt: new Date(),
            isActive: true
        }
    ];

    describe('Basic Rendering', () => {
        it('should render with empty participants list', () => {
            render(<CompactAvatarGroup participants={[]} />);

            const container = document.querySelector('.flex.items-center.gap-2');
            expect(container).toBeInTheDocument();

            // Should show count of 0
            expect(screen.getByText('0')).toBeInTheDocument();
        });

        it('should render with single participant', () => {
            render(<CompactAvatarGroup participants={[mockParticipants[0]]} />);

            expect(screen.getByTestId('user-avatar')).toBeInTheDocument();
            expect(screen.getByText('1')).toBeInTheDocument();
        });

        it('should render with multiple participants under maxVisible', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} />);

            const avatars = screen.getAllByTestId('user-avatar');
            expect(avatars).toHaveLength(3);
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('should render with default props', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            // Default maxVisible should allow both avatars to show
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(2);

            // Default showCount should show total count
            expect(screen.getByText('2')).toBeInTheDocument();

            // Should have Users icon (though we can't easily test lucide icon)
            const iconContainer = screen.getByText('2').closest('div');
            expect(iconContainer).toHaveClass('flex', 'items-center', 'gap-1');
        });
    });

    describe('Max Visible Logic', () => {
        it('should respect maxVisible prop', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={3} />);

            const avatars = screen.getAllByTestId('user-avatar');
            expect(avatars).toHaveLength(3);

            // Should show +3 indicator for remaining participants
            expect(screen.getByText('+3')).toBeInTheDocument();

            // Total count should still show all participants
            expect(screen.getByText('6')).toBeInTheDocument();
        });

        it('should show all participants when count equals maxVisible', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 5)} maxVisible={5} />);

            const avatars = screen.getAllByTestId('user-avatar');
            expect(avatars).toHaveLength(5);

            // Should not show +X indicator
            expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
        });

        it('should handle maxVisible larger than participants count', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} maxVisible={10} />);

            const avatars = screen.getAllByTestId('user-avatar');
            expect(avatars).toHaveLength(3);

            // Should not show +X indicator
            expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
        });

        it('should show remaining count correctly', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={2} />);

            // Should show 2 avatars
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(2);

            // Should show +4 for remaining
            expect(screen.getByText('+4')).toBeInTheDocument();

            // Total count should be 6
            expect(screen.getByText('6')).toBeInTheDocument();
        });
    });

    describe('Size Variants', () => {
        it('should apply small size correctly', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} size="sm" />);

            const avatars = screen.getAllByTestId('user-avatar');
            avatars.forEach(avatar => {
                expect(avatar).toHaveAttribute('data-size', 'sm');
            });
        });

        it('should apply medium size correctly (default)', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            const avatars = screen.getAllByTestId('user-avatar');
            avatars.forEach(avatar => {
                expect(avatar).toHaveAttribute('data-size', 'md');
            });
        });

        it('should apply large size correctly', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} size="lg" />);

            const avatars = screen.getAllByTestId('user-avatar');
            avatars.forEach(avatar => {
                expect(avatar).toHaveAttribute('data-size', 'lg');
            });
        });

        it('should apply correct ring classes to avatars', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            const avatars = screen.getAllByTestId('user-avatar');
            avatars.forEach(avatar => {
                expect(avatar).toHaveClass('ring-2', 'ring-white', 'dark:ring-slate-800');
            });
        });
    });

    describe('Show Count Toggle', () => {
        it('should show count by default', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} />);

            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('should hide count when showCount is false', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} showCount={false} />);

            // Count should not be visible
            expect(screen.queryByText('3')).not.toBeInTheDocument();

            // Avatars should still be visible
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(3);
        });

        it('should show count when explicitly set to true', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} showCount={true} />);

            expect(screen.getByText('3')).toBeInTheDocument();
        });
    });

    describe('Click Functionality', () => {
        it('should render as static div when no onShowAll callback', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            // Should not be wrapped in a button
            expect(screen.queryByRole('button')).not.toBeInTheDocument();

            // Should be a generic div with specific classes
            const container = document.querySelector('.flex.items-center.gap-2');
            expect(container).toBeInTheDocument();
        });

        it('should render as button when onShowAll is provided', () => {
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} onShowAll={onShowAll} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(button).toHaveClass('transition-all', 'duration-200', 'hover:bg-slate-50', 'dark:hover:bg-slate-800', 'rounded-lg', 'p-1', '-m-1');
        });

        it('should call onShowAll when clicked', async () => {
            const user = userEvent.setup();
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} onShowAll={onShowAll} />);

            const button = screen.getByRole('button');
            await user.click(button);

            expect(onShowAll).toHaveBeenCalledTimes(1);
        });

        it('should show correct tooltip when clickable', () => {
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} onShowAll={onShowAll} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Ver todos los participantes (3)');
        });
    });

    describe('Avatar Order and Layout', () => {
        it('should reverse avatar order for stacking effect', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 3)} />);

            const avatars = screen.getAllByTestId('user-avatar');

            // First rendered avatar should be the last participant (reversed)
            expect(avatars[0]).toHaveAttribute('data-user-name', 'Bob Johnson');
            expect(avatars[1]).toHaveAttribute('data-user-name', 'Jane Smith');
            expect(avatars[2]).toHaveAttribute('data-user-name', 'John Doe');
        });

        it('should apply negative space between avatars', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            const avatarContainer = screen.getAllByTestId('user-avatar')[0].closest('.flex');
            expect(avatarContainer).toHaveClass('-space-x-1');
        });

        it('should wrap each avatar in relative positioned div', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} />);

            const avatars = screen.getAllByTestId('user-avatar');
            avatars.forEach(avatar => {
                expect(avatar.parentElement).toHaveClass('relative');
            });
        });
    });

    describe('Remaining Count Indicator', () => {
        it('should style remaining count indicator correctly', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={3} />);

            const indicator = screen.getByText('+3').closest('div');
            expect(indicator).toHaveClass(
                'bg-slate-200',
                'dark:bg-slate-600',
                'rounded-full',
                'flex',
                'items-center',
                'justify-center',
                'ring-2',
                'ring-white',
                'dark:ring-slate-800',
                'text-slate-600',
                'dark:text-slate-300',
                'font-medium'
            );
        });

        it('should apply correct size classes to remaining count for small size', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={2} size="sm" />);

            const indicator = screen.getByText('+4').closest('div');
            expect(indicator).toHaveClass('w-6', 'h-6');

            const text = screen.getByText('+4');
            expect(text).toHaveClass('text-xs');
        });

        it('should apply correct size classes to remaining count for large size', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={2} size="lg" />);

            const indicator = screen.getByText('+4').closest('div');
            expect(indicator).toHaveClass('w-10', 'h-10');
        });
    });

    describe('Custom Styling', () => {
        it('should apply custom className', () => {
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} className="custom-class" />);

            const container = document.querySelector('.custom-class');
            expect(container).toBeInTheDocument();
            expect(container).toHaveClass('custom-class', 'flex', 'items-center', 'gap-2');
        });

        it('should apply custom className to button wrapper when clickable', () => {
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} className="custom-class" onShowAll={onShowAll} />);

            // The className should be applied to the inner div, not the button
            const innerContainer = screen.getByRole('button').querySelector('.custom-class');
            expect(innerContainer).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle single participant with onShowAll', async () => {
            const user = userEvent.setup();
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={[mockParticipants[0]]} onShowAll={onShowAll} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Ver todos los participantes (1)');

            await user.click(button);
            expect(onShowAll).toHaveBeenCalled();
        });

        it('should handle maxVisible of 0', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={0} />);

            // Should show no avatars
            expect(screen.queryByTestId('user-avatar')).not.toBeInTheDocument();

            // Should show +6 for all participants
            expect(screen.getByText('+6')).toBeInTheDocument();

            // Total count should still show
            expect(screen.getByText('6')).toBeInTheDocument();
        });

        it('should handle maxVisible of 1 with many participants', () => {
            render(<CompactAvatarGroup participants={mockParticipants} maxVisible={1} />);

            // Should show 1 avatar
            expect(screen.getAllByTestId('user-avatar')).toHaveLength(1);

            // Should show +5 for remaining
            expect(screen.getByText('+5')).toBeInTheDocument();
        });

        it('should handle participants without photoURL', () => {
            const participantsNoPhoto = mockParticipants.map(p => ({ ...p, photoURL: null }));
            render(<CompactAvatarGroup participants={participantsNoPhoto.slice(0, 3)} />);

            const avatars = screen.getAllByTestId('user-avatar');
            expect(avatars).toHaveLength(3);

            // Each should display initials
            expect(screen.getByText('BO')).toBeInTheDocument(); // Bob Johnson (reversed order)
            expect(screen.getByText('JA')).toBeInTheDocument(); // Jane Smith
            expect(screen.getByText('JO')).toBeInTheDocument(); // John Doe
        });

        it('should handle participants with very long names', () => {
            const longNameParticipants = [
                { ...mockParticipants[0], name: 'Very Long Name That Should Be Handled Gracefully' }
            ];
            render(<CompactAvatarGroup participants={longNameParticipants} />);

            const avatar = screen.getByTestId('user-avatar');
            expect(avatar).toHaveAttribute('data-user-name', 'Very Long Name That Should Be Handled Gracefully');
        });

        it('should handle rapid clicks when clickable', async () => {
            const user = userEvent.setup();
            const onShowAll = vi.fn();
            render(<CompactAvatarGroup participants={mockParticipants.slice(0, 2)} onShowAll={onShowAll} />);

            const button = screen.getByRole('button');

            // Click multiple times rapidly
            await user.click(button);
            await user.click(button);
            await user.click(button);

            expect(onShowAll).toHaveBeenCalledTimes(3);
        });

        it('should maintain functionality with mixed participant properties', () => {
            const mixedParticipants = [
                { ...mockParticipants[0], name: 'A' }, // Single letter name
                { ...mockParticipants[1], name: '', photoURL: 'https://example.com/empty.jpg' }, // Empty name
                { ...mockParticipants[2], name: 'Normal Name' } // Normal case
            ];

            render(<CompactAvatarGroup participants={mixedParticipants} />);

            expect(screen.getAllByTestId('user-avatar')).toHaveLength(3);
            expect(screen.getByText('3')).toBeInTheDocument();
        });
    });
});
