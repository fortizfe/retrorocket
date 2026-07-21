import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import JoinRetrospectiveModal from '@/features/dashboard/components/JoinRetrospectiveModal';

// Mock dependencies
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: { [key: string]: string } = {
                'dashboard.joinModal.title': 'Join Retrospective',
                'dashboard.joinModal.closeModal': 'Close Modal',
                'dashboard.joinModal.description': 'Enter the board ID to join an existing retrospective',
                'dashboard.joinModal.boardIdLabel': 'Board ID',
                'dashboard.joinModal.boardIdPlaceholder': 'Enter board ID',
                'dashboard.joinModal.boardIdHelp': 'The board ID is provided by the facilitator',
                'dashboard.joinModal.joining': 'Joining...',
                'dashboard.joinModal.join': 'Join',
                'dashboard.joinModal.helpText': 'Ask your facilitator for the board ID',
                'common.cancel': 'Cancel',
            };
            return translations[key] || key;
        },
    }),
}));

const mockJoinByIdAndNavigate = vi.fn();
const mockClearError = vi.fn();

vi.mock('@/features/boards/retrospective/hooks/useJoinRetrospective', () => ({
    useJoinRetrospective: () => ({
        isJoining: false,
        error: null,
        joinByIdAndNavigate: mockJoinByIdAndNavigate,
        clearError: mockClearError,
    }),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, disabled, onClick, type, ...props }: any) => (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            data-testid="mock-button"
            {...props}
        >
            {children}
        </button>
    ),
}));

vi.mock('@/lib/components/ui/Input', () => ({
    default: ({ value, onChange, placeholder, required, disabled, autoFocus, id, ...props }: any) => (
        <input
            id={id}
            type="text"
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            data-testid="mock-input"
            {...props}
        />
    ),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('JoinRetrospectiveModal', () => {
    const mockOnClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderModal = (isOpen = true) => {
        return render(
            <JoinRetrospectiveModal
                isOpen={isOpen}
                onClose={mockOnClose}
            />
        );
    };

    describe('Modal Visibility', () => {
        it('should render when isOpen is true', () => {
            renderModal(true);
            expect(screen.getByText('Join Retrospective')).toBeInTheDocument();
        });

        it('should not render when isOpen is false', () => {
            renderModal(false);
            expect(screen.queryByText('Join Retrospective')).not.toBeInTheDocument();
        });
    });

    describe('Modal Content', () => {
        it('should render modal title and description', () => {
            renderModal();

            expect(screen.getByText('Join Retrospective')).toBeInTheDocument();
            expect(screen.getByText('Enter the board ID to join an existing retrospective')).toBeInTheDocument();
        });

        it('should render form elements', () => {
            renderModal();

            expect(screen.getByLabelText('Board ID')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Enter board ID')).toBeInTheDocument();
            expect(screen.getByText('The board ID is provided by the facilitator')).toBeInTheDocument();
        });

        it('should render action buttons', () => {
            renderModal();

            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Join')).toBeInTheDocument();
        });

        it('should render help text', () => {
            renderModal();

            expect(screen.getByText('Ask your facilitator for the board ID')).toBeInTheDocument();
        });
    });

    describe('Input Handling', () => {
        it('should update input value when typing', async () => {
            const user = userEvent.setup();
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            await user.type(input, 'test-board-id');

            expect(input).toHaveValue('test-board-id');
        });

        it('should focus input when modal opens', () => {
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            expect(input).toHaveFocus();
        });
    });

    describe('Form Submission', () => {
        it('should call joinByIdAndNavigate when form is submitted with valid input', async () => {
            const user = userEvent.setup();
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            const submitButton = screen.getByText('Join');

            await user.type(input, 'test-board-id');
            await user.click(submitButton);

            expect(mockJoinByIdAndNavigate).toHaveBeenCalledWith('test-board-id');
        });

        it('should trim whitespace from input before submission', async () => {
            const user = userEvent.setup();
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            const submitButton = screen.getByText('Join');

            await user.type(input, '  test-board-id  ');
            await user.click(submitButton);

            expect(mockJoinByIdAndNavigate).toHaveBeenCalledWith('test-board-id');
        });

        it('should not submit when input is empty', async () => {
            const user = userEvent.setup();
            renderModal();

            const submitButton = screen.getByText('Join');
            await user.click(submitButton);

            expect(mockJoinByIdAndNavigate).not.toHaveBeenCalled();
        });
    });

    describe('Modal Closing', () => {
        it('should call onClose when cancel button is clicked', async () => {
            const user = userEvent.setup();
            renderModal();

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            expect(mockOnClose).toHaveBeenCalled();
        });

        it('should clear error when closing', async () => {
            const user = userEvent.setup();
            renderModal();

            const cancelButton = screen.getByText('Cancel');
            await user.click(cancelButton);

            expect(mockClearError).toHaveBeenCalled();
        });
    });

    describe('Button States', () => {
        it('should render join button as disabled when input is empty', () => {
            renderModal();

            const submitButton = screen.getByText('Join');
            expect(submitButton).toBeDisabled();
        });

        it('should render join button as enabled when input has value', async () => {
            const user = userEvent.setup();
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            await user.type(input, 'test-board-id');

            const submitButton = screen.getByText('Join');
            expect(submitButton).toBeEnabled();
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels', () => {
            renderModal();

            expect(screen.getByLabelText('Board ID')).toBeInTheDocument();
        });

        it('should have required attribute on input', () => {
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            expect(input).toBeRequired();
        });

        it('should associate label with input', () => {
            renderModal();

            const input = screen.getByPlaceholderText('Enter board ID');
            expect(input).toHaveAccessibleName('Board ID');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long board IDs', async () => {
            const user = userEvent.setup();
            renderModal();

            const longBoardId = 'a'.repeat(100);
            const input = screen.getByPlaceholderText('Enter board ID');
            const submitButton = screen.getByText('Join');

            await user.type(input, longBoardId);
            await user.click(submitButton);

            expect(mockJoinByIdAndNavigate).toHaveBeenCalledWith(longBoardId);
        });

        it('should handle special characters in board ID', async () => {
            const user = userEvent.setup();
            renderModal();

            const specialBoardId = 'board-123_test';
            const input = screen.getByPlaceholderText('Enter board ID');
            const submitButton = screen.getByText('Join');

            await user.type(input, specialBoardId);
            await user.click(submitButton);

            expect(mockJoinByIdAndNavigate).toHaveBeenCalledWith(specialBoardId);
        });
    });
});