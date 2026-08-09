import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CardMenu from '@/features/boards/retrospective/components/CardMenu';
import { Card } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
    MoreVertical: () => <div data-testid="more-vertical-icon" />,
    Target: () => <div data-testid="target-icon" />,
}));

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/lib/components/ui/DatePicker', () => ({
    default: ({ label, value, onChange }: any) => (
        <div>
            <label htmlFor="due-date-input">{label}</label>
            <input
                id="due-date-input"
                type="date"
                value={value ? value.toISOString().slice(0, 10) : ''}
                onChange={(e) => onChange(e.target.value ? new Date(e.target.value) : null)}
            />
        </div>
    ),
}));

describe('CardMenu', () => {
    const card: Card = {
        id: 'card-1',
        content: 'A card',
        column: 'helped',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'retro-1',
    };

    const participants: Participant[] = [
        { id: 'p1', name: 'Alice', userId: 'user-2', retrospectiveId: 'retro-1', joinedAt: new Date() },
    ];

    const baseProps = {
        card,
        participants,
        canConvertToAction: true,
        onConvertToAction: vi.fn(),
    };

    it('renders nothing when canConvertToAction is false — owner-only, absent not disabled (FR-007)', () => {
        render(<CardMenu {...baseProps} canConvertToAction={false} />);
        expect(screen.queryByTitle('retrospective.cards.convertToAction')).not.toBeInTheDocument();
    });

    it('opens the convert-to-action panel on trigger click', () => {
        render(<CardMenu {...baseProps} />);

        expect(screen.queryByText('retrospective.cards.convertToActionTitle')).not.toBeInTheDocument();
        fireEvent.click(screen.getByTitle('retrospective.cards.convertToAction'));
        expect(screen.getByText('retrospective.cards.convertToActionTitle')).toBeInTheDocument();
    });

    it('calls onConvertToAction with the selected assignee, resolved name, and due date', () => {
        const onConvertToAction = vi.fn();
        render(<CardMenu {...baseProps} onConvertToAction={onConvertToAction} />);

        fireEvent.click(screen.getByTitle('retrospective.cards.convertToAction'));
        fireEvent.change(screen.getByTitle('retrospective.cards.selectResponsible'), { target: { value: 'user-2' } });
        fireEvent.click(screen.getByText('retrospective.cards.convert'));

        expect(onConvertToAction).toHaveBeenCalledWith('card-1', 'user-2', 'Alice', null);
    });

    it('closes the panel on Cancel without calling onConvertToAction', () => {
        const onConvertToAction = vi.fn();
        render(<CardMenu {...baseProps} onConvertToAction={onConvertToAction} />);

        fireEvent.click(screen.getByTitle('retrospective.cards.convertToAction'));
        fireEvent.click(screen.getByText('common.cancel'));

        expect(onConvertToAction).not.toHaveBeenCalled();
        expect(screen.queryByText('retrospective.cards.convertToActionTitle')).not.toBeInTheDocument();
    });

    it('closes on Escape — provided by the shared useBoardMenuOverlay hook (research.md §3, FR-012)', () => {
        render(<CardMenu {...baseProps} />);

        fireEvent.click(screen.getByTitle('retrospective.cards.convertToAction'));
        expect(screen.getByText('retrospective.cards.convertToActionTitle')).toBeInTheDocument();

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByText('retrospective.cards.convertToActionTitle')).not.toBeInTheDocument();
    });
});
