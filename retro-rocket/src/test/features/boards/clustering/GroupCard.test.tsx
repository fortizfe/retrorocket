import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupCard } from '@/features/boards/clustering/components/GroupCard';
import { CardGroup, Card, EmojiReaction } from '@/features/boards/types/card';
import { useDraggable } from '@dnd-kit/core';
import { ColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { calculateGroupAggregations } from '@/features/boards/clustering/services/cardGroupService';

// Mock de dependencias
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    // A detectable marker (not a bare fragment passthrough) so tests can assert the
    // member-card list is actually wrapped in AnimatePresence — required for a removed
    // member card to exit-animate instead of vanishing instantly (design audit finding,
    // spec 028: same AnimatePresence-boundary bug class as DAF-001).
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
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

// Pass-through spy (real behaviour) so the spec-059 US6 block can assert useDraggable's arguments.
vi.mock('@dnd-kit/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@dnd-kit/core')>();
    return { ...actual, useDraggable: vi.fn(actual.useDraggable) };
});

vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card, onUpdate, onDelete, onVote, onLike, onReaction, onReactionRemove, dragHandleProps }: any) => (
        <div data-testid={`draggable-card-${card.id}`}>
            {/* spec 059 T066: mirrors the real DraggableCard handle wiring (only rendered when
                GroupCard passes dragHandleProps, which existing tests never trigger). */}
            {dragHandleProps && (
                <button
                    type="button"
                    data-testid={`drag-handle-${card.id}`}
                    ref={dragHandleProps.setActivatorNodeRef}
                    aria-label="retrospective.card.dragHandle"
                    {...dragHandleProps.attributes}
                    {...dragHandleProps.listeners}
                />
            )}
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

        it('shows the ungroup button at rest, with no hover required, when not read-only (research.md §3, FR-012)', () => {
            render(<GroupCard {...defaultProps} />);

            // No fireEvent.mouseEnter here: the previous `isHovered &&` guard kept
            // this control out of the DOM entirely until a mouse hovered it, making
            // it unreachable via keyboard/touch — a stricter defect than opacity-0
            // alone. It must now be present unconditionally.
            expect(screen.getByTitle('Ungroup cards')).toBeInTheDocument();
        });

        it('does not show ungroup button when read-only', () => {
            render(<GroupCard {...defaultProps} isReadOnly={true} />);

            expect(screen.queryByTitle('Ungroup cards')).not.toBeInTheDocument();
        });

        it('displays default title when no custom title', () => {
            const groupWithoutTitle = { ...mockGroup, title: '' };
            render(<GroupCard {...defaultProps} group={groupWithoutTitle} />);

            expect(screen.getByText('retrospective.groupCard.defaultGroupTitle')).toBeInTheDocument();
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

            const ungroupButton = screen.getByTitle('Ungroup cards');
            fireEvent.click(ungroupButton);

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to ungroup 3 cards?');
            expect(defaultProps.onDisbandGroup).toHaveBeenCalledWith('group-1');
        });

        it('does not disband group when confirmation is cancelled', () => {
            (window.confirm as any).mockReturnValue(false);
            render(<GroupCard {...defaultProps} />);

            const ungroupButton = screen.getByTitle('Ungroup cards');
            fireEvent.click(ungroupButton);

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to ungroup 3 cards?');
            expect(defaultProps.onDisbandGroup).not.toHaveBeenCalled();
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

    describe('Exit animation boundary (design audit finding, spec 028)', () => {
        it('wraps the member-card list in its own AnimatePresence (distinct from the collapse/expand one), so a removed member card can exit-animate instead of vanishing instantly', () => {
            render(<GroupCard {...defaultProps} />);

            // One AnimatePresence already exists for collapse/expand (group-content
            // toggle). A correct fix adds a second, dedicated one directly around the
            // member-card list — its absence is exactly the bug: without it, both
            // member cards are still structurally nested inside the outer
            // AnimatePresence (so a weaker "is some AnimatePresence an ancestor?"
            // check would pass even with the bug present), but the outer one's
            // children array doesn't change shape when a single member card is
            // removed from the interior list — only a list-scoped AnimatePresence
            // sees that removal directly.
            expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(2);
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

            expect(screen.getByText('retrospective.groupCard.defaultGroupTitle')).toBeInTheDocument();
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

    describe('Group title (spec 059, T038: T7 / T2 / T3)', () => {
        const renderGroup = (group: Partial<CardGroup> = {}, props: Record<string, unknown> = {}) =>
            render(
                <GroupCard
                    group={{ ...mockGroup, ...group }}
                    cards={mockCards}
                    onToggleCollapse={vi.fn()}
                    onDisbandGroup={vi.fn()}
                    onRemoveCardFromGroup={vi.fn()}
                    onCardUpdate={vi.fn()}
                    {...(props as object)}
                />
            );

        it('T7: an untitled group shows defaultGroupTitle, not groupOfCards', () => {
            renderGroup({ title: undefined });

            expect(screen.getByText('retrospective.groupCard.defaultGroupTitle')).toBeInTheDocument();
            expect(screen.queryByText(/Group of \d+ cards/)).not.toBeInTheDocument();
        });

        it('T7: a whitespace-only title is untitled too', () => {
            renderGroup({ title: '   ' });

            expect(screen.getByText('retrospective.groupCard.defaultGroupTitle')).toBeInTheDocument();
        });

        it('T7: a titled group still shows its own title', () => {
            renderGroup({ title: 'Team Collaboration' });

            expect(screen.getByText('Team Collaboration')).toBeInTheDocument();
            expect(screen.queryByText('retrospective.groupCard.defaultGroupTitle')).not.toBeInTheDocument();
        });

        it('no input is shown without autoEditTitle', () => {
            renderGroup({ title: 'Team Collaboration' });

            expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
        });

        it('T2: autoEditTitle opens a focused input with the whole title selected and calls onAutoEditConsumed once', async () => {
            const onAutoEditConsumed = vi.fn();
            renderGroup({ title: 'Team Collaboration' }, { autoEditTitle: true, onAutoEditConsumed, onRenameGroup: vi.fn() });

            const input = (await screen.findByRole('textbox')) as HTMLInputElement;
            await waitFor(() => expect(input).toHaveFocus());
            expect(input.value).toBe('Team Collaboration');
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(input.value.length);
            expect(onAutoEditConsumed).toHaveBeenCalledTimes(1);
        });

        it('T2: autoEditTitle on an untitled group edits the default title with everything selected', async () => {
            renderGroup({ title: undefined }, { autoEditTitle: true, onAutoEditConsumed: vi.fn(), onRenameGroup: vi.fn() });

            const input = (await screen.findByRole('textbox')) as HTMLInputElement;
            await waitFor(() => expect(input).toHaveFocus());
            expect(input.value).toBe('retrospective.groupCard.defaultGroupTitle');
            expect(input.selectionStart).toBe(0);
            expect(input.selectionEnd).toBe(input.value.length);
        });

        it('T2: onAutoEditConsumed is not called again on re-render', async () => {
            const onAutoEditConsumed = vi.fn();
            const props = { autoEditTitle: true, onAutoEditConsumed, onRenameGroup: vi.fn() };
            const { rerender } = renderGroup({ title: 'Team Collaboration' }, props);
            await screen.findByRole('textbox');

            rerender(
                <GroupCard
                    group={{ ...mockGroup, title: 'Team Collaboration' }}
                    cards={mockCards}
                    onToggleCollapse={vi.fn()}
                    onDisbandGroup={vi.fn()}
                    onRemoveCardFromGroup={vi.fn()}
                    onCardUpdate={vi.fn()}
                    {...props}
                />
            );

            expect(onAutoEditConsumed).toHaveBeenCalledTimes(1);
        });

        it('T3: Enter commits onRenameGroup(groupId, trimmedTitle)', async () => {
            const onRenameGroup = vi.fn(async () => { });
            renderGroup({ title: 'Team Collaboration' }, { autoEditTitle: true, onAutoEditConsumed: vi.fn(), onRenameGroup });
            const input = await screen.findByRole('textbox');

            fireEvent.change(input, { target: { value: '  Retro wins  ' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith('group-1', 'Retro wins'));
            expect(onRenameGroup).toHaveBeenCalledTimes(1);
        });

        it('T3: Enter on an emptied input commits null (clears the title)', async () => {
            const onRenameGroup = vi.fn(async () => { });
            renderGroup({ title: 'Team Collaboration' }, { autoEditTitle: true, onAutoEditConsumed: vi.fn(), onRenameGroup });
            const input = await screen.findByRole('textbox');

            fireEvent.change(input, { target: { value: '   ' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith('group-1', null));
        });

        it('T4: Enter on an unchanged value does not commit', async () => {
            const onRenameGroup = vi.fn(async () => { });
            renderGroup({ title: 'Team Collaboration' }, { autoEditTitle: true, onAutoEditConsumed: vi.fn(), onRenameGroup });
            const input = await screen.findByRole('textbox');

            fireEvent.keyDown(input, { key: 'Enter' });

            expect(onRenameGroup).not.toHaveBeenCalled();
        });
    });
});

// ---------------------------------------------------------------------------
// T049 (spec 059-drag-to-group-cards, US2): GroupCard renders the REAL GroupTitleEditor
// (kept real on purpose: mocking it would only prove prop plumbing, not the optimistic
// title / commit behaviour the story is about). `t` in this file is mocked to return
// the key (renameGroupLabel is not interpolated here), so the display button's accessible
// name is exactly `retrospective.groupCard.renameGroupLabel`.
// CONTRACTS: GroupCard puts the editor inside its <h3> heading; clicking the display button
// edits; commit calls onRenameGroup(group.id, trimmed | null); isReadOnly -> plain text.
// ---------------------------------------------------------------------------
describe('GroupCard title editing (spec 059, T049)', () => {
    const baseGroup: CardGroup = {
        id: 'group-1', retrospectiveId: 'retro-1', column: 'helped', headCardId: 'card-1',
        memberCardIds: ['card-2'], isCollapsed: false, title: 'Original',
        createdAt: new Date(), createdBy: 'user1', order: 1,
    };
    const cardsFor = (): Card[] => [
        { id: 'card-1', content: 'Head', column: 'helped', createdBy: 'user1', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'retro-1', color: 'pastelBlue' },
        { id: 'card-2', content: 'Member', column: 'helped', createdBy: 'user2', createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'retro-1', groupOrder: 1, color: 'pastelGreen' },
    ];
    const tree = (group: Partial<CardGroup>, props: Record<string, unknown> = {}) => (
        <GroupCard
            group={{ ...baseGroup, ...group }}
            cards={cardsFor()}
            onToggleCollapse={vi.fn()}
            onDisbandGroup={vi.fn()}
            onRemoveCardFromGroup={vi.fn()}
            onCardUpdate={vi.fn()}
            {...(props as object)}
        />
    );
    const RENAME_NAME = 'retrospective.groupCard.renameGroupLabel';
    const startEdit = () => {
        fireEvent.click(screen.getByRole('button', { name: RENAME_NAME }));
        return screen.getByRole('textbox') as HTMLInputElement;
    };

    it('renders the title as a rename button inside the h3 heading', () => {
        render(tree({ title: 'Original' }, { onRenameGroup: vi.fn() }));

        const heading = screen.getByRole('heading', { level: 3 });
        const button = screen.getByRole('button', { name: RENAME_NAME });
        expect(heading).toContainElement(button);
        expect(button).toHaveTextContent('Original');
    });

    it('clicking the title opens an input with the current title', () => {
        render(tree({ title: 'Original' }, { onRenameGroup: vi.fn() }));

        expect(startEdit().value).toBe('Original');
    });

    it('committing a new title calls onRenameGroup(groupId, trimmedTitle)', async () => {
        const onRenameGroup = vi.fn(async () => { });
        render(tree({ title: 'Original' }, { onRenameGroup }));
        const input = startEdit();

        fireEvent.change(input, { target: { value: '  Renamed  ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith('group-1', 'Renamed'));
        expect(onRenameGroup).toHaveBeenCalledTimes(1);
    });

    it('committing an emptied title calls onRenameGroup(groupId, null)', async () => {
        const onRenameGroup = vi.fn(async () => { });
        render(tree({ title: 'Original' }, { onRenameGroup }));
        const input = startEdit();

        fireEvent.change(input, { target: { value: '   ' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => expect(onRenameGroup).toHaveBeenCalledWith('group-1', null));
    });

    it('an unchanged title never calls onRenameGroup', () => {
        const onRenameGroup = vi.fn(async () => { });
        render(tree({ title: 'Original' }, { onRenameGroup }));
        const input = startEdit();

        fireEvent.keyDown(input, { key: 'Enter' });

        expect(onRenameGroup).not.toHaveBeenCalled();
    });

    it('shows the optimistic title until the realtime group.title prop updates', async () => {
        const onRenameGroup = vi.fn(async () => { });
        const { rerender } = render(tree({ title: 'Original' }, { onRenameGroup }));
        const input = startEdit();
        fireEvent.change(input, { target: { value: 'Renamed' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => expect(screen.getByRole('button', { name: RENAME_NAME })).toHaveTextContent('Renamed'));

        // unrelated re-render with the stale prop: optimistic value stays
        rerender(tree({ title: 'Original' }, { onRenameGroup }));
        expect(screen.getByRole('button', { name: RENAME_NAME })).toHaveTextContent('Renamed');

        // the realtime update arrives (even with a different value): the prop wins
        rerender(tree({ title: 'Server says' }, { onRenameGroup }));
        expect(screen.getByRole('button', { name: RENAME_NAME })).toHaveTextContent('Server says');
    });

    it('a failed rename reverts to the group.title prop', async () => {
        const onRenameGroup = vi.fn(async () => { throw new Error('409'); });
        render(tree({ title: 'Original' }, { onRenameGroup }));
        const input = startEdit();

        fireEvent.change(input, { target: { value: 'Renamed' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        await waitFor(() => expect(onRenameGroup).toHaveBeenCalled());
        await waitFor(() => expect(screen.getByRole('button', { name: RENAME_NAME })).toHaveTextContent('Original'));
    });

    it('isReadOnly renders the title as plain text: no rename button', () => {
        render(tree({ title: 'Original' }, { isReadOnly: true, onRenameGroup: vi.fn() }));

        expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Original');
        expect(screen.queryByRole('button', { name: RENAME_NAME })).not.toBeInTheDocument();
    });

    it('without onRenameGroup the title is not editable (no rename button)', () => {
        render(tree({ title: 'Original' }));

        expect(screen.queryByRole('button', { name: RENAME_NAME })).not.toBeInTheDocument();
    });

    it('an untitled group shows the default title on the rename button', () => {
        render(tree({ title: undefined }, { onRenameGroup: vi.fn() }));

        expect(screen.getByRole('button', { name: RENAME_NAME })).toHaveTextContent('retrospective.groupCard.defaultGroupTitle');
    });

    it('autoEditTitle (US1 interim behaviour, now via the editor) still opens a focused, fully selected input and consumes once', async () => {
        const onAutoEditConsumed = vi.fn();
        render(tree({ title: 'Original' }, { autoEditTitle: true, onAutoEditConsumed, onRenameGroup: vi.fn() }));

        const input = (await screen.findByRole('textbox')) as HTMLInputElement;
        await waitFor(() => expect(input).toHaveFocus());
        expect(input.selectionStart).toBe(0);
        expect(input.selectionEnd).toBe('Original'.length);
        expect(onAutoEditConsumed).toHaveBeenCalledTimes(1);
    });
});

// ===========================================================================================
// T062 (GroupCard half) + T066 — spec 059-drag-to-group-cards (US3 armed group, US6 handles).
// RED phase.
//
// CONTRACTS FIXED BY THESE BLOCKS:
//  - GroupCard reads the live drag state from `useOptionalColumnGroupingContext()` (no new
//    props; renders fine without a provider, as the existing tests do).
//  - Armed group (B5b): `armedTargetId === 'group:<group.id>'` puts `data-group-target="armed"`
//    on GroupCard's ROOT element, with the same ring as cards (`ring-2 ring-action`), and
//    renders the "Drop to group" badge (`retrospective.dragGroup.dropToGroup`) inside an
//    `aria-hidden` overlay (colour is never the only cue; dnd-kit's live region announces it).
//    `busyTargetId === 'group:<id>'` -> `aria-busy="true"` on the root. Any other value leaves
//    the group untouched.
//  - Member handles (D1/D7): when the context says `groupingEnabled` and the group is not
//    read-only, the head card AND every member card get `dragHandleProps` (attributes,
//    listeners, setActivatorNodeRef) from `useDraggable({ id: 'member:<cardId>',
//    data: { type: 'member', groupId } })`, so DraggableCard renders its drag handle. Without
//    a context or with `groupingEnabled: false` (mode user) no handle is rendered and no
//    `member:*` draggable is enabled (a hook may still be called with `disabled: true`).
//  - The handle's accessible name and focus ring belong to DraggableCard (asserted in
//    DraggableCard.test.tsx); here the stub mirrors them to prove the wiring.
// ===========================================================================================
describe('GroupCard armed feedback (spec 059, T062: B5b)', () => {
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    const group: CardGroup = {
        id: 'group-1', retrospectiveId: 'retro-1', column: 'helped', headCardId: 'card-1',
        memberCardIds: ['card-2'], isCollapsed: false, title: 'Test Group', totalVotes: 0, totalLikes: 0,
        createdAt: t0, createdBy: 'user1', order: 1,
    };
    const card = (id: string, extra: Partial<Card> = {}): Card => ({
        id, content: `content ${id}`, column: 'helped', createdBy: 'user1', createdAt: t0, updatedAt: t0,
        retrospectiveId: 'retro-1', color: 'pastelBlue', votes: 0, ...extra,
    });
    const cards = [card('card-1'), card('card-2', { groupOrder: 1 })];
    const baseProps = {
        group, cards,
        onToggleCollapse: vi.fn(), onDisbandGroup: vi.fn(), onRemoveCardFromGroup: vi.fn(), onCardUpdate: vi.fn(),
    };
    const ctx = (overrides: Record<string, unknown> = {}) => ({
        columnId: 'helped', groupingEnabled: true, items: [], groups: [group], ungroupedCards: [],
        armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
        consumePendingEdit: vi.fn(), requestMove: vi.fn(), computeOrder: vi.fn(() => 0),
        ...overrides,
    });
    const renderIn = (value: Record<string, unknown>, props: Record<string, unknown> = {}) =>
        render(
            <ColumnGroupingContext.Provider value={value as never}>
                <GroupCard {...baseProps} {...(props as object)} />
            </ColumnGroupingContext.Provider>,
        );

    it('an armed group marks its root with data-group-target="armed" and shows the "Drop to group" badge', () => {
        const { container } = renderIn(ctx({ armedTargetId: 'group:group-1' }));

        expect(container.firstElementChild).toHaveAttribute('data-group-target', 'armed');
        expect(screen.getByText('retrospective.dragGroup.dropToGroup')).toBeInTheDocument();
    });

    it('the armed ring matches the cards (ring-2 ring-action)', () => {
        const { container } = renderIn(ctx({ armedTargetId: 'group:group-1' }));

        const root = container.firstElementChild as HTMLElement;
        expect(root.className).toMatch(/(^|\s)ring-2(\s|$)/);
        expect(root.className).toMatch(/(^|\s)ring-action(\s|$)/);
    });

    it('the badge sits in an aria-hidden overlay (colour + text, announced by the live region instead)', () => {
        renderIn(ctx({ armedTargetId: 'group:group-1' }));

        expect(screen.getByText('retrospective.dragGroup.dropToGroup').closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it.each([
        ['nothing armed', null],
        ['another group armed', 'group:group-2'],
        ['a card armed', 'card:card-1'],
    ])('is not marked when %s', (_label, armedTargetId) => {
        const { container } = renderIn(ctx({ armedTargetId }));

        expect(container.firstElementChild).not.toHaveAttribute('data-group-target');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
    });

    it('clearing armedTargetId removes the feedback again (B4)', () => {
        const view = renderIn(ctx({ armedTargetId: 'group:group-1' }));
        expect(screen.getByText('retrospective.dragGroup.dropToGroup')).toBeInTheDocument();

        view.rerender(
            <ColumnGroupingContext.Provider value={ctx({ armedTargetId: null }) as never}>
                <GroupCard {...baseProps} />
            </ColumnGroupingContext.Provider>,
        );

        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
        expect(view.container.firstElementChild).not.toHaveAttribute('data-group-target');
    });

    it('is aria-busy while its own move is pending, and only then', () => {
        const busy = renderIn(ctx({ busyTargetId: 'group:group-1' }));
        expect(busy.container.firstElementChild).toHaveAttribute('aria-busy', 'true');
        busy.unmount();

        const other = renderIn(ctx({ busyTargetId: 'group:group-2' }));
        expect(other.container.firstElementChild).not.toHaveAttribute('aria-busy', 'true');
    });

    it('renders unchanged without any column context (no feedback, no throw)', () => {
        const { container } = render(<GroupCard {...baseProps} />);

        expect(container.firstElementChild).not.toHaveAttribute('data-group-target');
        expect(screen.queryByText('retrospective.dragGroup.dropToGroup')).not.toBeInTheDocument();
    });

    describe('a card added to a group (B5b: appended as the last member)', () => {
        const added = card('card-3', { groupOrder: 2, votes: 2 });
        const grownGroup: CardGroup = { ...group, memberCardIds: ['card-2', 'card-3'] };

        it('a COLLAPSED group stays collapsed after the add (no expand call, member cards stay hidden)', () => {
            const onToggleCollapse = vi.fn();
            const collapsed = { ...group, isCollapsed: true };
            const view = render(<GroupCard {...baseProps} group={collapsed} onToggleCollapse={onToggleCollapse} />);
            expect(screen.getByText('+1 more')).toBeInTheDocument();

            view.rerender(
                <GroupCard {...baseProps} group={{ ...grownGroup, isCollapsed: true }} cards={[...cards, added]} onToggleCollapse={onToggleCollapse} />,
            );

            expect(onToggleCollapse).not.toHaveBeenCalled();
            expect(screen.queryByTestId('draggable-card-card-2')).not.toBeInTheDocument();
            expect(screen.queryByTestId('draggable-card-card-3')).not.toBeInTheDocument();
            expect(screen.getByText('+2 more')).toBeInTheDocument();
        });

        it("the card count increases on rerender with the new member (collapsed header and expanded header)", () => {
            const view = render(<GroupCard {...baseProps} />);
            expect(screen.getByText('2 cards')).toBeInTheDocument();

            view.rerender(<GroupCard {...baseProps} group={grownGroup} cards={[...cards, added]} />);

            expect(screen.getByText('3 cards')).toBeInTheDocument();
            expect(screen.getByTestId('draggable-card-card-3')).toBeInTheDocument();
        });

        it('the header totals include the new card (calculateGroupAggregations, unchanged)', () => {
            const voted = [card('card-1', { votes: 3 }), card('card-2', { votes: 1, groupOrder: 1 })];
            const view = render(<GroupCard {...baseProps} cards={voted} group={calculateGroupAggregations(group, voted)} />);
            expect(screen.getByText('4 votes')).toBeInTheDocument();

            const withNew = [...voted, { ...added, votes: 2 }];
            view.rerender(<GroupCard {...baseProps} cards={withNew} group={calculateGroupAggregations(grownGroup, withNew)} />);

            expect(screen.getByText('6 votes')).toBeInTheDocument();
        });
    });
});

describe('GroupCard drag handles for head and member cards (spec 059, T066: D1, D7)', () => {
    const t0 = new Date('2026-01-01T00:00:00.000Z');
    const group: CardGroup = {
        id: 'group-1', retrospectiveId: 'retro-1', column: 'helped', headCardId: 'card-1',
        memberCardIds: ['card-2', 'card-3'], isCollapsed: false, title: 'Test Group',
        createdAt: t0, createdBy: 'user1', order: 1,
    };
    const card = (id: string, extra: Partial<Card> = {}): Card => ({
        id, content: `content ${id}`, column: 'helped', createdBy: 'user1', createdAt: t0, updatedAt: t0,
        retrospectiveId: 'retro-1', color: 'pastelBlue', ...extra,
    });
    const cards = [card('card-1'), card('card-2', { groupOrder: 1 }), card('card-3', { groupOrder: 2 })];
    const baseProps = {
        group, cards,
        onToggleCollapse: vi.fn(), onDisbandGroup: vi.fn(), onRemoveCardFromGroup: vi.fn(), onCardUpdate: vi.fn(),
    };
    const ctx = (groupingEnabled: boolean) => ({
        columnId: 'helped', groupingEnabled, items: [], groups: [group], ungroupedCards: [],
        armedTargetId: null, insertionLine: null, busyTargetId: null, pendingEditGroupId: null,
        consumePendingEdit: vi.fn(), requestMove: vi.fn(), computeOrder: vi.fn(() => 0),
    });
    const renderIn = (groupingEnabled: boolean, props: Record<string, unknown> = {}) =>
        render(
            <ColumnGroupingContext.Provider value={ctx(groupingEnabled) as never}>
                <GroupCard {...baseProps} {...(props as object)} />
            </ColumnGroupingContext.Provider>,
        );
    const memberCalls = () =>
        vi.mocked(useDraggable).mock.calls.map((c) => c[0]).filter((a) => String(a.id).startsWith('member:'));

    beforeEach(() => {
        vi.mocked(useDraggable).mockClear();
    });

    it('D1: the head card and every member card render a drag handle', () => {
        renderIn(true);

        expect(screen.getByTestId('drag-handle-card-1')).toBeInTheDocument();
        expect(screen.getByTestId('drag-handle-card-2')).toBeInTheDocument();
        expect(screen.getByTestId('drag-handle-card-3')).toBeInTheDocument();
    });

    it("D1: each handle is backed by useDraggable({ id: 'member:<cardId>', data: { type: 'member', groupId } })", () => {
        renderIn(true);

        for (const cardId of ['card-1', 'card-2', 'card-3']) {
            expect(memberCalls()).toContainEqual(
                expect.objectContaining({
                    id: `member:${cardId}`,
                    data: expect.objectContaining({ type: 'member', groupId: 'group-1' }),
                }),
            );
        }
    });

    it('D1: the handles are enabled draggables', () => {
        renderIn(true);

        expect(memberCalls().length).toBeGreaterThanOrEqual(3);
        for (const args of memberCalls()) expect(args.disabled).not.toBe(true);
    });

    it('wires the dnd-kit attributes onto the handle (keyboard sensor needs role/tabindex)', () => {
        renderIn(true);

        const handle = screen.getByTestId('drag-handle-card-2');
        expect(handle).toHaveAttribute('aria-roledescription');
        expect(handle).toHaveAttribute('tabindex', '0');
        expect(handle).toHaveAccessibleName('retrospective.card.dragHandle');
    });

    it('D7: no handles when grouping is disabled (mode user)', () => {
        renderIn(false);

        expect(screen.queryByTestId('drag-handle-card-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('drag-handle-card-2')).not.toBeInTheDocument();
        expect(screen.queryByTestId('drag-handle-card-3')).not.toBeInTheDocument();
        for (const args of memberCalls()) expect(args.disabled).toBe(true);
    });

    it('D7: no handles without any column context', () => {
        render(<GroupCard {...baseProps} />);

        expect(screen.queryByTestId('drag-handle-card-1')).not.toBeInTheDocument();
        expect(screen.queryByTestId('drag-handle-card-2')).not.toBeInTheDocument();
        for (const args of memberCalls()) expect(args.disabled).toBe(true);
    });

    it('no handles in a read-only group', () => {
        renderIn(true, { isReadOnly: true });

        expect(screen.queryByTestId('drag-handle-card-2')).not.toBeInTheDocument();
    });
});

describe('GroupCard collapse toggle accessible name (WCAG button-name)', () => {
    const renderToggle = (group: Partial<CardGroup> = {}) => {
        const onToggleCollapse = vi.fn();
        const base = {
            id: 'g-toggle', headCardId: 'h1', memberCardIds: ['m1'], isCollapsed: false,
            createdAt: new Date(), updatedAt: new Date(), retrospectiveId: 'r1', columnId: 'col1',
        } as unknown as CardGroup;
        const mk = (id: string): Card => ({
            id, content: id, column: 'col1', createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(),
            retrospectiveId: 'r1', order: 1,
        } as Card);
        render(
            <GroupCard
                group={{ ...base, ...group }}
                cards={[mk('h1'), mk('m1')]}
                onToggleCollapse={onToggleCollapse}
                onDisbandGroup={vi.fn()}
                onRemoveCardFromGroup={vi.fn()}
                onCardUpdate={vi.fn()}
            />
        );
        return { onToggleCollapse };
    };

    it('names the toggle with the group title and exposes aria-expanded', () => {
        const { onToggleCollapse } = renderToggle({ title: 'Team Collaboration' });
        const toggle = screen.getByRole('button', { name: 'retrospective.groupCard.toggleGroup' });
        expect(toggle).toHaveAttribute('aria-expanded', 'true');
        expect(toggle.className).toContain('focus-visible:ring-focus');
        fireEvent.click(toggle);
        expect(onToggleCollapse).toHaveBeenCalledWith('g-toggle');
    });

    it('reports aria-expanded=false when collapsed', () => {
        renderToggle({ title: 'X', isCollapsed: true });
        expect(screen.getByRole('button', { name: 'retrospective.groupCard.toggleGroup' })).toHaveAttribute('aria-expanded', 'false');
    });

    it('passes the displayed title (default title when untitled) to the label', () => {
        renderToggle({ title: undefined });
        // the mocked t returns the key; assert via the call params below
        expect(screen.getByRole('button', { name: 'retrospective.groupCard.toggleGroup' })).toBeInTheDocument();
    });
});
