import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RetrospectiveBoard from '../../../components/retrospective/RetrospectiveBoard';
import { Retrospective } from '../../../types/retrospective';

// Mock all the complex dependencies with simple implementations
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    }
}));

vi.mock('../../../components/retrospective/GroupableColumn', () => ({
    default: ({ column }: any) => (
        <div data-testid={`groupable-column-${column.id}`}>
            <h3>{column.title}</h3>
        </div>
    )
}));

vi.mock('../../../components/retrospective/ActionItemsColumn', () => ({
    default: ({ loading, error }: any) => (
        <div data-testid="action-items-column">
            <h3>Action Items</h3>
            {loading && <div>Loading...</div>}
            {error && <div>Error: {error}</div>}
        </div>
    )
}));

vi.mock('../../../components/ui/Loading', () => ({
    default: ({ text }: any) => <div data-testid="loading">{text}</div>
}));

vi.mock('../../../contexts/TypingProvider', () => ({
    TypingProvider: ({ children }: any) => <div data-testid="typing-provider">{children}</div>
}));

vi.mock('../../../utils/constants', () => ({
    getColumns: () => ({
        'helped': { id: 'helped', title: 'What helped?' },
        'hindered': { id: 'hindered', title: 'What hindered?' },
        'improve': { id: 'improve', title: 'What to improve?' }
    }),
    COLUMN_ORDER: ['helped', 'hindered', 'improve'],
    FIRESTORE_COLLECTIONS: {
        RETROSPECTIVES: "retrospectives",
        PARTICIPANTS: "participants",
        CARDS: "cards",
        GROUPS: "groups",
        ACTION_ITEMS: "actionItems",
    }
}));

// Mock hooks with default implementations
vi.mock('../../../hooks/useCards', () => ({
    useCards: () => ({
        cards: [],
        cardsByColumn: { 'helped': [], 'hindered': [], 'improve': [] },
        loading: false,
        error: null,
        createCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        voteCard: vi.fn(),
        toggleLike: vi.fn(),
        addReaction: vi.fn(),
        removeReaction: vi.fn(),
        reorderCards: vi.fn()
    })
}));

// Mock the optimized cards hook that's actually being used
vi.mock('../../../hooks/optimization/useOptimizedCards', () => ({
    useOptimizedCards: () => ({
        cards: [],
        cardsByColumn: { 'helped': [], 'hindered': [], 'improve': [] },
        loading: false,
        error: null,
        createCard: vi.fn(),
        updateCard: vi.fn(),
        deleteCard: vi.fn(),
        voteCard: vi.fn(),
        toggleLike: vi.fn(),
        addReaction: vi.fn(),
        removeReaction: vi.fn(),
        reorderCards: vi.fn(),
        getGroupedReactions: vi.fn(() => []),
        getUserLiked: vi.fn(() => false),
        getUserReaction: vi.fn(() => null),
        refetch: vi.fn(),
        metrics: {
            operations: 0,
            cacheHits: 0,
            errors: 0
        }
    })
}));

vi.mock('../../../hooks/useCardGroups', () => ({
    useCardGroups: () => ({
        groups: [],
        createGroup: vi.fn(),
        disbandGroup: vi.fn(),
        removeFromGroup: vi.fn(),
        toggleGroupCollapse: vi.fn(),
        findSuggestions: vi.fn()
    })
}));

vi.mock('../../../hooks/useActionItems', () => ({
    useActionItems: () => ({
        actionItems: [],
        loading: false,
        error: null,
        createActionItem: vi.fn(),
        updateActionItem: vi.fn(),
        deleteActionItem: vi.fn(),
        convertCardToActionItem: vi.fn()
    })
}));

vi.mock('../../../hooks/useCurrentUser', () => ({
    useCurrentUser: () => ({
        fullName: 'Test User',
        displayName: 'Test User',
        email: 'test@example.com',
        uid: 'user-123'
    })
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({})
}));

vi.mock('../../../hooks/useRetrospectiveColumns', () => ({
    useRetrospectiveColumns: () => ({
        columnConfigs: {
            'helped': { id: 'helped', title: 'What helped?', description: '', color: 'bg-green-50', icon: '👍' },
            'hindered': { id: 'hindered', title: 'What hindered?', description: '', color: 'bg-red-50', icon: '⚠️' },
            'improve': { id: 'improve', title: 'What to improve?', description: '', color: 'bg-yellow-50', icon: '💡' }
        },
        columnOrder: ['helped', 'hindered', 'improve'],
        actionColumn: null,
        loading: false,
        error: null,
        columns: []
    })
}));

// Mock sentiment hook
vi.mock('../../../hooks/useSentiment', () => ({
    useSentiment: () => ({
        isEnabled: false,
        sentiment: null,
        analysis: null,
        loading: false,
        error: null
    })
}));

describe('RetrospectiveBoard', () => {
    const mockRetrospective: Retrospective = {
        id: 'retro-123',
        title: 'Test Retrospective',
        createdBy: 'user-123',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 5,
        description: 'Test description'
    };

    const mockParticipants = [
        { uid: 'user-1', displayName: 'User 1' },
        { uid: 'user-2', displayName: 'User 2' }
    ];

    describe('Basic Rendering', () => {
        it('should render the retrospective board', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                    participants={mockParticipants}
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-helped')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-hindered')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-improve')).toBeInTheDocument();
            expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
        });

        it('should render all columns with correct titles', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            expect(screen.getByText('What helped?')).toBeInTheDocument();
            expect(screen.getByText('What hindered?')).toBeInTheDocument();
            expect(screen.getByText('What to improve?')).toBeInTheDocument();
            expect(screen.getByText('Action Items')).toBeInTheDocument();
        });

        it('should handle missing participants prop', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });

        it('should render with proper layout structure', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            const container = screen.getByTestId('typing-provider');
            expect(container).toBeInTheDocument();
        });
    });

    describe('Props and Integration', () => {
        it('should pass retrospective data to child components', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                    participants={mockParticipants}
                />
            );

            // Verify that all main components are rendered
            expect(screen.getByTestId('groupable-column-helped')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-hindered')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-improve')).toBeInTheDocument();
            expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
        });

        it('should handle onDataChange callback', () => {
            const mockOnDataChange = vi.fn();

            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                    onDataChange={mockOnDataChange}
                />
            );

            // Component should render without errors even with onDataChange
            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });

        it('should work with different user configurations', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-456"
                    participants={mockParticipants}
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty retrospective data gracefully', () => {
            const emptyRetrospective: Retrospective = {
                id: '',
                title: '',
                createdBy: '',
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 0
            };

            render(
                <RetrospectiveBoard
                    retrospective={emptyRetrospective}
                    currentUser=""
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });

        it('should handle missing currentUser', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser={undefined as any}
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });

        it('should render without optional props', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            expect(screen.getByTestId('typing-provider')).toBeInTheDocument();
        });
    });

    describe('Component Structure', () => {
        it('should maintain correct component hierarchy', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            const typingProvider = screen.getByTestId('typing-provider');
            expect(typingProvider).toBeInTheDocument();

            // Verify all columns are present
            expect(screen.getByTestId('groupable-column-helped')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-hindered')).toBeInTheDocument();
            expect(screen.getByTestId('groupable-column-improve')).toBeInTheDocument();
            expect(screen.getByTestId('action-items-column')).toBeInTheDocument();
        });

        it('should properly distribute columns in grid layout', () => {
            render(
                <RetrospectiveBoard
                    retrospective={mockRetrospective}
                    currentUser="user-123"
                />
            );

            // Should have 3 GroupableColumns + 1 ActionItemsColumn = 4 total columns
            const helped = screen.getByTestId('groupable-column-helped');
            const hindered = screen.getByTestId('groupable-column-hindered');
            const improve = screen.getByTestId('groupable-column-improve');
            const actions = screen.getByTestId('action-items-column');

            expect(helped).toBeInTheDocument();
            expect(hindered).toBeInTheDocument();
            expect(improve).toBeInTheDocument();
            expect(actions).toBeInTheDocument();
        });
    });
});
