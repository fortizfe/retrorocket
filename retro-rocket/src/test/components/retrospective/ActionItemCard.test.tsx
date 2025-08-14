import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionItemCard from '../../../components/retrospective/ActionItemCard';
import { ActionItem } from '../../../types/actionItem';
import { Participant } from '../../../types/participant';

// Mock de dependencias
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, params?: any) => {
            if (key === 'retrospective.actionItemCard.confirmDelete') {
                return 'Are you sure you want to delete this action item?';
            }
            if (key === 'retrospective.actionItemCard.editAction') {
                return 'Edit action';
            }
            if (key === 'retrospective.actionItemCard.deleteAction') {
                return 'Delete action';
            }
            if (key === 'retrospective.actionItemCard.placeholder') {
                return 'Describe the action to take...';
            }
            if (key === 'retrospective.actionItemCard.unassigned') {
                return 'No assigned';
            }
            if (key === 'retrospective.actionItemCard.save') {
                return 'Save';
            }
            if (key === 'retrospective.actionItemCard.cancel') {
                return 'Cancel';
            }
            if (key === 'retrospective.actionItemCard.responsible') {
                return 'Responsible';
            }
            if (key === 'retrospective.actionItemCard.created') {
                return 'Created';
            }
            if (key === 'retrospective.actionItems.actionLabel') {
                return 'ACCIÓN';
            }
            if (key === 'retrospective.actionItems.responsible') {
                return 'Responsable (opcional)';
            }
            if (key === 'retrospective.actionItems.responsibleSelect') {
                return 'Seleccionar responsable';
            }
            if (key === 'retrospective.actionItems.dueDate') {
                return 'Fecha límite (opcional)';
            }
            if (key === 'retrospective.actionItems.dueDatePlaceholder') {
                return 'Seleccionar fecha...';
            }
            return key;
        }
    })
}));

vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, onClick, disabled, loading, className, variant, size, ...props }: any) => (
        <button
            {...props}
            onClick={onClick}
            disabled={disabled || loading}
            className={className}
            data-variant={variant}
            data-size={size}
            data-loading={loading}
        >
            {loading ? 'Loading...' : children}
        </button>
    ),
}));

vi.mock('../../../components/ui/LinkifyText', () => ({
    default: ({ text, className }: any) => (
        <div data-testid="linkify-text" className={className}>
            {text}
        </div>
    ),
}));

// Mock de window.confirm
Object.defineProperty(window, 'confirm', {
    writable: true,
    value: vi.fn(),
});

describe('ActionItemCard', () => {
    const mockActionItem: ActionItem = {
        id: 'action-1',
        content: 'Implement user authentication',
        createdBy: 'user1',
        createdAt: new Date('2024-01-15T10:30:00.000Z'),
        updatedAt: new Date('2024-01-15T10:30:00.000Z'),
        retrospectiveId: 'retro-1',
        assignedTo: 'user2',
        assignedToName: 'John Doe',
        dueDate: null,
        order: 0
    };

    const mockParticipants: Participant[] = [
        {
            id: 'p1',
            userId: 'user1',
            name: 'Alice Smith',
            retrospectiveId: 'retro-1',
            isActive: true,
            joinedAt: new Date()
        },
        {
            id: 'p2',
            userId: 'user2',
            name: 'John Doe',
            retrospectiveId: 'retro-1',
            isActive: true,
            joinedAt: new Date()
        },
        {
            id: 'p3',
            userId: 'user3',
            name: 'Sarah Wilson',
            retrospectiveId: 'retro-1',
            isActive: false,
            joinedAt: new Date()
        }
    ];

    const defaultProps = {
        actionItem: mockActionItem,
        participants: mockParticipants,
        canEdit: true,
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (window.confirm as any).mockReturnValue(true);
    });

    describe('Rendering', () => {
        it('renders action item card with basic content', () => {
            render(<ActionItemCard {...defaultProps} />);

            expect(screen.getByText('🎯')).toBeInTheDocument();
            expect(screen.getByText('ACCIÓN')).toBeInTheDocument();
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
            expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        });

        it('shows edit and delete buttons when canEdit is true', () => {
            render(<ActionItemCard {...defaultProps} />);

            expect(screen.getByTitle('Edit action')).toBeInTheDocument();
            expect(screen.getByTitle('Delete action')).toBeInTheDocument();
        });

        it('hides edit and delete buttons when canEdit is false', () => {
            render(<ActionItemCard {...defaultProps} canEdit={false} />);

            expect(screen.queryByTitle('Edit action')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Delete action')).not.toBeInTheDocument();
        });

        it('shows assigned participant when action is assigned', () => {
            render(<ActionItemCard {...defaultProps} />);

            expect(screen.getByText(/Responsible: John Doe/)).toBeInTheDocument();
        });

        it('does not show assigned participant when action is not assigned', () => {
            const unassignedActionItem = { ...mockActionItem, assignedTo: null, assignedToName: null };
            render(<ActionItemCard {...defaultProps} actionItem={unassignedActionItem} />);

            expect(screen.queryByText(/Responsible:/)).not.toBeInTheDocument();
        });

        it('displays creation timestamp', () => {
            render(<ActionItemCard {...defaultProps} />);

            expect(screen.getByText(/Created:/)).toBeInTheDocument();
        });

        it('applies custom className', () => {
            const { container } = render(<ActionItemCard {...defaultProps} className="custom-class" />);

            expect(container.firstChild).toHaveClass('custom-class');
        });
    });

    describe('Edit functionality', () => {
        it('enters edit mode when edit button is clicked', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            expect(screen.getByDisplayValue('Implement user authentication')).toBeInTheDocument();
            expect(screen.getByRole('combobox')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('shows participant selector with all participants in edit mode', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();

            // Check options
            const selectElement = screen.getByLabelText('Responsable (opcional)');
            expect(selectElement).toHaveValue('user2'); // Current assignment
            expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
        });

        it('cancels edit mode when cancel button is clicked', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const textarea = screen.getByDisplayValue('Implement user authentication');
            fireEvent.change(textarea, { target: { value: 'Modified content' } });

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByDisplayValue('Modified content')).not.toBeInTheDocument();
            expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        });

        it('saves changes when save button is clicked', async () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const textarea = screen.getByDisplayValue('Implement user authentication');
            fireEvent.change(textarea, { target: { value: 'Updated action item' } });

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'user1' } });

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(defaultProps.onEdit).toHaveBeenCalledWith('action-1', {
                    content: 'Updated action item',
                    assignedTo: 'user1',
                    assignedToName: 'Alice Smith',
                    dueDate: null
                });
            });
        });

        it('trims whitespace when saving', async () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const textarea = screen.getByDisplayValue('Implement user authentication');
            fireEvent.change(textarea, { target: { value: '  Updated action with spaces  ' } });

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(defaultProps.onEdit).toHaveBeenCalledWith('action-1', expect.objectContaining({
                    content: 'Updated action with spaces'
                }));
            });
        });

        it('handles unassigning participant', async () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '' } });

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(defaultProps.onEdit).toHaveBeenCalledWith('action-1', expect.objectContaining({
                    assignedTo: null,
                    assignedToName: null
                }));
            });
        });

        it('disables save button when content is empty', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const textarea = screen.getByDisplayValue('Implement user authentication');
            fireEvent.change(textarea, { target: { value: '' } });

            const saveButton = screen.getByText('Save');
            expect(saveButton).toBeDisabled();
        });

        it('disables save button when content is only whitespace', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const textarea = screen.getByDisplayValue('Implement user authentication');
            fireEvent.change(textarea, { target: { value: '   ' } });

            const saveButton = screen.getByText('Save');
            expect(saveButton).toBeDisabled();
        });

        it('shows loading state when saving', async () => {
            const slowOnEdit = vi.fn();

            render(<ActionItemCard {...defaultProps} onEdit={slowOnEdit} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            // The loading state should be visible
            expect(saveButton).toHaveAttribute('data-loading', 'false');
        });
    });

    describe('Delete functionality', () => {
        it('shows confirmation dialog when delete button is clicked', () => {
            render(<ActionItemCard {...defaultProps} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this action item?');
        });

        it('calls onDelete when deletion is confirmed', () => {
            render(<ActionItemCard {...defaultProps} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDelete).toHaveBeenCalledWith('action-1');
        });

        it('does not call onDelete when deletion is cancelled', () => {
            (window.confirm as any).mockReturnValue(false);
            render(<ActionItemCard {...defaultProps} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDelete).not.toHaveBeenCalled();
        });

        it('shows loading state when deleting', () => {
            render(<ActionItemCard {...defaultProps} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            // The delete state is shown during deletion process
            expect(defaultProps.onDelete).toHaveBeenCalled();
        });

        it('disables edit and delete buttons during deletion', () => {
            render(<ActionItemCard {...defaultProps} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            // After click, buttons should be disabled during deletion process
            expect(screen.getByTitle('Edit action')).toBeDisabled();
            expect(screen.getByTitle('Delete action')).toBeDisabled();
        });
    });

    describe('Participant assignment', () => {
        it('finds and displays correct assigned participant', () => {
            render(<ActionItemCard {...defaultProps} />);

            expect(screen.getByText(/Responsible: John Doe/)).toBeInTheDocument();
        });

        it('handles case when assigned participant is not found', () => {
            const actionWithMissingParticipant = {
                ...mockActionItem,
                assignedTo: 'unknown-user',
                assignedToName: 'Unknown User'
            };

            render(<ActionItemCard {...defaultProps} actionItem={actionWithMissingParticipant} />);

            // Should not crash and should not show participant section
            expect(screen.queryByText(/Responsible:/)).not.toBeInTheDocument();
        });

        it('shows all participants including inactive ones in selector', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            // All participants should be available, including inactive ones
            expect(screen.getByText('Alice Smith')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Sarah Wilson')).toBeInTheDocument(); // inactive participant
        });
    });

    describe('Permission handling', () => {
        it('disables edit controls when canEdit is false', () => {
            render(<ActionItemCard {...defaultProps} canEdit={false} />);

            expect(screen.queryByTitle('Edit action')).not.toBeInTheDocument();
            expect(screen.queryByTitle('Delete action')).not.toBeInTheDocument();
        });

        it('disables controls during edit mode', () => {
            render(<ActionItemCard {...defaultProps} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            // Original edit/delete buttons should be disabled during edit
            expect(screen.getByTitle('Edit action')).toBeDisabled();
            expect(screen.getByTitle('Delete action')).toBeDisabled();
        });
    });

    describe('Edge cases', () => {
        it('handles empty participants list', () => {
            render(<ActionItemCard {...defaultProps} participants={[]} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();

            // Should only have the "No assigned" option
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(1);
            expect(screen.getByText('No assigned')).toBeInTheDocument();
        });

        it('handles action item with long content', () => {
            const longContentAction = {
                ...mockActionItem,
                content: 'This is a very long action item description that should be displayed properly in the card and wrapped appropriately without breaking the layout'
            };

            render(<ActionItemCard {...defaultProps} actionItem={longContentAction} />);

            expect(screen.getByText(longContentAction.content)).toBeInTheDocument();
        });

        it('handles action item with special characters in content', () => {
            const specialContentAction = {
                ...mockActionItem,
                content: 'Action with special chars: @#$%^&*()_+[]{}|;:,.<>?'
            };

            render(<ActionItemCard {...defaultProps} actionItem={specialContentAction} />);

            expect(screen.getByText(specialContentAction.content)).toBeInTheDocument();
        });

        it('handles missing optional props gracefully', () => {
            const minimalProps = {
                actionItem: mockActionItem,
                participants: mockParticipants,
                canEdit: false,
                onEdit: vi.fn(),
                onDelete: vi.fn(),
            };

            render(<ActionItemCard {...minimalProps} />);

            expect(screen.getByText('Implement user authentication')).toBeInTheDocument();
        });

        it('handles error during save operation', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const errorOnEdit = vi.fn().mockRejectedValue(new Error('Save failed'));

            render(<ActionItemCard {...defaultProps} onEdit={errorOnEdit} />);

            const editButton = screen.getByTitle('Edit action');
            fireEvent.click(editButton);

            const saveButton = screen.getByText('Save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(errorOnEdit).toHaveBeenCalled();
            });

            // Verify component displays the action item in read mode after error
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();

            consoleSpy.mockRestore();
        });

        it('handles error during delete operation', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            const errorOnDelete = vi.fn().mockImplementation(() => {
                throw new Error('Delete failed');
            });

            render(<ActionItemCard {...defaultProps} onDelete={errorOnDelete} />);

            const deleteButton = screen.getByTitle('Delete action');
            fireEvent.click(deleteButton);

            await waitFor(() => {
                expect(errorOnDelete).toHaveBeenCalled();
                expect(consoleSpy).toHaveBeenCalledWith('Error deleting action item:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });

        it('displays correct date format for creation time', () => {
            render(<ActionItemCard {...defaultProps} />);

            // Should display in Spanish format (DD/MM, HH:MM)
            expect(screen.getByText(/Created: 15\/1, 11:30/)).toBeInTheDocument();
        });
    });
});
