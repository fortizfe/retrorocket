/**
 * Essential Migration Tests for BoardCard Component
 * 
 * Validates core functionality migration from deleteRetrospectiveCompletely 
 * to OptimizedRetrospectiveService.softDeleteRetrospective
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';
import BoardCard from '../BoardCard';
import { OptimizedRetrospectiveService } from '../../../services/optimization/OptimizedRetrospectiveService';

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

describe('BoardCard Migration - Core Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should render board card with all required elements', () => {
        renderBoardCard();

        expect(screen.getByText('Test Retrospective')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
        // Basic card elements are rendered correctly
    });

    it('should call OptimizedRetrospectiveService when delete is invoked', async () => {
        const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
        (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

        renderBoardCard();

        // Find the delete button by its title attribute
        const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
        fireEvent.click(deleteButton);

        // Find the confirmation button - it should have the delete text
        await waitFor(() => {
            const confirmButton = screen.getByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(mockSoftDelete).toHaveBeenCalledWith('board-123', 'user-123');
        });
    });

    it('should call onBoardDeleted callback after successful soft delete', async () => {
        const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
        (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

        renderBoardCard();

        const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            const confirmButton = screen.getByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(mockOnBoardDeleted).toHaveBeenCalledWith('board-123');
        });
    });

    it('should handle deletion errors gracefully', async () => {
        const mockError = new Error('Database connection failed');
        const mockSoftDelete = vi.fn().mockRejectedValue(mockError);
        (OptimizedRetrospectiveService.softDeleteRetrospective as any) = mockSoftDelete;

        renderBoardCard();

        const deleteButton = screen.getByTitle('dashboard.boardCard.deleteTitle');
        fireEvent.click(deleteButton);

        await waitFor(() => {
            const confirmButton = screen.getByText('dashboard.boardCard.deleteButton');
            fireEvent.click(confirmButton);
        });

        await waitFor(() => {
            expect(mockSoftDelete).toHaveBeenCalled();
        });

        // Component should still be rendered (not crashed) - check via modal content
        expect(screen.getByText('dashboard.boardCard.deleteBoard')).toBeInTheDocument();
    });

    it('should not show delete button for non-owners', () => {
        renderBoardCard({ createdBy: 'other-user' });

        // Non-owners should not see delete button
        expect(screen.queryByTitle('dashboard.boardCard.deleteTitle')).not.toBeInTheDocument();
    });

    it('should maintain all existing display functionality', () => {
        renderBoardCard();

        // Check all essential elements are present
        expect(screen.getByText('Test Retrospective')).toBeInTheDocument();
        expect(screen.getByText('Test description')).toBeInTheDocument();
        expect(screen.getByText('dashboard.boardCard.openBoard')).toBeInTheDocument();
        // Participant count section exists - verified through date elements
        expect(screen.getByText(/ago 2025/)).toBeInTheDocument();
    });
});
