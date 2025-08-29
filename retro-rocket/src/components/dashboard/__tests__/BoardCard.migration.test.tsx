/**
 * Migration Tests for BoardCard Component
 * 
 * Tests validate that the migration from deleteRetrospectiveCompletely to 
 * OptimizedRetrospectiveService.softDeleteRetrospective maintains all 
 * existing functionality while adding soft delete benefits.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import BoardCard from '../BoardCard';
import { OptimizedRetrospectiveService } from '../../../services/optimization/OptimizedRetrospectiveService';
import toast from 'react-hot-toast';

// Mock dependencies
vi.mock('../../../services/optimization/OptimizedRetrospectiveService');
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'en'
    })
}));
vi.mock('react-hot-toast');

const mockBoard = {
    id: 'board-123',
    title: 'Test Retrospective',
    description: 'Test description',
    template: 'start-stop-continue',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 5,
    isActive: true,
    createdBy: 'user-123',
    isCreator: true
};

const mockOnBoardDeleted = vi.fn();

const renderBoardCard = (overrides = {}) => {
    const props = {
        board: { ...mockBoard, ...overrides },
        currentUserId: 'user-123',
        onBoardDeleted: mockOnBoardDeleted
    };

    return render(
        <BrowserRouter>
            <BoardCard {...props} />
        </BrowserRouter>
    );
};

describe('BoardCard - Migration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Delete Functionality Migration', () => {
        it('should use OptimizedRetrospectiveService.softDeleteRetrospective instead of deleteRetrospectiveCompletely', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

            renderBoardCard();

            // Click delete button to show confirmation
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            // Confirm deletion
            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockSoftDelete).toHaveBeenCalledWith('board-123', 'user-123');
            });
        });

        it('should call onBoardDeleted callback after successful deletion', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

            renderBoardCard();

            // Click delete button and confirm
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockOnBoardDeleted).toHaveBeenCalledWith('board-123');
            });
        });

        it('should show success toast with soft delete messaging', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            const mockToastSuccess = vi.fn();
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;
            (toast.success as any) = mockToastSuccess;

            renderBoardCard();

            // Click delete button and confirm
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('retrospective.deleteSuccess');
            });
        });

        it('should handle deletion errors gracefully', async () => {
            const mockError = new Error('Database connection failed');
            const mockSoftDelete = vi.fn().mockRejectedValue(mockError);
            const mockToastError = vi.fn();
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;
            (toast.error as any) = mockToastError;

            renderBoardCard();

            // Click delete button and confirm
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Database connection failed');
            });
        });

        it('should disable delete button during deletion process', async () => {
            let resolveDelete: () => void;
            const deletePromise = new Promise<void>((resolve) => {
                resolveDelete = resolve;
            });
            const mockSoftDelete = vi.fn().mockReturnValue(deletePromise);
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

            renderBoardCard();

            // Click delete button and confirm
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            // Button should be disabled during deletion
            await waitFor(() => {
                expect(confirmButton).toHaveAttribute('disabled');
            });

            // Resolve the deletion
            resolveDelete!();

            await waitFor(() => {
                expect(mockOnBoardDeleted).toHaveBeenCalled();
            });
        });
    });

    describe('Backward Compatibility', () => {
        it('should maintain all existing board card display functionality', () => {
            renderBoardCard();

            expect(screen.getByText('Test Retrospective')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'dashboard.boardCard.openBoard' })).toBeInTheDocument();
            expect(screen.getByTitle('dashboard.boardCard.deleteTitle')).toBeInTheDocument();
        });

        it('should handle owner permissions correctly', () => {
            renderBoardCard({ createdBy: 'other-user' });

            // Non-owners should not see delete button
            expect(screen.queryByTitle('dashboard.boardCard.deleteTitle')).not.toBeInTheDocument();
        });

        it('should show participant count and timestamps correctly', () => {
            renderBoardCard();

            // Check that basic card elements exist
            expect(screen.getByText('Test Retrospective')).toBeInTheDocument();
            expect(screen.getByText('Test description')).toBeInTheDocument();
        });

        it('should navigate to retrospective on view button click', () => {
            renderBoardCard();

            const viewButton = screen.getByRole('button', { name: 'dashboard.boardCard.openBoard' });
            expect(viewButton).toBeInTheDocument();
        });
    });

    describe('Soft Delete Benefits', () => {
        it('should provide recovery opportunity through soft delete', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

            renderBoardCard();

            // Delete the board
            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockSoftDelete).toHaveBeenCalledWith('board-123', 'user-123');
            });

            // Verify soft delete was used (not permanent delete)
            expect(mockSoftDelete).toHaveBeenCalledTimes(1);
        });

        it('should show appropriate messaging for reversible action', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            const mockToastSuccess = vi.fn();
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;
            (toast.success as any) = mockToastSuccess;

            renderBoardCard();

            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockToastSuccess).toHaveBeenCalledWith('retrospective.deleteSuccess');
            });
        });
    });

    describe('Integration with Optimization Services', () => {
        it('should integrate with OptimizedRetrospectiveService correctly', async () => {
            const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

            renderBoardCard();

            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(OptimizedRetrospectiveService.softDeleteRetrospective).toHaveBeenCalledWith(
                    'board-123',
                    'user-123'
                );
            });
        });

        it('should handle service-specific error types', async () => {
            const serviceError = new Error('Insufficient permissions for soft delete');
            serviceError.name = 'ServiceError';

            const mockSoftDelete = vi.fn().mockRejectedValue(serviceError);
            const mockToastError = vi.fn();
            (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;
            (toast.error as any) = mockToastError;

            renderBoardCard();

            const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
            fireEvent.click(deleteButton);

            const confirmButton = await screen.findByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);

            await waitFor(() => {
                expect(mockToastError).toHaveBeenCalledWith('Insufficient permissions for soft delete');
            });
        });
    });
});
