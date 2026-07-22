import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactionBadge from '@/features/boards/retrospective/components/ReactionBadge';
import { GroupedReaction } from '@/features/boards/types/card';

vi.mock('framer-motion', () => ({
    motion: {
        button: ({ children, whileHover, whileTap, initial, animate, ...props }: any) => (
            <button {...props}>{children}</button>
        ),
    },
}));

const reaction: GroupedReaction = { emoji: '😀', count: 3, users: ['a', 'b', 'c'] };

describe('ReactionBadge', () => {
    it('shows the emoji and count', () => {
        render(<ReactionBadge reaction={reaction} isMine={false} onToggle={vi.fn()} tooltip="3 reactions" />);
        expect(screen.getByText('😀')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('signals the "mine" state beyond color (aria-pressed + thicker border)', () => {
        render(<ReactionBadge reaction={reaction} isMine onToggle={vi.fn()} tooltip="you reacted" />);
        const btn = screen.getByRole('button');
        expect(btn).toHaveAttribute('aria-pressed', 'true');
        expect(btn.className).toContain('border-2');
        expect(btn.className).toContain('border-info-fg');
    });

    it('uses the localized tooltip as the accessible name', () => {
        render(<ReactionBadge reaction={reaction} isMine={false} onToggle={vi.fn()} tooltip="localized tip" />);
        expect(screen.getByRole('button', { name: 'localized tip' })).toBeInTheDocument();
    });

    it('calls onToggle with the emoji when clicked', async () => {
        const onToggle = vi.fn();
        render(<ReactionBadge reaction={reaction} isMine={false} onToggle={onToggle} tooltip="tip" />);
        await userEvent.click(screen.getByRole('button'));
        expect(onToggle).toHaveBeenCalledWith('😀');
    });

    it('uses semantic tokens, not hardcoded palette colors', () => {
        render(<ReactionBadge reaction={reaction} isMine onToggle={vi.fn()} tooltip="tip" />);
        expect(screen.getByRole('button').className).not.toMatch(/bg-(gray|blue|slate)-\d/);
    });
});
