import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BottomSheet from '@/lib/components/ui/BottomSheet';

vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({ t: (key: string) => key }),
}));

describe('BottomSheet', () => {
    it('renders nothing when closed', () => {
        render(
            <BottomSheet open={false} onClose={vi.fn()} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders as a dialog labeled by its title when open, with its content', () => {
        render(
            <BottomSheet open={true} onClose={vi.fn()} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        expect(screen.getByRole('dialog', { name: 'Opciones' })).toBeInTheDocument();
        expect(screen.getByText('content')).toBeInTheDocument();
    });

    it('calls onClose when the close button is activated', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <BottomSheet open={true} onClose={onClose} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        await user.click(screen.getByRole('button', { name: 'common.close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose on Escape', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <BottomSheet open={true} onClose={onClose} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        await user.keyboard('{Escape}');
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the backdrop is clicked', async () => {
        const user = userEvent.setup();
        const onClose = vi.fn();
        render(
            <BottomSheet open={true} onClose={onClose} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        await user.click(screen.getByTestId('bottom-sheet-backdrop'));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('moves focus to the close button when it opens, for keyboard/switch-control users', () => {
        render(
            <BottomSheet open={true} onClose={vi.fn()} title="Opciones">
                <p>content</p>
            </BottomSheet>
        );

        expect(screen.getByRole('button', { name: 'common.close' })).toHaveFocus();
    });
});
