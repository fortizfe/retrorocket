import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import EmojiReactions from '@/features/boards/retrospective/components/EmojiReactions';
import { GroupedReaction } from '@/features/boards/types/card';

// Mock dependencies
vi.mock('@/lib/hooks/useBodyScrollLock', () => ({
    useBodyScrollLock: vi.fn(() => ({
        restoreScroll: vi.fn(),
    })),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: vi.fn(() => ({
        t: (key: string, fallback?: string) => {
            // Map specific translation keys to category names that match EMOJI_CATEGORIES
            const translations: Record<string, string> = {
                'retrospective.emojiReactions.categories.Emociones': 'Emociones',
                'retrospective.emojiReactions.categories.Objetos': 'Objetos',
                'retrospective.emojiReactions.categories.Naturaleza': 'Naturaleza',
            };
            return translations[key] || fallback || key;
        },
    })),
}));

vi.mock('@/lib/utils/emojiConstants', () => ({
    EMOJI_CATEGORIES: {
        'Emociones': ['😀', '😃', '😄', '😁'],
        'Objetos': ['📱', '💻', '⌨️', '🖥️'],
        'Naturaleza': ['🌿', '🌱', '🍃', '🌳'],
    },
}));

vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

vi.mock('lucide-react', () => ({
    Smile: ({ size }: { size?: number }) => <span data-testid="smile-icon">{size}</span>,
}));

// Mock createPortal to render inline
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return {
        ...actual,
        createPortal: (element: any) => element,
    };
});

describe('EmojiReactions Component', () => {
    const defaultProps = {
        cardId: 'card-1',
        groupedReactions: [] as GroupedReaction[],
        currentUserId: 'testuser',
        onReaction: vi.fn(),
        onRemoveReaction: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders add reaction button', () => {
        render(<EmojiReactions {...defaultProps} />);

        const addButton = screen.getByRole('button');
        expect(addButton).toBeInTheDocument();
        expect(screen.getByTestId('smile-icon')).toBeInTheDocument();
    });

    it('renders existing reactions', () => {
        const groupedReactions: GroupedReaction[] = [
            {
                emoji: '😄',
                count: 2,
                users: ['Alice', 'Bob'],
            },
        ];

        render(
            <EmojiReactions
                {...defaultProps}
                groupedReactions={groupedReactions}
            />
        );

        expect(screen.getByText('😄')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('highlights user reactions when user is in users array', () => {
        const groupedReactions: GroupedReaction[] = [
            {
                emoji: '😄',
                count: 1,
                users: ['testuser'], // Current user has reacted
            },
        ];

        render(
            <EmojiReactions
                {...defaultProps}
                groupedReactions={groupedReactions}
            />
        );

        const reactionButtons = screen.getAllByRole('button');
        const reactionButton = reactionButtons.find(button =>
            button.textContent?.includes('😄')
        );

        expect(reactionButton).toHaveClass('border-blue-300');
    });

    it('handles multiple reactions correctly', () => {
        const groupedReactions: GroupedReaction[] = [
            {
                emoji: '😄',
                count: 3,
                users: ['Alice', 'Bob', 'Charlie'],
            },
            {
                emoji: '👍',
                count: 1,
                users: ['Dave'],
            },
        ];

        render(
            <EmojiReactions
                {...defaultProps}
                groupedReactions={groupedReactions}
            />
        );

        expect(screen.getByText('😄')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('👍')).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('handles empty reactions gracefully', () => {
        render(<EmojiReactions {...defaultProps} groupedReactions={[]} />);

        const addButton = screen.getByRole('button');
        expect(addButton).toBeInTheDocument();
    });

    it('calls onReaction when emoji is selected from picker', async () => {
        const user = userEvent.setup();
        const mockOnReaction = vi.fn();

        render(
            <EmojiReactions
                {...defaultProps}
                onReaction={mockOnReaction}
            />
        );

        // Open picker
        const addButton = screen.getByRole('button');
        await user.click(addButton);

        await waitFor(() => {
            expect(screen.getByText('😀')).toBeInTheDocument();
        });

        // Click emoji
        const emojiButtons = screen.getAllByRole('button');
        const emojiButton = emojiButtons.find(button =>
            button.textContent?.includes('😀')
        );

        if (emojiButton) {
            await user.click(emojiButton);
            expect(mockOnReaction).toHaveBeenCalledWith('😀');
        }
    });

    it('calls onRemoveReaction when user clicks their own reaction', async () => {
        const user = userEvent.setup();
        const mockOnRemoveReaction = vi.fn();

        const groupedReactions: GroupedReaction[] = [
            {
                emoji: '😄',
                count: 1,
                users: ['testuser'], // Current user has reacted
            },
        ];

        render(
            <EmojiReactions
                {...defaultProps}
                groupedReactions={groupedReactions}
                onRemoveReaction={mockOnRemoveReaction}
            />
        );

        const reactionButtons = screen.getAllByRole('button');
        const reactionButton = reactionButtons.find(button =>
            button.textContent?.includes('😄')
        );

        if (reactionButton) {
            await user.click(reactionButton);
            expect(mockOnRemoveReaction).toHaveBeenCalled();
        }
    });

    it('calls onReaction when user clicks others reaction to add their own', async () => {
        const user = userEvent.setup();
        const mockOnReaction = vi.fn();

        const groupedReactions: GroupedReaction[] = [
            {
                emoji: '😄',
                count: 1,
                users: ['otheruser'], // Other user has reacted, not current user
            },
        ];

        render(
            <EmojiReactions
                {...defaultProps}
                groupedReactions={groupedReactions}
                onReaction={mockOnReaction}
            />
        );

        const reactionButtons = screen.getAllByRole('button');
        const reactionButton = reactionButtons.find(button =>
            button.textContent?.includes('😄')
        );

        if (reactionButton) {
            await user.click(reactionButton);
            expect(mockOnReaction).toHaveBeenCalledWith('😄');
        }
    });
});
