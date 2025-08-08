import { screen, fireEvent } from '@testing-library/react';
import RetrospectiveCard from './RetrospectiveCard';
import { render, createMockCard, createMockParticipant } from '../../test/utils/test-utils';

// Mock child components
jest.mock('../ui/Card', () => {
    return function Card({ children, className, ...props }: any) {
        return <div className={className} {...props}>{children}</div>;
    };
});

jest.mock('../ui/Button', () => {
    return function Button({ children, onClick, loading, disabled, ...props }: any) {
        return (
            <button
                onClick={onClick}
                disabled={disabled || loading}
                data-loading={loading}
                {...props}
            >
                {loading ? 'Loading...' : children}
            </button>
        );
    };
});

jest.mock('../ui/TextareaWithEmoji', () => {
    return function TextareaWithEmoji({ value, onChange, ...props }: any) {
        return (
            <textarea
                value={value}
                onChange={onChange}
                data-testid="textarea-with-emoji"
                {...props}
            />
        );
    };
});

jest.mock('../ui/LinkifyText', () => {
    return function LinkifyText({ text, className }: any) {
        return <div className={className} data-testid="linkify-text">{text}</div>;
    };
});

jest.mock('./CardMenu', () => {
    return function CardMenu({ card, onConvertToAction, canConvertToAction }: any) {
        if (!canConvertToAction) return null;
        return (
            <button
                onClick={() => onConvertToAction?.(card.content, 'test-user', 'Test User')}
                data-testid="card-menu"
            >
                Convert to Action
            </button>
        );
    };
});

describe('RetrospectiveCard', () => {
    const mockCard = createMockCard({
        id: 'test-card-1',
        content: 'Test card content',
        createdBy: 'test-user-id',
        votes: 5,
        createdAt: new Date('2023-01-01T10:00:00Z'),
    });

    const defaultProps = {
        card: mockCard,
        onDelete: jest.fn(),
        onUpdate: jest.fn(),
        onVote: jest.fn(),
        currentUser: 'test-user-id',
        canEdit: true,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render card content and basic information', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        expect(screen.getByTestId('linkify-text')).toHaveTextContent('Test card content');
        expect(screen.getByText('test-user-id')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument(); // votes
    });

    it('should show formatted creation date', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Check that some date is displayed (format may vary based on locale)
        expect(screen.getByText(/1 ene/)).toBeInTheDocument();
    });

    it('should allow voting up', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        const voteUpButton = screen.getByLabelText('Vote up');
        fireEvent.click(voteUpButton);

        expect(defaultProps.onVote).toHaveBeenCalledWith('test-card-1', true);
    });

    it('should allow voting down when card has votes', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        const voteDownButton = screen.getByLabelText('Vote down');
        fireEvent.click(voteDownButton);

        expect(defaultProps.onVote).toHaveBeenCalledWith('test-card-1', false);
    });

    it('should disable vote down when card has no votes', () => {
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

    it('should show edit and delete buttons for card owner', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        expect(screen.getByLabelText('Edit card')).toBeInTheDocument();
        expect(screen.getByLabelText('Delete card')).toBeInTheDocument();
    });

    it('should not show edit and delete buttons for non-owner', () => {
        render(
            <RetrospectiveCard
                {...defaultProps}
                currentUser="different-user-id"
            />
        );

        expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete card')).not.toBeInTheDocument();
    });

    it('should not show edit buttons when canEdit is false', () => {
        render(
            <RetrospectiveCard
                {...defaultProps}
                canEdit={false}
            />
        );

        expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Delete card')).not.toBeInTheDocument();
    });

    it('should enter edit mode when clicking edit button', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should save changes when clicking save button', async () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        // Change content
        const textarea = screen.getByTestId('textarea-with-emoji');
        fireEvent.change(textarea, { target: { value: 'Updated content' } });

        // Save changes
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        fireEvent.click(saveButton);

        expect(defaultProps.onUpdate).toHaveBeenCalledWith('test-card-1', {
            content: 'Updated content'
        });
    });

    it('should not save when content is unchanged', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        // Save without changes
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        fireEvent.click(saveButton);

        expect(defaultProps.onUpdate).not.toHaveBeenCalled();
    });

    it('should cancel edit mode when clicking cancel button', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        // Change content
        const textarea = screen.getByTestId('textarea-with-emoji');
        fireEvent.change(textarea, { target: { value: 'Changed but cancelled' } });

        // Cancel changes
        const cancelButton = screen.getByRole('button', { name: /cancelar/i });
        fireEvent.click(cancelButton);

        // Should not be in edit mode anymore
        expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
        expect(screen.getByTestId('linkify-text')).toHaveTextContent('Test card content');
    });

    it('should delete card when clicking delete button', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        const deleteButton = screen.getByLabelText('Delete card');
        fireEvent.click(deleteButton);

        expect(defaultProps.onDelete).toHaveBeenCalledWith('test-card-1');
    });

    it('should show loading state on delete button when deleting', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        const deleteButton = screen.getByLabelText('Delete card');
        fireEvent.click(deleteButton);

        expect(deleteButton).toHaveAttribute('data-loading', 'true');
    });

    it('should disable save button when content is empty', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        // Clear content
        const textarea = screen.getByTestId('textarea-with-emoji');
        fireEvent.change(textarea, { target: { value: '' } });

        // Save button should be disabled
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        expect(saveButton).toBeDisabled();
    });

    it('should show card menu when canConvertToAction is true', () => {
        const participants = [
            {
                id: '1',
                name: 'User 1',
                username: 'User 1',
                userId: 'user1',
                email: 'user1@example.com',
                retrospectiveId: 'test-retro',
                joinedAt: new Date(),
                isActive: true,
                role: 'participant' as const,
            },
        ];

        render(
            <RetrospectiveCard
                {...defaultProps}
                participants={participants}
                canConvertToAction={true}
                onConvertToAction={jest.fn()}
            />
        );

        expect(screen.getByTestId('card-menu')).toBeInTheDocument();
    });

    it('should not show card menu when canConvertToAction is false', () => {
        render(
            <RetrospectiveCard
                {...defaultProps}
                canConvertToAction={false}
            />
        );

        expect(screen.queryByTestId('card-menu')).not.toBeInTheDocument();
    });

    it('should call onConvertToAction when card menu is used', () => {
        const onConvertToAction = jest.fn();
        const participants = [
            { id: '1', username: 'User 1', email: 'user1@example.com' },
        ];

        render(
            <RetrospectiveCard
                {...defaultProps}
                participants={participants}
                canConvertToAction={true}
                onConvertToAction={onConvertToAction}
            />
        );

        const cardMenu = screen.getByTestId('card-menu');
        fireEvent.click(cardMenu);

        expect(onConvertToAction).toHaveBeenCalledWith(
            'Test card content',
            'test-user',
            'Test User'
        );
    });

    it('should handle empty trim content correctly', () => {
        render(<RetrospectiveCard {...defaultProps} />);

        // Enter edit mode
        const editButton = screen.getByLabelText('Edit card');
        fireEvent.click(editButton);

        // Set content to whitespace only
        const textarea = screen.getByTestId('textarea-with-emoji');
        fireEvent.change(textarea, { target: { value: '   ' } });

        // Try to save
        const saveButton = screen.getByRole('button', { name: /guardar/i });
        fireEvent.click(saveButton);

        // Should not call onUpdate and should exit edit mode
        expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
    });
});
