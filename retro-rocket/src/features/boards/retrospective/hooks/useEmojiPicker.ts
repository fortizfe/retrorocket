import { useState } from 'react';
import {
    useFloating,
    offset,
    flip,
    shift,
    size,
    autoUpdate,
    useClick,
    useDismiss,
    useRole,
    useInteractions,
    type UseFloatingReturn,
} from '@floating-ui/react';
import { EmojiReaction } from '@/features/boards/types/card';

interface UseEmojiPickerOptions {
    disabled?: boolean;
    /** The current user's active reaction, if any (used to toggle removal). */
    userReaction?: string | null;
    onSelect: (emoji: EmojiReaction) => void;
    onRemove: () => void;
}

export interface UseEmojiPicker {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** Floating UI context, needed by `FloatingFocusManager`. */
    context: UseFloatingReturn['context'];
    refs: UseFloatingReturn['refs'];
    floatingStyles: UseFloatingReturn['floatingStyles'];
    getReferenceProps: (props?: Record<string, unknown>) => Record<string, unknown>;
    getFloatingProps: (props?: Record<string, unknown>) => Record<string, unknown>;
    /** Adds the emoji, or removes it when it is already the user's reaction. Closes the picker. */
    selectEmoji: (emoji: EmojiReaction) => void;
}

/**
 * Encapsulates the reaction-picker's open state and anchored positioning.
 *
 * Positioning is delegated to Floating UI (Constitution III): the panel is placed
 * at the trigger with `offset`, kept in the viewport with `flip`/`shift`, and
 * `autoUpdate` repositions it while open when the board scrolls or the window
 * resizes (FR-008, FR-009, FR-009a). Floating UI computes the position in a layout
 * effect before paint, so the panel never flashes at a wrong location (FR-008).
 */
export function useEmojiPicker({
    disabled = false,
    userReaction,
    onSelect,
    onRemove,
}: UseEmojiPickerOptions): UseEmojiPicker {
    const [open, setOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: (next) => {
            if (!disabled) setOpen(next);
        },
        placement: 'bottom-start',
        middleware: [
            offset(8),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            // Cap the panel height to the space available in the viewport so it
            // never overflows the fold; the panel scrolls internally instead
            // (FR-009: stays fully within the viewport).
            size({
                padding: 8,
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(180, availableHeight)}px`;
                },
            }),
        ],
        whileElementsMounted: autoUpdate,
    });

    const click = useClick(context, { enabled: !disabled });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'dialog' });
    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

    const selectEmoji = (emoji: EmojiReaction) => {
        if (userReaction === emoji) {
            onRemove();
        } else {
            onSelect(emoji);
        }
        setOpen(false);
    };

    return {
        open,
        setOpen,
        context,
        refs,
        floatingStyles,
        getReferenceProps,
        getFloatingProps,
        selectEmoji,
    };
}
