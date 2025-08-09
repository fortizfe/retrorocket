import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RetrospectiveColumn from '../../../components/retrospective/RetrospectiveColumn';
import { Card as CardType, CardColor } from '../../../types/card';
import { ColumnConfig } from '../../../types/retrospective';

// Mock all external dependencies
vi.mock('framer-motion', () => ({
    motion: {
        div: vi.fn(({ children, ...props }) => <div {...props}>{children}</div>),
    },
    AnimatePresence: vi.fn(({ children }) => children),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: any) => {
            const translations: Record<string, string> = {
                'retrospective.columns.cardsCount': `${options?.count || 0} cards`,
                'retrospective.columns.add': 'Add card',
                'retrospective.columns.colorPreview': 'Color preview',
                'retrospective.columns.placeholder': `Write about ${options?.columnTitle || 'this'}`,
                'retrospective.columns.createCard': 'Create card',
                'retrospective.columns.cancel': 'Cancel',
                'retrospective.columns.noCards': 'No cards yet',
                'retrospective.columns.addFirstCard': 'Add first card',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock UI components
vi.mock('../../../components/ui/Card', () => ({
    default: vi.fn(({ children, className, ...props }) => (
        <div className={className} data-testid="ui-card" {...props}>{children}</div>
    )),
}));

vi.mock('../../../components/ui/Button', () => ({
    default: vi.fn(({ children, onClick, disabled, loading, variant, ...props }) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            data-variant={variant}
            data-testid={props['data-testid'] || 'button'}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    )),
}));

vi.mock('../../../components/ui/TextareaWithEmoji', () => ({
    default: vi.fn(({ value, onChange, onBlur, placeholder, autoFocus, ...props }) => (
        <textarea
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            autoFocus={autoFocus}
            data-testid="textarea-with-emoji"
            {...props}
        />
    )),
}));

vi.mock('../../../components/ui/ColorPicker', () => ({
    default: vi.fn(({ selectedColor, onColorChange }) => (
        <div data-testid="color-picker">
            <button onClick={() => onColorChange('pastelBlue')}>
                Change Color
            </button>
            <span>Current: {selectedColor}</span>
        </div>
    )),
}));

vi.mock('../../../components/ui/TypingPreview', () => ({
    default: vi.fn(({ typingUsers, className }) => (
        <div className={className} data-testid="typing-preview">
            {typingUsers.map((user: any) => user.name).join(', ')} is typing...
        </div>
    )),
}));

vi.mock('../../../components/retrospective/DragDropColumn', () => ({
    default: vi.fn(({ cards, column, onCardUpdate, onCardDelete, currentUser }) => (
        <div data-testid="drag-drop-column">
            <div>Column: {column}</div>
            <div>Cards: {cards.length}</div>
            <div>User: {currentUser || 'none'}</div>
            {cards.map((card: CardType) => (
                <div key={card.id} data-testid={`card-${card.id}`}>
                    <span>{card.content}</span>
                    <button onClick={() => onCardUpdate(card.id, { content: 'updated' })}>
                        Update
                    </button>
                    <button onClick={() => onCardDelete(card.id)}>Delete</button>
                </div>
            ))}
        </div>
    )),
}));

// Mock typing context with proper implementation
const mockTypingContext = {
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
    getTypingUsersForColumn: vi.fn(() => [] as Array<{ name: string; userId: string }>),
};

vi.mock('../../../contexts/TypingProvider', () => ({
    useTypingContext: () => mockTypingContext,
}));

// Mock utils
vi.mock('../../../utils/cardColors', () => ({
    getCardStyling: vi.fn((color: CardColor) => `bg-${color}`),
    getSuggestedColorForColumn: vi.fn(() => 'pastelWhite' as CardColor),
}));

describe('RetrospectiveColumn', () => {
    const mockColumn: ColumnConfig = {
        id: 'helped',
        title: 'What Helped',
        description: 'Things that went well',
        color: 'bg-green-100',
        icon: '✅',
    };

    const mockCards: CardType[] = [
        {
            id: 'card-1',
            content: 'Good teamwork',
            column: 'helped',
            retrospectiveId: 'retro-1',
            createdBy: 'user-1',
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 1,
        },
        {
            id: 'card-2',
            content: 'Clear communication',
            column: 'helped',
            retrospectiveId: 'retro-1',
            createdBy: 'user-2',
            createdAt: new Date(),
            updatedAt: new Date(),
            order: 2,
        },
    ];

    const defaultProps = {
        column: mockColumn,
        cards: mockCards,
        onCardCreate: vi.fn(),
        onCardUpdate: vi.fn(),
        onCardDelete: vi.fn(),
        onCardVote: vi.fn(),
        onCardLike: vi.fn(),
        onCardReaction: vi.fn(),
        onCardReactionRemove: vi.fn(),
        onCardsReorder: vi.fn(),
        currentUser: 'user-1',
        retrospectiveId: 'retro-1',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders column header with title and description', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            expect(screen.getByText('What Helped')).toBeInTheDocument();
            expect(screen.getByText('Things that went well')).toBeInTheDocument();
            expect(screen.getByText('✅')).toBeInTheDocument();
        });

        it('displays correct card count', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            expect(screen.getByText('2 cards')).toBeInTheDocument();
        });

        it('shows add card button', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            expect(screen.getByText('Add card')).toBeInTheDocument();
        });

        it('renders DragDropColumn with cards', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            expect(screen.getByTestId('drag-drop-column')).toBeInTheDocument();
            expect(screen.getByText('Cards: 2')).toBeInTheDocument();
            expect(screen.getByTestId('card-card-1')).toBeInTheDocument();
            expect(screen.getByTestId('card-card-2')).toBeInTheDocument();
        });

        it('shows empty state when no cards', () => {
            render(<RetrospectiveColumn {...defaultProps} cards={[]} />);

            expect(screen.getByText('No cards yet')).toBeInTheDocument();
            expect(screen.getByText('Add first card')).toBeInTheDocument();
        });

        it('disables add button when no current user', () => {
            render(<RetrospectiveColumn {...defaultProps} currentUser={undefined} />);

            const addButton = screen.getByTestId('button');
            expect(addButton).toBeDisabled();
        });
    });

    describe('Card creation', () => {
        it('enters create mode when add button is clicked', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            expect(screen.getByText('Create card')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
        });

        it('shows color picker in create mode', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            expect(screen.getByTestId('color-picker')).toBeInTheDocument();
        });

        it('creates card when form is submitted with valid content', async () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            // Enter create mode
            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            // Fill in content
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'New card content' } });

            // Submit
            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCardCreate).toHaveBeenCalledWith({
                    content: 'New card content',
                    column: 'helped',
                    createdBy: 'user-1',
                    retrospectiveId: 'retro-1',
                    color: 'pastelWhite',
                });
            });
        });

        it('disables create button when content is empty', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const createButton = screen.getByText('Create card');
            expect(createButton).toBeDisabled();
        });

        it('enables create button when content is added', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Some content' } });

            const createButton = screen.getByText('Create card');
            expect(createButton).not.toBeDisabled();
        });

        it('cancels create mode when cancel button is clicked', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            // Enter create mode
            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            // Cancel
            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
        });

        it('trims whitespace from card content', async () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '  Content with spaces  ' } });

            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCardCreate).toHaveBeenCalledWith(
                    expect.objectContaining({
                        content: 'Content with spaces',
                    })
                );
            });
        });

        it('shows loading state when creating card', async () => {
            const slowOnCardCreate = vi.fn().mockReturnValue(Promise.resolve());
            render(<RetrospectiveColumn {...defaultProps} onCardCreate={slowOnCardCreate} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'New card' } });

            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Color selection', () => {
        it('allows changing card color', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const colorChangeButton = screen.getByText('Change Color');
            fireEvent.click(colorChangeButton);

            expect(screen.getByText('Current: pastelBlue')).toBeInTheDocument();
        });

        it('uses selected color when creating card', async () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            // Change color
            const colorChangeButton = screen.getByText('Change Color');
            fireEvent.click(colorChangeButton);

            // Add content and create
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'New card' } });

            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(defaultProps.onCardCreate).toHaveBeenCalledWith(
                    expect.objectContaining({
                        color: 'pastelBlue',
                    })
                );
            });
        });
    });

    describe('Card interactions', () => {
        it('handles card updates through DragDropColumn', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const updateButtons = screen.getAllByText('Update');
            fireEvent.click(updateButtons[0]);

            expect(defaultProps.onCardUpdate).toHaveBeenCalledWith('card-1', { content: 'updated' });
        });

        it('handles card deletions through DragDropColumn', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const deleteButtons = screen.getAllByText('Delete');
            fireEvent.click(deleteButtons[0]);

            expect(defaultProps.onCardDelete).toHaveBeenCalledWith('card-1');
        });
    });

    describe('Empty state', () => {
        it('shows empty state button for adding first card', () => {
            render(<RetrospectiveColumn {...defaultProps} cards={[]} />);

            const addFirstCardButton = screen.getByText('Add first card');
            expect(addFirstCardButton).toBeInTheDocument();
        });

        it('enters create mode when empty state button is clicked', () => {
            render(<RetrospectiveColumn {...defaultProps} cards={[]} />);

            const addFirstCardButton = screen.getByText('Add first card');
            fireEvent.click(addFirstCardButton);

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
        });

        it('hides empty state button when no current user', () => {
            render(<RetrospectiveColumn {...defaultProps} cards={[]} currentUser={undefined} />);

            expect(screen.getByText('No cards yet')).toBeInTheDocument();
            expect(screen.queryByText('Add first card')).not.toBeInTheDocument();
        });
    });

    describe('Typing functionality', () => {
        beforeEach(() => {
            mockTypingContext.getTypingUsersForColumn.mockReturnValue([
                { name: 'John Doe', userId: 'user-2' },
            ]);
        });

        afterEach(() => {
            vi.clearAllMocks();
        });

        it('shows typing preview when users are typing', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            expect(screen.getByTestId('typing-preview')).toBeInTheDocument();
            expect(screen.getByText('John Doe is typing...')).toBeInTheDocument();
        });

        it('starts typing when user types in textarea', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'typing...' } });

            expect(mockTypingContext.startTyping).toHaveBeenCalledWith('helped');
        });

        it('stops typing when textarea loses focus', () => {
            vi.useFakeTimers();
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.blur(textarea);

            vi.advanceTimersByTime(1000);

            expect(mockTypingContext.stopTyping).toHaveBeenCalledWith('helped');
            vi.useRealTimers();
        });

        it('stops typing when canceling card creation', () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const cancelButton = screen.getByText('Cancel');
            fireEvent.click(cancelButton);

            expect(mockTypingContext.stopTyping).toHaveBeenCalledWith('helped');
        });
    });

    describe('Edge cases', () => {
        it('handles empty card content gracefully', async () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '   ' } }); // Only spaces

            const createButton = screen.getByText('Create card');
            expect(createButton).toBeDisabled();
        });

        it('resets form after successful card creation', async () => {
            render(<RetrospectiveColumn {...defaultProps} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'New card' } });

            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
            });
        });

        it('handles card creation errors gracefully', async () => {
            const errorOnCardCreate = vi.fn().mockRejectedValue(new Error('Creation failed'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(<RetrospectiveColumn {...defaultProps} onCardCreate={errorOnCardCreate} />);

            const addButton = screen.getByText('Add card');
            fireEvent.click(addButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'New card' } });

            const createButton = screen.getByText('Create card');
            fireEvent.click(createButton);

            await waitFor(() => {
                expect(consoleSpy).toHaveBeenCalledWith('Error creating card:', expect.any(Error));
            });

            consoleSpy.mockRestore();
        });
    });
});
