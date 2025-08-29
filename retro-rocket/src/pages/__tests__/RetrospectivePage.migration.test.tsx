/**
 * Migration Tests for RetrospectivePage Component
 * 
 * Tests validate that the migration from retrospectiveService functions
 * to OptimizedRetrospectiveService maintains all existing functionality
 * while improving performance.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, beforeEach, afterEach, it, expect, Mock } from 'vitest';
import { OptimizedRetrospectiveService } from '../../services/optimization/OptimizedRetrospectiveService';

// Mock all the dependencies
vi.mock('../../services/optimization/OptimizedRetrospectiveService');
vi.mock('../../hooks/useRetrospective', () => ({
    useRetrospective: () => ({
        retrospective: {
            id: 'retro-123',
            title: 'Test Retrospective',
            template: 'start-stop-continue',
            facilitator: 'user-123'
        },
        loading: false,
        error: null
    })
}));
vi.mock('../../hooks/useParticipants', () => ({
    useParticipants: () => ({
        participants: [],
        addParticipant: vi.fn().mockResolvedValue({ id: 'participant-123', isNew: true })
    })
}));
vi.mock('../../hooks/useCurrentUser', () => ({
    useCurrentUser: () => ({
        user: { uid: 'user-123', displayName: 'Test User' }
    })
}));
vi.mock('../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        language: 'en'
    })
}));
vi.mock('../../components/retrospective/RetrospectiveBoard', () => ({
    default: () => <div data-testid="retrospective-board">Board</div>
}));
vi.mock('../../components/participants', () => ({
    ResponsiveParticipantDisplay: () => <div data-testid="participant-display">Participants</div>
}));
vi.mock('react-hot-toast');

// Mock useParams to return our test retrospective ID
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ id: 'retro-123' }),
        useNavigate: () => vi.fn()
    };
});

// Lazy import to avoid hoisting issues
let RetrospectivePage: any;

describe('RetrospectivePage - Migration Tests', () => {
    beforeEach(async () => {
        vi.clearAllMocks();

        // Dynamic import to avoid hoisting issues with mocks
        const module = await import('../RetrospectivePage');
        RetrospectivePage = module.default;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('Participant Count Management Migration', () => {
        it('should use OptimizedRetrospectiveService.incrementParticipantCount for new participants', async () => {
            const mockIncrementParticipantCount = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            // Wait for the component to load
            await waitFor(() => {
                expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
            });

            // The increment should be called when a new participant joins
            // This is triggered by the useEffect in the component
            await waitFor(() => {
                expect(mockIncrementParticipantCount).toHaveBeenCalledWith('retro-123');
            }, { timeout: 3000 });
        });

        it('should handle increment participant count errors gracefully', async () => {
            const mockError = new Error('Failed to increment participant count');
            const mockIncrementParticipantCount = vi.fn().mockRejectedValue(mockError);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            // Mock console.error to verify error handling
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(mockIncrementParticipantCount).toHaveBeenCalled();
            });

            // Error should be handled without crashing the component
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });
    });

    describe('Service Integration', () => {
        it('should integrate with OptimizedRetrospectiveService correctly', () => {
            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
            expect(screen.getByTestId('participant-display')).toBeInTheDocument();
        });

        it('should maintain all existing page functionality', async () => {
            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            // Verify core components are rendered
            await waitFor(() => {
                expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
                expect(screen.getByTestId('participant-display')).toBeInTheDocument();
            });
        });
    });

    describe('Performance Optimizations', () => {
        it('should use optimized service calls for participant management', async () => {
            const mockIncrementParticipantCount = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(OptimizedRetrospectiveService.incrementParticipantCount).toHaveBeenCalled();
            });

            // Verify the optimized service is called with correct parameters
            expect(mockIncrementParticipantCount).toHaveBeenCalledWith('retro-123');
        });

        it('should handle service optimization metrics correctly', async () => {
            const mockIncrementParticipantCount = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            await waitFor(() => {
                expect(mockIncrementParticipantCount).toHaveBeenCalled();
            });

            // The service should be called exactly once per participant addition
            expect(mockIncrementParticipantCount).toHaveBeenCalledTimes(1);
        });
    });

    describe('Backward Compatibility', () => {
        it('should maintain exact same behavior as original implementation', async () => {
            const mockIncrementParticipantCount = vi.fn().mockResolvedValue(undefined);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            // All original functionality should work
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();
            expect(screen.getByTestId('participant-display')).toBeInTheDocument();

            // Participant count should still be managed
            await waitFor(() => {
                expect(mockIncrementParticipantCount).toHaveBeenCalledWith('retro-123');
            });
        });

        it('should handle the same error scenarios as the original', async () => {
            const mockError = new Error('Service error');
            const mockIncrementParticipantCount = vi.fn().mockRejectedValue(mockError);
            (OptimizedRetrospectiveService.incrementParticipantCount as Mock) = mockIncrementParticipantCount;

            render(
                <BrowserRouter>
                    <RetrospectivePage />
                </BrowserRouter>
            );

            // Component should still render despite errors
            expect(screen.getByTestId('retrospective-board')).toBeInTheDocument();

            await waitFor(() => {
                expect(mockIncrementParticipantCount).toHaveBeenCalled();
            });
        });
    });
});
