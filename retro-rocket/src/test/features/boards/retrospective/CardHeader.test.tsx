import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardHeader from '@/features/boards/retrospective/components/CardHeader';
import CardVoteControl from '@/features/boards/retrospective/components/CardVoteControl';
import DraggableCard from '@/features/boards/retrospective/components/DraggableCard';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';
import { Card as CardType, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import { Retrospective } from '@/features/boards/types/retrospective';

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, currentLanguage: 'es' }),
}));

// Spreads the real module (rather than replacing it outright) so the
// "DraggableCard author display gating" describe block below can render the full
// DraggableCard tree — including CardFooter's real Edit2/Trash2 icons — without
// every icon needing its own stub here.
vi.mock('lucide-react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('lucide-react')>();
    return {
        ...actual,
        User: () => <span data-testid="user-icon" />,
        ThumbsUp: () => <span data-testid="thumb-icon" />,
    };
});

// ── DraggableCard's dependencies, needed only for the "author display gating"
// describe block below (T028) — mirrors DraggableCard.test.tsx's own mocks,
// since CardHeader itself is presentational and has no knowledge of anonymity;
// the gating this spec requires lives in DraggableCard, its only caller.
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
        i18n: { changeLanguage: () => new Promise(() => { }) },
    }),
    initReactI18next: { type: '3rdParty', init: () => { } },
}));

vi.mock('@/lib/components/ui/Card', () => ({
    default: ({ children, className, ...props }: any) => (
        <div className={className} {...props}>{children}</div>
    ),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, variant, className, loading, ...props }: any) => (
        <button onClick={onClick} disabled={disabled || loading} className={`${className} ${variant}`} {...props}>
            {loading ? 'Loading...' : children}
        </button>
    ),
}));

vi.mock('@/lib/components/ui/TextareaWithEmoji', () => ({
    default: React.forwardRef<HTMLTextAreaElement, any>(
        ({ value, onChange, placeholder, ...props }, ref) => (
            <textarea ref={ref} data-testid="textarea-with-emoji" value={value} onChange={onChange} placeholder={placeholder} {...props} />
        )
    ),
}));

vi.mock('@/lib/components/ui/ColorPicker', () => ({
    default: () => <div data-testid="color-picker" />,
}));

vi.mock('@/lib/components/ui/LinkifyText', () => ({
    default: ({ text, ...props }: any) => <div data-testid="linkify-text" {...props}>{text}</div>,
}));

vi.mock('@/features/boards/retrospective/components/LikeButton', () => ({
    default: () => <div data-testid="like-button" />,
}));

vi.mock('@/features/boards/retrospective/components/EmojiReactions', () => ({
    default: () => <div data-testid="emoji-reactions" />,
}));

vi.mock('@/features/boards/retrospective/components/CardMenu', () => ({
    default: () => <div data-testid="card-menu" />,
}));

vi.mock('@/lib/utils/cardHelpers', async () => {
    const actual = await vi.importActual<typeof import('@/lib/utils/cardHelpers')>('@/lib/utils/cardHelpers');
    return {
        ...actual,
        groupReactions: vi.fn(() => ({})),
        hasUserLiked: vi.fn(() => false),
        getUserReaction: vi.fn(() => null),
    };
});

vi.mock('@/lib/utils/cardColors', () => ({
    getCardStyling: vi.fn(() => 'bg-blue-100'),
    validateColor: vi.fn((color) => color || 'blue'),
}));

vi.mock('@/features/boards/retrospective/contexts/useBoardData', () => ({
    useBoardData: vi.fn(),
}));

const mockUseBoardData = vi.mocked(useBoardData);

describe('CardHeader', () => {
    it('renders the author name and an optional badge', () => {
        render(<CardHeader author="Alice" badge={<span>badge!</span>} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('badge!')).toBeInTheDocument();
    });

    it('uses semantic text tokens', () => {
        const { container } = render(<CardHeader author="Bob" />);
        expect(container.firstChild).toHaveClass('text-text-muted');
    });

    it('renders whatever author string it is given verbatim, with no lookup/resolution logic of its own (spec 020-user-display-name-fix)', () => {
        // CardHeader must stay presentational — resolving a uid to a display name
        // is the caller's responsibility (resolveAuthorDisplayName), not this component's.
        render(<CardHeader author="uid-abc123-not-a-real-name" />);
        expect(screen.getByText('uid-abc123-not-a-real-name')).toBeInTheDocument();
    });
});

describe('CardVoteControl', () => {
    it('shows the vote count and localized labels', () => {
        render(<CardVoteControl votes={4} onVote={vi.fn()} />);
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getByLabelText('retrospective.card.voteUp')).toBeInTheDocument();
        expect(screen.getByLabelText('retrospective.card.voteDown')).toBeInTheDocument();
    });

    it('disables the down-vote at zero and calls onVote otherwise', async () => {
        const onVote = vi.fn();
        const { rerender } = render(<CardVoteControl votes={0} onVote={onVote} />);
        expect(screen.getByLabelText('retrospective.card.voteDown')).toBeDisabled();

        rerender(<CardVoteControl votes={2} onVote={onVote} />);
        await userEvent.click(screen.getByLabelText('retrospective.card.voteUp'));
        expect(onVote).toHaveBeenCalledWith(true);
        await userEvent.click(screen.getByLabelText('retrospective.card.voteDown'));
        expect(onVote).toHaveBeenCalledWith(false);
    });
});

// spec 051-anonymous-board-mode, US2 (FR-003, SC-002), T028: DraggableCard is
// CardHeader's only caller and is the component that must gate the `author` prop
// it hands to CardHeader based on the board's anonymity — CardHeader itself stays
// a dumb renderer of whatever string it's given (see the "renders whatever author
// string it is given verbatim" test above). These tests exercise that gating at
// DraggableCard's boundary, since that's the real seam the contract describes
// (anonymity-ui-behavior-contract.md, "Card author display").
describe('DraggableCard author display gating (spec 051-anonymous-board-mode, US2, T028)', () => {
    const mockCard: CardType = {
        id: 'card-1',
        retrospectiveId: 'retro-1',
        column: 'helped',
        content: 'Test card content',
        color: 'blue' as CardColor,
        votes: 0,
        likes: [],
        reactions: [],
        order: 1,
        createdBy: 'user1',
        createdByName: 'Alice',
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockParticipants: Participant[] = [
        {
            id: 'participant-1',
            userId: 'user1',
            name: 'Alice',
            retrospectiveId: 'retro-1',
            joinedAt: new Date(),
            isActive: true,
            photoURL: null,
        },
    ];

    const baseBoardData = {
        cards: [], groups: [], actionItems: [], columnConfigs: {}, isFacilitator: false,
        participants: mockParticipants, timer: null, myFacilitatorNotes: [],
    };

    it('renders no author name anywhere in the card when the board is anonymous', () => {
        mockUseBoardData.mockReturnValue({
            ...baseBoardData,
            retrospective: { id: 'retro-1', isAnonymous: true } as Retrospective,
        });

        render(<DraggableCard card={mockCard} participants={mockParticipants} currentUser="user1" />);

        expect(screen.queryByText('Alice')).not.toBeInTheDocument();
        expect(screen.queryByText('user1')).not.toBeInTheDocument();
    });

    it('renders the author label exactly as today when the board is not anonymous', () => {
        mockUseBoardData.mockReturnValue({
            ...baseBoardData,
            retrospective: { id: 'retro-1', isAnonymous: false } as Retrospective,
        });

        render(<DraggableCard card={mockCard} participants={mockParticipants} currentUser="user1" />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders the author label when the board has not loaded / predates the isAnonymous field (legacy default)', () => {
        mockUseBoardData.mockReturnValue({
            ...baseBoardData,
            retrospective: null,
        });

        render(<DraggableCard card={mockCard} participants={mockParticipants} currentUser="user1" />);

        expect(screen.getByText('Alice')).toBeInTheDocument();
    });
});
