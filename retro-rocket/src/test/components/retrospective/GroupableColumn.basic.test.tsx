import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GroupableColumn from '../../../components/retrospective/GroupableColumn';
import { Card, CardGroup } from '../../../types/card';
import { ColumnConfig } from '../../../types/retrospective';

// Simple mocks
vi.mock('../../../components/ui/Card', () => ({
    default: ({ children }: any) => <div data-testid="mock-card">{children}</div>
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children }: any) => <button data-testid="mock-button">{children}</button>
}));

vi.mock('../../../components/ui/TextareaWithEmoji', () => ({
    default: () => <textarea data-testid="mock-textarea" placeholder="Mock textarea" />
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

// Mock the TypingProvider and hook
vi.mock('../../../contexts/TypingProvider', () => ({
    TypingProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useTypingContext: () => ({
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
        typingUsers: [],
        getTypingUsersForColumn: vi.fn(() => [])
    })
}));

// Mock the typing hook separately
vi.mock('../../../hooks/useTypingContext', () => ({
    useTypingContext: () => ({
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
        typingUsers: [],
        getTypingUsersForColumn: vi.fn(() => [])
    })
})); vi.mock('../../../hooks/useLanguage', () => ({
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

describe('GroupableColumn Basic Tests', () => {
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
        it('should render without crashing', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render column header menu', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
        });

        it('should render add card button icon', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
        });
    });

    describe('Card Display', () => {
        it('should handle empty cards list', () => {
            render(<GroupableColumn {...mockProps} cards={[]} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render with cards when provided', () => {
            const mockCard: Card = {
                id: 'card-1',
                content: 'Test card',
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
            };

            render(<GroupableColumn {...mockProps} cards={[mockCard]} />);
            expect(screen.getByTestId('group-card')).toBeInTheDocument();
        });
    });

    describe('Groups Display', () => {
        it('should handle empty groups list', () => {
            render(<GroupableColumn {...mockProps} groups={[]} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render with groups when provided', () => {
            const mockGroup: CardGroup = {
                id: 'group-1',
                retrospectiveId: 'retro-1',
                column: 'helped',
                headCardId: 'card-1',
                memberCardIds: ['card-2'],
                title: 'Test Group',
                isCollapsed: false,
                createdAt: new Date(),
                createdBy: 'user-1',
                order: 0
            };

            render(<GroupableColumn {...mockProps} groups={[mockGroup]} />);
            expect(screen.getByTestId('grouped-card-list')).toBeInTheDocument();
        });
    });

    describe('Column Types', () => {
        it('should render helped column', () => {
            render(<GroupableColumn {...mockProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });

        it('should render hindered column', () => {
            const hinderedColumn = {
                ...mockColumn,
                id: 'hindered' as const,
                title: 'What Hindered'
            };

            render(<GroupableColumn {...mockProps} column={hinderedColumn} />);
            expect(screen.getByText('What Hindered')).toBeInTheDocument();
        });

        it('should render improve column', () => {
            const improveColumn = {
                ...mockColumn,
                id: 'improve' as const,
                title: 'What to Improve'
            };

            render(<GroupableColumn {...mockProps} column={improveColumn} />);
            expect(screen.getByText('What to Improve')).toBeInTheDocument();
        });

        it('should render actions column', () => {
            const actionsColumn = {
                ...mockColumn,
                id: 'actions' as const,
                title: 'Action Items'
            };

            render(<GroupableColumn {...mockProps} column={actionsColumn} />);
            expect(screen.getByText('Action Items')).toBeInTheDocument();
        });
    });

    describe('Component Structure', () => {
        it('should maintain consistent structure with different props', () => {
            const { rerender } = render(<GroupableColumn {...mockProps} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();

            // Rerender with cards
            const mockCard: Card = {
                id: 'card-1',
                content: 'Test card',
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
            };

            rerender(<GroupableColumn {...mockProps} cards={[mockCard]} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
            expect(screen.getByTestId('group-card')).toBeInTheDocument();
        });
    });

    describe('Callback Functions', () => {
        it('should accept all required callback functions', () => {
            const callbacks = {
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
                onSuggestionGenerate: vi.fn()
            };

            render(<GroupableColumn {...mockProps} {...callbacks} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });
    });

    describe('Performance', () => {
        it('should render efficiently with reasonable performance', () => {
            const start = performance.now();
            render(<GroupableColumn {...mockProps} />);
            const end = performance.now();

            // Should render within reasonable time (less than 50ms)
            expect(end - start).toBeLessThan(50);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle missing optional props gracefully', () => {
            const minimalProps = {
                column: mockColumn,
                cards: [],
                groups: [],
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

            render(<GroupableColumn {...minimalProps} />);
            expect(screen.getByText('What Helped')).toBeInTheDocument();
        });
    });
});
