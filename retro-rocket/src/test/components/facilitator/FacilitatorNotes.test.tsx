import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FacilitatorNotes } from '../../../components/facilitator/FacilitatorNotes';

// Mock the Button component
vi.mock('../../../components/ui/Button', () => ({
    default: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>
            {children}
        </button>
    )
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
    StickyNote: () => <div data-testid="sticky-note-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    X: () => <div data-testid="x-icon" />,
    Edit2: () => <div data-testid="edit-icon" />,
    Check: () => <div data-testid="check-icon" />,
    AlertCircle: () => <div data-testid="alert-icon" />,
    Trash2: () => <div data-testid="trash-icon" />
}));

// Mock the useLanguage hook
vi.mock('../../../hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => {
            const translations: { [key: string]: string } = {
                'retrospective.facilitator.notes.title': 'Facilitator Notes',
                'retrospective.facilitator.notes.placeholder': 'Add a new note...',
                'retrospective.facilitator.notes.editPlaceholder': 'Edit note...',
                'retrospective.facilitator.notes.save': 'Save',
                'retrospective.facilitator.notes.cancel': 'Cancel',
                'retrospective.facilitator.notes.add': 'Add Note',
                'retrospective.facilitator.notes.edit': 'Edit',
                'retrospective.facilitator.notes.editTitle': 'Edit Note',
                'retrospective.facilitator.notes.delete': 'Delete',
                'retrospective.facilitator.notes.deleteTitle': 'Delete Note',
                'retrospective.facilitator.notes.deleteConfirm': 'Are you sure you want to delete this note?',
                'retrospective.facilitator.notes.close': 'Close',
                'retrospective.facilitator.notes.noNotes': 'No notes yet',
                'retrospective.facilitator.notes.noNotesSubtitle': 'Add your first note to get started',
                'retrospective.facilitator.notes.loading': 'Loading notes...'
            };
            return translations[key] || key;
        }
    })
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>
    },
    AnimatePresence: ({ children }: any) => <>{children}</>
}));

// Mock the useFacilitatorNotes hook
const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockClearError = vi.fn();

vi.mock('../../../hooks/useFacilitatorNotes', () => ({
    useFacilitatorNotes: () => ({
        notes: [
            {
                id: 'note-1',
                content: 'First test note',
                timestamp: new Date('2024-01-01T10:00:00Z'),
                facilitatorId: 'facilitator-1',
                retrospectiveId: 'retro-1'
            },
            {
                id: 'note-2',
                content: 'Second test note with more content',
                timestamp: new Date('2024-01-01T11:00:00Z'),
                facilitatorId: 'facilitator-1',
                retrospectiveId: 'retro-1'
            }
        ],
        loading: false,
        error: null,
        createNote: mockCreateNote,
        updateNote: mockUpdateNote,
        deleteNote: mockDeleteNote,
        clearError: mockClearError
    })
}));

// Mock window.confirm
const mockConfirm = vi.fn(() => true);
Object.defineProperty(window, 'confirm', { value: mockConfirm });

describe('FacilitatorNotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConfirm.mockReturnValue(true);
    });

    describe('Component Rendering', () => {
        it('renders the component title correctly', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);
            expect(screen.getByText('Facilitator Notes')).toBeInTheDocument();
        });

        it('renders the "Add Note" button when not creating', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);
            expect(screen.getByText('Add Note')).toBeInTheDocument();
        });

        it('renders existing notes', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);
            expect(screen.getByText('First test note')).toBeInTheDocument();
            expect(screen.getByText('Second test note with more content')).toBeInTheDocument();
        });
    });

    describe('Create Note Functionality', () => {
        it('shows create form when Add Note button is clicked', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const addButton = screen.getByText('Add Note');
            fireEvent.click(addButton);

            await waitFor(() => {
                expect(screen.getByPlaceholderText('Add a new note...')).toBeInTheDocument();
            });
        });

        it('hides Add Note button when creating', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            fireEvent.click(screen.getByText('Add Note'));

            await waitFor(() => {
                expect(screen.queryByText('Add Note')).not.toBeInTheDocument();
            });
        });

        it('allows typing in the create textarea', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            fireEvent.click(screen.getByText('Add Note'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Add a new note...');
                fireEvent.change(textarea, { target: { value: 'New note content' } });
                expect(textarea).toHaveValue('New note content');
            });
        });

        it('calls createNote when Save is clicked', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            fireEvent.click(screen.getByText('Add Note'));

            await waitFor(() => {
                const textarea = screen.getByPlaceholderText('Add a new note...');
                fireEvent.change(textarea, { target: { value: 'New note content' } });

                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                expect(mockCreateNote).toHaveBeenCalledWith('New note content');
            });
        });

        it('cancels creation when Cancel is clicked', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            fireEvent.click(screen.getByText('Add Note'));

            await waitFor(() => {
                const cancelButton = screen.getByRole('button', { name: /cancel/i });
                fireEvent.click(cancelButton);

                expect(screen.getByText('Add Note')).toBeInTheDocument();
                expect(screen.queryByPlaceholderText('Add a new note...')).not.toBeInTheDocument();
            });
        });
    });

    describe('Edit Note Functionality', () => {
        it('renders Edit buttons for each note', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);
            const editButtons = screen.getAllByText('Edit');
            expect(editButtons).toHaveLength(2); // Two test notes
        });

        it('enters edit mode when Edit button is clicked', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                expect(screen.getByDisplayValue('First test note')).toBeInTheDocument();
            });
        });

        it('calls updateNote when Save is clicked during edit', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const editButtons = screen.getAllByText('Edit');
            fireEvent.click(editButtons[0]);

            await waitFor(() => {
                const textarea = screen.getByDisplayValue('First test note');
                fireEvent.change(textarea, { target: { value: 'Updated content' } });

                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                expect(mockUpdateNote).toHaveBeenCalledWith('note-1', 'Updated content');
            });
        });
    });

    describe('Delete Note Functionality', () => {
        it('renders Delete buttons for each note', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);
            const deleteButtons = screen.getAllByText('Delete');
            expect(deleteButtons).toHaveLength(2); // Two test notes
        });

        it('shows confirmation dialog when Delete is clicked', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this note?');
        });

        it('calls deleteNote when confirmed', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(mockDeleteNote).toHaveBeenCalledWith('note-1');
        });

        it('does not call deleteNote when cancelled', async () => {
            mockConfirm.mockReturnValue(false);

            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(mockDeleteNote).not.toHaveBeenCalled();
        });
    });

    describe('Validation', () => {
        it('does not call createNote with empty content', async () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            fireEvent.click(screen.getByText('Add Note'));

            await waitFor(() => {
                const saveButton = screen.getByRole('button', { name: /save/i });
                fireEvent.click(saveButton);

                expect(mockCreateNote).not.toHaveBeenCalled();
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper button types', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const editButtons = screen.getAllByRole('button', { name: /edit/i });
            const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

            editButtons.forEach(button => {
                expect(button).toHaveAttribute('type', 'button');
            });

            deleteButtons.forEach(button => {
                expect(button).toHaveAttribute('type', 'button');
            });
        });

        it('has proper titles for action buttons', () => {
            render(<FacilitatorNotes retrospectiveId="retro-1" facilitatorId="facilitator-1" />);

            const editButtons = screen.getAllByTitle('Edit Note');
            const deleteButtons = screen.getAllByTitle('Delete Note');

            expect(editButtons).toHaveLength(2);
            expect(deleteButtons).toHaveLength(2);
        });
    });
});
