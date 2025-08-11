import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JoinPanelForm from '../../../components/forms/JoinPanelForm';

// Mock the hooks
vi.mock('../../../hooks/useParticipants', () => ({
    useParticipants: vi.fn()
}));

vi.mock('../../../hooks/useCurrentUser', () => ({
    useCurrentUser: vi.fn()
}));

// Mock the UI components
vi.mock('../../../components/ui/Input', () => ({
    default: ({ ...props }: any) => <input {...props} />
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, loading, disabled, ...props }: any) => (
        <button {...props} disabled={disabled || loading}>
            {loading ? 'Loading...' : children}
        </button>
    )
}));

const mockAddParticipant = vi.fn();
const mockUseParticipants = vi.fn(() => ({
    addParticipant: mockAddParticipant
}));

const mockUseCurrentUser = vi.fn(() => ({
    uid: 'test-user-id'
}));

// Apply mocks
import { useParticipants } from '../../../hooks/useParticipants';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

(useParticipants as any).mockImplementation(mockUseParticipants);
(useCurrentUser as any).mockImplementation(mockUseCurrentUser);

describe('JoinPanelForm', () => {
    const defaultProps = {
        retrospectiveId: 'test-retro-id',
        onParticipantJoined: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAddParticipant.mockResolvedValue({ id: 'new-participant-id' });
        mockUseCurrentUser.mockReturnValue({ uid: 'test-user-id' });
        mockUseParticipants.mockReturnValue({ addParticipant: mockAddParticipant });
    });

    describe('Basic Rendering', () => {
        it('should render the form correctly', () => {
            render(<JoinPanelForm {...defaultProps} />);

            expect(screen.getByPlaceholderText('Ingresa tu nombre')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Unirse al panel' })).toBeInTheDocument();
        });

        it('should render with correct form structure', () => {
            render(<JoinPanelForm {...defaultProps} />);

            const form = screen.getByRole('textbox').closest('form');
            expect(form).toBeInTheDocument();
            expect(form).toHaveClass('flex', 'flex-col', 'items-center');
        });

        it('should render input with correct placeholder', () => {
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            expect(input).toHaveAttribute('type', 'text');
            expect(input).toHaveClass('mb-4');
        });

        it('should render button with correct classes', () => {
            render(<JoinPanelForm {...defaultProps} />);

            const button = screen.getByRole('button', { name: 'Unirse al panel' });
            expect(button).toHaveAttribute('type', 'submit');
            expect(button).toHaveClass('w-full');
        });
    });

    describe('User Input', () => {
        it('should update input value when user types', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');

            expect(input).toHaveValue('John Doe');
        });

        it('should handle empty input', () => {
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            expect(input).toHaveValue('');
        });

        it('should handle special characters in input', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'José María');

            expect(input).toHaveValue('José María');
        });

        it('should handle very long names', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const longName = 'A'.repeat(100);
            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, longName);

            expect(input).toHaveValue(longName);
        });
    });

    describe('Form Submission', () => {
        it('should call addParticipant when form is submitted with valid data', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const button = screen.getByRole('button', { name: 'Unirse al panel' });

            await user.type(input, 'John Doe');
            await user.click(button);

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalledWith({
                    name: 'John Doe',
                    userId: 'test-user-id',
                    retrospectiveId: 'test-retro-id'
                });
            });
        });

        it('should call onParticipantJoined callback when submission is successful', async () => {
            const user = userEvent.setup();
            const onParticipantJoined = vi.fn();
            render(<JoinPanelForm {...defaultProps} onParticipantJoined={onParticipantJoined} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(onParticipantJoined).toHaveBeenCalledWith('new-participant-id', 'John Doe');
            });
        });

        it('should clear input after successful submission', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(input).toHaveValue('');
            });
        });

        it('should trim whitespace from name before submission', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, '  John Doe  ');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalledWith({
                    name: 'John Doe',
                    userId: 'test-user-id',
                    retrospectiveId: 'test-retro-id'
                });
            });
        });

        it('should submit form using Enter key', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.keyboard('{Enter}');

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalled();
            });
        });
    });

    describe('Loading States', () => {
        it('should show loading state during submission', async () => {
            const user = userEvent.setup();
            let resolvePromise: (value: any) => void;
            const submissionPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            mockAddParticipant.mockReturnValue(submissionPromise);

            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            expect(screen.getByText('Loading...')).toBeInTheDocument();

            resolvePromise!({ id: 'new-participant-id' });
            await waitFor(() => {
                expect(screen.getByText('Unirse al panel')).toBeInTheDocument();
            });
        });

        it('should disable button during submission', async () => {
            const user = userEvent.setup();
            let resolvePromise: (value: any) => void;
            const submissionPromise = new Promise((resolve) => {
                resolvePromise = resolve;
            });
            mockAddParticipant.mockReturnValue(submissionPromise);

            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const button = screen.getByRole('button', { name: 'Unirse al panel' });

            await user.type(input, 'John Doe');
            expect(button).not.toBeDisabled();

            await user.click(button);
            expect(button).toBeDisabled();

            resolvePromise!({ id: 'new-participant-id' });
            await waitFor(() => {
                // After successful submission, input is cleared and button becomes disabled again
                expect(input).toHaveValue('');
            });
            expect(button).toBeDisabled(); // Disabled because input is empty
        });
    });

    describe('Validation', () => {
        it('should disable button when name is empty', () => {
            render(<JoinPanelForm {...defaultProps} />);

            const button = screen.getByRole('button', { name: 'Unirse al panel' });
            expect(button).toBeDisabled();
        });

        it('should disable button when name is only whitespace', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const button = screen.getByRole('button', { name: 'Unirse al panel' });

            await user.type(input, '   ');
            expect(button).toBeDisabled();
        });

        it('should enable button when name has valid content', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const button = screen.getByRole('button', { name: 'Unirse al panel' });

            await user.type(input, 'John');
            expect(button).not.toBeDisabled();
        });

        it('should not submit when name is empty', async () => {
            render(<JoinPanelForm {...defaultProps} />);

            // Try to submit with empty name
            fireEvent.submit(screen.getByRole('textbox').closest('form')!);

            expect(mockAddParticipant).not.toHaveBeenCalled();
        });

        it('should not submit when name is only whitespace', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, '   ');

            fireEvent.submit(screen.getByRole('textbox').closest('form')!);

            expect(mockAddParticipant).not.toHaveBeenCalled();
        });

        it('should disable button when user ID is not available', () => {
            mockUseCurrentUser.mockReturnValue({ uid: undefined as any });
            render(<JoinPanelForm {...defaultProps} />);

            const button = screen.getByRole('button', { name: 'Unirse al panel' });
            expect(button).toBeDisabled();
        });

        it('should not submit when user ID is not available', async () => {
            mockUseCurrentUser.mockReturnValue({ uid: undefined as any });
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const user = userEvent.setup();
            await user.type(input, 'John Doe');

            fireEvent.submit(screen.getByRole('textbox').closest('form')!);

            expect(mockAddParticipant).not.toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        it('should handle addParticipant errors gracefully', async () => {
            const user = userEvent.setup();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            mockAddParticipant.mockRejectedValue(new Error('Network error'));

            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding participant:', expect.any(Error));
            });

            // Should still have the name in the input after error
            expect(input).toHaveValue('John Doe');

            consoleErrorSpy.mockRestore();
        });

        it('should not call onParticipantJoined when addParticipant fails', async () => {
            const user = userEvent.setup();
            const onParticipantJoined = vi.fn();
            vi.spyOn(console, 'error').mockImplementation(() => { });
            mockAddParticipant.mockRejectedValue(new Error('Network error'));

            render(<JoinPanelForm {...defaultProps} onParticipantJoined={onParticipantJoined} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalled();
            });

            expect(onParticipantJoined).not.toHaveBeenCalled();
        });

        it('should reset loading state after error', async () => {
            const user = userEvent.setup();
            vi.spyOn(console, 'error').mockImplementation(() => { });
            mockAddParticipant.mockRejectedValue(new Error('Network error'));

            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(screen.getByText('Unirse al panel')).toBeInTheDocument();
            });

            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
    });

    describe('Props and Callbacks', () => {
        it('should work without onParticipantJoined callback', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm retrospectiveId="test-retro-id" />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalled();
            });
        });

        it('should use provided retrospectiveId in addParticipant call', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm retrospectiveId="custom-retro-id" />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'John Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalledWith({
                    name: 'John Doe',
                    userId: 'test-user-id',
                    retrospectiveId: 'custom-retro-id'
                });
            });
        });

        it('should pass retrospectiveId to useParticipants hook', () => {
            render(<JoinPanelForm retrospectiveId="hook-test-id" />);

            expect(mockUseParticipants).toHaveBeenCalledWith('hook-test-id');
        });
    });

    describe('Edge Cases', () => {
        it('should handle rapid successive submissions', async () => {
            const user = userEvent.setup();
            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            const button = screen.getByRole('button', { name: 'Unirse al panel' });

            await user.type(input, 'John Doe');

            // Click multiple times rapidly
            await user.click(button);
            await user.click(button);
            await user.click(button);

            // Should only be called once due to loading state
            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalledTimes(1);
            });
        });

        it('should handle form submission with different user IDs', async () => {
            const user = userEvent.setup();
            mockUseCurrentUser.mockReturnValue({ uid: 'different-user-id' });

            render(<JoinPanelForm {...defaultProps} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'Jane Doe');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(mockAddParticipant).toHaveBeenCalledWith({
                    name: 'Jane Doe',
                    userId: 'different-user-id',
                    retrospectiveId: 'test-retro-id'
                });
            });
        });

        it('should handle addParticipant returning different response format', async () => {
            const user = userEvent.setup();
            const onParticipantJoined = vi.fn();
            mockAddParticipant.mockResolvedValue({ id: 'custom-format-id' });

            render(<JoinPanelForm {...defaultProps} onParticipantJoined={onParticipantJoined} />);

            const input = screen.getByPlaceholderText('Ingresa tu nombre');
            await user.type(input, 'Test User');
            await user.click(screen.getByRole('button', { name: 'Unirse al panel' }));

            await waitFor(() => {
                expect(onParticipantJoined).toHaveBeenCalledWith('custom-format-id', 'Test User');
            });
        });
    });
});
