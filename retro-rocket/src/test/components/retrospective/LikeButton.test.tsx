import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import LikeButton from '../../../components/retrospective/LikeButton';
import { Like } from '../../../types/card';

// Mock dependencies
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: vi.fn(() => ({
        t: (key: string, params?: Record<string, any>) => {
            const translations: Record<string, string> = {
                'retrospective.likeButton.likeCard': 'Like this card',
                'retrospective.likeButton.singleLike': '{username} liked this',
                'retrospective.likeButton.doubleLike': '{username1} and {username2} liked this',
                'retrospective.likeButton.multipleLikes': '{usernames} and {lastUser} liked this',
                'retrospective.likeButton.manyLikes': '{usernames} and {remaining} others liked this',
            };

            let result = translations[key] || key;

            // Advanced parameter substitution with null/undefined safety
            if (params) {
                Object.entries(params).forEach(([param, value]) => {
                    const placeholder = `{${param}}`;
                    const safeValue = value != null ? value.toString() : '';
                    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), safeValue);
                });
            }

            return result;
        },
    })),
}));

vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

vi.mock('lucide-react', () => ({
    Plus: ({ size, className }: { size?: number; className?: string }) =>
        <span data-testid="plus-icon" data-size={size} className={className}>+</span>,
}));

describe('LikeButton Component', () => {
    const defaultProps = {
        cardId: 'card-1',
        likesCount: 0,
        isLiked: false,
        onToggleLike: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('renders with zero likes', () => {
            render(<LikeButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(screen.getByText('0')).toBeInTheDocument();
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });

        it('renders with like count', () => {
            render(<LikeButton {...defaultProps} likesCount={5} />);

            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('shows plus icon', () => {
            render(<LikeButton {...defaultProps} />);

            const icon = screen.getByTestId('plus-icon');
            expect(icon).toBeInTheDocument();
            expect(icon).toHaveAttribute('data-size', '14');
        });
    });

    describe('Like States', () => {
        it('shows not liked state styling', () => {
            render(<LikeButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-slate-100');
            expect(button).toHaveClass('text-slate-600');
        });

        it('shows liked state styling', () => {
            render(<LikeButton {...defaultProps} isLiked={true} />);

            const button = screen.getByRole('button');
            expect(button).toHaveClass('bg-primary-100');
            expect(button).toHaveClass('text-primary-600');
        });

        it('shows filled icon when liked', () => {
            render(<LikeButton {...defaultProps} isLiked={true} />);

            const icon = screen.getByTestId('plus-icon');
            expect(icon).toHaveClass('fill-current');
        });

        it('shows normal icon when not liked', () => {
            render(<LikeButton {...defaultProps} isLiked={false} />);

            const icon = screen.getByTestId('plus-icon');
            expect(icon).not.toHaveClass('fill-current');
        });
    });

    describe('User Interactions', () => {
        it('calls onToggleLike when clicked', async () => {
            const user = userEvent.setup();
            const mockOnToggleLike = vi.fn();

            render(<LikeButton {...defaultProps} onToggleLike={mockOnToggleLike} />);

            const button = screen.getByRole('button');
            await user.click(button);

            expect(mockOnToggleLike).toHaveBeenCalledTimes(1);
        });

        it('does not call onToggleLike when disabled', async () => {
            const user = userEvent.setup();
            const mockOnToggleLike = vi.fn();

            render(<LikeButton {...defaultProps} onToggleLike={mockOnToggleLike} disabled={true} />);

            const button = screen.getByRole('button');
            await user.click(button);

            expect(mockOnToggleLike).not.toHaveBeenCalled();
        });

        it('shows disabled styling when disabled', () => {
            render(<LikeButton {...defaultProps} disabled={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button).toHaveClass('opacity-50');
            expect(button).toHaveClass('cursor-not-allowed');
        });
    });

    describe('Tooltip Generation', () => {
        it('shows like card tooltip when no likes', () => {
            render(<LikeButton {...defaultProps} likesCount={0} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Like this card');
        });

        it('shows single like tooltip', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() }
            ];

            render(<LikeButton {...defaultProps} likesCount={1} likes={likes} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Alice liked this');
        });

        it('shows double like tooltip', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() },
                { userId: 'user2', username: 'Bob', timestamp: new Date() }
            ];

            render(<LikeButton {...defaultProps} likesCount={2} likes={likes} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Alice and Bob liked this');
        });

        it('shows multiple likes tooltip (3-5 users)', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() },
                { userId: 'user2', username: 'Bob', timestamp: new Date() },
                { userId: 'user3', username: 'Charlie', timestamp: new Date() }
            ];

            render(<LikeButton {...defaultProps} likesCount={3} likes={likes} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Alice, Bob and Charlie liked this');
        });

        it('shows many likes tooltip (6+ users)', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() },
                { userId: 'user2', username: 'Bob', timestamp: new Date() },
                { userId: 'user3', username: 'Charlie', timestamp: new Date() },
                { userId: 'user4', username: 'Dave', timestamp: new Date() },
                { userId: 'user5', username: 'Eve', timestamp: new Date() },
                { userId: 'user6', username: 'Frank', timestamp: new Date() }
            ];

            render(<LikeButton {...defaultProps} likesCount={6} likes={likes} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Alice, Bob, Charlie and 3 others liked this');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty likes array gracefully', () => {
            render(<LikeButton {...defaultProps} likesCount={0} likes={[]} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Like this card');
        });

        it('handles missing likes prop', () => {
            render(<LikeButton {...defaultProps} likesCount={0} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title', 'Like this card');
        });

        it('handles mismatched likes count and array length', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() }
            ];

            // Count says 5 but only 1 like in array
            render(<LikeButton {...defaultProps} likesCount={5} likes={likes} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('handles very high like counts', () => {
            render(<LikeButton {...defaultProps} likesCount={999} />);

            expect(screen.getByText('999')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('has proper button role', () => {
            render(<LikeButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toBeInTheDocument();
        });

        it('has descriptive title attribute', () => {
            render(<LikeButton {...defaultProps} />);

            const button = screen.getByRole('button');
            expect(button).toHaveAttribute('title');
        });

        it('is properly disabled when disabled prop is true', () => {
            render(<LikeButton {...defaultProps} disabled={true} />);

            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
        });
    });

    describe('Props Validation', () => {
        it('accepts all required props', () => {
            expect(() => {
                render(<LikeButton {...defaultProps} />);
            }).not.toThrow();
        });

        it('accepts optional props', () => {
            const likes: Like[] = [
                { userId: 'user1', username: 'Alice', timestamp: new Date() }
            ];

            expect(() => {
                render(
                    <LikeButton
                        {...defaultProps}
                        disabled={true}
                        likes={likes}
                    />
                );
            }).not.toThrow();
        });
    });
});
