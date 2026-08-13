import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupSuggestionModal } from '@/features/boards/clustering/components/GroupSuggestionModal';
import { GroupSuggestion, Card } from '@/features/boards/types/card';

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

    // spec 044: mounting/unmounting (previously this component's own `isOpen` prop)
    // and Escape/outside-click dismissal are now the caller's responsibility
    // (ColumnHeaderMenu.tsx's `useBoardMenuOverlay` instance) — this component only
    // ever renders its content, unconditionally, once mounted.
    const defaultProps = {
        onClose: vi.fn(),
        suggestions: mockSuggestions,
        cards: mockCards,
        onAcceptSuggestion: vi.fn(),
        onRejectSuggestion: vi.fn(),
    };

    it('renders suggestion content', () => {
        render(<GroupSuggestionModal {...defaultProps} />);
        expect(screen.getByText('groupSuggestion.group 1')).toBeInTheDocument();
    });

    it('renders the loading state instead of suggestions while loading', () => {
        render(<GroupSuggestionModal {...defaultProps} loading />);
        expect(screen.queryByText('groupSuggestion.group 1')).not.toBeInTheDocument();
        expect(screen.getByText('groupSuggestion.analyzing')).toBeInTheDocument();
    });

    it('renders the empty state when there are no suggestions', () => {
        render(<GroupSuggestionModal {...defaultProps} suggestions={[]} />);
        expect(screen.getByText('groupSuggestion.noSuggestionsTitle')).toBeInTheDocument();
    });

    it('calls onClose when the header close button is clicked', () => {
        const onClose = vi.fn();
        render(<GroupSuggestionModal {...defaultProps} onClose={onClose} />);

        fireEvent.click(screen.getByLabelText('common.close'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
