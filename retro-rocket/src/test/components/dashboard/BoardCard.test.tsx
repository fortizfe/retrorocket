import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import toast from 'react-hot-toast';
import BoardCard from '../../../components/dashboard/BoardCard';
import { OptimizedRetrospectiveService } from '../../../services/optimization/OptimizedRetrospectiveService';

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
    BrowserRouter: ({ children }: any) => children,
    useNavigate: () => mockNavigate,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../../services/optimization/OptimizedRetrospectiveService', () => ({
    OptimizedRetrospectiveService: {
        softDeleteRetrospective: vi.fn(),
    },
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: { [key: string]: string } = {
                'dashboard.boardCard.deleteSuccess': 'Board deleted successfully',
                'dashboard.boardCard.deleteError': 'Error deleting board',
                'dashboard.boardCard.deleteBoard': 'Delete Board',
                'dashboard.boardCard.deleteConfirmation': 'This action cannot be undone',
                'dashboard.boardCard.deleteButton': 'Delete',
                'dashboard.boardCard.deleteTitle': 'Delete board',
                'dashboard.boardCard.joined': 'Joined',
                'dashboard.boardCard.creator': 'Creator',
                'dashboard.boardCard.participants': 'participants',
                'dashboard.boardCard.openBoard': 'Open Board',
                'retrospective.deleteSuccess': 'Board deleted successfully',
                'retrospective.deleteError': 'Error deleting board',
                'common.cancel': 'Cancel',
            };
            return translations[key] || key;
        },
    }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    },
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, variant, size, loading, disabled, onClick, className, ...props }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={className}
            data-variant={variant}
            data-size={size}
            data-loading={loading}
            {...props}
        >
            {children}
        </button>
    ),
}));

vi.mock('../../../components/ui/Card', () => ({
    default: ({ children, className }: any) => (
        <div className={className}>{children}</div>
    ),
}));

describe('BoardCard', () => {
    const mockOnBoardDeleted = vi.fn();

    const defaultBoard = {
        id: 'board-1',
        title: 'Test Board',
        description: 'Test board description',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
        participantCount: 3,
        isActive: true,
        createdBy: 'user-1',
        isCreator: true,
    };

    const currentUserId = 'user-1';

    const createDelayedPromise = () => new Promise(resolve => setTimeout(resolve, 100));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderBoardCard = (board = defaultBoard, userId = currentUserId) => {
        return render(
            <BrowserRouter>
                <BoardCard
                    board={board}
                    currentUserId={userId}
                    onBoardDeleted={mockOnBoardDeleted}
                />
            </BrowserRouter>
        );
    };

    describe('Normal View', () => {
        it('should render board card with title and description', () => {
            renderBoardCard();

            expect(screen.getByText('Test Board')).toBeInTheDocument();
            expect(screen.getByText('Test board description')).toBeInTheDocument();
        });

        it('should render board card without description when not provided', () => {
            const { description, ...boardWithoutDescription } = defaultBoard;
            renderBoardCard(boardWithoutDescription as any);

            expect(screen.getByText('Test Board')).toBeInTheDocument();
            expect(screen.queryByText('Test board description')).not.toBeInTheDocument();
        });

        it('should display formatted creation date', () => {
            renderBoardCard();

            expect(screen.getByText(/1 ene 2023/)).toBeInTheDocument();
        });

        it('should display participant count', () => {
            renderBoardCard();

            expect(screen.getByText('3 participants')).toBeInTheDocument();
        });

        it('should show creator badge when user is creator', () => {
            renderBoardCard();

            expect(screen.getByText('Creator')).toBeInTheDocument();
        });

        it('should show joined badge when user is not creator', () => {
            const boardAsParticipant = { ...defaultBoard, isCreator: false };
            renderBoardCard(boardAsParticipant);

            expect(screen.getByText('Joined')).toBeInTheDocument();
        });

        it('should show delete button only for board owner', () => {
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            expect(deleteButton).toBeInTheDocument();
        });

        it('should not show delete button for non-owner', () => {
            renderBoardCard(defaultBoard, 'different-user');

            expect(screen.queryByTitle('Delete board')).not.toBeInTheDocument();
        });

        it('should render open board button', () => {
            renderBoardCard();

            expect(screen.getByText('Open Board')).toBeInTheDocument();
        });
    });

    describe('Delete Confirmation View', () => {
        it('should show delete confirmation when delete button is clicked', () => {
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            expect(screen.getByText('Delete Board')).toBeInTheDocument();
            expect(screen.getByText('This action cannot be undone')).toBeInTheDocument();
            expect(screen.getByText('"Test Board"')).toBeInTheDocument();
        });

        it('should show cancel and delete buttons in confirmation view', () => {
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Delete')).toBeInTheDocument();
        });

        it('should return to normal view when cancel is clicked', () => {
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByText('Delete Board')).not.toBeInTheDocument();
            expect(screen.getByText('Test Board')).toBeInTheDocument();
        });
    });

    describe('Delete Functionality', () => {
        it('should call delete service when delete is confirmed', async () => {
            (OptimizedRetrospectiveService.softDeleteRetrospective as Mock).mockResolvedValue(undefined);
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            await waitFor(() => {
                expect(OptimizedRetrospectiveService.softDeleteRetrospective).toHaveBeenCalledWith('board-1', 'user-1');
            });
        });

        it('should show success toast and call onBoardDeleted when delete succeeds', async () => {
            (OptimizedRetrospectiveService.softDeleteRetrospective as Mock).mockResolvedValue(undefined);
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            await waitFor(() => {
                expect(toast.success).toHaveBeenCalledWith('Board deleted successfully');
                expect(mockOnBoardDeleted).toHaveBeenCalledWith('board-1');
            });
        });

        it('should show error toast when delete fails', async () => {
            (OptimizedRetrospectiveService.softDeleteRetrospective as Mock).mockRejectedValue(new Error('Delete failed'));
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Delete failed');
            });
        });

        it('should disable buttons during deletion', async () => {
            (OptimizedRetrospectiveService.softDeleteRetrospective as Mock).mockImplementation(createDelayedPromise);
            renderBoardCard();

            const deleteButton = screen.getByTitle('Delete board');
            fireEvent.click(deleteButton);

            const confirmDeleteButton = screen.getByText('Delete');
            fireEvent.click(confirmDeleteButton);

            // Check buttons are disabled during deletion
            expect(screen.getByText('Cancel')).toBeDisabled();
        });

        it('should not allow delete if user is not owner', () => {
            const nonOwnerBoard = { ...defaultBoard, createdBy: 'different-user' };
            renderBoardCard(nonOwnerBoard);

            // Delete button should not be visible for non-owners
            expect(screen.queryByTitle('Delete board')).not.toBeInTheDocument();
        });
    });

    describe('Navigation', () => {
        it('should call navigate when open board button is clicked', () => {
            renderBoardCard();

            const openButton = screen.getByText('Open Board');
            fireEvent.click(openButton);

            expect(mockNavigate).toHaveBeenCalledWith('/retro/board-1');
        });
    });

    describe('Edge Cases', () => {
        it('should handle missing optional properties', () => {
            const minimalBoard = {
                id: 'board-2',
                title: 'Minimal Board',
                createdAt: new Date('2023-01-01'),
                updatedAt: new Date('2023-01-01'),
                participantCount: 1,
                isActive: true,
                createdBy: 'user-1',
                isCreator: true,
            };

            renderBoardCard(minimalBoard as any);

            expect(screen.getByText('Minimal Board')).toBeInTheDocument();
            expect(screen.getByText('1 participants')).toBeInTheDocument();
        });

        it('should handle zero participants', () => {
            const boardWithNoParticipants = { ...defaultBoard, participantCount: 0 };
            renderBoardCard(boardWithNoParticipants);

            expect(screen.getByText('0 participants')).toBeInTheDocument();
        });

        it('should handle very long title and description', () => {
            const boardWithLongContent = {
                ...defaultBoard,
                title: 'This is a very long board title that should be handled properly by the component with appropriate styling',
                description: 'This is a very long description that should also be handled properly with appropriate text truncation and line clamping to ensure the UI remains clean and readable even with extensive content that might overflow the available space',
            };

            renderBoardCard(boardWithLongContent);

            expect(screen.getByText(boardWithLongContent.title)).toBeInTheDocument();
            expect(screen.getByText(boardWithLongContent.description)).toBeInTheDocument();
        });
    });
});
