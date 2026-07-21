import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CreateCardForm from '@/lib/components/forms/CreateCardForm';

// Mock the card service
vi.mock('@/features/boards/retrospective/services/cardService', () => ({
    createCard: vi.fn(),
}));

// Mock Input component
vi.mock('@/lib/components/ui/Input', () => ({
    default: ({ value, onChange, placeholder, className, ...props }: any) => (
        <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={className}
            data-testid="card-input"
            {...props}
        />
    ),
}));

// Mock Button component
vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, type, disabled, loading, className, ...props }: any) => (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={className}
            data-testid="card-button"
            data-loading={loading}
            {...props}
        >
            {children}
        </button>
    ),
}));

const { createCard } = await import('@/features/boards/retrospective/services/cardService');

describe('CreateCardForm', () => {
    const defaultProps = {
        columnId: 'test-column-id',
        retrospectiveId: 'test-retro-id',
        participantName: 'Test User',
        onCardCreated: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render form with input and button', () => {
            render(<CreateCardForm {...defaultProps} />);

            expect(screen.getByTestId('card-input')).toBeInTheDocument();
            expect(screen.getByTestId('card-button')).toBeInTheDocument();
            expect(screen.getByText('Add Card')).toBeInTheDocument();
        });

        it('should render input with correct placeholder', () => {
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            expect(input).toHaveAttribute('placeholder', 'Enter your card content');
        });

        it('should initially have empty input value', () => {
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            expect(input.value).toBe('');
        });

        it('should initially disable submit button', () => {
            render(<CreateCardForm {...defaultProps} />);

            const button = screen.getByTestId('card-button');
            expect(button).toBeDisabled();
        });
    });

    describe('User Input', () => {
        it('should update input value when user types', async () => {
            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test card content');

            expect(input).toHaveValue('Test card content');
        });

        it('should enable submit button when input has content', async () => {
            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            const button = screen.getByTestId('card-button');

            expect(button).toBeDisabled();

            await user.type(input, 'Test content');

            expect(button).not.toBeDisabled();
        });

        it('should disable button when input is only whitespace', async () => {
            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            const button = screen.getByTestId('card-button');

            await user.type(input, '   ');

            expect(button).toBeDisabled();
        });

        it('should enable button again after adding non-whitespace content', async () => {
            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            const button = screen.getByTestId('card-button');

            await user.type(input, '   ');
            expect(button).toBeDisabled();

            await user.type(input, 'actual content');
            expect(button).not.toBeDisabled();
        });
    });

    describe('Form Submission', () => {
        it('should call createCard with correct parameters when form is submitted', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue('new-card-id');

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test card content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledWith({
                    content: 'Test card content',
                    column: 'test-column-id',
                    createdBy: 'Test User',
                    retrospectiveId: 'test-retro-id',
                });
            });
        });

        it('should trim whitespace from card content before submission', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue('new-card-id');

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, '  Test card content  ');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledWith({
                    content: 'Test card content',
                    column: 'test-column-id',
                    createdBy: 'Test User',
                    retrospectiveId: 'test-retro-id',
                });
            });
        });

        it('should not submit when content is empty', async () => {
            const mockCreateCard = vi.mocked(createCard);
            render(<CreateCardForm {...defaultProps} />);

            const form = screen.getByTestId('card-input').closest('form')!;
            fireEvent.submit(form);

            expect(mockCreateCard).not.toHaveBeenCalled();
        });

        it('should not submit when content is only whitespace', async () => {
            const mockCreateCard = vi.mocked(createCard);
            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, '   ');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            expect(mockCreateCard).not.toHaveBeenCalled();
        });

        it('should clear input after successful submission', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(input.value).toBe('');
            });
        });

        it('should call onCardCreated after successful submission', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");
            const mockOnCardCreated = vi.fn();

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} onCardCreated={mockOnCardCreated} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockOnCardCreated).toHaveBeenCalled();
            });
        });

        it('should work without onCardCreated callback', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} onCardCreated={undefined} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;

            // Should not throw error
            expect(() => {
                fireEvent.submit(form);
            }).not.toThrow();

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalled();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading state during submission', async () => {
            let resolvePromise: (value: string) => void;
            const createPromise = new Promise<string>((resolve) => {
                resolvePromise = resolve;
            });

            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockReturnValue(createPromise);

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            // Button should show loading state
            const button = screen.getByTestId('card-button');
            expect(button).toHaveAttribute('data-loading', 'true');

            // Resolve the promise
            resolvePromise!('new-card-id');

            await waitFor(() => {
                expect(button).toHaveAttribute('data-loading', 'false');
            });
        });

        it('should disable button during submission', async () => {
            let resolvePromise: (value: string) => void;
            const createPromise = new Promise<string>((resolve) => {
                resolvePromise = resolve;
            });

            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockReturnValue(createPromise);

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const button = screen.getByTestId('card-button');
            expect(button).not.toBeDisabled();

            const form = input.closest('form')!;
            fireEvent.submit(form);

            // Button should show loading state
            expect(button).toHaveAttribute('data-loading', 'true');

            // Resolve the promise
            resolvePromise!('new-card-id');

            await waitFor(() => {
                expect(button).not.toBeDisabled();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle createCard errors gracefully', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockRejectedValue(new Error('Create failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error creating card:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('should reset loading state after error', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockRejectedValue(new Error('Create failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                const button = screen.getByTestId('card-button');
                expect(button).toHaveAttribute('data-loading', 'false');
            });

            consoleSpy.mockRestore();
        });

        it('should not clear input after error', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockRejectedValue(new Error('Create failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            // Input should still contain the content after error
            expect(input.value).toBe('Test content');

            consoleSpy.mockRestore();
        });

        it('should not call onCardCreated after error', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockRejectedValue(new Error('Create failed'));
            const mockOnCardCreated = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} onCardCreated={mockOnCardCreated} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalled();
            });

            expect(mockOnCardCreated).not.toHaveBeenCalled();

            consoleSpy.mockRestore();
        });
    });

    describe('Form Structure', () => {
        it('should have proper form element', () => {
            render(<CreateCardForm {...defaultProps} />);

            const form = screen.getByTestId('card-input').closest('form');
            expect(form).toBeInTheDocument();
        });

        it('should have submit button with correct type', () => {
            render(<CreateCardForm {...defaultProps} />);

            const button = screen.getByTestId('card-button');
            expect(button).toHaveAttribute('type', 'submit');
        });

        it('should prevent default form submission', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;

            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const preventDefaultSpy = vi.spyOn(submitEvent, 'preventDefault');

            form.dispatchEvent(submitEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
        });
    });

    describe('Component Props', () => {
        it('should use all provided props correctly', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const customProps = {
                columnId: 'custom-column',
                retrospectiveId: 'custom-retro',
                participantName: 'Custom User',
                onCardCreated: vi.fn(),
            };

            const user = userEvent.setup();
            render(<CreateCardForm {...customProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledWith({
                    content: 'Test content',
                    column: 'custom-column',
                    createdBy: 'Custom User',
                    retrospectiveId: 'custom-retro',
                });
            });
        });
    });

    describe('Accessibility', () => {
        it('should have accessible form structure', () => {
            render(<CreateCardForm {...defaultProps} />);

            const form = screen.getByTestId('card-input').closest('form');
            const input = screen.getByTestId('card-input');
            const button = screen.getByTestId('card-button');

            expect(form).toBeInTheDocument();
            expect(input).toBeInTheDocument();
            expect(button).toBeInTheDocument();
        });

        it('should have descriptive button text', () => {
            render(<CreateCardForm {...defaultProps} />);

            expect(screen.getByText('Add Card')).toBeInTheDocument();
        });

        it('should have helpful placeholder text', () => {
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            expect(input).toHaveAttribute('placeholder', 'Enter your card content');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long content', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const longContent = 'A'.repeat(1000);

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, longContent);

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledWith({
                    content: longContent,
                    column: 'test-column-id',
                    createdBy: 'Test User',
                    retrospectiveId: 'test-retro-id',
                });
            });
        });

        it('should handle special characters in content', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const specialContent = 'Special chars: @#$%^&*()_+';

            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');

            // Use fireEvent.change instead of user.type for special characters
            fireEvent.change(input, { target: { value: specialContent } });

            const form = input.closest('form')!;
            fireEvent.submit(form);

            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledWith({
                    content: specialContent,
                    column: 'test-column-id',
                    createdBy: 'Test User',
                    retrospectiveId: 'test-retro-id',
                });
            });
        });

        it('should handle rapid form submissions', async () => {
            const mockCreateCard = vi.mocked(createCard);
            mockCreateCard.mockResolvedValue("new-card-id");

            const user = userEvent.setup();
            render(<CreateCardForm {...defaultProps} />);

            const input = screen.getByTestId('card-input');
            await user.type(input, 'Test content');

            const form = input.closest('form')!;

            // Submit once - should work
            fireEvent.submit(form);

            // Wait for the first submission to complete
            await waitFor(() => {
                expect(mockCreateCard).toHaveBeenCalledTimes(1);
            });

            // Input should be cleared, so rapid submissions won't work without new content
            expect(input).toHaveValue('');
        });
    });
});
