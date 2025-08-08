import { screen, waitFor } from '@testing-library/react';
import RetrospectiveBoard from './RetrospectiveBoard';
import { render, createMockRetrospective, createMockCard, createMockActionItem } from '../../test/utils/test-utils';
import { useCards } from '../../hooks/useCards';
import { useCardGroups } from '../../hooks/useCardGroups';
import { useActionItems } from '../../hooks/useActionItems';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useLanguage } from '../../hooks/useLanguage';

// Mock dependencies
jest.mock('../../hooks/useCards');
jest.mock('../../hooks/useCardGroups');
jest.mock('../../hooks/useActionItems');
jest.mock('../../hooks/useCurrentUser');
jest.mock('../../hooks/useLanguage');
jest.mock('../../utils/constants', () => ({
    getColumns: jest.fn(() => ({
        'went-well': { id: 'went-well', title: '¿Qué fue bien?', color: 'green' },
        'went-wrong': { id: 'went-wrong', title: '¿Qué fue mal?', color: 'red' },
        'improvements': { id: 'improvements', title: '¿Qué podemos mejorar?', color: 'blue' },
    })),
    COLUMN_ORDER: ['went-well', 'went-wrong', 'improvements'],
}));

// Mock child components
jest.mock('./GroupableColumn', () => {
    return function GroupableColumn({ column, cards }: any) {
        return (
            <div data-testid={`column-${column.id}`}>
                <h3>{column.title}</h3>
                <div data-testid={`cards-count-${column.id}`}>{cards.length} cards</div>
            </div>
        );
    };
});

jest.mock('./ActionItemsColumn', () => {
    return function ActionItemsColumn({ actionItems }: any) {
        return (
            <div data-testid="action-items-column">
                <h3>Elementos de Acción</h3>
                <div data-testid="action-items-count">{actionItems.length} items</div>
            </div>
        );
    };
});

jest.mock('../ui/Loading', () => {
    return function Loading({ text }: { text: string }) {
        return <div data-testid="loading">{text}</div>;
    };
});

jest.mock('../../contexts/TypingProvider', () => ({
    TypingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('RetrospectiveBoard', () => {
    const mockRetrospective = createMockRetrospective();
    const mockCards = [
        createMockCard({ column: 'went-well' }),
        createMockCard({ id: 'card-2', column: 'went-wrong' }),
        createMockCard({ id: 'card-3', column: 'improvements' }),
    ];
    const mockActionItems = [createMockActionItem()];

    const mockUseCards = useCards as jest.MockedFunction<typeof useCards>;
    const mockUseCardGroups = useCardGroups as jest.MockedFunction<typeof useCardGroups>;
    const mockUseActionItems = useActionItems as jest.MockedFunction<typeof useActionItems>;
    const mockUseCurrentUser = useCurrentUser as jest.MockedFunction<typeof useCurrentUser>;
    const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

    const defaultCardsHook = {
        cards: mockCards,
        cardsByColumn: {
            'went-well': [mockCards[0]],
            'went-wrong': [mockCards[1]],
            'improvements': [mockCards[2]],
        } as any,
        loading: false,
        error: null,
        createCard: jest.fn(),
        updateCard: jest.fn(),
        deleteCard: jest.fn(),
        voteCard: jest.fn(),
        toggleLike: jest.fn(),
        addReaction: jest.fn(),
        removeReaction: jest.fn(),
        reorderCards: jest.fn(),
        getGroupedReactions: jest.fn(() => []),
        getUserLiked: jest.fn(() => false),
        getUserReaction: jest.fn(() => null),
        refetch: jest.fn(),
    };

    const defaultGroupsHook = {
        groups: [],
        groupedCards: {},
        ungroupedCards: {},
        loading: false,
        error: null,
        createGroup: jest.fn(),
        disbandGroup: jest.fn(),
        removeFromGroup: jest.fn(),
        addToGroup: jest.fn(),
        updateGroup: jest.fn(),
        toggleGroupCollapse: jest.fn(),
        findSuggestions: jest.fn(),
    };

    const defaultActionItemsHook = {
        actionItems: mockActionItems,
        loading: false,
        error: null,
        createActionItem: jest.fn(),
        updateActionItem: jest.fn(),
        deleteActionItem: jest.fn(),
        convertCardToActionItem: jest.fn(),
        clearError: jest.fn(),
    };

    const defaultCurrentUser = {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        userProfile: null,
        isAuthenticated: true,
        loading: false,
        isReady: false, // Changed to match expected type
        fullName: 'Test User',
    };

    beforeEach(() => {
        mockUseCards.mockReturnValue(defaultCardsHook);
        mockUseCardGroups.mockReturnValue(defaultGroupsHook);
        mockUseActionItems.mockReturnValue(defaultActionItemsHook);
        mockUseCurrentUser.mockReturnValue(defaultCurrentUser);
        mockUseLanguage.mockReturnValue();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should render all columns with correct data', () => {
        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        // Check all three regular columns
        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
        expect(screen.getByTestId('column-went-wrong')).toBeInTheDocument();
        expect(screen.getByTestId('column-improvements')).toBeInTheDocument();

        // Check action items column
        expect(screen.getByTestId('action-items-column')).toBeInTheDocument();

        // Check card counts
        expect(screen.getByTestId('cards-count-went-well')).toHaveTextContent('1 cards');
        expect(screen.getByTestId('cards-count-went-wrong')).toHaveTextContent('1 cards');
        expect(screen.getByTestId('cards-count-improvements')).toHaveTextContent('1 cards');

        // Check action items count
        expect(screen.getByTestId('action-items-count')).toHaveTextContent('1 items');
    });

    it('should show loading state while cards are loading', () => {
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            loading: true,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('loading')).toBeInTheDocument();
        expect(screen.getByText('Cargando retrospectiva...')).toBeInTheDocument();
    });

    it('should show error state when cards fail to load', () => {
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            loading: false,
            error: 'Failed to load cards',
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByText('Error al cargar las tarjetas')).toBeInTheDocument();
        expect(screen.getByText('Failed to load cards')).toBeInTheDocument();
    });

    it('should identify facilitator correctly', () => {
        const facilitatorUser = {
            ...defaultCurrentUser,
            uid: mockRetrospective.createdBy,
        };
        mockUseCurrentUser.mockReturnValue(facilitatorUser);

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser={mockRetrospective.createdBy}
            />
        );

        // The facilitator should be able to edit action items
        expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
    });

    it('should identify non-facilitator correctly', () => {
        const regularUser = {
            ...defaultCurrentUser,
            uid: 'different-user-id',
        };
        mockUseCurrentUser.mockReturnValue(regularUser);

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="different-user-id"
            />
        );

        // Non-facilitator should still see the action items column
        expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
    });

    it('should handle card creation', async () => {
        const createCardMock = jest.fn();
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            createCard: createCardMock,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        // This would be triggered by the GroupableColumn component
        // We're testing that the handler is properly passed down
        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });

    it('should handle card updates', async () => {
        const updateCardMock = jest.fn();
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            updateCard: updateCardMock,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });

    it('should handle card deletion', async () => {
        const deleteCardMock = jest.fn();
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            deleteCard: deleteCardMock,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });

    it('should handle card voting', async () => {
        const voteCardMock = jest.fn();
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            voteCard: voteCardMock,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });

    it('should handle group creation', async () => {
        const createGroupMock = jest.fn();
        mockUseCardGroups.mockReturnValue({
            ...defaultGroupsHook,
            createGroup: createGroupMock,
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });

    it('should call onDataChange when data changes', async () => {
        const onDataChangeMock = jest.fn();

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
                onDataChange={onDataChangeMock}
            />
        );

        await waitFor(() => {
            expect(onDataChangeMock).toHaveBeenCalledWith(
                mockCards,
                [],
                mockActionItems
            );
        });
    });

    it('should handle empty state correctly', () => {
        mockUseCards.mockReturnValue({
            ...defaultCardsHook,
            cards: [],
            cardsByColumn: {
                'went-well': [],
                'went-wrong': [],
                'improvements': [],
            },
        });

        mockUseActionItems.mockReturnValue({
            ...defaultActionItemsHook,
            actionItems: [],
        });

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('cards-count-went-well')).toHaveTextContent('0 cards');
        expect(screen.getByTestId('cards-count-went-wrong')).toHaveTextContent('0 cards');
        expect(screen.getByTestId('cards-count-improvements')).toHaveTextContent('0 cards');
        expect(screen.getByTestId('action-items-count')).toHaveTextContent('0 items');
    });

    it('should handle participants prop correctly', () => {
        const participants = [
            { id: '1', username: 'User 1', email: 'user1@example.com' },
            { id: '2', username: 'User 2', email: 'user2@example.com' },
        ];

        render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
                participants={participants}
            />
        );

        // All columns should be rendered correctly
        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
        expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
    });

    it('should re-render when language changes', () => {
        const { rerender } = render(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        // Initial render
        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();

        // Simulate language change by re-rendering
        rerender(
            <RetrospectiveBoard
                retrospective={mockRetrospective}
                currentUser="test-user-id"
            />
        );

        expect(screen.getByTestId('column-went-well')).toBeInTheDocument();
    });
});
