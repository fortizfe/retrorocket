import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardFooter from '@/features/boards/retrospective/components/CardFooter';

const language = { current: 'en' };
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, currentLanguage: language.current }),
}));

vi.mock('lucide-react', () => ({
    Edit2: () => <span data-testid="edit-icon" />,
    Trash2: () => <span data-testid="trash-icon" />,
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => (
        <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>
    ),
}));

const baseProps = {
    createdAt: new Date('2026-07-22T10:00:00.000Z'),
    canEdit: true,
    isEditing: false,
    isDeleting: false,
    canSave: true,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
};

describe('CardFooter', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        language.current = 'en';
    });

    it('formats the date using the active language, not a hardcoded es-ES locale', () => {
        const expectedEn = new Intl.DateTimeFormat('en', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }).format(baseProps.createdAt);
        const { rerender } = render(<CardFooter {...baseProps} />);
        expect(screen.getByText(expectedEn)).toBeInTheDocument();

        language.current = 'es';
        const expectedEs = new Intl.DateTimeFormat('es', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
        }).format(baseProps.createdAt);
        rerender(<CardFooter {...baseProps} />);
        expect(screen.getByText(expectedEs)).toBeInTheDocument();
    });

    it('shows edit/delete actions with localized labels when not editing', async () => {
        render(<CardFooter {...baseProps} />);
        await userEvent.click(screen.getByLabelText('retrospective.card.editCard'));
        expect(baseProps.onEdit).toHaveBeenCalled();
        await userEvent.click(screen.getByLabelText('retrospective.card.deleteCard'));
        expect(baseProps.onDelete).toHaveBeenCalled();
    });

    it('shows save/cancel while editing', async () => {
        render(<CardFooter {...baseProps} isEditing />);
        await userEvent.click(screen.getByText('retrospective.card.save'));
        expect(baseProps.onSave).toHaveBeenCalled();
        await userEvent.click(screen.getByText('retrospective.card.cancel'));
        expect(baseProps.onCancel).toHaveBeenCalled();
    });

    it('hides actions when canEdit is false', () => {
        render(<CardFooter {...baseProps} canEdit={false} />);
        expect(screen.queryByLabelText('retrospective.card.editCard')).toBeNull();
    });
});
