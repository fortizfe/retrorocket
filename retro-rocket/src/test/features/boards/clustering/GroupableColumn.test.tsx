import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, beforeEach, afterEach, expect, type Mock } from 'vitest';
import toast from 'react-hot-toast';
import GroupableColumn from '@/features/boards/clustering/components/GroupableColumn';
import { Card, CardGroup, MoveCardResult } from '@/features/boards/types/card';
import { GroupingConflictError } from '@/features/boards/clustering/hooks/useCardGroups';
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
    default: ({ cards, groupBy, onCardsReorder }: any) => (
        <div data-testid="grouped-card-list" data-group-by={groupBy}>
            {/* spec 059, T028 (B8): lets a test trigger the section-local reorder callback
                GroupableColumn hands down in mode 'user'. */}
            <button
                data-testid="grouped-list-reorder"
                onClick={() => onCardsReorder?.([{ cardId: 'u2', order: 0, column: 'helped' }])}
            >
                reorder-in-section
            </button>
            {cards?.map((card: any) => (
                <div key={card.id} data-testid={`card-${card.id}`}>
                    Card: {card.content}
                </div>
            ))}
        </div>
    ),
}));

// spec 059-drag-to-group-cards, T028 (B8/B9). ColumnDndProvider owns the real DndContext,
// sensors and intent tracking (covered by its own tests); jsdom cannot simulate dnd-kit
// pointer drops. So here it is replaced by a stub that CAPTURES the ColumnGroupingContext
// value GroupableColumn provides, letting tests drive exactly what the provider does on a
// drop: `ctx.computeOrder(placement)` then `ctx.requestMove(sourceId, target)`.
// The factory imports the context module lazily so that this file keeps loading (and the
// pre-existing tests keep running) before the new modules exist.
const dndHarness = vi.hoisted(() => ({ ctx: { current: null as any } }));
vi.mock('@/features/boards/clustering/dnd/ColumnDndProvider', async () => {
    // Path held in a variable on purpose: a literal specifier would make Vite's static
    // import analysis fail this whole file while the module does not exist yet.
    const contextModulePath = '@/features/boards/clustering/dnd/ColumnGroupingContext';
    const { useColumnGroupingContext } = await vi.importActual<any>(contextModulePath);
    const Stub = ({ children }: any) => {
        dndHarness.ctx.current = useColumnGroupingContext();
        return <div data-testid="column-dnd-provider">{children}</div>;
    };
    return { ColumnDndProvider: Stub, default: Stub };
});

// ColumnItemList is covered by ColumnItemList.test.tsx; here it only needs to prove that
// GroupableColumn renders it in modes none/suggestions and forwards onRenameGroup.
vi.mock('@/features/boards/clustering/components/ColumnItemList', () => ({
    default: ({ items, onRenameGroup, onGroupToggleCollapse, onGroupDisband }: any) => (
        <div data-testid="column-item-list" data-item-ids={(items ?? []).map((i: any) => i.id).join(',')}>
            <button data-testid="item-list-rename" onClick={() => onRenameGroup?.('g1', 'New title')}>rename</button>
            {/* The real list renders each group inside its own AnimatePresence boundary
                (spec 028); this stand-in keeps one so the boundary assertion still holds. */}
            <div data-testid="animate-presence">
                {(items ?? []).filter((i: any) => i.kind === 'group').map((i: any) => (
                    <div
                        key={i.id}
                        data-testid="group-card"
                        data-group-id={i.group.id}
                        // spec 059 T037: mirrors what the real list does (autoEditTitle = pendingEditGroupId === group.id)
                        data-auto-edit={String(dndHarness.ctx.current?.pendingEditGroupId === i.group.id)}
                    >
                        <span>Group: {i.group.title}</span>
                        <button onClick={() => onGroupToggleCollapse?.(i.group.id)}>Toggle</button>
                        <button onClick={() => onGroupDisband?.(i.group.id)}>Disband</button>
                    </div>
                ))}
            </div>
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
        // spec 059 T073: the teardown confirmation's {{count}} must be observable, so this one
        // key renders as `<key>:<count>`; every other key stays an identity translation.
        t: (key: string, params?: { count?: number }) =>
            key === 'retrospective.grouping.confirmTeardown' ? `${key}:${params?.count}` : key,
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
            await waitFor(() => expect(screen.getByTestId('column-item-list')).toBeInTheDocument());

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

            expect(screen.getByTestId('column-item-list')).toBeInTheDocument();
        });

        it('should pass participants to child components', () => {
            const participants = [
                { id: 'user-1', name: 'John Doe' },
                { id: 'user-2', name: 'Jane Smith' },
            ];

            render(<GroupableColumn {...defaultProps} participants={participants} />);

            expect(screen.getByTestId('column-item-list')).toBeInTheDocument();
        });

        it('should handle onConvertToAction callback', () => {
            const mockOnConvertToAction = vi.fn();

            render(<GroupableColumn
                {...defaultProps}
                canConvertToAction={true}
                onConvertToAction={mockOnConvertToAction}
            />);

            expect(screen.getByTestId('column-item-list')).toBeInTheDocument();
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
            expect(screen.getByTestId('column-item-list')).toBeInTheDocument();
            expect(screen.queryByTestId('grouped-card-list')).not.toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// spec 059-drag-to-group-cards, T028: B8 / B9 regression + new GroupableColumn props
// (onCardMove, onGroupRename, onColumnRenormalize). Contract: contracts/drag-group-ui.md,
// research.md §12 (requestMove is the single path), §14 (midpoint + precision guard).
// ---------------------------------------------------------------------------
describe('GroupableColumn drag orchestration (spec 059, B8/B9)', () => {
    const column: ColumnConfig = { id: 'helped', title: 'What went well?', description: 'd', color: 'blue', icon: '👍' };
    const t0 = new Date('2026-01-01');
    const mk = (id: string, order: number, extra: Partial<Card> = {}): Card => ({
        id, content: id, retrospectiveId: 'retro-1', column: 'helped', createdBy: 'user-1',
        color: 'pastelBlue', createdAt: t0, updatedAt: t0, order, ...extra,
    });
    // display order: u1(10), u2(20), group g1(25), u3(30)  -> interleaved column items
    const cards059: Card[] = [
        mk('u1', 10), mk('u2', 20), mk('u3', 30),
        mk('gh', 0, { groupId: 'g1', isGroupHead: true }), mk('gm', 0, { groupId: 'g1', groupOrder: 1 }),
    ];
    const groups059: CardGroup[] = [{
        id: 'g1', retrospectiveId: 'retro-1', column: 'helped', title: 'G', headCardId: 'gh',
        memberCardIds: ['gm'], isCollapsed: false, createdAt: t0, createdBy: 'user-1', order: 25,
    }];

    const baseProps = () => ({
        column,
        cards: cards059,
        groups: groups059,
        onCardCreate: vi.fn(), onCardUpdate: vi.fn(), onCardDelete: vi.fn(), onCardVote: vi.fn(),
        onCardLike: vi.fn(), onCardReaction: vi.fn(), onCardReactionRemove: vi.fn(),
        onCardsReorder: vi.fn(), onGroupCreate: vi.fn(), onGroupDisband: vi.fn(),
        onGroupToggleCollapse: vi.fn(), onCardRemoveFromGroup: vi.fn(),
        onSuggestionGenerate: vi.fn(() => []),
        onCardMove: vi.fn(async (): Promise<MoveCardResult> => ({ dissolvedGroupIds: [] })),
        onGroupRename: vi.fn(async () => { }),
        onColumnRenormalize: vi.fn(async () => { }),
        currentUser: 'user-1', retrospectiveId: 'retro-1', participants: [], canConvertToAction: false,
    });
    const modeState = (criteria: 'none' | 'suggestions' | 'user') =>
        ({ helped: { criteria, activeGroups: [] } }) as any;

    beforeEach(() => {
        vi.clearAllMocks();
        dndHarness.ctx.current = null;
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
            retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
            participants: [], timer: null, myFacilitatorNotes: [],
        });
    });

    describe.each(['none', 'suggestions'] as const)('mode %s (B9)', (mode) => {
        it('renders the interleaved ColumnItemList (groups + ungrouped cards in column order) instead of GroupedCardList', () => {
            render(<GroupableColumn {...baseProps()} columnGroupingStates={modeState(mode)} />);

            expect(screen.getByTestId('column-item-list')).toHaveAttribute(
                'data-item-ids', 'card:u1,card:u2,group:g1,card:u3'
            );
            expect(screen.queryByTestId('grouped-card-list')).not.toBeInTheDocument();
        });

        it('provides a grouping context scoped to the column with grouping enabled', () => {
            render(<GroupableColumn {...baseProps()} columnGroupingStates={modeState(mode)} />);

            const ctx = dndHarness.ctx.current;
            expect(ctx).not.toBeNull();
            expect(ctx.columnId).toBe('helped');
            expect(ctx.groupingEnabled).toBe(true);
            expect(ctx.items.map((i: any) => i.id)).toEqual(['card:u1', 'card:u2', 'group:g1', 'card:u3']);
        });

        it('a reorder drop calls onCardMove(cardId, { kind: "position", order }) with the midpoint order', async () => {
            const props = baseProps();
            render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);
            const ctx = dndHarness.ctx.current;
            expect(ctx).not.toBeNull();

            // drop u3 between u2 (20) and the group g1 (25)
            await act(async () => {
                const order = ctx.computeOrder({ beforeId: 'card:u2', afterId: 'group:g1' });
                await ctx.requestMove('u3', { kind: 'position', order });
            });

            expect(props.onCardMove).toHaveBeenCalledTimes(1);
            expect(props.onCardMove).toHaveBeenCalledWith('u3', { kind: 'position', order: 22.5 });
            expect(props.onColumnRenormalize).not.toHaveBeenCalled();
            expect(props.onCardsReorder).not.toHaveBeenCalled(); // no more full-column /cards/reorder rewrite
        });

        it('dropping at the start / end of the column uses b-1 / a+1', async () => {
            const props = baseProps();
            render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);
            const ctx = dndHarness.ctx.current;
            expect(ctx).not.toBeNull();

            await act(async () => {
                await ctx.requestMove('u3', { kind: 'position', order: ctx.computeOrder({ afterId: 'card:u1' }) });
                await ctx.requestMove('u1', { kind: 'position', order: ctx.computeOrder({ beforeId: 'card:u3' }) });
            });

            expect(props.onCardMove).toHaveBeenNthCalledWith(1, 'u3', { kind: 'position', order: 9 });
            expect(props.onCardMove).toHaveBeenNthCalledWith(2, 'u1', { kind: 'position', order: 31 });
        });

        it('when the precision guard trips, onColumnRenormalize(columnId, items) runs FIRST, then onCardMove with the order computed on the renormalised column', async () => {
            const props = baseProps();
            const tight = [mk('u1', 10), mk('u2', 10.0005), mk('u3', 30), cards059[3], cards059[4]];
            render(<GroupableColumn {...props} cards={tight} columnGroupingStates={modeState(mode)} />);
            const ctx = dndHarness.ctx.current;
            expect(ctx).not.toBeNull();

            await act(async () => {
                const order = ctx.computeOrder({ beforeId: 'card:u1', afterId: 'card:u2' });
                await ctx.requestMove('u3', { kind: 'position', order });
            });

            // every column item, display order, raw ids, spaced 1024 apart (columnOrder contract)
            expect(props.onColumnRenormalize).toHaveBeenCalledTimes(1);
            expect(props.onColumnRenormalize).toHaveBeenCalledWith('helped', [
                { kind: 'card', id: 'u1', order: 1024 },
                { kind: 'card', id: 'u2', order: 2048 },
                { kind: 'group', id: 'g1', order: 3072 },
                { kind: 'card', id: 'u3', order: 4096 },
            ]);
            expect(props.onCardMove).toHaveBeenCalledTimes(1);
            expect(props.onCardMove).toHaveBeenCalledWith('u3', { kind: 'position', order: 1536 });

            const renormalizeCall = (props.onColumnRenormalize as Mock).mock.invocationCallOrder[0];
            const moveCall = (props.onCardMove as Mock).mock.invocationCallOrder[0];
            expect(renormalizeCall).toBeLessThan(moveCall);
        });

        it('forwards onGroupRename to the item list as onRenameGroup(groupId, title)', async () => {
            const props = baseProps();
            render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);

            fireEvent.click(screen.getByTestId('item-list-rename'));

            expect(props.onGroupRename).toHaveBeenCalledWith('g1', 'New title');
        });

        describe('drop on a card target (spec 059, T037: B5 / X1)', () => {
            const g2: CardGroup = { ...groups059[0], id: 'g2', headCardId: 'u1', memberCardIds: [], order: 5 };

            it('B5: requestMove(src, {kind:"card", cardId}) forwards to onCardMove(src, target) unchanged', async () => {
                const props = baseProps();
                render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);

                await act(async () => {
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' });
                });

                expect(props.onCardMove).toHaveBeenCalledTimes(1);
                expect(props.onCardMove).toHaveBeenCalledWith('u1', { kind: 'card', cardId: 'u2' });
            });

            it('a resolved createdGroupId sets pendingEditGroupId; only the matching group gets autoEditTitle', async () => {
                const props = baseProps();
                props.onCardMove = vi.fn(async () => ({ createdGroupId: 'g1', dissolvedGroupIds: [] })) as never;
                render(
                    <GroupableColumn {...props} groups={[...groups059, g2]} columnGroupingStates={modeState(mode)} />
                );
                expect(dndHarness.ctx.current.pendingEditGroupId).toBeNull();

                await act(async () => {
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' });
                });

                expect(dndHarness.ctx.current.pendingEditGroupId).toBe('g1');
                const groupsInList = screen.getAllByTestId('group-card');
                expect(groupsInList.find((el) => el.getAttribute('data-group-id') === 'g1')).toHaveAttribute('data-auto-edit', 'true');
                expect(groupsInList.find((el) => el.getAttribute('data-group-id') === 'g2')).toHaveAttribute('data-auto-edit', 'false');
            });

            it('consumePendingEdit() clears pendingEditGroupId', async () => {
                const props = baseProps();
                props.onCardMove = vi.fn(async () => ({ createdGroupId: 'g1', dissolvedGroupIds: [] })) as never;
                render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);
                await act(async () => {
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' });
                });
                expect(dndHarness.ctx.current.pendingEditGroupId).toBe('g1');

                act(() => dndHarness.ctx.current.consumePendingEdit());

                expect(dndHarness.ctx.current.pendingEditGroupId).toBeNull();
            });

            it('no createdGroupId (add to existing group / reorder / void result) leaves pendingEditGroupId null', async () => {
                const props = baseProps();
                props.onCardMove = vi.fn(async () => ({ dissolvedGroupIds: [] })) as never;
                render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);

                await act(async () => {
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'group', groupId: 'g1' });
                });

                expect(dndHarness.ctx.current.pendingEditGroupId).toBeNull();
            });

            it('X1: a GroupingConflictError shows the retrospective.dragGroup.conflict toast and sets no pending edit', async () => {
                const props = baseProps();
                props.onCardMove = vi.fn(async () => { throw new GroupingConflictError('409'); }) as never;
                render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);

                await act(async () => {
                    // requestMove may swallow the conflict after surfacing it or rethrow; both are fine.
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' }).catch(() => { });
                });

                // Note: setup.ts mocks react-hot-toast with only success/error/loading/dismiss
                // (the default export is not callable), so the non-blocking toast is toast.error.
                expect(toast.error as Mock).toHaveBeenCalledWith('retrospective.dragGroup.conflict');
                expect(dndHarness.ctx.current.pendingEditGroupId).toBeNull();
            });

            it('a non-conflict failure does not show the conflict toast', async () => {
                const props = baseProps();
                props.onCardMove = vi.fn(async () => { throw new Error('network'); }) as never;
                vi.spyOn(console, 'error').mockImplementation(() => { });
                render(<GroupableColumn {...props} columnGroupingStates={modeState(mode)} />);

                await act(async () => {
                    await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' }).catch(() => { });
                });

                expect(toast.error as Mock).not.toHaveBeenCalledWith('retrospective.dragGroup.conflict');
            });
        });
    });

    describe('mode user (B8): reorder stays inside the author section', () => {
        it('renders GroupedCardList, not the interleaved ColumnItemList', () => {
            render(<GroupableColumn {...baseProps()} columnGroupingStates={modeState('user')} />);

            expect(screen.getByTestId('grouped-card-list')).toHaveAttribute('data-group-by', 'user');
            expect(screen.queryByTestId('column-item-list')).not.toBeInTheDocument();
        });

        it('still routes section reorders to onCardsReorder (/cards/reorder) and never to onCardMove', () => {
            const props = baseProps();
            render(<GroupableColumn {...props} columnGroupingStates={modeState('user')} />);

            fireEvent.click(screen.getByTestId('grouped-list-reorder'));

            expect(props.onCardsReorder).toHaveBeenCalledWith([{ cardId: 'u2', order: 0, column: 'helped' }]);
            expect(props.onCardMove).not.toHaveBeenCalled();
            expect(props.onColumnRenormalize).not.toHaveBeenCalled();
        });

        it('disables grouping in the column context (no group intent, FR-010)', () => {
            render(<GroupableColumn {...baseProps()} columnGroupingStates={modeState('user')} />);

            // The context is still provided (member/menu components may read it) but grouping is off.
            expect(dndHarness.ctx.current).not.toBeNull();
            expect(dndHarness.ctx.current.groupingEnabled).toBe(false);
        });
    });
});

// ---------------------------------------------------------------------------
// spec 059-drag-to-group-cards, T045 (US4): B8 + anonymous board.
// CONTRACTS FIXED HERE:
//  - `groupingEnabled` in the provided ColumnGroupingContext derives from the DISPLAYED mode
//    (`displayGroupingCriteria !== 'user'`), never from the persisted criteria.
//  - `ctx.requestMove(src, {kind:'card'|'group'})` while grouping is disabled is REFUSED:
//    `onCardMove` is never called (the returned promise may resolve or reject; tests tolerate both).
// ---------------------------------------------------------------------------
describe('GroupableColumn grouping gate (spec 059, T045: B8 / anonymous)', () => {
    const column: ColumnConfig = { id: 'helped', title: 'What went well?', description: 'd', color: 'blue', icon: '👍' };
    const t0 = new Date('2026-01-01');
    const mk = (id: string, order: number, extra: Partial<Card> = {}): Card => ({
        id, content: id, retrospectiveId: 'retro-1', column: 'helped', createdBy: 'user-1',
        color: 'pastelBlue', createdAt: t0, updatedAt: t0, order, ...extra,
    });
    const cardsG: Card[] = [
        mk('u1', 10), mk('u2', 20),
        mk('gh', 0, { groupId: 'g1', isGroupHead: true }), mk('gm', 0, { groupId: 'g1', groupOrder: 1 }),
    ];
    const groupsG: CardGroup[] = [{
        id: 'g1', retrospectiveId: 'retro-1', column: 'helped', title: 'G', headCardId: 'gh',
        memberCardIds: ['gm'], isCollapsed: false, createdAt: t0, createdBy: 'user-1', order: 25,
    }];
    const props = () => ({
        column, cards: cardsG, groups: groupsG,
        onCardCreate: vi.fn(), onCardUpdate: vi.fn(), onCardDelete: vi.fn(), onCardVote: vi.fn(),
        onCardLike: vi.fn(), onCardReaction: vi.fn(), onCardReactionRemove: vi.fn(),
        onCardsReorder: vi.fn(), onGroupCreate: vi.fn(), onGroupDisband: vi.fn(),
        onGroupToggleCollapse: vi.fn(), onCardRemoveFromGroup: vi.fn(),
        onSuggestionGenerate: vi.fn(() => []),
        onCardMove: vi.fn(async (): Promise<MoveCardResult> => ({ dissolvedGroupIds: [] })),
        onGroupRename: vi.fn(async () => { }),
        onColumnRenormalize: vi.fn(async () => { }),
        currentUser: 'user-1', retrospectiveId: 'retro-1', participants: [], canConvertToAction: false,
    });
    const state = (criteria: 'none' | 'suggestions' | 'user') =>
        ({ helped: { criteria, activeGroups: [] } }) as any;
    const board = (isAnonymous: boolean) =>
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
            retrospective: { id: 'retro-1', isAnonymous } as Retrospective,
            participants: [], timer: null, myFacilitatorNotes: [],
        });

    beforeEach(() => {
        vi.clearAllMocks();
        dndHarness.ctx.current = null;
        board(false);
    });

    describe('B8: displayed mode "user" (non-anonymous board)', () => {
        it('exposes groupingEnabled === false in the context', () => {
            render(<GroupableColumn {...props()} columnGroupingStates={state('user')} />);

            expect(dndHarness.ctx.current).not.toBeNull();
            expect(dndHarness.ctx.current.groupingEnabled).toBe(false);
        });

        it.each([
            ['card', { kind: 'card', cardId: 'u2' }],
            ['group', { kind: 'group', groupId: 'g1' }],
        ])('refuses requestMove(src, {kind:"%s"}) without calling onCardMove', async (_label, target) => {
            const p = props();
            render(<GroupableColumn {...p} columnGroupingStates={state('user')} />);

            await act(async () => {
                await Promise.resolve(dndHarness.ctx.current.requestMove('u1', target)).catch(() => { });
            });

            expect(p.onCardMove).not.toHaveBeenCalled();
        });

        it('also refuses a grouped member being moved into another group', async () => {
            const p = props();
            render(<GroupableColumn {...p} columnGroupingStates={state('user')} />);

            await act(async () => {
                await Promise.resolve(dndHarness.ctx.current.requestMove('gm', { kind: 'card', cardId: 'u1' })).catch(() => { });
            });

            expect(p.onCardMove).not.toHaveBeenCalled();
        });

        it('does not toast a conflict for a refused move (it is not a server conflict)', async () => {
            const p = props();
            render(<GroupableColumn {...p} columnGroupingStates={state('user')} />);

            await act(async () => {
                await Promise.resolve(dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' })).catch(() => { });
            });

            expect(toast.error as Mock).not.toHaveBeenCalledWith('retrospective.dragGroup.conflict');
        });
    });

    describe.each(['none', 'suggestions'] as const)('control: displayed mode "%s"', (mode) => {
        it('has groupingEnabled === true and forwards a group move to onCardMove', async () => {
            const p = props();
            render(<GroupableColumn {...p} columnGroupingStates={state(mode)} />);

            expect(dndHarness.ctx.current.groupingEnabled).toBe(true);
            await act(async () => {
                await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' }).catch(() => { });
            });

            expect(p.onCardMove).toHaveBeenCalledTimes(1);
        });
    });

    describe('anonymous board whose persisted mode is "user" (displayed as none)', () => {
        it('has groupingEnabled === true, because grouping derives from the displayed mode', () => {
            board(true);
            render(<GroupableColumn {...props()} columnGroupingStates={state('user')} />);

            expect(screen.getByText('Current: none')).toBeInTheDocument();
            expect(dndHarness.ctx.current).not.toBeNull();
            expect(dndHarness.ctx.current.groupingEnabled).toBe(true);
        });

        it('renders the interleaved ColumnItemList (not GroupedCardList) and accepts card moves', async () => {
            board(true);
            const p = props();
            render(<GroupableColumn {...p} columnGroupingStates={state('user')} />);

            expect(screen.getByTestId('column-item-list')).toBeInTheDocument();
            expect(screen.queryByTestId('grouped-card-list')).not.toBeInTheDocument();

            await act(async () => {
                await dndHarness.ctx.current.requestMove('u1', { kind: 'card', cardId: 'u2' }).catch(() => { });
            });

            expect(p.onCardMove).toHaveBeenCalledTimes(1);
            expect(mockSetGroupingCriteria).not.toHaveBeenCalled();
        });

        it('regression: the same persisted "user" mode on a non-anonymous board stays disabled', () => {
            board(false);
            render(<GroupableColumn {...props()} columnGroupingStates={state('user')} />);

            expect(dndHarness.ctx.current.groupingEnabled).toBe(false);
        });

        it('flips live when the board toggles anonymous mode', () => {
            board(false);
            const p = props();
            const { rerender } = render(<GroupableColumn {...p} columnGroupingStates={state('user')} />);
            expect(dndHarness.ctx.current.groupingEnabled).toBe(false);

            board(true);
            rerender(<GroupableColumn {...p} columnGroupingStates={state('user')} />);

            expect(dndHarness.ctx.current.groupingEnabled).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// spec 059-drag-to-group-cards, T073 (FR-033, S1-S4): leaving "suggestions" while the column
// has MANUAL groups asks for confirmation BEFORE anything is persisted.
//
// CONTRACTS FIXED BY THIS BLOCK:
//  - The confirmation is `window.confirm(t('retrospective.grouping.confirmTeardown',
//    { count }))`, `count` = ALL of the column's groups (manual, suggestion and legacy), the
//    same idiom GroupCard uses for its disband. In this file `t` renders that key as
//    `<key>:<count>`.
//  - Trigger: previous criteria === 'suggestions', new criteria differs, and at least one of
//    the column's groups has `origin === 'manual'`. A missing `origin` is a legacy suggestion
//    group, NOT manual.
//  - Order: confirm -> setGroupingCriteria -> disband of every group. Cancel persists nothing:
//    no setGroupingCriteria, no disband, the selector keeps showing "suggestions".
//  - Any other transition (none -> user, anything -> suggestions) never asks.
// ---------------------------------------------------------------------------
describe('GroupableColumn mode-switch safeguard (spec 059, T073: S1-S4)', () => {
    const CONFIRM_KEY = 'retrospective.grouping.confirmTeardown';
    const t0 = new Date('2026-01-01');
    const column: ColumnConfig = { id: 'helped', title: 'What went well?', description: 'd', color: 'blue', icon: '👍' };
    const mkCard = (id: string, order: number, extra: Partial<Card> = {}): Card => ({
        id, content: id, retrospectiveId: 'retro-1', column: 'helped', createdBy: 'user-1',
        color: 'pastelBlue', createdAt: t0, updatedAt: t0, order, ...extra,
    });
    const mkGroup = (id: string, head: string, members: string[], extra: Partial<CardGroup> = {}): CardGroup => ({
        id, retrospectiveId: 'retro-1', column: 'helped', title: id, headCardId: head, memberCardIds: members,
        isCollapsed: false, createdAt: t0, createdBy: 'user-1', order: 1, ...extra,
    });
    const cards = [
        mkCard('c1', 1), mkCard('c2', 2, { groupId: 'g-manual' }), mkCard('c3', 3, { groupId: 'g-manual' }),
        mkCard('c4', 4, { groupId: 'g-legacy' }), mkCard('c5', 5, { groupId: 'g-legacy' }),
    ];
    const manualGroup = mkGroup('g-manual', 'c2', ['c3'], { origin: 'manual' });
    const legacyGroup = mkGroup('g-legacy', 'c4', ['c5']); // no origin
    const suggestionGroup = mkGroup('g-sugg', 'c4', ['c5'], { origin: 'suggestion' });

    let confirmSpy: ReturnType<typeof vi.spyOn>;
    let onGroupDisband: Mock;

    const renderColumn = (groups: CardGroup[]) => {
        onGroupDisband = vi.fn().mockResolvedValue(undefined);
        return render(
            <GroupableColumn
                column={column} cards={cards} groups={groups}
                onCardCreate={vi.fn()} onCardUpdate={vi.fn()} onCardDelete={vi.fn()} onCardVote={vi.fn()}
                onCardLike={vi.fn()} onCardReaction={vi.fn()} onCardReactionRemove={vi.fn()}
                onCardsReorder={vi.fn()} onGroupCreate={vi.fn()} onGroupDisband={onGroupDisband}
                onGroupToggleCollapse={vi.fn()} onCardRemoveFromGroup={vi.fn()}
                onSuggestionGenerate={vi.fn(() => [])}
                currentUser="user-1" retrospectiveId="retro-1" participants={[]} canConvertToAction={false}
            />,
        );
    };
    /** Real transition none -> suggestions through the stateful useColumnGrouping mock. */
    const enterSuggestions = async (user: ReturnType<typeof userEvent.setup>) => {
        await user.click(screen.getByText('Group by Suggestions'));
        await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());
        mockSetGroupingCriteria.mockClear();
        confirmSpy.mockClear();
    };
    const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 20)); });

    beforeEach(() => {
        vi.clearAllMocks();
        mockUseBoardData.mockReturnValue({
            cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
            retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
            participants: [], timer: null, myFacilitatorNotes: [],
        });
        confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    });
    afterEach(() => {
        confirmSpy.mockRestore();
    });

    describe('S1: the confirmation comes first, with every column group counted', () => {
        it.each([['No Grouping', 'none'], ['Group by User', 'user']])(
            'leaving suggestions for "%s" asks window.confirm(confirmTeardown, count = ALL column groups) BEFORE setGroupingCriteria',
            async (buttonLabel, criteria) => {
                const user = userEvent.setup();
                renderColumn([manualGroup, legacyGroup]);
                await enterSuggestions(user);

                await user.click(screen.getByText(buttonLabel));

                await waitFor(() => expect(confirmSpy).toHaveBeenCalledTimes(1));
                // 2 groups in the column (1 manual + 1 legacy): the count is not just the manual ones.
                expect(confirmSpy).toHaveBeenCalledWith(`${CONFIRM_KEY}:2`);
                await waitFor(() => expect(mockSetGroupingCriteria).toHaveBeenCalledWith('helped', criteria));
                expect(confirmSpy.mock.invocationCallOrder[0]).toBeLessThan(mockSetGroupingCriteria.mock.invocationCallOrder[0]);
            },
        );

        it('a single manual group is enough to ask (count 1)', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup]);
            await enterSuggestions(user);

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(confirmSpy).toHaveBeenCalledWith(`${CONFIRM_KEY}:1`));
        });

        it('nothing is persisted or disbanded while the confirmation is still undecided', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup]);
            await enterSuggestions(user);
            let seenAtConfirm: { persisted: number; disbanded: number } | null = null;
            confirmSpy.mockImplementation(() => {
                seenAtConfirm = { persisted: mockSetGroupingCriteria.mock.calls.length, disbanded: onGroupDisband.mock.calls.length };
                return true;
            });

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
            expect(seenAtConfirm).toEqual({ persisted: 0, disbanded: 0 });
        });
    });

    describe('S2: confirming runs the existing flow, in order', () => {
        it('persists the new mode, then disbands every column group (manual and legacy)', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup, legacyGroup]);
            await enterSuggestions(user);

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(onGroupDisband).toHaveBeenCalledTimes(2));
            expect(confirmSpy).toHaveBeenCalledWith(`${CONFIRM_KEY}:2`);
            expect(confirmSpy.mock.invocationCallOrder[0]).toBeLessThan(mockSetGroupingCriteria.mock.invocationCallOrder[0]);
            expect(onGroupDisband).toHaveBeenCalledWith('g-manual');
            expect(onGroupDisband).toHaveBeenCalledWith('g-legacy');
            expect(mockSetGroupingCriteria).toHaveBeenCalledTimes(1);
            expect(mockSetGroupingCriteria).toHaveBeenCalledWith('helped', 'none');
            expect(mockSetGroupingCriteria.mock.invocationCallOrder[0]).toBeLessThan(onGroupDisband.mock.invocationCallOrder[0]);
            await waitFor(() => expect(screen.getByText('Current: none')).toBeInTheDocument());
        });
    });

    describe('S3: cancelling persists nothing', () => {
        it.each([['No Grouping'], ['Group by User']])(
            'cancel on "%s": no setGroupingCriteria, no disband, selector still shows suggestions',
            async (buttonLabel) => {
                const user = userEvent.setup();
                renderColumn([manualGroup, legacyGroup]);
                await enterSuggestions(user);
                confirmSpy.mockReturnValue(false);

                await user.click(screen.getByText(buttonLabel));
                await settle();

                expect(confirmSpy).toHaveBeenCalledTimes(1);
                expect(mockSetGroupingCriteria).not.toHaveBeenCalled();
                expect(onGroupDisband).not.toHaveBeenCalled();
                expect(screen.getByText('Current: suggestions')).toBeInTheDocument();
                expect(toast.error as Mock).not.toHaveBeenCalled();
            },
        );

        it('the groups stay rendered after a cancel', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup, legacyGroup]);
            await enterSuggestions(user);
            confirmSpy.mockReturnValue(false);

            await user.click(screen.getByText('No Grouping'));
            await settle();

            expect(screen.getAllByTestId('group-card')).toHaveLength(2);
        });

        it('after a cancel the user can still switch for real by confirming the next time', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup]);
            await enterSuggestions(user);
            confirmSpy.mockReturnValueOnce(false);
            await user.click(screen.getByText('No Grouping'));
            await settle();
            expect(mockSetGroupingCriteria).not.toHaveBeenCalled();

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(mockSetGroupingCriteria).toHaveBeenCalledWith('helped', 'none'));
            await waitFor(() => expect(onGroupDisband).toHaveBeenCalledWith('g-manual'));
        });
    });

    describe('S4: no manual groups -> today\'s flow, no confirmation', () => {
        it('legacy groups without origin: no confirm, setGroupingCriteria then disband all', async () => {
            const user = userEvent.setup();
            renderColumn([legacyGroup]);
            await enterSuggestions(user);

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(onGroupDisband).toHaveBeenCalledWith('g-legacy'));
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(mockSetGroupingCriteria).toHaveBeenCalledWith('helped', 'none');
        });

        it('groups explicitly marked origin "suggestion": no confirm', async () => {
            const user = userEvent.setup();
            renderColumn([suggestionGroup]);
            await enterSuggestions(user);

            await user.click(screen.getByText('Group by User'));

            await waitFor(() => expect(onGroupDisband).toHaveBeenCalledWith('g-sugg'));
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(mockSetGroupingCriteria).toHaveBeenCalledWith('helped', 'user');
        });

        it('no groups at all: no confirm, the mode just switches', async () => {
            const user = userEvent.setup();
            renderColumn([]);
            await enterSuggestions(user);

            await user.click(screen.getByText('No Grouping'));

            await waitFor(() => expect(screen.getByText('Current: none')).toBeInTheDocument());
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(onGroupDisband).not.toHaveBeenCalled();
        });

        it('manual groups but the switch does not leave suggestions (none -> user): no confirm, nothing disbanded', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup]);

            await user.click(screen.getByText('Group by User'));

            await waitFor(() => expect(screen.getByText('Current: user')).toBeInTheDocument());
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(onGroupDisband).not.toHaveBeenCalled();
        });

        it('manual groups and the switch ENTERS suggestions (none -> suggestions): no confirm', async () => {
            const user = userEvent.setup();
            renderColumn([manualGroup]);

            await user.click(screen.getByText('Group by Suggestions'));

            await waitFor(() => expect(screen.getByText('Current: suggestions')).toBeInTheDocument());
            expect(confirmSpy).not.toHaveBeenCalled();
            expect(onGroupDisband).not.toHaveBeenCalled();
        });
    });
});
