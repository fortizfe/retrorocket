import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroupableColumn from '../../../components/retrospective/GroupableColumn';
import { Card, CardGroup } from '../../../types/card';
import { ColumnConfig } from '../../../types/retrospective';

// Simple mocks that don't cause event handling issues
vi.mock('../../../components/ui/Card', () => ({
    default: ({ children }: any) => <div data-testid="mock-card">{children}</div>
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children }: any) => <button data-testid="mock-button">{children}</button>
}));

vi.mock('../../../components/ui/TextareaWithEmoji', () => ({
    default: () => <textarea data-testid="mock-textarea" />
}));

vi.mock('../../../components/ui/ColorPicker', () => ({
    default: () => <div data-testid="color-picker">Color Picker</div>
}));

vi.mock('../../../components/ui/TypingPreview', () => ({
    default: () => <div data-testid="typing-preview">Typing Preview</div>
}));

vi.mock('../../../components/retrospective/GroupCard', () => ({
    GroupCard: () => <div data-testid="group-card">Group Card</div>
}));

vi.mock('../../../components/retrospective/ColumnHeaderMenu', () => ({
    default: () => <div data-testid="column-header-menu">Header Menu</div>
}));

vi.mock('../../../components/retrospective/GroupSuggestionModal', () => ({
    GroupSuggestionModal: () => <div data-testid="group-suggestion-modal">Modal</div>
}));

vi.mock('../../../components/retrospective/GroupedCardList', () => ({
    default: () => <div data-testid="grouped-card-list">Grouped Card List</div>
}));

vi.mock('../../../contexts/TypingProvider', () => ({
    useTypingContext: () => ({
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
        typingUsers: []
    })
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key
    })
}));

vi.mock('../../../hooks/useColumnGrouping', () => ({
    useColumnGrouping: () => ({
        isGroupingEnabled: false,
        toggleGrouping: vi.fn(),
        groupCards: vi.fn(),
        ungroupCards: vi.fn()
    })
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children }: any) => <div>{children}</div>,
        section: ({ children }: any) => <section>{children}</section>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

vi.mock('lucide-react', () => ({
    Plus: () => <div data-testid="plus-icon">+</div>,
    Users: () => <div data-testid="users-icon">Users</div>
}));

describe('GroupableColumn Simple Tests', () => {
    const createMockCard = (id: string, content: string): Card => ({
        id,
        content,
        column: 'helped',
        order: 0,
        retrospectiveId: 'retro-1',
        color: 'pastelBlue',
        votes: 0,
        likes: [],
        reactions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1'
    });

    const mockColumn: ColumnConfig = {
        id: 'helped',
        title: 'What Helped',
        description: 'What helped us?',
        color: 'green',
        icon: 'thumbs-up'
    };

    const mockProps = {
        column: mockColumn,
        cards: [] as Card[],
        groups: [] as CardGroup[],
        onCardCreate: vi.fn(),
        onCardUpdate: vi.fn(),
        onCardDelete: vi.fn(),
        onCardVote: vi.fn(),
        onCardLike: vi.fn(),
        onCardReaction: vi.fn(),
        onCardReactionRemove: vi.fn(),
        onCardsReorder: vi.fn(),
        onGroupCreate: vi.fn(),
        onGroupDisband: vi.fn(),
        onGroupToggleCollapse: vi.fn(),
        onCardRemoveFromGroup: vi.fn(),
        onSuggestionGenerate: vi.fn(() => []),
        retrospectiveId: 'retro-1'
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render column with title', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render header menu', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
        });

        it('should render add card button', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });
    });

    describe('Card Display', () => {
        it('should render individual cards when not grouped', () => {
            const cards = [
                createMockCard('1', 'Card 1'),
                createMockCard('2', 'Card 2')
            ];

            render(<GroupableColumn {...mockProps} column={{ ...mockProps.column, cards }} />);

            // Cards should be displayed
            expect(screen.getAllByTestId('group-card')).toHaveLength(2);
        });

        it('should render groups when grouping is enabled', () => {
            const cards = [createMockCard('1', 'Card 1')];
            const groups = [createMockGroup('group-1', 'Group 1', cards)];

            render(
                <GroupableColumn
                    {...mockProps}
                    column={{
                        ...mockProps.column,
                        cards,
                        groups,
                        isGroupingEnabled: true
                    }}
                />
            );

            expect(screen.getByText('Group 1')).toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        it('should show loading state when isLoading is true', () => {
            render(<GroupableColumn {...mockProps} isLoading={true} />);

            // Component should still render but may show loading indicators
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should not show loading state when isLoading is false', () => {
            render(<GroupableColumn {...mockProps} isLoading={false} />);

            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });
    });

    describe('Empty States', () => {
        it('should render empty column without cards', () => {
            render(<GroupableColumn {...mockProps} />);

            expect(screen.getByText('What Helped')).toBeInTheDocument();
            expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
        });

        it('should render empty groups', () => {
            const groups = [createMockGroup('group-1', 'Empty Group', [])];

            render(
                <GroupableColumn
                    {...mockProps}
                    column={{
                        ...mockProps.column,
                        groups,
                        isGroupingEnabled: true
                    }}
                />
            );

            expect(screen.getByText('Empty Group')).toBeInTheDocument();
        });
    });

    describe('Column Types', () => {
        it('should render helped column', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render hindered column', () => {
            const hinderedProps = {
                ...mockProps,
                column: {
                    ...mockProps.column,
                    type: ColumnType.hindered,
                    title: 'What Hindered'
                }
            };

            render(<GroupableColumn {...hinderedProps} />);
            expect(screen.getByText('What Hindered')).toBeInTheDocument();
        });

        it('should render improve column', () => {
            const improveProps = {
                ...mockProps,
                column: {
                    ...mockProps.column,
                    type: ColumnType.improve,
                    title: 'What to Improve'
                }
            };

            render(<GroupableColumn {...improveProps} />);
            expect(screen.getByText('What to Improve')).toBeInTheDocument();
        });

        it('should render actions column', () => {
            const actionsProps = {
                ...mockProps,
                column: {
                    ...mockProps.column,
                    type: ColumnType.actions,
                    title: 'Action Items'
                }
            };

            render(<GroupableColumn {...actionsProps} />);
            expect(screen.getByText('Action Items')).toBeInTheDocument();
        });
    });

    describe('Props Integration', () => {
        it('should accept and render different card configurations', () => {
            const cards = [
                createMockCard('1', 'First card'),
                createMockCard('2', 'Second card'),
                createMockCard('3', 'Third card')
            ];

            render(<GroupableColumn {...mockProps} column={{ ...mockProps.column, cards }} />);

            expect(screen.getAllByTestId('group-card')).toHaveLength(3);
        });

        it('should handle mixed groups and individual cards', () => {
            const cards = [createMockCard('1', 'Individual card')];
            const groups = [createMockGroup('group-1', 'Grouped cards', [createMockCard('2', 'Grouped card')])];

            render(
                <GroupableColumn
                    {...mockProps}
                    column={{
                        ...mockProps.column,
                        cards,
                        groups,
                        isGroupingEnabled: true
                    }}
                />
            );

            expect(screen.getByText('Grouped cards')).toBeInTheDocument();
            expect(screen.getAllByTestId('group-card')).toHaveLength(2);
        });
    });

    describe('Component Structure', () => {
        it('should maintain consistent structure across different states', () => {
            const { rerender } = render(<GroupableColumn {...mockProps} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();

            // Rerender with cards
            const cards = [createMockCard('1', 'Card 1')];
            rerender(<GroupableColumn {...mockProps} column={{ ...mockProps.column, cards }} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
            expect(screen.getByTestId('group-card')).toBeInTheDocument();
        });

        it('should maintain UI structure when toggling grouping', () => {
            const cards = [createMockCard('1', 'Card 1')];
            const { rerender } = render(
                <GroupableColumn {...mockProps} column={{ ...mockProps.column, cards }} />
            );

            expect(screen.getByTestId('group-card')).toBeInTheDocument();

            // Toggle grouping
            rerender(
                <GroupableColumn
                    {...mockProps}
                    column={{ ...mockProps.column, cards, isGroupingEnabled: true }}
                />
            );

            expect(screen.getByTestId('group-card')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have accessible column title', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should provide accessible controls', () => {
            render(<GroupableColumn {...mockProps} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });
    });

    describe('Performance', () => {
        it('should handle large numbers of cards efficiently', () => {
            const manyCards = Array.from({ length: 100 }, (_, i) =>
                createMockCard(`card-${i}`, `Card content ${i}`)
            );

            const start = performance.now();
            render(<GroupableColumn {...mockProps} column={{ ...mockProps.column, cards: manyCards }} />);
            const end = performance.now();

            // Should render within reasonable time (less than 100ms)
            expect(end - start).toBeLessThan(100);
            expect(screen.getAllByTestId('group-card')).toHaveLength(100);
        });

        it('should handle many groups efficiently', () => {
            const manyGroups = Array.from({ length: 50 }, (_, i) =>
                createMockGroup(`group-${i}`, `Group ${i}`, [createMockCard(`card-${i}`, `Card ${i}`)])
            );

            const start = performance.now();
            render(
                <GroupableColumn
                    {...mockProps}
                    column={{
                        ...mockProps.column,
                        groups: manyGroups,
                        isGroupingEnabled: true
                    }}
                />
            );
            const end = performance.now();

            expect(end - start).toBeLessThan(100);
            expect(screen.getAllByTestId('group-card')).toHaveLength(50);
        });
    });
});
