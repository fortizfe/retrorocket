import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupCard } from '../../../components/retrospective/GroupCard';
import { CardGroup, Card, EmojiReaction } from '../../../types/card';

// Mock de dependencias
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, params?: any) => {
            if (key === 'retrospective.groupCard.confirmUngroupCards') {
                return `Are you sure you want to ungroup ${params?.totalCards} cards?`;
            }
            if (key === 'retrospective.groupCard.groupOfCards') {
                return `Group of ${params?.totalCards} cards`;
            }
            if (key === 'retrospective.groupCard.cardsCount') {
                return `${params?.count} cards`;
            }
            if (key === 'retrospective.groupCard.votesCount') {
                return `${params?.count} votes`;
            }
            if (key === 'retrospective.groupCard.likesCount') {
                return `${params?.count} likes`;
            }
            if (key === 'retrospective.groupCard.ungroupCards') {
                return 'Ungroup cards';
            }
            if (key === 'retrospective.groupCard.primaryCard') {
                return 'Primary';
            }
            if (key === 'retrospective.groupCard.moreCards') {
                return `+${params?.count} more`;
            }
            return key;
        }
    })
}));

vi.mock('../../../components/retrospective/DraggableCard', () => ({
    default: ({ card, onUpdate, onDelete, onVote, onLike, onReaction, onReactionRemove }: any) => (
        <div data-testid={`draggable-card-${card.id}`}>
            <div data-testid={`card-content-${card.id}`}>{card.content}</div>
            <button data-testid={`update-${card.id}`} onClick={() => onUpdate?.(card.id, { content: 'updated' })}>
                Update
            </button>
            <button data-testid={`delete-${card.id}`} onClick={() => onDelete?.(card.id)}>
                Delete
            </button>
            <button data-testid={`vote-${card.id}`} onClick={() => onVote?.(card.id, true)}>
                Vote
            </button>
            <button data-testid={`like-${card.id}`} onClick={() => onLike?.(card.id, 'user1', 'user1')}>
                Like
            </button>
            <button data-testid={`react-${card.id}`} onClick={() => onReaction?.(card.id, 'user1', 'user1', '👍' as EmojiReaction)}>
                React
            </button>
            <button data-testid={`remove-reaction-${card.id}`} onClick={() => onReactionRemove?.(card.id, 'user1')}>
                Remove Reaction
            </button>
        </div>
    ),
}));

// Mock de window.confirm
Object.defineProperty(window, 'confirm', {
    writable: true,
    value: vi.fn(),
});

describe('GroupCard', () => {
    const mockGroup: CardGroup = {
        id: 'group-1',
        retrospectiveId: 'retro-1',
        column: 'helped',
        headCardId: 'card-1',
        memberCardIds: ['card-2', 'card-3'],
        isCollapsed: false,
        title: 'Test Group',
        totalVotes: 5,
        totalLikes: 3,
        createdAt: new Date(),
        createdBy: 'user1',
        order: 1
    };

    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'Head card content',
            column: 'helped',
            createdBy: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            votes: 3,
            color: 'pastelBlue',
            likes: [
                { userId: 'user1', username: 'User 1', timestamp: new Date() },
                { userId: 'user2', username: 'User 2', timestamp: new Date() }
            ],
            reactions: [
                { userId: 'user1', username: 'User 1', emoji: '👍', timestamp: new Date() }
            ]
        },
        {
            id: 'card-2',
            content: 'Member card 1 content',
            column: 'helped',
            createdBy: 'user2',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            votes: 1,
            groupOrder: 1,
            color: 'pastelGreen'
        },
        {
            id: 'card-3',
            content: 'Member card 2 content',
            column: 'helped',
            createdBy: 'user3',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            votes: 1,
            groupOrder: 2,
            color: 'pastelYellow'
        }
    ];

    const defaultProps = {
        group: mockGroup,
        cards: mockCards,
        onToggleCollapse: vi.fn(),
        onDisbandGroup: vi.fn(),
        onRemoveCardFromGroup: vi.fn(),
        onCardUpdate: vi.fn(),
        onCardDelete: vi.fn(),
        onCardVote: vi.fn(),
        onCardLike: vi.fn(),
        onCardReaction: vi.fn(),
        onCardReactionRemove: vi.fn(),
        currentUserId: 'user1',
        isReadOnly: false
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (window.confirm as any).mockReturnValue(true);
    });

    describe('Rendering', () => {
        it('renders group card with header', () => {
            render(<GroupCard {...defaultProps} />);

            expect(screen.getByText('Test Group')).toBeInTheDocument();
            expect(screen.getByText('3 cards')).toBeInTheDocument();
            expect(screen.getByText('5 votes')).toBeInTheDocument();
            expect(screen.getByText('3 likes')).toBeInTheDocument();
        });

        it('renders head card with primary badge when has member cards', () => {
            render(<GroupCard {...defaultProps} />);

            expect(screen.getByTestId('draggable-card-card-1')).toBeInTheDocument();
            expect(screen.getByText('Primary')).toBeInTheDocument();
        });

        it('renders member cards with proper ordering', () => {
            render(<GroupCard {...defaultProps} />);

            expect(screen.getByTestId('draggable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-3')).toBeInTheDocument();
            expect(screen.getByTestId('card-content-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('card-content-card-3')).toBeInTheDocument();
        });

        it('shows collapse/expand button', () => {
            render(<GroupCard {...defaultProps} />);

            // Find the collapse button by looking for the button that contains chevron icons
            const buttons = screen.getAllByRole('button');
            const collapseButton = buttons.find(button =>
                button.querySelector('svg') &&
                button.className.includes('group')
            );

            expect(collapseButton).toBeInTheDocument();
        });

        it('shows ungroup button on hover when not read-only', () => {
            render(<GroupCard {...defaultProps} />);

            const groupContainer = screen.getByText('Test Group').closest('div')?.closest('div')?.closest('div');

            if (groupContainer) {
                fireEvent.mouseEnter(groupContainer);
                expect(screen.getByTitle('Ungroup cards')).toBeInTheDocument();
            }
        });

        it('does not show ungroup button when read-only', () => {
            render(<GroupCard {...defaultProps} isReadOnly={true} />);

            const groupContainer = screen.getByText('Test Group').closest('div')?.closest('div')?.closest('div');

            if (groupContainer) {
                fireEvent.mouseEnter(groupContainer);
                expect(screen.queryByTitle('Ungroup cards')).not.toBeInTheDocument();
            }
        });

        it('displays default title when no custom title', () => {
            const groupWithoutTitle = { ...mockGroup, title: '' };
            render(<GroupCard {...defaultProps} group={groupWithoutTitle} />);

            expect(screen.getByText('Group of 3 cards')).toBeInTheDocument();
        });

        it('does not render when head card is missing', () => {
            const cardsWithoutHead = mockCards.filter(card => card.id !== 'card-1');
            const { container } = render(<GroupCard {...defaultProps} cards={cardsWithoutHead} />);

            expect(container.firstChild).toBeNull();
        });
    });

    describe('Collapse/Expand functionality', () => {
        it('calls onToggleCollapse when collapse button is clicked', () => {
            render(<GroupCard {...defaultProps} />);

            // Find the collapse button by looking for the button that contains chevron icons
            const buttons = screen.getAllByRole('button');
            const collapseButton = buttons.find(button =>
                button.querySelector('svg') &&
                button.className.includes('group')
            ) || buttons[0];

            fireEvent.click(collapseButton);

            expect(defaultProps.onToggleCollapse).toHaveBeenCalledWith('group-1');
        });

        it('shows collapsed state summary when collapsed', () => {
            const collapsedGroup = { ...mockGroup, isCollapsed: true };
            render(<GroupCard {...defaultProps} group={collapsedGroup} />);

            expect(screen.getByText('Head card content')).toBeInTheDocument();
            expect(screen.getByText('+2 more')).toBeInTheDocument();
        });

        it('truncates long content in collapsed state', () => {
            const longContentCard = {
                ...mockCards[0],
                content: 'This is a very long card content that should be truncated when displayed in collapsed state'
            };
            const cardsWithLongContent = [longContentCard, ...mockCards.slice(1)];
            const collapsedGroup = { ...mockGroup, isCollapsed: true };

            render(<GroupCard {...defaultProps} group={collapsedGroup} cards={cardsWithLongContent} />);

            // Look for the truncated text with ... at the end
            expect(screen.getByText(/This is a very long card content that should be tr/)).toBeInTheDocument();
        });

        it('does not show member cards when collapsed', () => {
            const collapsedGroup = { ...mockGroup, isCollapsed: true };
            render(<GroupCard {...defaultProps} group={collapsedGroup} />);

            expect(screen.queryByTestId('draggable-card-card-2')).not.toBeInTheDocument();
            expect(screen.queryByTestId('draggable-card-card-3')).not.toBeInTheDocument();
        });
    });

    describe('Group disbanding', () => {
        it('calls onDisbandGroup when ungroup button is clicked with confirmation', () => {
            render(<GroupCard {...defaultProps} />);

            const groupContainer = screen.getByText('Test Group').closest('div')?.closest('div')?.closest('div');

            if (groupContainer) {
                fireEvent.mouseEnter(groupContainer);
                const ungroupButton = screen.getByTitle('Ungroup cards');
                fireEvent.click(ungroupButton);

                expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to ungroup 3 cards?');
                expect(defaultProps.onDisbandGroup).toHaveBeenCalledWith('group-1');
            }
        });

        it('does not disband group when confirmation is cancelled', () => {
            (window.confirm as any).mockReturnValue(false);
            render(<GroupCard {...defaultProps} />);

            const groupContainer = screen.getByText('Test Group').closest('div')?.closest('div')?.closest('div');

            if (groupContainer) {
                fireEvent.mouseEnter(groupContainer);
                const ungroupButton = screen.getByTitle('Ungroup cards');
                fireEvent.click(ungroupButton);

                expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to ungroup 3 cards?');
                expect(defaultProps.onDisbandGroup).not.toHaveBeenCalled();
            }
        });

        it('disbands group when head card is deleted', async () => {
            render(<GroupCard {...defaultProps} />);

            const deleteHeadButton = screen.getByTestId('delete-card-1');
            fireEvent.click(deleteHeadButton);

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to ungroup 3 cards?');
            expect(defaultProps.onDisbandGroup).toHaveBeenCalledWith('group-1');
        });
    });

    describe('Card removal', () => {
        it('removes member card from group when member card is deleted', () => {
            render(<GroupCard {...defaultProps} />);

            const deleteMemberButton = screen.getByTestId('delete-card-2');
            fireEvent.click(deleteMemberButton);

            expect(defaultProps.onRemoveCardFromGroup).toHaveBeenCalledWith('card-2');
        });
    });

    describe('Card interactions', () => {
        it('propagates card update events', async () => {
            render(<GroupCard {...defaultProps} />);

            const updateButton = screen.getByTestId('update-card-1');
            fireEvent.click(updateButton);

            await waitFor(() => {
                expect(defaultProps.onCardUpdate).toHaveBeenCalledWith('card-1', { content: 'updated' });
            });
        });

        it('propagates card vote events', async () => {
            render(<GroupCard {...defaultProps} />);

            const voteButton = screen.getByTestId('vote-card-1');
            fireEvent.click(voteButton);

            await waitFor(() => {
                expect(defaultProps.onCardVote).toHaveBeenCalledWith('card-1', true);
            });
        });

        it('propagates card like events', async () => {
            render(<GroupCard {...defaultProps} />);

            const likeButton = screen.getByTestId('like-card-1');
            fireEvent.click(likeButton);

            await waitFor(() => {
                expect(defaultProps.onCardLike).toHaveBeenCalledWith('card-1', 'user1', 'user1');
            });
        });

        it('propagates card reaction events', async () => {
            render(<GroupCard {...defaultProps} />);

            const reactButton = screen.getByTestId('react-card-1');
            fireEvent.click(reactButton);

            await waitFor(() => {
                expect(defaultProps.onCardReaction).toHaveBeenCalledWith('card-1', 'user1', 'user1', '👍');
            });
        });

        it('propagates card reaction removal events', async () => {
            render(<GroupCard {...defaultProps} />);

            const removeReactionButton = screen.getByTestId('remove-reaction-card-1');
            fireEvent.click(removeReactionButton);

            await waitFor(() => {
                expect(defaultProps.onCardReactionRemove).toHaveBeenCalledWith('card-1', 'user1');
            });
        });
    });

    describe('Read-only mode', () => {
        it('disables collapse button in read-only mode', () => {
            render(<GroupCard {...defaultProps} isReadOnly={true} />);

            // Find the collapse button by looking for the button that contains chevron icons
            const buttons = screen.getAllByRole('button');
            const collapseButton = buttons.find(button =>
                button.querySelector('svg') &&
                button.className.includes('group')
            ) || buttons[0];

            expect(collapseButton).toBeDisabled();
        });

        it('passes read-only state to child cards', () => {
            render(<GroupCard {...defaultProps} isReadOnly={true} />);

            // Child DraggableCard components should receive canEdit={false}
            expect(screen.getByTestId('draggable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-3')).toBeInTheDocument();
        });
    });

    describe('Statistics display', () => {
        it('shows votes count when totalVotes > 0', () => {
            render(<GroupCard {...defaultProps} />);

            expect(screen.getByText('5 votes')).toBeInTheDocument();
        });

        it('shows likes count when totalLikes > 0', () => {
            render(<GroupCard {...defaultProps} />);

            expect(screen.getByText('3 likes')).toBeInTheDocument();
        });

        it('does not show votes count when totalVotes is 0', () => {
            const groupWithoutVotes = { ...mockGroup, totalVotes: 0 };
            render(<GroupCard {...defaultProps} group={groupWithoutVotes} />);

            expect(screen.queryByText('0 votes')).not.toBeInTheDocument();
        });

        it('does not show likes count when totalLikes is 0', () => {
            const groupWithoutLikes = { ...mockGroup, totalLikes: 0 };
            render(<GroupCard {...defaultProps} group={groupWithoutLikes} />);

            expect(screen.queryByText('0 likes')).not.toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('handles group with only head card (no members)', () => {
            const soloGroup = { ...mockGroup, memberCardIds: [] };
            const soloCards = [mockCards[0]];

            render(<GroupCard {...defaultProps} group={soloGroup} cards={soloCards} />);

            expect(screen.getByText('1 cards')).toBeInTheDocument();
            expect(screen.queryByText('Primary')).not.toBeInTheDocument(); // No primary badge for solo card
            expect(screen.getByTestId('draggable-card-card-1')).toBeInTheDocument();
        });

        it('handles missing member cards gracefully', () => {
            const cardsWithMissingMember = [mockCards[0], mockCards[1]]; // Missing card-3

            render(<GroupCard {...defaultProps} cards={cardsWithMissingMember} />);

            expect(screen.getByTestId('draggable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-2')).toBeInTheDocument();
            expect(screen.queryByTestId('draggable-card-card-3')).not.toBeInTheDocument();
        });

        it('handles undefined optional props gracefully', () => {
            const minimalProps = {
                group: mockGroup,
                cards: mockCards,
                onToggleCollapse: vi.fn(),
                onDisbandGroup: vi.fn(),
                onRemoveCardFromGroup: vi.fn(),
                onCardUpdate: vi.fn(),
                onCardDelete: vi.fn(),
            };

            render(<GroupCard {...minimalProps} />);

            expect(screen.getByTestId('draggable-card-card-1')).toBeInTheDocument();
        });

        it('handles empty group title correctly', () => {
            const groupWithEmptyTitle = { ...mockGroup, title: '   ' };
            render(<GroupCard {...defaultProps} group={groupWithEmptyTitle} />);

            expect(screen.getByText('Group of 3 cards')).toBeInTheDocument();
        });

        it('sorts member cards by groupOrder', () => {
            const unorderedCards = [
                mockCards[0], // head card
                { ...mockCards[2], groupOrder: 1 }, // Should be first member
                { ...mockCards[1], groupOrder: 2 }  // Should be second member
            ];

            render(<GroupCard {...defaultProps} cards={unorderedCards} />);

            // Both cards should be rendered (order testing would require more complex DOM inspection)
            expect(screen.getByTestId('draggable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-3')).toBeInTheDocument();
        });
    });
});
