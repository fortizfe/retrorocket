import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import { Card as CardType, CardColor, EmojiReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: {
            changeLanguage: () => new Promise(() => { }),
        },
    }),
    // Required now that DraggableCard imports the sentiment barrel, which transitively
    // loads constants → i18n/config (which calls `.use(initReactI18next)`).
    initReactI18next: { type: '3rdParty', init: () => { } },
}));

// Mock language hook
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string) => key,
        currentLanguage: 'en',
    }),
}));

// Mock UI components
vi.mock('@/lib/components/ui/Card', () => ({
    default: ({ children, className, ...props }: any) => (
        <div className={className} {...props}>
            {children}
        </div>
    ),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, variant, className, loading, ...props }: any) => (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={`${className} ${variant}`}
            {...props}
        >
            {loading ? 'Loading...' : children}
        </button>
    ),
}));

vi.mock('@/lib/components/ui/TextareaWithEmoji', () => ({
    // forwardRef (matching the real component) so DraggableCard's ref-based focus
    // fix has a real DOM node to call .focus() on in tests.
    default: React.forwardRef<HTMLTextAreaElement, any>(
        ({ value, onChange, placeholder, ...props }, ref) => (
            <textarea
                ref={ref}
                data-testid="textarea-with-emoji"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                {...props}
            />
        )
    ),
}));

vi.mock('@/lib/components/ui/ColorPicker', () => ({
    default: ({ selectedColor: _selectedColor, onColorChange, ...props }: any) => (
        <div data-testid="color-picker" {...props}>
            <button onClick={() => onColorChange?.('blue' as CardColor)}>
                Change Color
            </button>
        </div>
    ),
}));

vi.mock('@/lib/components/ui/LinkifyText', () => ({
    default: ({ text, ...props }: any) => (
        <div data-testid="linkify-text" {...props}>
            {text}
        </div>
    ),
}));

vi.mock('@/features/boards/retrospective/components/LikeButton', () => ({
    default: ({ onToggleLike, likesCount, ...props }: any) => (
        <button
            data-testid="like-button"
            onClick={onToggleLike}
            {...props}
        >
            Like ({likesCount})
        </button>
    ),
}));

vi.mock('@/features/boards/retrospective/components/EmojiReactions', () => ({
    default: ({ onReaction, onRemoveReaction, currentUserId: _currentUserId, ...props }: any) => (
        <div data-testid="emoji-reactions" {...props}>
            <button data-testid="add-reaction" onClick={() => onReaction?.('👍' as EmojiReaction)}>
                Add Reaction
            </button>
            <button data-testid="remove-reaction" onClick={onRemoveReaction}>
                Remove Reaction
            </button>
        </div>
    ),
}));

vi.mock('@/features/boards/retrospective/components/CardMenu', () => ({
    default: ({ card: _card, participants: _participants, onConvertToAction, canConvertToAction, ...props }: any) => (
        <div data-testid="card-menu" {...props}>
            {canConvertToAction && (
                <button
                    data-testid="convert-to-action"
                    onClick={() => onConvertToAction?.('Test action', 'user1', 'User One')}
                >
                    Convert to Action
                </button>
            )}
        </div>
    ),
}));

// Mock card helpers, keeping the real resolveAuthorDisplayName so these tests
// exercise the actual author-name resolution (spec 020-user-display-name-fix)
// rather than a stand-in.
vi.mock('@/lib/utils/cardHelpers', async () => {
    const actual = await vi.importActual<typeof import('@/lib/utils/cardHelpers')>('@/lib/utils/cardHelpers');
    return {
        ...actual,
        groupReactions: vi.fn(() => ({})),
        hasUserLiked: vi.fn(() => false),
        getUserReaction: vi.fn(() => null),
    };
});

// Mock card colors
vi.mock('@/lib/utils/cardColors', () => ({
    getCardStyling: vi.fn(() => 'bg-blue-100'),
    validateColor: vi.fn((color) => color || 'blue'),
}));

describe('DraggableCard', () => {
    const mockCard: CardType = {
        id: 'card-1',
        retrospectiveId: 'retro-1',
        column: 'helped',
        content: 'Test card content',
        color: 'blue' as CardColor,
        votes: 3,
        likes: [
            { userId: 'user1', username: 'User One', timestamp: new Date() },
            { userId: 'user2', username: 'User Two', timestamp: new Date() }
        ],
        reactions: [
            {
                userId: 'user1',
                username: 'User One',
                emoji: '👍' as EmojiReaction,
                timestamp: new Date()
            }
        ],
        order: 1,
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockParticipants: Participant[] = [
        {
            id: 'participant-1',
            userId: 'user1',
            name: 'User One',
            retrospectiveId: 'retro-1',
            joinedAt: new Date(),
            isActive: true,
            photoURL: null
        },
        {
            id: 'participant-2',
            userId: 'user2',
            name: 'User Two',
            retrospectiveId: 'retro-1',
            joinedAt: new Date(),
            isActive: true,
            photoURL: null
        }
    ];

    const defaultProps = {
        card: mockCard,
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onVote: vi.fn(),
        onLike: vi.fn(),
        onReaction: vi.fn(),
        onReactionRemove: vi.fn(),
        currentUser: 'user1',
        canEdit: true,
        isDragging: false,
        participants: mockParticipants,
        canConvertToAction: true,
        onConvertToAction: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders card with basic content', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
            expect(screen.getByText('Test card content')).toBeInTheDocument();
        });

        it('shows voting controls', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByText('3')).toBeInTheDocument(); // vote count
        });

        it('shows like button with count', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('like-button')).toBeInTheDocument();
            expect(screen.getByText('Like (2)')).toBeInTheDocument();
        });

        it('shows emoji reactions', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('emoji-reactions')).toBeInTheDocument();
        });

        it('shows edit controls for card owner', () => {
            render(<DraggableCard {...defaultProps} />);

            const editButton = screen.getByLabelText('retrospective.card.editCard');
            expect(editButton).toBeInTheDocument();
        });

        it('hides edit controls for non-owner', () => {
            render(<DraggableCard {...defaultProps} currentUser="user2" />);

            expect(screen.queryByLabelText('retrospective.card.editCard')).not.toBeInTheDocument();
        });

        it('shows delete button for card owner', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByLabelText('retrospective.card.deleteCard')).toBeInTheDocument();
        });

        it('shows color picker when can edit', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('color-picker')).toBeInTheDocument();
        });

        it('shows card menu when can convert to action', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('card-menu')).toBeInTheDocument();
        });

        it('applies dragging styles when isDragging is true', () => {
            const { container } = render(<DraggableCard {...defaultProps} isDragging={true} />);

            const cardElement = container.querySelector('.rotate-2.shadow-2xl');
            expect(cardElement).toBeInTheDocument();
        });
    });

    describe('Edit functionality', () => {
        it('enters edit mode when edit button is clicked', () => {
            render(<DraggableCard {...defaultProps} />);

            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            expect(screen.getByText('retrospective.card.save')).toBeInTheDocument();
            expect(screen.getByText('retrospective.card.cancel')).toBeInTheDocument();
        });

        it('exits edit mode when cancel button is clicked', () => {
            render(<DraggableCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            // Cancel edit
            const cancelButton = screen.getByText('retrospective.card.cancel');
            fireEvent.click(cancelButton);

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
        });

        it('saves changes when save button is clicked with modified content', async () => {
            render(<DraggableCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            // Modify content
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Updated content' } });

            // Save changes
            const saveButton = screen.getByText('retrospective.card.save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(defaultProps.onUpdate).toHaveBeenCalledWith('card-1', {
                    content: 'Updated content'
                });
            });
        });

        it('does not save when content is unchanged', async () => {
            render(<DraggableCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            // Save without changes
            const saveButton = screen.getByText('retrospective.card.save');
            fireEvent.click(saveButton);

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });

        it('does not save when content is empty', async () => {
            render(<DraggableCard {...defaultProps} />);

            // Enter edit mode
            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            // Clear content
            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '   ' } }); // Only spaces

            // Save
            const saveButton = screen.getByText('retrospective.card.save');
            fireEvent.click(saveButton);

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });
    });

    describe('Delete functionality', () => {
        it('calls onDelete when delete button is clicked', async () => {
            render(<DraggableCard {...defaultProps} />);

            const deleteButton = screen.getByLabelText('retrospective.card.deleteCard');
            fireEvent.click(deleteButton);

            expect(defaultProps.onDelete).toHaveBeenCalledWith('card-1');
        });

        it('shows loading state when deleting', () => {
            render(<DraggableCard {...defaultProps} />);

            const deleteButton = screen.getByLabelText('retrospective.card.deleteCard');
            fireEvent.click(deleteButton);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });
    });

    describe('Voting functionality', () => {
        it('handles upvote when upvote button is clicked', async () => {
            render(<DraggableCard {...defaultProps} />);

            const upvoteButton = screen.getByLabelText('retrospective.card.voteUp');
            fireEvent.click(upvoteButton);

            expect(defaultProps.onVote).toHaveBeenCalledWith('card-1', true);
        });

        it('handles downvote when downvote button is clicked', async () => {
            render(<DraggableCard {...defaultProps} />);

            const downvoteButton = screen.getByLabelText('retrospective.card.voteDown');
            fireEvent.click(downvoteButton);

            expect(defaultProps.onVote).toHaveBeenCalledWith('card-1', false);
        });

        it('does not show voting controls when votes is 0', () => {
            const cardWithoutVotes = { ...mockCard, votes: 0 };
            render(<DraggableCard {...defaultProps} card={cardWithoutVotes} />);

            expect(screen.queryByLabelText('retrospective.card.voteUp')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('retrospective.card.voteDown')).not.toBeInTheDocument();
        });
    });

    describe('Like functionality', () => {
        it('handles like toggle when like button is clicked', async () => {
            render(<DraggableCard {...defaultProps} />);

            const likeButton = screen.getByTestId('like-button');
            fireEvent.click(likeButton);

            expect(defaultProps.onLike).toHaveBeenCalledWith('card-1', 'user1', 'user1');
        });
    });

    describe('Reaction functionality', () => {
        it('handles adding reaction', async () => {
            render(<DraggableCard {...defaultProps} />);

            const addReactionButton = screen.getByTestId('add-reaction');
            fireEvent.click(addReactionButton);

            expect(defaultProps.onReaction).toHaveBeenCalledWith('card-1', 'user1', 'user1', '👍');
        });
    });

    describe('Color functionality', () => {
        it('handles color change', async () => {
            render(<DraggableCard {...defaultProps} />);

            const changeColorButton = screen.getByText('Change Color');
            fireEvent.click(changeColorButton);

            expect(defaultProps.onUpdate).toHaveBeenCalledWith('card-1', {
                color: 'blue'
            });
        });
    });

    describe('Action conversion functionality', () => {
        it('handles converting card to action item', async () => {
            render(<DraggableCard {...defaultProps} />);

            const convertButton = screen.getByTestId('convert-to-action');
            fireEvent.click(convertButton);

            expect(defaultProps.onConvertToAction).toHaveBeenCalledWith(
                'Test action',
                'user1',
                'User One'
            );
        });

        it('does not show conversion menu when canConvertToAction is false', () => {
            render(<DraggableCard {...defaultProps} canConvertToAction={false} />);

            expect(screen.queryByTestId('card-menu')).not.toBeInTheDocument();
        });

        it('keeps the convert-to-action menu always visible — never hover-only (research.md §3, FR-012)', () => {
            render(<DraggableCard {...defaultProps} />);

            const cardMenu = screen.getByTestId('card-menu');
            let node: HTMLElement | null = cardMenu;
            while (node) {
                expect(node.className).not.toMatch(/\bopacity-0\b/);
                node = node.parentElement;
            }
        });
    });

    describe('Permission handling', () => {
        it('hides edit controls when canEdit is false', () => {
            render(<DraggableCard {...defaultProps} canEdit={false} />);

            expect(screen.queryByLabelText('retrospective.card.editCard')).not.toBeInTheDocument();
            expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
        });

        it('shows delete button only for card owner', () => {
            render(<DraggableCard {...defaultProps} currentUser="user2" />);

            expect(screen.queryByLabelText('retrospective.card.deleteCard')).not.toBeInTheDocument();
        });
    });

    describe('Author display name (spec 020-user-display-name-fix)', () => {
        it('resolves the author label from the live participants list when createdByName is absent (legacy card)', () => {
            const legacyCard = { ...mockCard, createdBy: 'user1', createdByName: undefined };
            render(<DraggableCard {...defaultProps} card={legacyCard} />);

            expect(screen.getByText('User One')).toBeInTheDocument();
            expect(screen.queryByText('user1')).not.toBeInTheDocument();
        });

        it('shows the captured createdByName even when the author has left (no longer in participants)', () => {
            const cardWithCapturedName = { ...mockCard, createdBy: 'departed-uid', createdByName: 'Departed Person' };
            render(<DraggableCard {...defaultProps} card={cardWithCapturedName} participants={mockParticipants} />);

            expect(screen.getByText('Departed Person')).toBeInTheDocument();
            expect(screen.queryByText('departed-uid')).not.toBeInTheDocument();
        });

        it('shows the localized fallback label for a legacy card whose author is no longer resolvable at all', () => {
            const unresolvableCard = { ...mockCard, createdBy: 'departed-uid', createdByName: undefined };
            render(<DraggableCard {...defaultProps} card={unresolvableCard} participants={mockParticipants} />);

            expect(screen.getByText('retrospective.grouping.unknownAuthor')).toBeInTheDocument();
            expect(screen.queryByText('departed-uid')).not.toBeInTheDocument();
        });
    });

    describe('Author display name resolution priority (022, FR-001a)', () => {
        it('prefers the live participant match over the captured createdByName, and leaves vote/like counts unaffected', () => {
            const renamedAuthorCard = { ...mockCard, createdBy: 'user1', createdByName: 'Old Captured Name' };
            const participantsWithNewName: Participant[] = [
                { ...mockParticipants[0], name: 'New Current Name' },
                mockParticipants[1],
            ];

            render(<DraggableCard {...defaultProps} card={renamedAuthorCard} participants={participantsWithNewName} />);

            expect(screen.getByText('New Current Name')).toBeInTheDocument();
            expect(screen.queryByText('Old Captured Name')).not.toBeInTheDocument();
            // FR-010: resolving a different display name must not change vote/like counts.
            expect(screen.getByText('3')).toBeInTheDocument(); // votes, unchanged
            expect(screen.getByText('Like (2)')).toBeInTheDocument(); // likesCount, unchanged
        });
    });

    describe('Edge cases', () => {
        it('handles missing optional props gracefully', () => {
            const minimalProps = {
                card: mockCard,
                currentUser: 'user1'
            };

            expect(() => render(<DraggableCard {...minimalProps} />)).not.toThrow();
        });

        it('handles card with no likes or reactions', () => {
            const cardWithoutInteractions = {
                ...mockCard,
                likes: [],
                reactions: []
            };

            render(<DraggableCard {...defaultProps} card={cardWithoutInteractions} />);

            expect(screen.getByTestId('like-button')).toBeInTheDocument();
            expect(screen.getByTestId('emoji-reactions')).toBeInTheDocument();
        });

        it('handles anonymous user correctly', () => {
            render(<DraggableCard {...defaultProps} currentUser="anonymous" />);

            expect(screen.queryByLabelText('retrospective.card.editCard')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('retrospective.card.deleteCard')).not.toBeInTheDocument();
        });

        it('handles error in update operation', async () => {
            const mockUpdateWithError = vi.fn().mockRejectedValue(new Error('Update failed'));

            render(<DraggableCard {...defaultProps} onUpdate={mockUpdateWithError} />);

            // Enter edit mode and make changes
            const editButton = screen.getByLabelText('retrospective.card.editCard');
            fireEvent.click(editButton);

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Updated content' } });

            const saveButton = screen.getByText('retrospective.card.save');
            fireEvent.click(saveButton);

            await waitFor(() => {
                expect(mockUpdateWithError).toHaveBeenCalledWith('card-1', {
                    content: 'Updated content'
                });
            });
        });

        it('handles error in delete operation', async () => {
            const mockDeleteWithError = vi.fn().mockRejectedValue(new Error('Delete failed'));

            render(<DraggableCard {...defaultProps} onDelete={mockDeleteWithError} />);

            const deleteButton = screen.getByLabelText('retrospective.card.deleteCard');
            fireEvent.click(deleteButton);

            await waitFor(() => {
                expect(mockDeleteWithError).toHaveBeenCalledWith('card-1');
            });
        });
    });
});
