import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CardFooter from '@/features/boards/retrospective/components/CardFooter';

/**
 * T007 (058-card-owner-action-hub, RED phase): rewritten for the new `CardFooter`
 * contract (contracts/owner-action-menu.md §3) — the footer no longer owns
 * `onEdit`/`onDelete`/`isDeleting` or the `Edit2`/`Trash2` buttons, which move into
 * `OwnerActionMenu` (T012). The footer keeps only the timestamp, Save/Cancel while
 * editing, and a trailing `actions` slot the caller (DraggableCard, T015) composes
 * from `OwnerActionMenu` and/or the facilitator `CardMenu`.
 *
 * This is expected to fail against today's `CardFooter.tsx` (which still requires
 * `onEdit`/`onDelete`/`isDeleting` and renders the removed buttons) until T013
 * simplifies it.
 */

const language = { current: 'en' };
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key, currentLanguage: language.current }),
}));

vi.mock('@/lib/components/ui/Button', () => ({
    default: ({ children, onClick, disabled, 'aria-label': ariaLabel }: any) => (
        <button onClick={onClick} disabled={disabled} aria-label={ariaLabel}>{children}</button>
    ),
}));

// New contract: no `onEdit`/`onDelete`/`isDeleting` — only the timestamp, Save/Cancel
// while editing, and the trailing `actions` slot.
const baseProps = {
    createdAt: new Date('2026-07-22T10:00:00.000Z'),
    canEdit: true,
    isEditing: false,
    canSave: true,
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

    it('renders the trailing actions slot', () => {
        render(<CardFooter {...baseProps} actions={<button>Slot action</button>} />);
        expect(screen.getByText('Slot action')).toBeInTheDocument();
    });

    it('renders nothing extra when actions is omitted', () => {
        render(<CardFooter {...baseProps} />);
        expect(screen.queryByText('Slot action')).not.toBeInTheDocument();
    });

    describe('Save/Cancel while editing', () => {
        it('renders Save and Cancel when isEditing && canEdit, and wires their callbacks', async () => {
            const onSave = vi.fn();
            const onCancel = vi.fn();
            render(<CardFooter {...baseProps} isEditing canEdit onSave={onSave} onCancel={onCancel} />);

            await userEvent.click(screen.getByText('retrospective.card.save'));
            expect(onSave).toHaveBeenCalledTimes(1);

            await userEvent.click(screen.getByText('retrospective.card.cancel'));
            expect(onCancel).toHaveBeenCalledTimes(1);
        });

        it('disables Save when canSave is false', () => {
            render(<CardFooter {...baseProps} isEditing canEdit canSave={false} />);
            expect(screen.getByText('retrospective.card.save').closest('button')).toBeDisabled();
        });

        it('does not render Save/Cancel when not editing', () => {
            render(<CardFooter {...baseProps} isEditing={false} canEdit />);
            expect(screen.queryByText('retrospective.card.save')).not.toBeInTheDocument();
            expect(screen.queryByText('retrospective.card.cancel')).not.toBeInTheDocument();
        });

        it('does not render Save/Cancel when editing is requested but canEdit is false', () => {
            render(<CardFooter {...baseProps} isEditing canEdit={false} />);
            expect(screen.queryByText('retrospective.card.save')).not.toBeInTheDocument();
            expect(screen.queryByText('retrospective.card.cancel')).not.toBeInTheDocument();
        });

        it('never hides Save/Cancel behind hover-only opacity classes (research.md §3, FR-012)', () => {
            render(<CardFooter {...baseProps} isEditing canEdit />);
            const saveButton = screen.getByText('retrospective.card.save');
            let node: HTMLElement | null = saveButton;
            while (node) {
                expect(node.className).not.toMatch(/\bopacity-0\b/);
                node = node.parentElement;
            }
        });
    });

    it('never renders an element labelled retrospective.card.editCard or retrospective.card.deleteCard — those controls moved into OwnerActionMenu', () => {
        // Not editing, canEdit=true: the exact state in which today's CardFooter still
        // renders its own Edit2/Trash2 buttons with these labels — the case this test
        // must catch (RED against the current implementation; green once T013 removes
        // them). Checking the isEditing=true state would pass trivially either way,
        // since even today's component swaps those buttons for Save/Cancel there.
        render(<CardFooter {...baseProps} isEditing={false} canEdit />);
        expect(screen.queryByLabelText('retrospective.card.editCard')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('retrospective.card.deleteCard')).not.toBeInTheDocument();
    });
});
