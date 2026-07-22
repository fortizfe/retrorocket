import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReactionPicker from '@/features/boards/retrospective/components/ReactionPicker';
import { useEmojiPicker } from '@/features/boards/retrospective/hooks/useEmojiPicker';
import { EmojiReaction } from '@/features/boards/types/card';

// Render the FloatingPortal inline so queries can find the dialog.
vi.mock('react-dom', async () => {
    const actual = await vi.importActual('react-dom');
    return { ...actual, createPortal: (el: any) => el };
});

vi.mock('@/lib/utils/emojiConstants', () => ({
    EMOJI_CATEGORIES: {
        Emociones: ['😀', '😃'],
        Objetos: ['💡', '🔥'],
    },
}));

const HINT = 'Click an emoji to react';
vi.mock('@/lib/hooks/useLanguage', () => ({
    useLanguage: () => ({
        t: (key: string, opts?: any) => {
            if (key === 'retrospective.emojiReactions.picker.hint') return HINT;
            if (key === 'retrospective.emojiReactions.picker.ariaLabel') return 'Emoji reaction picker';
            if (key === 'retrospective.emojiReactions.reactions.reactWith') return `React with ${opts?.emoji}`;
            // i18next default-value form: t(key, 'Default') → returns the string default.
            if (typeof opts === 'string') return opts;
            return key;
        },
    }),
}));

/** Harness that opens a real Floating UI context and renders ReactionPicker. */
function Harness({ onSelect }: { onSelect: (e: EmojiReaction) => void }) {
    const picker = useEmojiPicker({ onSelect, onRemove: vi.fn() });
    return (
        <div>
            <button ref={picker.refs.setReference} {...picker.getReferenceProps()}>
                open
            </button>
            {picker.open && (
                <ReactionPicker
                    context={picker.context}
                    setFloating={picker.refs.setFloating}
                    floatingStyles={picker.floatingStyles}
                    getFloatingProps={picker.getFloatingProps}
                    userReaction={null}
                    onSelect={picker.selectEmoji}
                />
            )}
        </div>
    );
}

describe('ReactionPicker', () => {
    it('renders a dialog with an accessible name, categories, emojis, and a localized hint', async () => {
        render(<Harness onSelect={vi.fn()} />);
        await userEvent.click(screen.getByRole('button', { name: 'open' }));

        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        // Semantic-token surface, no hardcoded palette.
        expect(dialog.className).toContain('bg-surface-raised');
        expect(dialog.className).not.toMatch(/bg-(gray|slate|zinc)-\d/);

        expect(screen.getByRole('button', { name: 'Emociones' })).toBeInTheDocument();
        expect(screen.getByText('😀')).toBeInTheDocument();
        expect(screen.getByText(HINT)).toBeInTheDocument();
    });

    it('invokes onSelect when an emoji is chosen', async () => {
        const onSelect = vi.fn();
        render(<Harness onSelect={onSelect} />);
        await userEvent.click(screen.getByRole('button', { name: 'open' }));
        await userEvent.click(screen.getByText('😀'));
        expect(onSelect).toHaveBeenCalledWith('😀');
    });
});
