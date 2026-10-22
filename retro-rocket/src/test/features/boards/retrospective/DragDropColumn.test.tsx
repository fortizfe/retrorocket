import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DragDropColumn from '@/features/boards/retrospective/components/DragDropColumn';
import { Card } from '@/features/boards/types/card';
import { ColumnType } from '@/features/boards/types/retrospective';
import { Participant } from '@/features/boards/types/participant';

// Local override (not the global passthrough in src/test/setup.ts) so this file can
// assert the card list is actually wrapped in AnimatePresence — required for the
// deletion exit animation to run at all, since AnimatePresence must directly parent
// the point where a card is removed from this list (design audit finding, spec 028:
// it was previously nested one level too deep, inside DraggableCard itself, where it
// never got to see a real unmount).
//
// `motion.div` is also provided (058-card-owner-action-hub, T017) — forwardRef
// passthrough stripping nothing (every prop, including motion-only ones, just lands
// on the DOM node; jsdom ignores the ones it doesn't understand) — so the real,
// unmocked `DraggableCard` and `OwnerActionMenu` used by the T017 integration test
// below have a real root node to query/focus and a real animated panel to open.
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
            <div ref={ref} {...props}>{children}</div>
        )),
        // LikeButton and EmojiReactions (both real in the T017 integration test
        // below) render `motion.button` unconditionally.
        button: React.forwardRef<HTMLButtonElement, any>(({ children, ...props }, ref) => (
            <button ref={ref} {...props}>{children}</button>
        )),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="card-list-animate-presence">{children}</div>
    ),
}));

// Needed only by the T017 integration test below, which renders the real
// `DraggableCard` → `OwnerActionMenu` chain (bypassing the trivial `DraggableCard`
// mock further down, via `vi.importActual`) — every other test in this file renders
// the mocked `SortableCard`/`DraggableCard` stubs and never reaches `useLanguage` or
// `react-i18next` at all, so this is purely additive.
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'en' }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { changeLanguage: () => new Promise(() => { }) },
    }),
    initReactI18next: { type: '3rdParty', init: () => { } },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

// Mock @dnd-kit libraries
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children, onDragStart, onDragEnd, onDragOver }: any) => (
        <div data-testid="dnd-context" data-drag-start={!!onDragStart} data-drag-end={!!onDragEnd} data-drag-over={!!onDragOver}>
            {children}
        </div>
    ),
    DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
    useSensor: vi.fn(() => ({})),
    useSensors: vi.fn(() => []),
    PointerSensor: vi.fn(),
    KeyboardSensor: vi.fn(),
    closestCorners: vi.fn()
}));

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children, items, id, strategy }: any) => (
        <div data-testid="sortable-context" data-id={id} data-strategy={strategy} data-items={JSON.stringify(items)}>
            {children}
        </div>
    ),
    verticalListSortingStrategy: 'vertical-list-sorting',
    sortableKeyboardCoordinates: vi.fn(),
    arrayMove: vi.fn((array, oldIndex, newIndex) => {
        const result = [...array];
        const [removed] = result.splice(oldIndex, 1);
        result.splice(newIndex, 0, removed);
        return result;
    })
}));

// Mock SortableCard and DraggableCard components
vi.mock('@/features/boards/retrospective/components/SortableCard', () => ({
    default: ({ card, onUpdate, onDelete, onVote, onLike, isSelected, onSelect }: any) => (
        <div data-testid={`sortable-card-${card.id}`} data-card-id={card.id} data-selected={isSelected}>
            <div>{card.content}</div>
            <button data-testid={`update-card-${card.id}`} onClick={() => onUpdate(card.id, { content: 'updated' })}>
                Update
            </button>
            <button data-testid={`delete-card-${card.id}`} onClick={() => onDelete(card.id)}>
                Delete
            </button>
            <button data-testid={`vote-card-${card.id}`} onClick={() => onVote(card.id, true)}>
                Vote
            </button>
            <button data-testid={`like-card-${card.id}`} onClick={() => onLike(card.id, 'user1', 'User 1')}>
                Like
            </button>
            {onSelect && (
                <button data-testid={`select-card-${card.id}`} onClick={() => onSelect(card.id)}>
                    Select
                </button>
            )}
        </div>
    )
}));

vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card, isDragging }: any) => (
        <div data-testid={`draggable-card-${card.id}`} data-dragging={isDragging}>
            {card.content}
        </div>
    )
}));

describe('DragDropColumn', () => {
    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'First card',
            column: 'helped',
            createdBy: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-123',
            order: 0,
            votes: 2,
            color: 'pastelBlue',
            likes: [],
            reactions: []
        },
        {
            id: 'card-2',
            content: 'Second card',
            column: 'helped',
            createdBy: 'user2',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-123',
            order: 1,
            votes: 1,
            color: 'pastelGreen',
            likes: [],
            reactions: []
        },
        {
            id: 'card-3',
            content: 'Third card',
            column: 'helped',
            createdBy: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-123',
            order: 2,
            votes: 0,
            color: 'pastelYellow',
            likes: [],
            reactions: []
        }
    ];

    const mockParticipants: Participant[] = [
        { id: 'p1', name: 'User 1', userId: 'user1', retrospectiveId: 'retro-123', joinedAt: new Date(), isActive: true },
        { id: 'p2', name: 'User 2', userId: 'user2', retrospectiveId: 'retro-123', joinedAt: new Date(), isActive: true }
    ];

    const defaultProps = {
        cards: mockCards,
        column: 'helped' as ColumnType,
        onCardUpdate: vi.fn(),
        onCardDelete: vi.fn(),
        onCardVote: vi.fn(),
        onCardLike: vi.fn(),
        onCardReaction: vi.fn(),
        onCardReactionRemove: vi.fn(),
        onCardsReorder: vi.fn(),
        currentUser: 'user1',
        canEdit: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        // spec 059 (T031): the DndContext, sensors and DragOverlay moved to ColumnDndProvider.
        it('should render only a SortableContext (no DndContext or DragOverlay of its own)', () => {
            render(<DragDropColumn {...defaultProps} />);

            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
            expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();
            expect(screen.queryByTestId('drag-overlay')).not.toBeInTheDocument();
        });

        it('should forward id and strategy to its SortableContext (defaulting to the vertical list strategy)', () => {
            const { rerender } = render(<DragDropColumn {...defaultProps} id="section:user1" />);
            expect(screen.getByTestId('sortable-context')).toHaveAttribute('data-id', 'section:user1');
            expect(screen.getByTestId('sortable-context')).toHaveAttribute('data-strategy', 'vertical-list-sorting');

            rerender(<DragDropColumn {...defaultProps} id="section:user1" strategy={'custom-strategy' as never} />);
            expect(screen.getByTestId('sortable-context')).toHaveAttribute('data-strategy', 'custom-strategy');
        });

        it('should render all cards in sorted order', () => {
            render(<DragDropColumn {...defaultProps} />);

            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();

            expect(screen.getByText('First card')).toBeInTheDocument();
            expect(screen.getByText('Second card')).toBeInTheDocument();
            expect(screen.getByText('Third card')).toBeInTheDocument();
        });

        it('should render children when provided', () => {
            render(
                <DragDropColumn {...defaultProps}>
                    <div data-testid="custom-child">Custom content</div>
                </DragDropColumn>
            );

            expect(screen.getByTestId('custom-child')).toBeInTheDocument();
            expect(screen.getByText('Custom content')).toBeInTheDocument();
        });
    });

    describe('Card Sorting and Filtering', () => {
        it('should sort cards by order property', () => {
            const unsortedCards = [
                { ...mockCards[0], order: 5 },
                { ...mockCards[1], order: 1 },
                { ...mockCards[2], order: 3 }
            ];

            render(<DragDropColumn {...defaultProps} cards={unsortedCards} />);

            const sortableContext = screen.getByTestId('sortable-context');
            const itemsData = JSON.parse(sortableContext.getAttribute('data-items') || '[]');

            // Should be sorted by order: card-2 (order: 1), card-3 (order: 3), card-1 (order: 5)
            expect(itemsData).toEqual(['card:card-2', 'card:card-3', 'card:card-1']);
        });

        it('should filter out cards with invalid IDs', () => {
            const cardsWithInvalid = [
                mockCards[0],
                { ...mockCards[1], id: '' }, // Invalid: empty ID
                { ...mockCards[2], id: undefined as any }, // Invalid: undefined ID
                {
                    id: 'valid-card',
                    content: 'Valid card',
                    column: 'helped' as ColumnType,
                    createdBy: 'user1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    retrospectiveId: 'retro-123',
                    order: 3,
                    votes: 0,
                    color: 'pastelBlue',
                    likes: [],
                    reactions: []
                }
            ];

            render(<DragDropColumn {...defaultProps} cards={cardsWithInvalid} />);

            // Should only render cards with valid IDs
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-valid-card')).toBeInTheDocument();
            expect(screen.queryByTestId('sortable-card-')).not.toBeInTheDocument();
        });

        it('should handle cards without order property', () => {
            const cardsWithoutOrder = [
                { ...mockCards[0], order: undefined },
                { ...mockCards[1], order: undefined },
                mockCards[2] // has order: 2
            ];

            render(<DragDropColumn {...defaultProps} cards={cardsWithoutOrder} />);

            // All cards should still render
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();
        });
    });

    describe('Card Event Handlers', () => {
        it('should handle card update events', async () => {
            const user = userEvent.setup();
            render(<DragDropColumn {...defaultProps} />);

            await user.click(screen.getByTestId('update-card-card-1'));

            expect(defaultProps.onCardUpdate).toHaveBeenCalledWith('card-1', { content: 'updated' });
        });

        it('should handle card delete events', async () => {
            const user = userEvent.setup();
            render(<DragDropColumn {...defaultProps} />);

            await user.click(screen.getByTestId('delete-card-card-1'));

            expect(defaultProps.onCardDelete).toHaveBeenCalledWith('card-1');
        });

        it('should handle card vote events', async () => {
            const user = userEvent.setup();
            render(<DragDropColumn {...defaultProps} />);

            await user.click(screen.getByTestId('vote-card-card-1'));

            expect(defaultProps.onCardVote).toHaveBeenCalledWith('card-1', true);
        });

        it('should handle card like events', async () => {
            const user = userEvent.setup();
            render(<DragDropColumn {...defaultProps} />);

            await user.click(screen.getByTestId('like-card-card-1'));

            expect(defaultProps.onCardLike).toHaveBeenCalledWith('card-1', 'user1', 'User 1');
        });

        it('should pass through all event handlers to SortableCard', () => {
            render(<DragDropColumn {...defaultProps} />);

            // Verify that cards are rendered with all necessary props
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();
        });
    });

    describe('Grouping Mode', () => {
        it('should handle grouping mode when enabled', () => {
            const selectedCards = new Set(['card-1', 'card-3']);
            const onCardSelect = vi.fn();

            render(
                <DragDropColumn
                    {...defaultProps}
                    isGroupingMode={true}
                    selectedCards={selectedCards}
                    onCardSelect={onCardSelect}
                />
            );

            // Cards should show selection state
            expect(screen.getByTestId('sortable-card-card-1')).toHaveAttribute('data-selected', 'true');
            expect(screen.getByTestId('sortable-card-card-2')).toHaveAttribute('data-selected', 'false');
            expect(screen.getByTestId('sortable-card-card-3')).toHaveAttribute('data-selected', 'true');
        });

        it('should handle card selection events in grouping mode', async () => {
            const user = userEvent.setup();
            const onCardSelect = vi.fn();

            render(
                <DragDropColumn
                    {...defaultProps}
                    isGroupingMode={true}
                    onCardSelect={onCardSelect}
                />
            );

            await user.click(screen.getByTestId('select-card-card-1'));

            expect(onCardSelect).toHaveBeenCalledWith('card-1');
        });

        it('should work without grouping mode enabled', () => {
            render(<DragDropColumn {...defaultProps} isGroupingMode={false} />);

            // No selection buttons should be rendered
            expect(screen.queryByTestId('select-card-card-1')).not.toBeInTheDocument();
            expect(screen.queryByTestId('select-card-card-2')).not.toBeInTheDocument();
            expect(screen.queryByTestId('select-card-card-3')).not.toBeInTheDocument();
        });
    });

    describe('Permissions and Edit Mode', () => {
        it('should respect canEdit prop', () => {
            render(<DragDropColumn {...defaultProps} canEdit={false} />);

            // Cards should still render
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();
        });

        it('should handle missing currentUser', () => {
            render(<DragDropColumn {...defaultProps} currentUser={undefined} />);

            // Component should still render without errors
            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
        });

        it('should work with different currentUser', () => {
            render(<DragDropColumn {...defaultProps} currentUser="user2" />);

            // Component should render normally
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();
        });
    });

    describe('Action Items Integration', () => {
        it('should handle action item conversion props', () => {
            const onConvertToAction = vi.fn();

            render(
                <DragDropColumn
                    {...defaultProps}
                    participants={mockParticipants}
                    canConvertToAction={true}
                    onConvertToAction={onConvertToAction}
                />
            );

            // Component should render with action conversion capabilities
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
        });

        it('should work without action conversion props', () => {
            render(
                <DragDropColumn
                    {...defaultProps}
                    canConvertToAction={false}
                />
            );

            // Component should render normally
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
        });
    });

    describe('Empty States', () => {
        it('should handle empty cards array', () => {
            render(<DragDropColumn {...defaultProps} cards={[]} />);

            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();

            // No cards should be rendered
            expect(screen.queryByTestId(/sortable-card-/)).not.toBeInTheDocument();
        });

        it('should handle empty cards array with children', () => {
            render(
                <DragDropColumn {...defaultProps} cards={[]}>
                    <div data-testid="empty-state">No cards yet</div>
                </DragDropColumn>
            );

            expect(screen.getByTestId('empty-state')).toBeInTheDocument();
            expect(screen.getByText('No cards yet')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle null/undefined cards gracefully', () => {
            const cardsWithNulls = [
                mockCards[0],
                null as any,
                mockCards[1],
                undefined as any,
                mockCards[2]
            ];

            render(<DragDropColumn {...defaultProps} cards={cardsWithNulls} />);

            // Should only render valid cards
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-2')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-3')).toBeInTheDocument();
        });

        it('should handle missing optional props gracefully', () => {
            const minimalProps = {
                cards: mockCards,
                column: 'helped' as ColumnType,
                onCardUpdate: vi.fn(),
                onCardDelete: vi.fn(),
                onCardVote: vi.fn(),
                onCardLike: vi.fn(),
                onCardReaction: vi.fn(),
                onCardReactionRemove: vi.fn(),
                onCardsReorder: vi.fn()
            };

            render(<DragDropColumn {...minimalProps} />);

            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-1')).toBeInTheDocument();
        });

        it('should handle very large number of cards', () => {
            const manyCards = Array.from({ length: 100 }, (_, i) => ({
                id: `card-${i}`,
                content: `Card ${i}`,
                column: 'helped' as ColumnType,
                createdBy: 'user1',
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: 'retro-123',
                order: i,
                votes: 0,
                color: 'pastelBlue' as const,
                likes: [],
                reactions: []
            }));

            render(<DragDropColumn {...defaultProps} cards={manyCards} />);

            expect(screen.getByTestId('sortable-context')).toBeInTheDocument();
            // Just check that the first and last cards are rendered
            expect(screen.getByTestId('sortable-card-card-0')).toBeInTheDocument();
            expect(screen.getByTestId('sortable-card-card-99')).toBeInTheDocument();
        });
    });

    describe('Exit animation boundary (design audit finding, spec 028)', () => {
        it('wraps the rendered card list in AnimatePresence, so a removed card can exit-animate instead of vanishing instantly', () => {
            render(<DragDropColumn {...defaultProps} />);

            const animatePresence = screen.getByTestId('card-list-animate-presence');
            expect(animatePresence).toBeInTheDocument();
            expect(animatePresence).toContainElement(screen.getByTestId('sortable-card-card-1'));
            expect(animatePresence).toContainElement(screen.getByTestId('sortable-card-card-3'));
        });
    });

    describe('DragOverlay', () => {
        it('does not render its own DragOverlay (ColumnDndProvider owns it, spec 059)', () => {
            render(<DragDropColumn {...defaultProps} />);

            expect(screen.queryByTestId('drag-overlay')).not.toBeInTheDocument();
        });
    });

    describe('Post-delete focus across the real hub (T017, 058-card-owner-action-hub)', () => {
        /**
         * T017: confirms T009 (`getPostDeleteFocusTarget`), T015 (`DraggableCard`'s
         * wiring into the hub) and T016 (`GroupableColumn`'s `data-card-column` /
         * `data-add-card-trigger` markers) work together end to end. This describe
         * block renders the REAL `DraggableCard` → `OwnerActionMenu` chain — bypassing
         * the trivial `DraggableCard` mock registered above (which every other test in
         * this file uses) via `vi.importActual` — wrapped in a plain
         * `[data-card-column]` element (contracts/owner-action-menu.md §6: that marker
         * is `GroupableColumn`'s to render, not `DragDropColumn`'s, so this test adds
         * it itself rather than standing up the whole grouping column).
         */
        it("deletes the first of two owned cards through the real hub (trigger → Delete card → Confirm) and moves focus to the remaining card's root", async () => {
            // Several real userEvent interactions against the real Floating UI /
            // OwnerActionMenu stack (not the trivial stubs the rest of this file
            // uses) — comfortably under 5s alone, but can exceed the default
            // testTimeout under full-suite parallel load.
            const user = userEvent.setup();
            const { default: RealDraggableCard } = await vi.importActual<
                typeof import('@/features/boards/retrospective/components/DraggableCard')
            >('@/features/boards/retrospective/components/DraggableCard');

            const cardA: Card = { ...mockCards[0], id: 'owned-card-a', createdBy: 'user1' };
            const cardB: Card = { ...mockCards[1], id: 'owned-card-b', createdBy: 'user1' };

            // A tiny stateful host, standing in for GroupableColumn/DragDropColumn: the
            // real parent-level responsibility of actually removing a deleted card from
            // the rendered list once the delete call resolves (DraggableCard's own
            // `handleDeleteViaHub` only awaits `onDelete` and then focuses the
            // already-resolved target — it never removes anything from the DOM itself).
            const TestColumn: React.FC = () => {
                const [cards, setCards] = useState([cardA, cardB]);
                const handleDelete = async (cardId: string) => {
                    setCards((prev) => prev.filter((c) => c.id !== cardId));
                };
                return (
                    <div data-card-column>
                        {cards.map((card) => (
                            <RealDraggableCard key={card.id} card={card} currentUser="user1" canEdit onDelete={handleDelete} />
                        ))}
                    </div>
                );
            };

            render(<TestColumn />);

            const triggers = screen.getAllByRole('button', { name: 'retrospective.card.ownerActions.trigger' });
            expect(triggers).toHaveLength(2);

            await user.click(triggers[0]);
            await user.click(await screen.findByRole('menuitem', { name: 'retrospective.card.ownerActions.delete' }));
            await user.click(await screen.findByRole('menuitem', { name: 'retrospective.card.ownerActions.deleteConfirm' }));

            await waitFor(() => {
                expect(screen.queryByText(cardA.content)).not.toBeInTheDocument();
            });

            const remainingCard = screen.getByText(cardB.content).closest('[data-card-focus-target]');
            expect(remainingCard).not.toBeNull();
            await waitFor(() => expect(remainingCard).toHaveFocus());
        }, 15000);
    });
});
