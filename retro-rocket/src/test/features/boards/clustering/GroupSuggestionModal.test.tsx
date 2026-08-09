import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupSuggestionModal } from '@/features/boards/clustering/components/GroupSuggestionModal';
import { GroupSuggestion, Card } from '@/features/boards/types/card';

// A detectable marker (not a bare fragment passthrough) so tests can assert
// AnimatePresence stays mounted across `isOpen` transitions — required for the modal
// to exit-animate instead of vanishing instantly (design audit finding, spec 028: an
// `if (!isOpen) return null` guard previously sat *before* the component's own
// AnimatePresence, removing it along with everything inside in one render pass).
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

vi.mock('@/features/boards/retrospective/components/DraggableCard', () => ({
    default: ({ card }: any) => <div data-testid={`draggable-card-${card.id}`}>{card.content}</div>,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    ),
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

describe('GroupSuggestionModal', () => {
    const mockCards: Card[] = [
        {
            id: 'card-1',
            content: 'First card',
            column: 'helped',
            createdBy: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            order: 0,
            votes: 0,
            color: 'pastelBlue',
            likes: [],
            reactions: [],
        },
    ];

    const mockSuggestions: GroupSuggestion[] = [
        {
            id: 'suggestion-1',
            cardIds: ['card-1'],
            similarity: 0.8,
            reason: 'Similar content',
            algorithm: 'keyword',
        } as GroupSuggestion,
    ];

    const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        suggestions: mockSuggestions,
        cards: mockCards,
        onAcceptSuggestion: vi.fn(),
        onRejectSuggestion: vi.fn(),
    };

    it('renders modal content when open', () => {
        render(<GroupSuggestionModal {...defaultProps} />);
        expect(screen.getByText('groupSuggestion.group 1')).toBeInTheDocument();
    });

    it('does not render modal content when closed', () => {
        render(<GroupSuggestionModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('groupSuggestion.group 1')).not.toBeInTheDocument();
    });

    it('keeps AnimatePresence mounted even when closed, so the modal can exit-animate instead of being removed via an early return (design audit finding, spec 028)', () => {
        const { rerender } = render(<GroupSuggestionModal {...defaultProps} isOpen={false} />);

        expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(1);

        rerender(<GroupSuggestionModal {...defaultProps} isOpen={true} />);
        expect(screen.getAllByTestId('animate-presence').length).toBeGreaterThanOrEqual(1);
    });

    it('closes on Escape key — a real gap in the previous version, which only closed on backdrop click (FR-012)', () => {
        const onClose = vi.fn();
        render(<GroupSuggestionModal {...defaultProps} onClose={onClose} />);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not listen for Escape while closed', () => {
        const onClose = vi.fn();
        render(<GroupSuggestionModal {...defaultProps} isOpen={false} onClose={onClose} />);

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).not.toHaveBeenCalled();
    });
});
