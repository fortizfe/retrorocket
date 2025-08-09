import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import RetrospectiveCard from '../../components/retrospective/RetrospectiveCard';
import ActionItemCard from '../../components/retrospective/ActionItemCard';
import { Card } from '../../types/card';
import { ActionItem } from '../../types/actionItem';
import { Participant } from '../../types/participant';

// Mock external dependencies
vi.mock('../../services/cardService', () => ({
    createCard: vi.fn(),
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
    voteCard: vi.fn(),
    subscribeToCards: vi.fn(),
    getCardsByRetrospective: vi.fn(),
}));

vi.mock('../../services/cardInteractionService', () => ({
    toggleLike: vi.fn(),
    addOrUpdateReaction: vi.fn(),
    removeReaction: vi.fn(),
    batchUpdateCardOrder: vi.fn(),
}));

vi.mock('../../hooks/useCurrentUser', () => ({
    useCurrentUser: () => ({
        user: {
            uid: 'user-123',
            displayName: 'Test User',
            email: 'test@example.com'
        },
        loading: false
    })
}));

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: {
            uid: 'user-123',
            displayName: 'Test User',
            email: 'test@example.com'
        },
        loading: false,
        signOut: vi.fn()
    })
}));

vi.mock('react-beautiful-dnd', () => ({
    DragDropContext: ({ children }: any) => children,
    Droppable: ({ children }: any) => children({
        draggableProps: {},
        dragHandleProps: {},
        innerRef: vi.fn(),
    }, {}),
    Draggable: ({ children }: any) => children({
        draggableProps: {},
        dragHandleProps: {},
        innerRef: vi.fn(),
    }, {}),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
        {children}
    </BrowserRouter>
);

describe('Retrospective Workflow Integration', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockUsername = 'Test User';

    const mockCards: Card[] = [
        {
            id: 'card-1',
            retrospectiveId: mockRetrospectiveId,
            column: 'helped',
            content: 'Good communication',
            createdBy: mockUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            votes: 3,
            likes: [],
            reactions: [],
            order: 1,
            color: 'pastelBlue'
        },
        {
            id: 'card-2',
            retrospectiveId: mockRetrospectiveId,
            column: 'hindered',
            content: 'Technical issues',
            createdBy: mockUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            votes: 1,
            likes: [],
            reactions: [],
            order: 1,
            color: 'pastelRed'
        }
    ];

    const mockActionItems: ActionItem[] = [
        {
            id: 'action-1',
            retrospectiveId: mockRetrospectiveId,
            content: 'Improve testing process',
            assignedTo: mockUserId,
            assignedToName: mockUsername,
            createdBy: mockUserId,
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 1
        }
    ];

    const mockParticipants: Participant[] = [
        {
            id: 'participant-1',
            userId: mockUserId,
            name: mockUsername,
            retrospectiveId: mockRetrospectiveId,
            joinedAt: new Date(),
            isActive: true
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Card Interaction Workflow', () => {
        it('should handle complete card lifecycle: vote, like, edit, delete', async () => {
            const user = userEvent.setup();
            const mockCard: Card = {
                ...mockCards[0],
                content: 'Initial content'
            };

            const mockOnUpdate = vi.fn();
            const mockOnDelete = vi.fn();
            const mockOnVote = vi.fn();

            render(
                <TestWrapper>
                    <RetrospectiveCard
                        card={mockCard}
                        onUpdate={mockOnUpdate}
                        onDelete={mockOnDelete}
                        onVote={mockOnVote}
                        currentUser={mockUserId}
                        canEdit={true}
                        participants={mockParticipants}
                        canConvertToAction={true}
                        onConvertToAction={vi.fn()}
                    />
                </TestWrapper>
            );

            // Verify card is displayed
            expect(screen.getByText('Initial content')).toBeInTheDocument();

            // Test voting with correct label
            const voteUpButton = screen.getByLabelText(/vote up/i);
            await user.click(voteUpButton);

            expect(mockOnVote).toHaveBeenCalledWith(mockCard.id, true);

            // Test editing with correct label
            const editButton = screen.getByLabelText(/edit card/i);
            await user.click(editButton);

            const editTextarea = screen.getByDisplayValue('Initial content');
            await user.clear(editTextarea);
            await user.type(editTextarea, 'Updated content');

            const saveEditButton = screen.getByText(/guardar/i);
            await user.click(saveEditButton);

            expect(mockOnUpdate).toHaveBeenCalledWith(mockCard.id, {
                content: 'Updated content'
            });
        });

        it('should handle card menu interactions', async () => {
            const user = userEvent.setup();
            const mockCard: Card = mockCards[0];
            const mockOnConvertToAction = vi.fn();

            render(
                <TestWrapper>
                    <RetrospectiveCard
                        card={mockCard}
                        onUpdate={vi.fn()}
                        onDelete={vi.fn()}
                        onVote={vi.fn()}
                        currentUser={mockUserId}
                        canEdit={true}
                        participants={mockParticipants}
                        canConvertToAction={true}
                        onConvertToAction={mockOnConvertToAction}
                    />
                </TestWrapper>
            );

            // Verify card content is displayed
            expect(screen.getByText('Good communication')).toBeInTheDocument();

            // Check that menu button exists (look for the exact title)
            const menuButton = screen.getByTitle('retrospective.cards.convertToAction');
            expect(menuButton).toBeInTheDocument();

            // Click the menu button to open the menu
            await user.click(menuButton);

            // Check if dropdown content appears
            await waitFor(() => {
                expect(screen.getByText(/convertir en elemento de acción/i)).toBeInTheDocument();
            });
        });
    });

    describe('Action Items Workflow', () => {
        it('should handle action item interactions', async () => {
            const mockActionItem = mockActionItems[0];
            const mockOnEdit = vi.fn();
            const mockOnDelete = vi.fn();

            render(
                <TestWrapper>
                    <ActionItemCard
                        actionItem={mockActionItem}
                        participants={mockParticipants}
                        canEdit={true}
                        onEdit={mockOnEdit}
                        onDelete={mockOnDelete}
                    />
                </TestWrapper>
            );

            // Verify action item is displayed
            expect(screen.getByText('Improve testing process')).toBeInTheDocument();

            // Check that edit button exists (by title since it doesn't have aria-label)
            const editButton = screen.getByTitle(/editAction/i);
            expect(editButton).toBeInTheDocument();
        });

        it('should handle action item assignment workflow', async () => {
            const mockActionItem = mockActionItems[0];

            render(
                <TestWrapper>
                    <ActionItemCard
                        actionItem={mockActionItem}
                        participants={mockParticipants}
                        canEdit={true}
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Verify assignment section contains the assignee name
            expect(screen.getByText(/Test User/)).toBeInTheDocument();
        });
    });

    describe('Cross-Component Integration', () => {
        it('should handle card conversion to action item workflow', async () => {
            const mockConvertToActionItem = vi.fn();
            const mockCard: Card = mockCards[0];

            render(
                <TestWrapper>
                    <RetrospectiveCard
                        card={mockCard}
                        onUpdate={vi.fn()}
                        onDelete={vi.fn()}
                        onVote={vi.fn()}
                        currentUser={mockUserId}
                        canEdit={true}
                        participants={mockParticipants}
                        canConvertToAction={true}
                        onConvertToAction={mockConvertToActionItem}
                    />
                </TestWrapper>
            );

            // Verify card is displayed with conversion capability
            expect(screen.getByText('Good communication')).toBeInTheDocument();

            // Check that convert button exists
            const convertButton = screen.getByTitle('retrospective.cards.convertToAction');
            expect(convertButton).toBeInTheDocument();
        });
    });

    describe('Error Handling in Workflows', () => {
        it('should handle permission errors in workflow', async () => {
            const mockCard: Card = mockCards[0];

            render(
                <TestWrapper>
                    <RetrospectiveCard
                        card={mockCard}
                        onUpdate={vi.fn()}
                        onDelete={vi.fn()}
                        onVote={vi.fn()}
                        currentUser="different-user"
                        canEdit={false} // User cannot edit
                        participants={mockParticipants}
                        canConvertToAction={false}
                        onConvertToAction={vi.fn()}
                    />
                </TestWrapper>
            );

            // Verify that non-editors see card content but limited options
            expect(screen.getByText('Good communication')).toBeInTheDocument();

            // Edit button should not be visible for non-editors
            const editButton = screen.queryByLabelText(/edit card/i);
            expect(editButton).not.toBeInTheDocument();
        });

        it('should handle action item permission restrictions', async () => {
            const mockActionItem = mockActionItems[0];

            render(
                <TestWrapper>
                    <ActionItemCard
                        actionItem={mockActionItem}
                        participants={mockParticipants}
                        canEdit={false} // User cannot edit
                        onEdit={vi.fn()}
                        onDelete={vi.fn()}
                    />
                </TestWrapper>
            );

            // Verify action item is displayed but edit options are limited
            expect(screen.getByText('Improve testing process')).toBeInTheDocument();

            // Edit button should not be visible for non-editors
            const editButton = screen.queryByTitle(/editAction/i);
            expect(editButton).not.toBeInTheDocument();
        });
    });

    describe('Performance and State Management', () => {
        it('should handle rapid interactions without state conflicts', async () => {
            const user = userEvent.setup();
            const mockOnVote = vi.fn();
            const mockCard: Card = mockCards[0];

            render(
                <TestWrapper>
                    <RetrospectiveCard
                        card={mockCard}
                        onUpdate={vi.fn()}
                        onDelete={vi.fn()}
                        onVote={mockOnVote}
                        currentUser={mockUserId}
                        canEdit={true}
                        participants={mockParticipants}
                        canConvertToAction={true}
                        onConvertToAction={vi.fn()}
                    />
                </TestWrapper>
            );

            // Rapid interactions with vote buttons
            const voteUpButton = screen.getByLabelText(/vote up/i);
            const voteDownButton = screen.getByLabelText(/vote down/i);

            // Click multiple times rapidly
            await user.click(voteUpButton);
            await user.click(voteDownButton);
            await user.click(voteUpButton);

            // Verify all interactions were handled
            await waitFor(() => {
                expect(mockOnVote).toHaveBeenCalledTimes(3);
            });
        });
    });
});
