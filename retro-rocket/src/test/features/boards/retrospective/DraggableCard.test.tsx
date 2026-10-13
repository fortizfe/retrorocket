import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toast from 'react-hot-toast';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import { Card as CardType, CardColor, EmojiReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import { BoardDataContext, EMPTY_BOARD } from '@/features/boards/retrospective/contexts/useBoardData';
import type { Retrospective } from '@/features/boards/types/retrospective';
import { getPostDeleteFocusTarget } from '@/features/boards/retrospective/utils/postDeleteFocus';

/**
 * T008 (058-card-owner-action-hub, RED phase): rewritten against the new contract —
 * `DraggableCard` no longer renders a header `ColorPicker` or footer Edit/Delete
 * buttons directly; every owner action (edit, colour, delete) routes through the new
 * `OwnerActionMenu` hub (contracts/owner-action-menu.md §4; data-model.md). Since
 * `OwnerActionMenu` itself is covered by its own unit tests (OwnerActionMenu.test.tsx,
 * T006), it is mocked here as a thin stand-in that exposes its props as clickable
 * controls — these tests verify *DraggableCard's wiring* into the hub (gating,
 * optimistic colour, focus handoff, post-delete focus), not the hub's own internals.
 *
 * Almost every test in this file is expected to fail against today's
 * `DraggableCard.tsx` (RED): it never renders `OwnerActionMenu` at all yet (T015's
 * job), still shows the header `ColorPicker`, and still wires `CardFooter`'s removed
 * `onEdit`/`onDelete`/`isDeleting` props directly.
 */

// Mock framer-motion. `motion.div` forwards its ref (via forwardRef, matching the
// TextareaWithEmoji mock below) so T015's root-ref-based post-delete-focus wiring has
// a real DOM node to call `getPostDeleteFocusTarget` against.
vi.mock('framer-motion', () => ({
    motion: {
        div: React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) => (
            <div ref={ref} {...props}>{children}</div>
        )),
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

// Local mock (overriding src/test/setup.ts's global one) so this file can assert
// calls, matching the established pattern (useJoinRetrospective.test.ts).
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

// `getPostDeleteFocusTarget` is a pure DOM helper with its own unit tests
// (postDeleteFocus.test.ts, T005) — mocked here so these tests control exactly what
// it returns without needing a real [data-card-column] DOM tree.
vi.mock('@/features/boards/retrospective/utils/postDeleteFocus', () => ({
    getPostDeleteFocusTarget: vi.fn(),
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

// `OwnerActionMenu` carries its own full behavioural test suite
// (OwnerActionMenu.test.tsx, T006) — this stand-in exposes exactly its documented
// props (contracts/owner-action-menu.md §1) as plain controls, and mimics its
// `restoreFocus` → focus-the-trigger-once → `onFocusRestored` contract (B-restore),
// so DraggableCard's own focus-handoff wiring (set on Save/Cancel, T015) is verified
// end to end rather than just "was the prop truthy".
vi.mock('@/features/boards/retrospective/components/OwnerActionMenu', () => {
    const OwnerActionMenuStub = ({ cardId, color, onEdit, onColorChange, onDelete, isDragging, restoreFocus, onFocusRestored }: any) => {
        const triggerRef = React.useRef<HTMLButtonElement>(null);
        React.useEffect(() => {
            if (restoreFocus) {
                triggerRef.current?.focus();
                onFocusRestored?.();
            }
        }, [restoreFocus, onFocusRestored]);

        return (
            <div
                data-testid="owner-action-menu"
                data-card-id={cardId}
                data-color={color}
                data-dragging={String(!!isDragging)}
            >
                <button
                    ref={triggerRef}
                    data-testid="owner-trigger"
                    aria-label="retrospective.card.ownerActions.trigger"
                >
                    Owner actions
                </button>
                <button data-testid="owner-edit" onClick={onEdit}>Edit via hub</button>
                <button data-testid="owner-color" onClick={() => onColorChange?.('pastelGreen' as CardColor)}>
                    Pick green via hub
                </button>
                {/* Mirrors OwnerActionMenu's real contract (contracts/owner-action-menu.md
                    B6/B7): the real component's `handleConfirmDelete` awaits `onDelete()`
                    inside its own try/catch, so a rejection never escapes to an unhandled
                    promise rejection — only `DraggableCard`'s wiring up to that catch is
                    under test here, not the hub's own retry/toast behaviour (OwnerActionMenu.test.tsx). */}
                <button data-testid="owner-delete" onClick={() => { void onDelete?.().catch(() => { }); }}>Delete via hub</button>
            </div>
        );
    };
    return { default: OwnerActionMenuStub };
});

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
    validateColor: vi.fn((color) => color || 'pastelBlue'),
    getColorConfig: vi.fn((color: string) => ({ nameKey: `colors.${color}` })),
}));

/** Deferred promise — lets a test control exactly when an async prop (onUpdate,
 * onDelete) settles, to probe the optimistic-colour revert and post-delete-focus
 * timing guarantees. */
function createDeferred<T = void>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

describe('DraggableCard', () => {
    const mockCard: CardType = {
        id: 'card-1',
        retrospectiveId: 'retro-1',
        column: 'helped',
        content: 'Test card content',
        color: 'pastelBlue' as CardColor,
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

    const anonymousRetrospective: Retrospective = {
        id: 'retro-1',
        title: 'Anonymous retro',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        participantCount: 2,
        isActive: true,
        isAnonymous: true,
    };

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
        vi.mocked(getPostDeleteFocusTarget).mockReturnValue(null);
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

    describe('Owner Action Hub gating (FR-001: single gate, canEdit && isOwner)', () => {
        it('shows the hub trigger for the card owner when canEdit is true', () => {
            render(<DraggableCard {...defaultProps} />);

            expect(screen.getByTestId('owner-action-menu')).toBeInTheDocument();
        });

        it('hides the hub for a non-owner', () => {
            render(<DraggableCard {...defaultProps} currentUser="user2" />);

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });

        it('hides the hub for the owner when canEdit is false (e.g. grouping mode, read-only preview)', () => {
            render(<DraggableCard {...defaultProps} canEdit={false} />);

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });

        it("hides the hub on another participant's card on an anonymous board", () => {
            render(
                <BoardDataContext.Provider value={{ ...EMPTY_BOARD, retrospective: anonymousRetrospective }}>
                    <DraggableCard {...defaultProps} currentUser="user2" />
                </BoardDataContext.Provider>
            );

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });

        it('shows the hub for the owner even on an anonymous board', () => {
            render(
                <BoardDataContext.Provider value={{ ...EMPTY_BOARD, retrospective: anonymousRetrospective }}>
                    <DraggableCard {...defaultProps} currentUser="user1" />
                </BoardDataContext.Provider>
            );

            expect(screen.getByTestId('owner-action-menu')).toBeInTheDocument();
        });

        it('never shows a header colour control, for any user — ownership is checked only once, by the hub (FR-002)', () => {
            render(<DraggableCard {...defaultProps} currentUser="user2" />);
            expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();

            render(<DraggableCard {...defaultProps} currentUser="user1" />);
            expect(screen.queryByTestId('color-picker')).not.toBeInTheDocument();
        });

        it('hides the hub while the card is being edited', () => {
            render(<DraggableCard {...defaultProps} />);
            fireEvent.click(screen.getByTestId('owner-edit'));

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });

        it('forwards isSortableDragging to the hub as isDragging', () => {
            render(<DraggableCard {...(defaultProps as any)} isSortableDragging />);

            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-dragging', 'true');
        });
    });

    // T020 (058-card-owner-action-hub, US2): the facilitator's convert-to-action
    // `CardMenu` must stay in the footer, work the same, and never be merged into
    // the owner hub (quickstart #11, FR-005, FR-016, SC-010). `CardMenu` itself is
    // mocked (see the top-of-file mock) the same way `OwnerActionMenu` is — these
    // tests verify DraggableCard's *composition* of the two independent controls,
    // not either control's own internals (CardMenu.test.tsx / OwnerActionMenu.test.tsx
    // own that, including the actual Settings2-vs-MoreVertical icon choice, which a
    // mocked integration test like this one cannot assert).
    describe('Facilitator convert-to-action coexistence (US2, FR-005, FR-016)', () => {
        it("shows only the convert-to-action control, and no owner trigger, when a facilitator who isn't the card's owner views it", () => {
            render(<DraggableCard {...defaultProps} currentUser="user2" canConvertToAction onConvertToAction={vi.fn()} />);

            expect(screen.getByTestId('convert-to-action')).toBeInTheDocument();
            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });

        it('shows both controls, as two distinct elements, on the facilitator\'s own card — owner trigger first', () => {
            render(<DraggableCard {...defaultProps} currentUser="user1" canConvertToAction onConvertToAction={vi.fn()} />);

            const ownerMenu = screen.getByTestId('owner-action-menu');
            const cardMenu = screen.getByTestId('card-menu');
            expect(ownerMenu).toBeInTheDocument();
            expect(cardMenu).toBeInTheDocument();
            expect(ownerMenu).not.toBe(cardMenu);

            // Order: OwnerActionMenu renders before CardMenu in document order
            // (contracts/owner-action-menu.md §4's documented actions order).
            expect(
                ownerMenu.compareDocumentPosition(cardMenu) & Node.DOCUMENT_POSITION_FOLLOWING
            ).toBeTruthy();

            // Two independent triggers, never the same control standing in for both.
            expect(screen.getByTestId('owner-trigger')).not.toBe(screen.getByTestId('convert-to-action'));
        });

        it('never renders the convert-to-action control inside the owner hub panel — the two stay independent (FR-016)', () => {
            render(<DraggableCard {...defaultProps} currentUser="user1" canConvertToAction onConvertToAction={vi.fn()} />);

            const ownerMenu = screen.getByTestId('owner-action-menu');
            expect(within(ownerMenu).queryByTestId('convert-to-action')).not.toBeInTheDocument();
        });

        it('hides both the owner hub and the convert-to-action control while editing', () => {
            render(<DraggableCard {...defaultProps} currentUser="user1" canConvertToAction onConvertToAction={vi.fn()} />);

            fireEvent.click(screen.getByTestId('owner-edit'));

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
            expect(screen.queryByTestId('card-menu')).not.toBeInTheDocument();
        });
    });

    describe('Edit via the hub (FR-009)', () => {
        it('enters edit mode when "Edit card" is chosen from the hub', () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-edit'));

            expect(screen.getByTestId('textarea-with-emoji')).toBeInTheDocument();
            expect(screen.getByText('retrospective.card.save')).toBeInTheDocument();
            expect(screen.getByText('retrospective.card.cancel')).toBeInTheDocument();
        });

        it('exits edit mode, refocuses the hub trigger, when Cancel is clicked', () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-edit'));
            fireEvent.click(screen.getByText('retrospective.card.cancel'));

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
            expect(screen.getByTestId('linkify-text')).toBeInTheDocument();
            expect(screen.getByTestId('owner-action-menu')).toBeInTheDocument();
            expect(screen.getByTestId('owner-trigger')).toHaveFocus();
        });

        it('saves changes, exits edit mode, and refocuses the hub trigger when Save is clicked', async () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-edit'));

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Updated content' } });

            fireEvent.click(screen.getByText('retrospective.card.save'));

            await waitFor(() => {
                expect(defaultProps.onUpdate).toHaveBeenCalledWith('card-1', {
                    content: 'Updated content'
                });
            });
            await waitFor(() => expect(screen.getByTestId('owner-action-menu')).toBeInTheDocument());
            expect(screen.getByTestId('owner-trigger')).toHaveFocus();
        });

        it('does not save when content is unchanged', async () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-edit'));
            fireEvent.click(screen.getByText('retrospective.card.save'));

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });

        it('does not save when content is empty', async () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-edit'));

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: '   ' } }); // Only spaces

            fireEvent.click(screen.getByText('retrospective.card.save'));

            expect(defaultProps.onUpdate).not.toHaveBeenCalled();
        });

        it('does not start editing on double-click of the card content — "Edit card" in the hub is the only way in', () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.doubleClick(screen.getByTestId('linkify-text'));

            expect(screen.queryByTestId('textarea-with-emoji')).not.toBeInTheDocument();
        });

        it('handles error in update operation', async () => {
            const mockUpdateWithError = vi.fn().mockRejectedValue(new Error('Update failed'));

            render(<DraggableCard {...defaultProps} onUpdate={mockUpdateWithError} />);

            fireEvent.click(screen.getByTestId('owner-edit'));

            const textarea = screen.getByTestId('textarea-with-emoji');
            fireEvent.change(textarea, { target: { value: 'Updated content' } });

            fireEvent.click(screen.getByText('retrospective.card.save'));

            await waitFor(() => {
                expect(mockUpdateWithError).toHaveBeenCalledWith('card-1', {
                    content: 'Updated content'
                });
            });
        });
    });

    describe('Delete via the hub, with post-delete focus (FR-012)', () => {
        it('calls onDelete via the hub', async () => {
            render(<DraggableCard {...defaultProps} />);

            fireEvent.click(screen.getByTestId('owner-delete'));

            await waitFor(() => expect(defaultProps.onDelete).toHaveBeenCalledWith('card-1'));
        });

        it('resolves the post-delete focus target before awaiting onDelete, and focuses it only once onDelete resolves', async () => {
            const focusTarget = document.createElement('button');
            document.body.appendChild(focusTarget);
            vi.mocked(getPostDeleteFocusTarget).mockReturnValue(focusTarget);

            const deferred = createDeferred<void>();
            const onDelete = vi.fn(() => deferred.promise);

            render(<DraggableCard {...defaultProps} onDelete={onDelete} />);
            fireEvent.click(screen.getByTestId('owner-delete'));

            expect(getPostDeleteFocusTarget).toHaveBeenCalledTimes(1);
            expect(getPostDeleteFocusTarget).toHaveBeenCalledWith(expect.any(HTMLElement));
            expect(focusTarget).not.toHaveFocus();

            await act(async () => {
                deferred.resolve();
                await deferred.promise;
            });

            expect(focusTarget).toHaveFocus();
            document.body.removeChild(focusTarget);
        });

        it('handles error in delete operation', async () => {
            const mockDeleteWithError = vi.fn().mockRejectedValue(new Error('Delete failed'));

            render(<DraggableCard {...defaultProps} onDelete={mockDeleteWithError} />);

            fireEvent.click(screen.getByTestId('owner-delete'));

            await waitFor(() => {
                expect(mockDeleteWithError).toHaveBeenCalledWith('card-1');
            });
            // The rejection propagates to OwnerActionMenu's own catch (contracts
            // §1 B7), not to DraggableCard — so the card stays mounted, onDelete
            // is called exactly once (no retry loop / crash), and nothing else
            // throws out of this handler (no unhandled rejection, asserted by the
            // absence of a Vitest "Unhandled Errors" report for this file).
            expect(mockDeleteWithError).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId('draggable-card')).toBeInTheDocument();
        });
    });

    describe('Optimistic colour update via the hub (FR-008, research.md §5)', () => {
        it("repaints the card immediately via the optimistic pendingColor, reflected in the hub's color prop", () => {
            const deferred = createDeferred<void>();
            const onUpdate = vi.fn(() => deferred.promise);
            render(<DraggableCard {...defaultProps} onUpdate={onUpdate} />);

            const before = screen.getByTestId('owner-action-menu').getAttribute('data-color');
            expect(before).not.toBe('pastelGreen');

            fireEvent.click(screen.getByTestId('owner-color'));

            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', 'pastelGreen');
            expect(onUpdate).toHaveBeenCalledWith('card-1', { color: 'pastelGreen' });
        });

        it('reverts the optimistic colour and shows a localized error toast when onUpdate rejects', async () => {
            const onUpdate = vi.fn().mockRejectedValue(new Error('network error'));
            render(<DraggableCard {...defaultProps} onUpdate={onUpdate} />);
            const original = screen.getByTestId('owner-action-menu').getAttribute('data-color');

            fireEvent.click(screen.getByTestId('owner-color'));
            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', 'pastelGreen');

            await waitFor(() => {
                expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', original);
            });
            expect(toast.error).toHaveBeenCalledWith('retrospective.card.ownerActions.colorError');
        });

        it('clears the optimistic pendingColor once the card.color prop catches up (no stale pin after real-time sync)', () => {
            const onUpdate = vi.fn().mockResolvedValue(undefined);
            const { rerender } = render(<DraggableCard {...defaultProps} onUpdate={onUpdate} />);

            fireEvent.click(screen.getByTestId('owner-color'));
            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', 'pastelGreen');

            // Real-time sync delivers the new colour on the `card` prop itself.
            rerender(<DraggableCard {...defaultProps} card={{ ...mockCard, color: 'pastelGreen' as CardColor }} onUpdate={onUpdate} />);
            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', 'pastelGreen');

            // A later, unrelated real-time update away from pastelGreen must be reflected
            // immediately — if pendingColor had not cleared, it would still pin the hub to
            // 'pastelGreen' here, masking the new synced value.
            rerender(<DraggableCard {...defaultProps} card={{ ...mockCard, color: 'pastelRed' as CardColor }} onUpdate={onUpdate} />);
            expect(screen.getByTestId('owner-action-menu')).toHaveAttribute('data-color', 'pastelRed');
        });

        it('announces the colour change in a polite live region that stays mounted on the card', async () => {
            render(<DraggableCard {...defaultProps} onUpdate={vi.fn().mockResolvedValue(undefined)} />);

            fireEvent.click(screen.getByTestId('owner-color'));

            const announcement = await screen.findByText('retrospective.card.ownerActions.colorChanged');
            expect(announcement).toHaveAttribute('aria-live', 'polite');
        });
    });

    describe('Root element (for post-delete focus)', () => {
        it('gives the card root element tabIndex=-1 and the data-card-focus-target marker', () => {
            render(<DraggableCard {...defaultProps} />);

            const cardRoot = screen.getByTestId('draggable-card');
            expect(cardRoot).toHaveAttribute('tabindex', '-1');
            expect(cardRoot).toHaveAttribute('data-card-focus-target');
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

        it('hides the hub for an anonymous current user (never the owner of anyone else\'s card)', () => {
            render(<DraggableCard {...defaultProps} currentUser="anonymous" />);

            expect(screen.queryByTestId('owner-action-menu')).not.toBeInTheDocument();
        });
    });
});
