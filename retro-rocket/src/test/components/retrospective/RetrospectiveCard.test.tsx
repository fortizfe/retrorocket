import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RetrospectiveCard from '../../../components/retrospective/RetrospectiveCard';
import { Card as CardType } from '../../../types/card';
import { Participant } from '../../../types/participant';

// Mock motion components
vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
    AnimatePresence: vi.fn(({ children }) => children),
}));

// Mock UI components
vi.mock('../../../components/ui/Card', () => ({
    default: vi.fn(({ children, className, ...props }) => (
        <div className={className} {...props}>{children}</div>
    )),
}));

vi.mock('../../../components/ui/Button', () => ({
    default: vi.fn(({ children, onClick, disabled, loading, className, ...props }) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={className}
            data-testid={props['aria-label'] ? `button-${props['aria-label'].replace(/\s+/g, '-').toLowerCase()}` : undefined}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    )),
}));

vi.mock('../../../components/ui/TextareaWithEmoji', () => ({
    default: vi.fn(({ value, onChange, placeholder, autoFocus, ...props }) => (
        <textarea
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            data-testid="textarea-with-emoji"
            {...props}
        />
    )),
}));

vi.mock('../../../components/ui/LinkifyText', () => ({
    default: vi.fn(({ text, className }) => (
        <div className={className} data-testid="linkify-text">{text}</div>
    )),
}));

vi.mock('../../../components/retrospective/CardMenu', () => ({
    default: vi.fn(({ card, canConvertToAction, onConvertToAction, participants }) => (
        <div data-testid="card-menu">
            {canConvertToAction && onConvertToAction && (
                <button onClick={() => onConvertToAction('Test Action')}>
                    Convert to Action
                </button>
            )}
        </div>
    )),
}));

describe('RetrospectiveCard', () => {
    const mockCard: CardType = {
        id: 'card-1',
        content: 'Test card content',
        column: 'helped',
        retrospectiveId: 'retro-1',
        createdBy: 'user-1',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        updatedAt: new Date('2024-01-01T10:00:00Z'),
        votes: 5,
        order: 1,
    };

    const mockParticipants: Participant[] = [
        {
            id: 'participant-1',
            name: 'John Doe',
            userId: 'user-1',
            retrospectiveId: 'retro-1',
            joinedAt: new Date(),
            isActive: true,
        },
    ];

    const defaultProps = {
        card: mockCard,
        onDelete: vi.fn(),
        onUpdate: vi.fn(),
        onVote: vi.fn(),
        currentUser: 'user-1',
        canEdit: true,
        participants: mockParticipants,
        canConvertToAction: false,
        onConvertToAction: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders card with basic content', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            expect(screen.getByTestId('linkify-text')).toHaveTextContent('Test card content');
            expect(screen.getByText('user-1')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument(); // votes
        });

        it('displays formatted creation date', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Should display formatted date in Spanish locale
            expect(screen.getByText(/1 ene/)).toBeInTheDocument();
        });

        it('shows card menu when canConvertToAction is true', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    canConvertToAction={true}
                />
            );

            expect(screen.getByTestId('card-menu')).toBeInTheDocument();
        });

        it('hides card menu when canConvertToAction is false', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            expect(screen.queryByTestId('card-menu')).not.toBeInTheDocument();
        });
    });

    describe('Voting functionality', () => {
        it('calls onVote with increment=true when vote up button is clicked', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const voteUpButton = screen.getByLabelText('Vote up');
            fireEvent.click(voteUpButton);

            expect(defaultProps.onVote).toHaveBeenCalledWith('card-1', true);
        });

        it('calls onVote with increment=false when vote down button is clicked', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const voteDownButton = screen.getByLabelText('Vote down');
            fireEvent.click(voteDownButton);

            expect(defaultProps.onVote).toHaveBeenCalledWith('card-1', false);
        });

        it('disables vote down button when votes is 0', () => {
            const cardWithNoVotes = { ...mockCard, votes: 0 };
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    card={cardWithNoVotes}
                />
            );

            const voteDownButton = screen.getByLabelText('Vote down');
            expect(voteDownButton).toBeDisabled();
        });

        it('displays correct vote count', () => {
            const cardWithVotes = { ...mockCard, votes: 10 };
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    card={cardWithVotes}
                />
            );

            expect(screen.getByText('10')).toBeInTheDocument();
        });
    });

    describe('Edit functionality', () => {
        it('shows edit and delete buttons for card owner', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            expect(screen.getByTestId('button-edit-card')).toBeInTheDocument();
            expect(screen.getByTestId('button-delete-card')).toBeInTheDocument();
        });

        it('hides edit and delete buttons for non-owner', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    currentUser="different-user"
                />
            );

            expect(screen.queryByTestId('button-edit-card')).not.toBeInTheDocument();
            expect(screen.queryByTestId('button-delete-card')).not.toBeInTheDocument();
        });

        it('hides edit and delete buttons when canEdit is false', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    canEdit={false}
                />
            );

            expect(screen.queryByTestId('button-edit-card')).not.toBeInTheDocument();
            expect(screen.queryByTestId('button-delete-card')).not.toBeInTheDocument();
        });

        it('enters edit mode when edit button is clicked', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            expect(screen.getByText('Guardar')).toBeInTheDocument();
            expect(screen.getByText('Cancelar')).toBeInTheDocument();
        });

        it('exits edit mode when cancel button is clicked', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            // Cancel edit
            const cancelButton = screen.getByText('Cancelar');
            fireEvent.click(cancelButton);

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
        });

        it('saves changes when save button is clicked with modified content', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            // Modify content
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Updated content' } });

            // Save changes
            const saveButton = screen.getByText('Guardar');
            fireEvent.click(saveButton);

            expect(defaultProps.onUpdate).toHaveBeenCalledWith('card-1', {
                content: 'Updated content'
            });
        });

        it('does not save when content is unchanged', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            // Save without changes
            const saveButton = screen.getByText('Guardar');
            fireEvent.click(saveButton);

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });

        it('disables save button when content is empty', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            // Clear content
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '' } });

            const saveButton = screen.getByText('Guardar');
            expect(saveButton).toBeDisabled();
        });
    });

    describe('Delete functionality', () => {
        it('calls onDelete when delete button is clicked', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const deleteButton = screen.getByTestId('button-delete-card');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDelete).toHaveBeenCalledWith('card-1');
        });

        it('shows loading state when deleting', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const deleteButton = screen.getByTestId('button-delete-card');
            fireEvent.click(deleteButton);

            // The button should show loading text
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Convert to action functionality', () => {
        it('shows convert option when canConvertToAction is true', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    canConvertToAction={true}
                />
            );

            expect(screen.getByText('Convert to Action')).toBeInTheDocument();
        });

        it('calls onConvertToAction when convert button is clicked', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    canConvertToAction={true}
                />
            );

            const convertButton = screen.getByText('Convert to Action');
            fireEvent.click(convertButton);

            expect(defaultProps.onConvertToAction).toHaveBeenCalledWith('Test Action');
        });
    });

    describe('Edge cases', () => {
        it('handles card without votes', () => {
            const cardWithoutVotes = { ...mockCard, votes: undefined };
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    card={cardWithoutVotes}
                />
            );

            expect(screen.getByText('0')).toBeInTheDocument();
        });

        it('handles card without creation date', () => {
            const cardWithoutDate = { ...mockCard, createdAt: null as any };
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    card={cardWithoutDate}
                />
            );

            // Should not crash and should render the card
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
        });

        it('handles undefined currentUser', () => {
            render(
                <RetrospectiveCard
                    {...defaultProps}
                    currentUser={undefined}
                />
            );

            // Should not show edit/delete buttons
            expect(screen.queryByTestId('button-edit-card')).not.toBeInTheDocument();
            expect(screen.queryByTestId('button-delete-card')).not.toBeInTheDocument();
        });

        it('trims whitespace when saving edited content', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            // Modify content with whitespace
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '  Updated content  ' } });

            // Save changes
            const saveButton = screen.getByText('Guardar');
            fireEvent.click(saveButton);

            expect(defaultProps.onUpdate).toHaveBeenCalledWith('card-1', {
                content: 'Updated content'
            });
        });
    });

    describe('Accessibility', () => {
        it('has proper aria-labels for vote buttons', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            expect(screen.getByLabelText('Vote up')).toBeInTheDocument();
            expect(screen.getByLabelText('Vote down')).toBeInTheDocument();
        });

        it('has proper aria-labels for edit and delete buttons', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            expect(screen.getByLabelText('Edit card')).toBeInTheDocument();
            expect(screen.getByLabelText('Delete card')).toBeInTheDocument();
        });

        it('shows textarea when entering edit mode', () => {
            render(<RetrospectiveCard {...defaultProps} />);

            const editButton = screen.getByTestId('button-edit-card');
            fireEvent.click(editButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            expect(textarea).toBeInTheDocument();
            expect(textarea).toHaveValue('Test card content');
        });
    });
});
