import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import EditRetrospectiveModal from '@/features/dashboard/components/EditRetrospectiveModal';
import { renameBoard } from '@/features/dashboard/services/backendBoardsClient';

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/features/dashboard/services/backendBoardsClient', () => ({
    renameBoard: vi.fn(),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        dialog: ({ children, open, ...props }: any) => <dialog open={open} {...props}>{children}</dialog>,
    },
    AnimatePresence: ({ children }: any) => children,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, loading, disabled, ...props }: any) => (
        <button onClick={onClick} disabled={disabled || loading} {...props}>
            {children}
        </button>
    ),
}));

describe('EditRetrospectiveModal', () => {
    const board = { id: 'board-1', title: 'Original Title' };
    const onBoardUpdated = vi.fn();
    const onClose = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderModal = (isOpen = true) =>
        render(
            <EditRetrospectiveModal
                isOpen={isOpen}
                onClose={onClose}
                board={board}
                onBoardUpdated={onBoardUpdated}
            />
        );

    it('renders the current title pre-filled in the title field', () => {
        renderModal();
        expect(screen.getByDisplayValue('Original Title')).toBeInTheDocument();
    });

    describe('Label/input association (regression guard — fixes a pre-existing accessibility gap)', () => {
        it('associates the title label with its input programmatically via getByLabelText, not just visually', () => {
            // Before the fix, Input's <label> had no htmlFor, so the label and
            // input were visually adjacent but not programmatically linked —
            // getByLabelText() (and screen readers) couldn't find the input via
            // its label. Known gap noted in e2e/dashboard-manage.spec.ts.
            renderModal();
            const input = screen.getByLabelText('dashboard.boardCard.titleLabel');
            expect(input).toBeInTheDocument();
            expect(input).toHaveValue('Original Title');
        });
    });

    describe('Validation (FR-007)', () => {
        it('blocks saving and shows an inline error when the title is empty', async () => {
            renderModal();
            const input = screen.getByLabelText('dashboard.boardCard.titleLabel');
            fireEvent.change(input, { target: { value: '   ' } });
            fireEvent.click(screen.getByText('common.save'));

            await waitFor(() => {
                expect(screen.getByText('dashboard.boardCard.titleRequired')).toBeInTheDocument();
            });
            expect(renameBoard).not.toHaveBeenCalled();
        });

        it('clears the inline error once the user starts typing again', async () => {
            renderModal();
            const input = screen.getByLabelText('dashboard.boardCard.titleLabel');
            fireEvent.change(input, { target: { value: '' } });
            fireEvent.click(screen.getByText('common.save'));
            await waitFor(() => {
                expect(screen.getByText('dashboard.boardCard.titleRequired')).toBeInTheDocument();
            });

            fireEvent.change(input, { target: { value: 'New title' } });
            expect(screen.queryByText('dashboard.boardCard.titleRequired')).not.toBeInTheDocument();
        });

        it('trims whitespace before saving', async () => {
            vi.mocked(renameBoard).mockResolvedValueOnce(undefined);
            renderModal();
            const input = screen.getByLabelText('dashboard.boardCard.titleLabel');
            fireEvent.change(input, { target: { value: '  Trimmed Title  ' } });
            fireEvent.click(screen.getByText('common.save'));

            await waitFor(() => {
                expect(renameBoard).toHaveBeenCalledWith('board-1', 'Trimmed Title');
            });
        });
    });

    describe('Save flow', () => {
        it('calls renameBoard, shows a success toast, calls onBoardUpdated, and closes on success', async () => {
            vi.mocked(renameBoard).mockResolvedValueOnce(undefined);
            renderModal();
            const input = screen.getByLabelText('dashboard.boardCard.titleLabel');
            fireEvent.change(input, { target: { value: 'Updated Title' } });
            fireEvent.click(screen.getByText('common.save'));

            await waitFor(() => {
                expect(renameBoard).toHaveBeenCalledWith('board-1', 'Updated Title');
                expect(toast.success).toHaveBeenCalledWith('dashboard.boardCard.editSuccess');
                expect(onBoardUpdated).toHaveBeenCalledWith('board-1', { title: 'Updated Title' });
                expect(onClose).toHaveBeenCalled();
            });
        });

        it('shows an error toast and does not close when the save fails', async () => {
            vi.mocked(renameBoard).mockRejectedValueOnce(new Error('rename failed'));
            renderModal();
            fireEvent.click(screen.getByText('common.save'));

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('rename failed');
            });
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('Cancel', () => {
        it('calls onClose when cancel is clicked', () => {
            renderModal();
            fireEvent.click(screen.getByText('common.cancel'));
            expect(onClose).toHaveBeenCalled();
        });
    });
});
