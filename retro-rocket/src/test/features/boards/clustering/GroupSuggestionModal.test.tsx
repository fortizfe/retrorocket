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
        {
            id: 'card-2',
            content: 'Second card',
            column: 'helped',
            createdBy: 'user1',
            createdAt: new Date(),
            updatedAt: new Date(),
            retrospectiveId: 'retro-1',
            order: 1,
            votes: 0,
            color: 'pastelBlue',
            likes: [],
            reactions: [],
        },
    ];

    const mockSuggestions: GroupSuggestion[] = [
        { id: 'suggestion-1', cardIds: ['card-1'], similarity: 0.8, suggestedTitle: 'Suggested title one' },
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

    describe('inline-editable suggested title (spec 047, FR-001/FR-002/FR-003)', () => {
        it('pre-fills the title input from suggestedTitle and caps it at 35 characters', () => {
            render(<GroupSuggestionModal {...defaultProps} />);
            const input = screen.getByTestId('suggestion-title-input-suggestion-1') as HTMLInputElement;
            expect(input.value).toBe('Suggested title one');
            expect(input.maxLength).toBe(35);
        });

        it('lets the user edit the title inline, in place, within the panel', () => {
            render(<GroupSuggestionModal {...defaultProps} />);
            const input = screen.getByTestId('suggestion-title-input-suggestion-1') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'My custom title' } });
            expect(input.value).toBe('My custom title');
        });

        it('keeps each suggestion\'s title edit isolated — editing one does not affect another (FR-006)', () => {
            const twoSuggestions: GroupSuggestion[] = [
                { id: 'suggestion-1', cardIds: ['card-1'], similarity: 0.8, suggestedTitle: 'Title one' },
                { id: 'suggestion-2', cardIds: ['card-2'], similarity: 0.7, suggestedTitle: 'Title two' },
            ];
            render(<GroupSuggestionModal {...defaultProps} suggestions={twoSuggestions} />);

            const input1 = screen.getByTestId('suggestion-title-input-suggestion-1') as HTMLInputElement;
            const input2 = screen.getByTestId('suggestion-title-input-suggestion-2') as HTMLInputElement;

            fireEvent.change(input1, { target: { value: 'Edited only one' } });

            expect(input1.value).toBe('Edited only one');
            expect(input2.value).toBe('Title two');
        });

        it('passes the edited title through onAcceptSuggestion when the group is accepted (FR-004)', () => {
            const onAcceptSuggestion = vi.fn();
            render(<GroupSuggestionModal {...defaultProps} onAcceptSuggestion={onAcceptSuggestion} />);

            const input = screen.getByTestId('suggestion-title-input-suggestion-1') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'Edited before accept' } });
            fireEvent.click(screen.getByText('groupSuggestion.createGroup'));

            expect(onAcceptSuggestion).toHaveBeenCalledTimes(1);
            expect(onAcceptSuggestion.mock.calls[0][0].suggestedTitle).toBe('Edited before accept');
        });

        it('passes the original AI-suggested title through onAcceptSuggestion when left unedited (FR-004)', () => {
            const onAcceptSuggestion = vi.fn();
            render(<GroupSuggestionModal {...defaultProps} onAcceptSuggestion={onAcceptSuggestion} />);

            fireEvent.click(screen.getByText('groupSuggestion.createGroup'));

            expect(onAcceptSuggestion.mock.calls[0][0].suggestedTitle).toBe('Suggested title one');
        });

        it('discards the title edit when the suggestion is rejected — a later, different suggestion never sees the leftover edit (FR-007)', () => {
            const { rerender } = render(<GroupSuggestionModal {...defaultProps} />);

            const input = screen.getByTestId('suggestion-title-input-suggestion-1') as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'An edit that should be discarded' } });
            fireEvent.click(screen.getByText('groupSuggestion.discard'));

            expect(defaultProps.onRejectSuggestion).toHaveBeenCalledWith('suggestion-1');

            // Simulate the parent (GroupableColumn) replacing the rejected suggestion
            // with a fresh one that happens to reuse the same id slot in the array.
            const freshSuggestion: GroupSuggestion[] = [
                { id: 'suggestion-2', cardIds: ['card-2'], similarity: 0.6, suggestedTitle: 'Brand new suggestion' },
            ];
            rerender(<GroupSuggestionModal {...defaultProps} suggestions={freshSuggestion} />);

            const freshInput = screen.getByTestId('suggestion-title-input-suggestion-2') as HTMLInputElement;
            expect(freshInput.value).toBe('Brand new suggestion');
        });
    });
});
