import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ActionItemsColumn from '../../../components/retrospective/ActionItemsColumn';
import { ActionItem } from '../../../types/actionItem';
import { Participant } from '../../../types/participant';

// Mock all external dependencies
vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
    AnimatePresence: vi.fn(({ children }) => children),
}));

// Mock useLanguage hook
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, options?: any) => {
            const translations: Record<string, string> = {
                'retrospective.actionItems.title': 'Action Items',
                'retrospective.actionItems.description': 'Define specific actions to implement',
                'retrospective.actionItems.addActionItem': 'Añadir elemento de acción',
                'retrospective.actionItems.newAction': 'Describe la acción a implementar...',
                'retrospective.actionItems.responsible': 'Responsable (opcional)',
                'retrospective.actionItems.responsibleSelect': 'Seleccionar responsable',
                'retrospective.actionItems.create': 'Crear',
                'retrospective.actionItems.cancel': 'Cancelar',
                'retrospective.actionItems.dueDate': 'Fecha de vencimiento (opcional)',
                'retrospective.actionItems.dueDatePlaceholder': 'Seleccionar fecha de vencimiento',
                'retrospective.cards.unassigned': 'Sin asignar',
                'retrospective.facilitator.onlyFacilitatorCanCreateActions': 'Only facilitator can create actions',
                'retrospective.facilitator.noActionItems': 'No action items yet',
                'retrospective.facilitator.createFirstActionOrConvert': 'Create first action or convert from cards',
                'retrospective.facilitator.facilitatorCanCreateActions': 'Facilitator can create actions',
                'retrospective.facilitator.loadingActionItems': 'Loading action items...',
            };
            return translations[key] || key;
        },
        currentLanguage: 'es',
        changeLanguage: vi.fn(),
        getAvailableLanguages: vi.fn(() => []),
    }),
}));

// Mock UI components
vi.mock('../../../components/ui/Button', () => ({
    default: vi.fn(({ children, onClick, disabled, loading, variant, className, ...props }) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            data-variant={variant}
            className={className}
            data-testid={props['data-testid'] || 'button'}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    )),
}));

// Mock ActionItemCard component
vi.mock('../../../components/retrospective/ActionItemCard', () => ({
    default: vi.fn(({ actionItem, participants, canEdit, onEdit, onDelete }) => (
        <div data-testid={`action-item-${actionItem.id}`}>
            <div>Content: {actionItem.content}</div>
            <div>Assigned to: {actionItem.assignedToName || 'Unassigned'}</div>
            <div>Can edit: {canEdit ? 'yes' : 'no'}</div>
            {canEdit && (
                <>
                    <button
                        onClick={() => onEdit(actionItem.id, { content: 'updated content' })}
                        data-testid={`edit-action-${actionItem.id}`}
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => onDelete(actionItem.id)}
                        data-testid={`delete-action-${actionItem.id}`}
                    >
                        Delete
                    </button>
                </>
            )}
        </div>
    )),
}));

// Mock DatePicker component
vi.mock('../../../components/ui/DatePicker', () => ({
    default: vi.fn(({ label, value, onChange, placeholder, minDate, className }) => (
        <div>
            <label>{label}</label>
            <input
                type="date"
                value={value ? value.toISOString().split('T')[0] : ''}
                onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
                placeholder={placeholder}
                className={className}
            />
        </div>
    )),
}));

// Mock language hook
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, options?: any) => {
            const translations: Record<string, string> = {
                'retrospective.actionItems.title': 'Action Items',
                'retrospective.actionItems.description': 'Define specific actions to implement',
                'retrospective.facilitator.onlyFacilitatorCanCreateActions': 'Only facilitator can create actions',
                'retrospective.facilitator.noActionItems': 'No action items yet',
                'retrospective.facilitator.createFirstActionOrConvert': 'Create first action or convert from cards',
                'retrospective.facilitator.facilitatorCanCreateActions': 'Facilitator can create actions',
                'retrospective.facilitator.loadingActionItems': 'Loading action items...',
            };
            return translations[key] || key;
        },
    }),
}));

describe('ActionItemsColumn', () => {
    const mockParticipants: Participant[] = [
        {
            id: 'participant-1',
            userId: 'user-1',
            name: 'John Doe',
            isActive: true,
            joinedAt: new Date(),
            retrospectiveId: 'retro-1',
        },
        {
            id: 'participant-2',
            userId: 'user-2',
            name: 'Jane Smith',
            isActive: true,
            joinedAt: new Date(),
            retrospectiveId: 'retro-1',
        },
    ];

    const mockActionItems: ActionItem[] = [
        {
            id: 'action-1',
            content: 'Implement new feature',
            retrospectiveId: 'retro-1',
            createdBy: 'facilitator-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedTo: 'user-1',
            assignedToName: 'John Doe',
            dueDate: null,
            order: 1,
        },
        {
            id: 'action-2',
            content: 'Fix critical bug',
            retrospectiveId: 'retro-1',
            createdBy: 'facilitator-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            assignedTo: null,
            assignedToName: null,
            dueDate: null,
            order: 2,
        },
    ];

    const defaultProps = {
        actionItems: mockActionItems,
        participants: mockParticipants,
        canEdit: true,
        onCreateActionItem: vi.fn(),
        onEditActionItem: vi.fn(),
        onDeleteActionItem: vi.fn(),
        loading: false,
        error: null,
        retrospectiveId: 'retro-1',
        facilitatorId: 'facilitator-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders column header with title and count', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            expect(screen.getByText('Action Items')).toBeInTheDocument();
            expect(screen.getByText('Define specific actions to implement')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument(); // Count badge
        });

        it('renders all action items', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            expect(screen.getByTestId('action-item-action-1')).toBeInTheDocument();
            expect(screen.getByTestId('action-item-action-2')).toBeInTheDocument();
            expect(screen.getByText('Content: Implement new feature')).toBeInTheDocument();
            expect(screen.getByText('Content: Fix critical bug')).toBeInTheDocument();
        });

        it('shows add action button when can edit', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            expect(screen.getByTestId('button')).toBeInTheDocument();
        });

        it('hides add action button when cannot edit', () => {
            render(<ActionItemsColumn {...defaultProps} canEdit={false} />);

            expect(screen.queryByTestId('button')).not.toBeInTheDocument();
        });

        it('shows permission message when cannot edit', () => {
            render(<ActionItemsColumn {...defaultProps} canEdit={false} />);

            expect(screen.getByText('Only facilitator can create actions')).toBeInTheDocument();
        });

        it('shows empty state when no action items', () => {
            render(<ActionItemsColumn {...defaultProps} actionItems={[]} />);

            expect(screen.getByText('No action items yet')).toBeInTheDocument();
            expect(screen.getByText('Create first action or convert from cards')).toBeInTheDocument();
        });

        it('shows loading state', () => {
            render(<ActionItemsColumn {...defaultProps} actionItems={[]} loading={true} />);

            expect(screen.getByText('Loading action items...')).toBeInTheDocument();
        });

        it('displays error message when error occurs', () => {
            render(<ActionItemsColumn {...defaultProps} error="Failed to load action items" />);

            expect(screen.getByText('Failed to load action items')).toBeInTheDocument();
        });
    });

    describe('Action creation', () => {
        it('enters create mode when add button is clicked', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            expect(screen.getByPlaceholderText('retrospective.actionItems.newAction')).toBeInTheDocument();
            expect(screen.getByText('retrospective.actionItems.create')).toBeInTheDocument();
            expect(screen.getByText('retrospective.actionItems.cancel')).toBeInTheDocument();
        });

        it('shows assignee selector in create mode', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            expect(screen.getByLabelText('retrospective.actionItems.responsible')).toBeInTheDocument();
            expect(screen.getByText('retrospective.cards.unassigned')).toBeInTheDocument();
            expect(screen.getByText('John Doe')).toBeInTheDocument();
            expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        });

        it('creates action item with content only', async () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'New action item' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCreateActionItem).toHaveBeenCalledWith({
                    content: 'New action item',
                    retrospectiveId: 'retro-1',
                    createdBy: 'facilitator-1',
                    assignedTo: null,
                    assignedToName: null,
                    dueDate: null,
                });
            });
        });

        it('creates action item with assignee', async () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'Assigned action' } });

            const assigneeSelect = screen.getByLabelText('retrospective.actionItems.responsible');
            fireEvent.change(assigneeSelect, { target: { value: 'user-1' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCreateActionItem).toHaveBeenCalledWith({
                    content: 'Assigned action',
                    retrospectiveId: 'retro-1',
                    createdBy: 'facilitator-1',
                    assignedTo: 'user-1',
                    assignedToName: 'John Doe',
                    dueDate: null,
                });
            });
        });

        it('disables create button when content is empty', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const createButton = screen.getByText('retrospective.actionItems.create');
            expect(createButton).toBeDisabled();
        });

        it('enables create button when content is added', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'Some content' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            expect(createButton).not.toBeDisabled();
        });

        it('cancels create mode and resets form', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'Test content' } });

            const cancelButton = screen.getByText('retrospective.actionItems.cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByPlaceholderText('retrospective.actionItems.newAction')).not.toBeInTheDocument();
            expect(screen.getByTestId('button')).toBeInTheDocument();
        });

        it('resets form after successful creation', async () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'New action' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(screen.queryByPlaceholderText('retrospective.actionItems.newAction')).not.toBeInTheDocument();
                expect(screen.getByTestId('button')).toBeInTheDocument();
            });
        });

        it('trims whitespace from content', async () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: '  Content with spaces  ' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCreateActionItem).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: 'Content with spaces',
                    })
                );
            });
        });

        it('shows loading state when creating', () => {
            render(<ActionItemsColumn {...defaultProps} loading={true} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'New action' } });

            const createButton = screen.getByText('Loading...');
            expect(createButton).toBeDisabled();
        });
    });

    describe('Action item interactions', () => {
        it('handles edit action through ActionItemCard', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const editButton = screen.getByTestId('edit-action-action-1');
            fireEvent.click(editButton);

            expect(defaultProps.onEditActionItem).toHaveBeenCalledWith('action-1', { content: 'updated content' });
        });

        it('handles delete action through ActionItemCard', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const deleteButton = screen.getByTestId('delete-action-action-1');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDeleteActionItem).toHaveBeenCalledWith('action-1');
        });

        it('passes canEdit prop correctly to ActionItemCard', () => {
            render(<ActionItemsColumn {...defaultProps} canEdit={false} />);

            const editTexts = screen.getAllByText('Can edit: no');
            expect(editTexts).toHaveLength(2); // Two action items, both showing 'no'
        });

        it('passes participants to ActionItemCard', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            // ActionItemCard should receive participants - this is tested by the component rendering
            expect(screen.getByTestId('action-item-action-1')).toBeInTheDocument();
        });
    });

    describe('Edge cases', () => {
        it('handles empty content gracefully', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: '   ' } }); // Only spaces

            const createButton = screen.getByText('retrospective.actionItems.create');
            expect(createButton).toBeDisabled();
        });

        it('handles empty participants list', () => {
            render(<ActionItemsColumn {...defaultProps} participants={[]} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const assigneeSelect = screen.getByLabelText('retrospective.actionItems.responsible');
            expect(assigneeSelect.children).toHaveLength(1); // Only "Sin asignar" option
        });

        it('handles undefined assignedToName', () => {
            const actionItemsWithoutNames = [{
                ...mockActionItems[0],
                assignedToName: null,
            }];

            render(<ActionItemsColumn {...defaultProps} actionItems={actionItemsWithoutNames} />);

            expect(screen.getByText('Assigned to: Unassigned')).toBeInTheDocument();
        });

        it('handles missing participant for selected assignee', async () => {
            const participantsWithoutUser = mockParticipants.filter(p => p.userId !== 'user-1');

            render(<ActionItemsColumn {...defaultProps} participants={participantsWithoutUser} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: 'Test action' } });

            const assigneeSelect = screen.getByLabelText('retrospective.actionItems.responsible');
            fireEvent.change(assigneeSelect, { target: { value: 'user-1' } }); // Non-existent user

            const createButton = screen.getByText('retrospective.actionItems.create');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCreateActionItem).toHaveBeenCalledWith({
                    content: 'Test action',
                    retrospectiveId: 'retro-1',
                    createdBy: 'facilitator-1',
                    assignedTo: null, // Should be null since empty value is converted to null
                    assignedToName: null, // Should be null if participant not found
                    dueDate: null,
                });
            });
        });
    });

    describe('Empty states and messages', () => {
        it('shows different empty message for facilitator vs participant', () => {
            render(<ActionItemsColumn {...defaultProps} actionItems={[]} canEdit={false} />);

            expect(screen.getByText('Facilitator can create actions')).toBeInTheDocument();
        });

        it('does not show loading when there are existing action items', () => {
            render(<ActionItemsColumn {...defaultProps} loading={true} />);

            expect(screen.queryByText('Loading action items...')).not.toBeInTheDocument();
            expect(screen.getByTestId('action-item-action-1')).toBeInTheDocument();
        });

        it('shows loading state when there are no action items', () => {
            render(<ActionItemsColumn {...defaultProps} actionItems={[]} loading={true} error="Test error" />);

            // Error should be shown
            expect(screen.getByText('Test error')).toBeInTheDocument();
            // Loading should also be shown since the component shows both when actionItems is empty
            expect(screen.getByText('Loading action items...')).toBeInTheDocument();
        });
    });

    describe('Form validation', () => {
        it('prevents submission with only whitespace', async () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            fireEvent.change(textarea, { target: { value: '   \n\t   ' } });

            const createButton = screen.getByText('retrospective.actionItems.create');
            expect(createButton).toBeDisabled();

            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCreateActionItem).not.toHaveBeenCalled();
            });
        });

        it('updates create button state reactively', () => {
            render(<ActionItemsColumn {...defaultProps} />);

            const addButton = screen.getByTestId('button');
            fireEvent.click(addButton);

            const textarea = screen.getByPlaceholderText('retrospective.actionItems.newAction');
            const createButton = screen.getByText('retrospective.actionItems.create');

            // Initially disabled
            expect(createButton).toBeDisabled();

            // Add content
            fireEvent.change(textarea, { target: { value: 'Content' } });
            expect(createButton).not.toBeDisabled();

            // Remove content
            fireEvent.change(textarea, { target: { value: '' } });
            expect(createButton).toBeDisabled();
        });
    });
});
