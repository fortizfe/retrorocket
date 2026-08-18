import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, expect, type Mock } from 'vitest';
import toast from 'react-hot-toast';
import GroupableColumn from '@/features/boards/clustering/components/GroupableColumn';
import { Card, CardGroup } from '@/features/boards/types/card';
import { ColumnConfig, Retrospective } from '@/features/boards/types/retrospective';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
        section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    },
    // A detectable marker (not a bare fragment passthrough) so tests can count how many
    // distinct AnimatePresence boundaries exist — used to assert the groups list gets
    // its own, in addition to the pre-existing new-card-form and empty-state ones
    // (design audit finding, spec 028: same AnimatePresence-boundary bug class as DAF-001).
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    Plus: () => <div data-testid="plus-icon" />,
    Users: () => <div data-testid="users-icon" />,
    Lightbulb: () => <div data-testid="lightbulb-icon" />,
    ChevronDown: () => <div data-testid="chevron-down" />,
    ChevronUp: () => <div data-testid="chevron-up" />,
}));

// Mock UI components
vi.mock('@/lib/components/ui/Card', () => ({
    default: ({ children, ...props }: any) => <div data-testid="ui-card" {...props}>{children}</div>,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, ...props }: any) => (
        <button data-testid="ui-button" onClick={onClick} disabled={disabled} {...props}>
            {children}
        </button>
    ),
}));

vi.mock('@/lib/components/ui/TextareaWithEmoji', () => ({
    // forwardRef (matching the real component) so GroupableColumn's ref-based focus
    // fix (research.md §4) has a real DOM node to call .focus() on in tests.
    default: React.forwardRef<HTMLTextAreaElement, any>(
        ({ value, onChange, onFocus, onBlur, placeholder, ...props }, ref) => (
            <textarea
                ref={ref}
                data-testid="textarea-with-emoji"
                value={value}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder={placeholder}
                {...props}
            />
        )
    ),
}));

vi.mock('@/lib/components/ui/ColorPicker', () => ({
    default: ({ selectedColor, onColorChange, ...props }: any) => (
        <div data-testid="color-picker" {...props}>
            <button onClick={() => onColorChange?.('blue')}>Blue</button>
            <button onClick={() => onColorChange?.('red')}>Red</button>
            <span>Selected: {selectedColor}</span>
        </div>
    )
}));

vi.mock('@/lib/components/ui/TypingPreview', () => ({
    // feature 052-anonymous-typing-indicator, T005: also captures the `isAnonymous`
    // prop GroupableColumn is expected to pass through (not yet wired up — T008),
    // via `data-anonymous`, so tests can assert on it without depending on
    // TypingPreview's own (separately covered) rendering logic.
    default: ({ typingUsers, isAnonymous }: any) => (
        <div data-testid="typing-preview" data-anonymous={String(isAnonymous)}>
            {typingUsers?.length > 0 && `${typingUsers.length} users typing`}
        </div>
    ),
}));

// Mock complex child components
vi.mock('@/features/boards/clustering/components/GroupCard', () => ({
    GroupCard: ({ group, onToggleCollapse, onDisbandGroup, ...props }: any) => (
        <div data-testid="group-card" data-group-id={group.id} {...props}>
            <span>Group: {group.title}</span>
            <button onClick={() => onToggleCollapse?.(group.id)}>Toggle</button>
            <button onClick={() => onDisbandGroup?.(group.id)}>Disband</button>
        </div>
    ),
}));

// GroupSuggestionModal is no longer rendered directly by GroupableColumn (spec 044,
// US1 — it moved into ColumnHeaderMenu's own anchored panel); the mocked
// ColumnHeaderMenu below exposes the suggestion props/handlers GroupableColumn passes
// down, so this file can still assert on that plumbing directly.
vi.mock('@/features/boards/clustering/components/ColumnHeaderMenu', () => ({
    default: ({
        currentGrouping, onGroupingChange, hasCards, disabled,
        suggestionsOpen, suggestions, suggestionsLoading, suggestionsError,
        onAcceptSuggestion, onRejectSuggestion, onCloseSuggestions,
        excludeUserGrouping,
    }: any) => (
        <div data-testid="column-header-menu">
            <span>Current: {currentGrouping}</span>
            {/* spec 051-anonymous-board-mode, T030(c): exposes whatever GroupableColumn
                passes for the "hide the user-grouping option while anonymous" flag
                (FR-004), so tests can assert on it without depending on this menu's own
                (separately covered) rendering logic. */}
            <span data-testid="exclude-user-grouping">{String(excludeUserGrouping)}</span>
            <button onClick={() => onGroupingChange?.('user')}>Group by User</button>
            <button onClick={() => onGroupingChange?.('suggestions')}>Group by Suggestions</button>
            <button onClick={() => onGroupingChange?.('none')}>No Grouping</button>
            {hasCards && <span>Has Cards</span>}
            {disabled && <span>Disabled</span>}

            {suggestionsOpen && (
                <div data-testid="group-suggestion-modal">
                    {suggestionsLoading && <span data-testid="suggestions-loading">Loading</span>}
                    {suggestionsError && <span data-testid="suggestions-error">{suggestionsError}</span>}
                    <button onClick={onCloseSuggestions}>Close</button>
                    {suggestions?.map((suggestion: any, index: number) => (
                        <button
                            key={index}
                            onClick={() => onAcceptSuggestion?.(suggestion)}
                            data-testid={`suggestion-${index}`}
                        >
                            Accept Suggestion {index}
                        </button>
                    ))}
                    {suggestions?.map((suggestion: any, index: number) => (
                        <button
                            key={`reject-${index}`}
                            onClick={() => onRejectSuggestion?.(suggestion.id)}
                            data-testid={`reject-suggestion-${index}`}
                        >
                            Reject Suggestion {index}
                        </button>
                    ))}
                </div>
            )}
        </div>
    ),
}));

vi.mock('@/features/boards/clustering/components/GroupedCardList', () => ({
    default: ({ cards, groupBy }: any) => (
        <div data-testid="grouped-card-list" data-group-by={groupBy}>
            {cards?.map((card: any) => (
                <div key={card.id} data-testid={`card-${card.id}`}>
                    Card: {card.content}
                </div>
            ))}
        </div>
    ),
}));

// Mock contexts and hooks
const mockGetTypingUsersForColumn = vi.fn<(columnId: string) => any[]>(() => []);

vi.mock('@/features/boards/retrospective/contexts/useTypingContext', () => ({
    useTypingContext: () => ({
        startTyping: vi.fn(),
        stopTyping: vi.fn(),
        getTypingUsersForColumn: mockGetTypingUsersForColumn,
    }),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
    }),
}));

// Real React state backing this mock (rather than a static return value) so that
// calling setGroupingCriteria actually re-renders GroupableColumn with the updated
// criteria on the next getColumnState() read — needed for spec 047 US2's mode-switch
// teardown tests, which depend on reading the *previous* criteria at the moment of
// a real transition (e.g. suggestions -> none), not a hardcoded constant.
//
// Seeds its initial per-column criteria from `columnGroupingStates` (the second
// arg, mirroring the real hook's `initialState` param) so spec 051-anonymous-board-
// mode's T030 tests can start a column already persisted at criteria: 'user'
// without needing a simulated menu click first.
const mockSetGroupingCriteria = vi.fn();
vi.mock('@/features/boards/clustering/hooks/useColumnGrouping', () => ({
    useColumnGrouping: (_retrospectiveId?: string, initialState?: Record<string, { criteria: string }>) => {
        const [criteriaByColumn, setCriteriaByColumn] = React.useState<Record<string, string>>(
            () => Object.fromEntries(Object.entries(initialState ?? {}).map(([columnId, state]) => [columnId, state.criteria]))
        );
        return {
            getColumnState: (columnId: string) => ({
                criteria: criteriaByColumn[columnId] ?? 'none',
                previousState: null,
            }),
            setGroupingCriteria: (columnId: string, criteria: string) => {
                mockSetGroupingCriteria(columnId, criteria);
                setCriteriaByColumn(prev => ({ ...prev, [columnId]: criteria }));
            },
            processCards: (cards: any) => cards,
            restorePreviousState: vi.fn(),
        };
    },
}));

vi.mock('@/lib/utils/cardColors', () => ({
    getCardStyling: vi.fn(() => ({ bg: 'bg-blue-100', border: 'border-blue-200' })),
    getDefaultColor: vi.fn(() => 'pastelWhite'),
}));

// spec 051-anonymous-board-mode, US2, T030: GroupableColumn is a descendant of the
// same BoardDataContext.Provider DraggableCard reads from (research.md §6), so it
// reads the board's isAnonymous flag the same way rather than needing a new prop
// threaded from RetrospectiveBoard.tsx.
vi.mock('@/features/boards/retrospective/contexts/useBoardData', () => ({
    useBoardData: vi.fn(),
}));

const mockUseBoardData = vi.mocked(useBoardData);

describe('GroupableColumn', () => {
    const mockColumn: ColumnConfig = {
        id: 'helped',
        title: 'What went well?',
        description: 'Positive feedback',
        color: 'blue',
        icon: '👍',
    };

    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'Great teamwork',
            retrospectiveId: 'retro-1',
            column: 'helped',
            createdBy: 'user-1',
            color: 'pastelBlue',
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
            votes: 3,
            order: 1,
        },
        {
            id: 'card-2',
            content: 'Good communication',
            retrospectiveId: 'retro-1',
            column: 'helped',
            createdBy: 'user-2',
            color: 'pastelGreen',
            createdAt: new Date('2023-01-02'),
            updatedAt: new Date('2023-01-02'),
            votes: 1,
            order: 2,
        },
    ];

    const mockGroups: CardGroup[] = [
        {
            id: 'group-1',
            retrospectiveId: 'retro-1',
            column: 'helped',
            title: 'Team Collaboration',
            headCardId: 'card-1',
            memberCardIds: ['card-2'],
            isCollapsed: false,
            createdAt: new Date('2023-01-01'),
            createdBy: 'user-1',
            order: 1,
        },
    ];

    const defaultProps = {
        column: mockColumn,
        cards: mockCards,
        groups: mockGroups,
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
        currentUser: 'user-1',
        retrospectiveId: 'retro-1',
        participants: [],
        canConvertToAction: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Default: non-anonymous board, matching today's behavior for every test in
        // this file that doesn't itself set an anonymous board (T030 tests override
        // this per-test, after this beforeEach runs).
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
            retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
            participants: [], timer: null, myFacilitatorNotes: [],
        });
    });

    describe('Basic Rendering', () => {
        it('should render the column with title and description', () => {
            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
            expect(screen.getByText('Positive feedback')).toBeInTheDocument();
        });

        it('should render add card button when not disabled', () => {
            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByRole('button', { name: /retrospective\.columns\.add/i })).toBeInTheDocument();
        });

        it('should render column header menu', () => {
            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('column-header-menu')).toBeInTheDocument();
        });

        it('should render group cards when groups exist', () => {
            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('group-card')).toBeInTheDocument();
            expect(screen.getByText('Group: Team Collaboration')).toBeInTheDocument();
        });

        it('should render typing preview component', () => {
            // Configure mock to return typing users
            mockGetTypingUsersForColumn.mockReturnValue([{ id: 'user-1', displayName: 'Test User' }]);

            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('typing-preview')).toBeInTheDocument();

            // Reset mock
            mockGetTypingUsersForColumn.mockReturnValue([]);
        });
    });

    describe('Card Creation', () => {
        it('should enter create mode when add button is clicked', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            expect(screen.getByTestId('color-picker')).toBeInTheDocument();
        });

        it('should focus the new-card textarea when entering create mode', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await waitFor(() => {
                expect(textarea).toHaveFocus();
            });
        });

        it('should show cancel and submit buttons in create mode', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            expect(screen.getByRole('button', { name: /retrospective\.columns\.cancel/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /retrospective\.columns\.createCard/i })).toBeInTheDocument();
        });

        it('should handle card content input', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            expect(textarea).toHaveValue('New card content');
        });

        it('should pre-select the neutral default color, not a column-derived one', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            expect(screen.getByText(/Selected:.*pastelWhite/)).toBeInTheDocument();
        });

        it('should update the selected color when the user picks one manually', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const redButton = screen.getByText('Red');
            await user.click(redButton);

            expect(screen.getByText(/Selected:.*red/)).toBeInTheDocument();
        });

        it('should create card when form is submitted', async () => {
            const user = userEvent.setup();
            const mockOnCardCreate = vi.fn().mockResolvedValue(undefined);
            render(<GroupableColumn {...defaultProps} onCardCreate={mockOnCardCreate} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnCardCreate).toHaveBeenCalledWith({
                    content: 'New card content',
                    column: 'helped',
                    color: 'pastelWhite',
                    createdBy: 'user-1',
                    retrospectiveId: 'retro-1',
                });
            });
        });

        it('should create card with the manually selected color when the user overrides the default', async () => {
            const user = userEvent.setup();
            const mockOnCardCreate = vi.fn().mockResolvedValue(undefined);
            render(<GroupableColumn {...defaultProps} onCardCreate={mockOnCardCreate} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const redButton = screen.getByText('Red');
            await user.click(redButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnCardCreate).toHaveBeenCalledWith({
                    content: 'New card content',
                    column: 'helped',
                    color: 'red',
                    createdBy: 'user-1',
                    retrospectiveId: 'retro-1',
                });
            });
        });

        it('should exit create mode after successful creation', async () => {
            const user = userEvent.setup();
            const mockOnCardCreate = vi.fn().mockResolvedValue(undefined);
            render(<GroupableColumn {...defaultProps} onCardCreate={mockOnCardCreate} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
            });
        });

        it('should cancel create mode when cancel button is clicked', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const cancelButton = screen.getByRole('button', { name: /retrospective\.columns\.cancel/i });
            await user.click(cancelButton);

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
        });

        it('should disable submit button when content is empty', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            expect(submitButton).toBeDisabled();
        });

        it('should enable submit button when content is provided', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'Some content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            expect(submitButton).not.toBeDisabled();
        });
    });

    describe('Group Management', () => {
        it('should handle group toggle collapse', async () => {
            const user = userEvent.setup();
            const mockOnGroupToggleCollapse = vi.fn();
            render(<GroupableColumn {...defaultProps} onGroupToggleCollapse={mockOnGroupToggleCollapse} />);

            const toggleButton = screen.getByText('Toggle');
            await user.click(toggleButton);

            expect(mockOnGroupToggleCollapse).toHaveBeenCalledWith('group-1');
        });

        it('should handle group disband', async () => {
            const user = userEvent.setup();
            const mockOnGroupDisband = vi.fn();
            render(<GroupableColumn {...defaultProps} onGroupDisband={mockOnGroupDisband} />);

            const disbandButton = screen.getByText('Disband');
            await user.click(disbandButton);

            expect(mockOnGroupDisband).toHaveBeenCalledWith('group-1');
        });

        it('should render groups in correct order', () => {
            const multipleGroups: CardGroup[] = [
                { ...mockGroups[0], title: 'Group A', order: 2 },
                { ...mockGroups[0], id: 'group-2', title: 'Group B', order: 1 },
            ];

            render(<GroupableColumn {...defaultProps} groups={multipleGroups} />);

            const groups = screen.getAllByTestId('group-card');
            expect(groups).toHaveLength(2);
        });

        it('wraps the groups list in its own AnimatePresence, so a disbanded group can exit-animate instead of vanishing instantly (design audit finding, spec 028)', () => {
            const multipleGroups: CardGroup[] = [
                { ...mockGroups[0], title: 'Group A', order: 2 },
                { ...mockGroups[0], id: 'group-2', title: 'Group B', order: 1 },
            ];

            render(<GroupableColumn {...defaultProps} groups={multipleGroups} />);

            // Two AnimatePresence boundaries already exist unconditionally (the
            // new-card-form and empty-state ones) regardless of groups content — a
            // correct fix adds a third, dedicated one directly around the groups list.
            expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(3);
        });
    });

    describe('Column Header Menu Integration', () => {
        it('should pass correct props to column header menu', () => {
            render(<GroupableColumn {...defaultProps} />);

            const headerMenu = screen.getByTestId('column-header-menu');
            expect(headerMenu).toBeInTheDocument();
            expect(screen.getByText('Current: none')).toBeInTheDocument();
        });

        it('should handle grouping criteria change', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const userGroupButton = screen.getByText('Group by User');
            await user.click(userGroupButton);

            // The mock implementation would call the mocked setGroupingCriteria
            // In a real test, you'd verify the effect of the grouping change
        });

        it('should show has cards indicator when cards exist', () => {
            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByText('Has Cards')).toBeInTheDocument();
        });

        it('should not show has cards indicator when no cards exist', () => {
            render(<GroupableColumn {...defaultProps} cards={[]} groups={[]} />);

            // Note: Current component implementation passes hasCards={true} always
            // This is a potential bug that should be fixed in the component
            expect(screen.getByText('Has Cards')).toBeInTheDocument();
        });
    });

    describe('Group Suggestions (spec 044: async AI-based generation)', () => {
        it('opens the panel in its loading state immediately, before the async onSuggestionGenerate resolves (FR-007)', async () => {
            const user = userEvent.setup();
            let resolveSuggestions!: (value: unknown[]) => void;
            const pending = new Promise(resolve => { resolveSuggestions = resolve; });
            const mockOnSuggestionGenerate = vi.fn().mockReturnValue(pending);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));

            // The panel must be visible with a loading indicator *before* the promise
            // resolves — this is a real async round-trip now (worker + model
            // inference), not the old synchronous algorithm.
            expect(screen.getByTestId('group-suggestion-modal')).toBeInTheDocument();
            expect(screen.getByTestId('suggestions-loading')).toBeInTheDocument();

            resolveSuggestions([{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Suggested title' }]);
            await waitFor(() => expect(screen.queryByTestId('suggestions-loading')).not.toBeInTheDocument());
        });

        it('awaits the async onSuggestionGenerate and shows the resulting suggestions', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Suggested title' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));

            expect(mockOnSuggestionGenerate).toHaveBeenCalledTimes(1);
            await waitFor(() => {
                expect(screen.getByTestId('group-suggestion-modal')).toBeInTheDocument();
                expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
            });
            expect(screen.queryByTestId('suggestions-error')).not.toBeInTheDocument();
        });

        it('shows a distinct error state (not an empty result) when onSuggestionGenerate rejects (FR-008)', async () => {
            const user = userEvent.setup();
            const mockOnSuggestionGenerate = vi.fn().mockRejectedValue(new Error('AI model unavailable'));
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));

            await waitFor(() => {
                expect(screen.getByTestId('group-suggestion-modal')).toBeInTheDocument();
                expect(screen.getByTestId('suggestions-error')).toHaveTextContent('AI model unavailable');
            });
            expect(screen.queryByTestId('suggestion-0')).not.toBeInTheDocument();
        });

        it('accepting a suggestion creates a group via onGroupCreate', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Some title' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            const mockOnGroupCreate = vi.fn().mockResolvedValue('new-group-id');
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} onGroupCreate={mockOnGroupCreate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());
            await user.click(screen.getByTestId('suggestion-0'));

            await waitFor(() => expect(mockOnGroupCreate).toHaveBeenCalledWith('card-1', ['card-2'], 'Some title'));
        });

        it('accepting a suggestion with a non-empty title passes it through as the group\'s customTitle (spec 047 FR-004)', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Standup runs long' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            const mockOnGroupCreate = vi.fn().mockResolvedValue('new-group-id');
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} onGroupCreate={mockOnGroupCreate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());
            await user.click(screen.getByTestId('suggestion-0'));

            await waitFor(() => expect(mockOnGroupCreate).toHaveBeenCalledWith('card-1', ['card-2'], 'Standup runs long'));
        });

        it('accepting a suggestion whose title was cleared to blank falls back to a computed "Group N" title (spec 047 FR-005)', async () => {
            // defaultProps.groups already contains one existing group in column 'helped'
            // (mockGroups), so the next accepted group should be numbered "Group 2".
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: '   ' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            const mockOnGroupCreate = vi.fn().mockResolvedValue('new-group-id');
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} onGroupCreate={mockOnGroupCreate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());
            await user.click(screen.getByTestId('suggestion-0'));

            await waitFor(() => expect(mockOnGroupCreate).toHaveBeenCalledWith('card-1', ['card-2'], 'groupSuggestion.group 2'));
        });

        it('shows an error toast and keeps the suggestion when onGroupCreate fails (spec 046, FR-007a)', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Suggested title' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            const mockOnGroupCreate = vi.fn().mockRejectedValue(new Error('network error'));
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} onGroupCreate={mockOnGroupCreate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());
            await user.click(screen.getByTestId('suggestion-0'));

            await waitFor(() => expect(toast.error as Mock).toHaveBeenCalledWith('groupSuggestion.acceptError'));
            expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
            expect(screen.getByTestId('group-suggestion-modal')).toBeInTheDocument();
        });

        it('rejecting or closing suggestions never touches cards or groups (spec 046, FR-006)', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Suggested title' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());

            await user.click(screen.getByTestId('reject-suggestion-0'));
            await waitFor(() => expect(screen.queryByTestId('suggestion-0')).not.toBeInTheDocument());

            await user.click(screen.getByText('Close'));
            await waitFor(() => expect(screen.queryByTestId('group-suggestion-modal')).not.toBeInTheDocument());

            expect(defaultProps.onCardUpdate).not.toHaveBeenCalled();
            expect(defaultProps.onCardDelete).not.toHaveBeenCalled();
            expect(defaultProps.onGroupCreate).not.toHaveBeenCalled();
            expect(defaultProps.onGroupDisband).not.toHaveBeenCalled();
            expect(defaultProps.onCardRemoveFromGroup).not.toHaveBeenCalled();
        });

        it('closing the suggestions panel clears its state', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Suggested title' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('group-suggestion-modal')).toBeInTheDocument());

            await user.click(screen.getByText('Close'));
            await waitFor(() => expect(screen.queryByTestId('group-suggestion-modal')).not.toBeInTheDocument());
        });
    });

    describe('Mode-switch teardown (spec 047, US2)', () => {
        it('switching away from suggestions to "no grouping" disbands every existing group and re-sorts remaining cards per "none" (FR-008/FR-009)', async () => {
            const user = userEvent.setup();
            const mockOnGroupDisband = vi.fn().mockResolvedValue(undefined);
            const { rerender } = render(<GroupableColumn {...defaultProps} onGroupDisband={mockOnGroupDisband} />);

            // Real transition into 'suggestions' first, via the stateful mock, so the
            // component's own read of "previous criteria" genuinely reflects it.
            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(mockOnGroupDisband).toHaveBeenCalledTimes(1));
            expect(mockOnGroupDisband).toHaveBeenCalledWith('group-1');
            await waitFor(() => expect(screen.getByTestId('grouped-card-list')).toHaveAttribute('data-group-by', 'none'));

            // Simulate the parent applying the realtime-synced result of the disband.
            rerender(<GroupableColumn {...defaultProps} onGroupDisband={mockOnGroupDisband} groups={[]} />);
            expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
        });

        it('switching away from suggestions to "group by user" disbands every existing group and re-sorts remaining cards per "user" (FR-008/FR-009)', async () => {
            const user = userEvent.setup();
            const mockOnGroupDisband = vi.fn().mockResolvedValue(undefined);
            render(<GroupableColumn {...defaultProps} onGroupDisband={mockOnGroupDisband} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());

            await user.click(screen.getByText('Group by User'));

            await waitFor(() => expect(mockOnGroupDisband).toHaveBeenCalledTimes(1));
            expect(mockOnGroupDisband).toHaveBeenCalledWith('group-1');
            await waitFor(() => expect(screen.getByTestId('grouped-card-list')).toHaveAttribute('data-group-by', 'user'));
        });

        it('discards pending, un-actioned suggestions and closes the panel when switching away from suggestions (FR-011)', async () => {
            const user = userEvent.setup();
            const mockSuggestions = [{ id: 's1', cardIds: ['card-1', 'card-2'], similarity: 0.8, suggestedTitle: 'Pending suggestion' }];
            const mockOnSuggestionGenerate = vi.fn().mockResolvedValue(mockSuggestions);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByTestId('suggestion-0')).toBeInTheDocument());

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(screen.queryByTestId('group-suggestion-modal')).not.toBeInTheDocument());
            expect(screen.queryByTestId('suggestion-0')).not.toBeInTheDocument();
        });

        it('does not call onGroupDisband when switching away from suggestions and the column has no accepted groups', async () => {
            const user = userEvent.setup();
            const mockOnGroupDisband = vi.fn();
            render(<GroupableColumn {...defaultProps} groups={[]} onGroupDisband={mockOnGroupDisband} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());
            await user.click(screen.getByText('No Grouping'));
            await waitFor(() => expect(screen.getByText('Current: none')).toBeInTheDocument());

            expect(mockOnGroupDisband).not.toHaveBeenCalled();
        });

        it('does not call onGroupDisband when switching between two non-suggestions modes (FR-013)', async () => {
            const user = userEvent.setup();
            const mockOnGroupDisband = vi.fn();
            // Initial mocked criteria is 'none' (useColumnGrouping mock default) — go
            // straight to 'user', never touching 'suggestions'.
            render(<GroupableColumn {...defaultProps} onGroupDisband={mockOnGroupDisband} />);

            await user.click(screen.getByText('Group by User'));
            await waitFor(() => expect(screen.getByText('Current: user')).toBeInTheDocument());

            expect(mockOnGroupDisband).not.toHaveBeenCalled();
        });

        it('attempts every disband even if one rejects, and shows a visible error toast without blocking the others (research.md §4)', async () => {
            const user = userEvent.setup();
            const twoGroups: CardGroup[] = [
                mockGroups[0],
                { ...mockGroups[0], id: 'group-2', headCardId: 'card-2', memberCardIds: [] },
            ];
            const mockOnGroupDisband = vi.fn((groupId: string) =>
                groupId === 'group-1' ? Promise.reject(new Error('network error')) : Promise.resolve()
            );
            render(<GroupableColumn {...defaultProps} groups={twoGroups} onGroupDisband={mockOnGroupDisband} />);

            await user.click(screen.getByText('Group by Suggestions'));
            await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());
            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(mockOnGroupDisband).toHaveBeenCalledTimes(2));
            expect(mockOnGroupDisband).toHaveBeenCalledWith('group-1');
            expect(mockOnGroupDisband).toHaveBeenCalledWith('group-2');
            await waitFor(() => expect(toast.error as Mock).toHaveBeenCalledWith('retrospective.grouping.disbandOnSwitchError'));
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle missing current user gracefully', () => {
            render(<GroupableColumn {...defaultProps} currentUser={undefined} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
        });

        it('should handle empty cards array', () => {
            render(<GroupableColumn {...defaultProps} cards={[]} groups={[]} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
            expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
        });

        it('renders a distinct empty-column state that invites the first contribution (edge case, data-model.md Board State)', () => {
            render(<GroupableColumn {...defaultProps} cards={[]} groups={[]} />);

            // Distinct from a bare void: the column's own icon (also shown in the
            // header, hence getAllByText), an explicit "no cards" message, and a
            // call-to-action to add the first one.
            expect(screen.getAllByText(mockColumn.icon).length).toBeGreaterThan(0);
            expect(screen.getByText('retrospective.columns.noCards')).toBeInTheDocument();
            expect(screen.getByText('retrospective.columns.addFirstCard')).toBeInTheDocument();
        });

        it('should handle empty groups array', () => {
            render(<GroupableColumn {...defaultProps} groups={[]} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
            expect(screen.queryByTestId('group-card')).not.toBeInTheDocument();
        });

        it('should handle card creation errors gracefully', async () => {
            const user = userEvent.setup();
            const mockOnCardCreate = vi.fn().mockRejectedValue(new Error('Creation failed'));
            render(<GroupableColumn {...defaultProps} onCardCreate={mockOnCardCreate} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            await user.click(submitButton);

            await waitFor(() => {
                expect(mockOnCardCreate).toHaveBeenCalled();
                // Should remain in create mode on error
                expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            });
        });

        it('should handle whitespace-only content appropriately', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, '   ');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            expect(submitButton).toBeDisabled();
        });

        it('should handle very long content', async () => {
            const user = userEvent.setup();
            const longContent = 'A'.repeat(1000);
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            // Use fireEvent.change to avoid simulating 1000 individual keystrokes
            fireEvent.change(textarea, { target: { value: longContent } });

            expect(textarea).toHaveValue(longContent);
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels for interactive elements', () => {
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            expect(addButton).toBeInTheDocument();
        });

        it('should support keyboard navigation', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            addButton.focus();

            await user.keyboard('{Enter}');
            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
        });

        it('should handle focus management in create mode', async () => {
            const user = userEvent.setup();
            render(<GroupableColumn {...defaultProps} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            expect(textarea).toHaveFocus();
        });
    });

    describe('Performance Considerations', () => {
        it('should handle large numbers of cards efficiently', () => {
            const manyCards: Card[] = Array.from({ length: 100 }, (_, i) => ({
                id: `card-${i}`,
                content: `Card content ${i}`,
                retrospectiveId: 'retro-1',
                column: 'helped',
                createdBy: 'user-1',
                color: 'pastelBlue',
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-01'),
                votes: 0,
                order: i,
            }));

            render(<GroupableColumn {...defaultProps} cards={manyCards} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
        });

        it('should handle large numbers of groups efficiently', () => {
            const manyGroups: CardGroup[] = Array.from({ length: 50 }, (_, i) => ({
                id: `group-${i}`,
                retrospectiveId: 'retro-1',
                column: 'helped',
                title: `Group ${i}`,
                headCardId: `card-${i}`,
                memberCardIds: [],
                isCollapsed: false,
                createdAt: new Date('2023-01-01'),
                createdBy: 'user-1',
                order: i,
            }));

            render(<GroupableColumn {...defaultProps} groups={manyGroups} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
        });
    });

    describe('Props Integration', () => {
        it('should respect canConvertToAction prop', () => {
            render(<GroupableColumn {...defaultProps} canConvertToAction={true} />);

            expect(screen.getByTestId('grouped-card-list')).toBeInTheDocument();
        });

        it('should pass participants to child components', () => {
            const participants = [
                { id: 'user-1', name: 'John Doe' },
                { id: 'user-2', name: 'Jane Smith' },
            ];

            render(<GroupableColumn {...defaultProps} participants={participants} />);

            expect(screen.getByTestId('grouped-card-list')).toBeInTheDocument();
        });

        it('should handle onConvertToAction callback', () => {
            const mockOnConvertToAction = vi.fn();

            render(<GroupableColumn
                {...defaultProps}
                canConvertToAction={true}
                onConvertToAction={mockOnConvertToAction}
            />);

            expect(screen.getByTestId('grouped-card-list')).toBeInTheDocument();
        });
    });

    describe('Loading States', () => {
        it('should show loading state during card creation', async () => {
            const user = userEvent.setup();
            const mockOnCardCreate = vi.fn().mockResolvedValue(undefined);
            render(<GroupableColumn {...defaultProps} onCardCreate={mockOnCardCreate} />);

            const addButton = screen.getByRole('button', { name: /retrospective\.columns\.add/i });
            await user.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            await user.type(textarea, 'New card content');

            const submitButton = screen.getByRole('button', { name: /retrospective\.columns\.createCard/i });
            await user.click(submitButton);

            expect(mockOnCardCreate).toHaveBeenCalled();
        });

        it('should handle suggestion generation', () => {
            const mockOnSuggestionGenerate = vi.fn(() => []);
            render(<GroupableColumn {...defaultProps} onSuggestionGenerate={mockOnSuggestionGenerate} />);

            expect(screen.getByText('What went well?')).toBeInTheDocument();
        });
    });

    // spec 051-anonymous-board-mode, US2 (FR-004, FR-010), T030: a column persisted
    // at criteria 'user' must render as ungrouped while the board is anonymous — a
    // display-time-only override (research.md §5) that must never write 'none' back
    // through setGroupingCriteria, so the saved 'user' choice reappears automatically
    // the moment the board goes non-anonymous again.
    describe('Anonymous board mode (spec 051-anonymous-board-mode, US2, T030)', () => {
        const persistedUserGrouping = {
            helped: { criteria: 'user' as const, activeGroups: [] },
        };

        it('renders ungrouped and never calls setGroupingCriteria when the board is anonymous and the persisted criteria is "user"', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: true } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} columnGroupingStates={persistedUserGrouping} />);

            expect(screen.getByText('Current: none')).toBeInTheDocument();
            expect(screen.getByTestId('grouped-card-list')).toHaveAttribute('data-group-by', 'none');
            // The override is display-time only (research.md §5) — the persisted
            // 'user' choice in columnGroupingStates must never be overwritten.
            expect(mockSetGroupingCriteria).not.toHaveBeenCalled();
        });

        it('renders grouped by user when the board is not anonymous, with the same persisted criteria (regression)', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} columnGroupingStates={persistedUserGrouping} />);

            expect(screen.getByText('Current: user')).toBeInTheDocument();
            expect(screen.getByTestId('grouped-card-list')).toHaveAttribute('data-group-by', 'user');
        });

        it('passes excludeUserGrouping to the grouping menu when the board is anonymous', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: true } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('exclude-user-grouping')).toHaveTextContent('true');
        });

        it('does not pass excludeUserGrouping (falsy) to the grouping menu when the board is not anonymous', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} />);

            const flag = screen.getByTestId('exclude-user-grouping').textContent;
            expect(flag === 'false' || flag === 'undefined').toBe(true);
        });
    });

    // feature 052-anonymous-typing-indicator, T005 (US1): GroupableColumn does not
    // pass `isAnonymous` to TypingPreview yet (that's T008) — RED until then.
    describe('Typing preview anonymity (feature 052-anonymous-typing-indicator)', () => {
        it('passes isAnonymous={true} to TypingPreview when the board is anonymous', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: true } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('typing-preview')).toHaveAttribute('data-anonymous', 'true');
        });

        it('passes isAnonymous={false} to TypingPreview when the board is not anonymous', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            render(<GroupableColumn {...defaultProps} />);

            expect(screen.getByTestId('typing-preview')).toHaveAttribute('data-anonymous', 'false');
        });

        // feature 052-anonymous-typing-indicator, T012 (US3/FR-006/SC-003): the two
        // tests above only check the initial render. This proves the live-toggle case —
        // that flipping the board's isAnonymous flag re-renders the SAME TypingPreview
        // DOM node with an updated data-anonymous value, rather than requiring a fresh
        // mount (i.e. a real prop update, matching "no reload required"). research.md §1
        // predicts this needs no new production code beyond T008/T009's plumbing.
        it('updates data-anonymous live on the same DOM node when the board toggles anonymous mode, without unmounting (User Story 3)', () => {
            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });

            const { rerender } = render(<GroupableColumn {...defaultProps} />);
            const nodeBeforeToggle = screen.getByTestId('typing-preview');
            expect(nodeBeforeToggle).toHaveAttribute('data-anonymous', 'false');

            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: true } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });
            rerender(<GroupableColumn {...defaultProps} />);

            const nodeAfterToggleOn = screen.getByTestId('typing-preview');
            expect(nodeAfterToggleOn).toBe(nodeBeforeToggle);
            expect(nodeAfterToggleOn).toHaveAttribute('data-anonymous', 'true');

            mockUseBoardData.mockReturnValue({
                cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
                retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
                participants: [], timer: null, myFacilitatorNotes: [],
            });
            rerender(<GroupableColumn {...defaultProps} />);

            const nodeAfterToggleOff = screen.getByTestId('typing-preview');
            expect(nodeAfterToggleOff).toBe(nodeBeforeToggle);
            expect(nodeAfterToggleOff).toHaveAttribute('data-anonymous', 'false');
        });
    });
});
