import { useCallback, useState } from 'react';
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
    type Placement,
    type UseFloatingReturn,
} from '@floating-ui/react';

/**
 * Derives a CSS `transform-origin` from Floating UI's *resolved* placement
 * (post-`flip`, not the configured preference) so the panel scales from the
 * edge nearest its trigger instead of its own center — required for any
 * trigger-anchored popover/menu/dropdown (`animate` skill, "Never Ship:
 * `transform-origin: center` on a trigger-anchored popover").
 */
function transformOriginFromPlacement(placement: Placement): string {
    const [side, alignment] = placement.split('-') as [string, string | undefined];
    if (side === 'top' || side === 'bottom') {
        const y = side === 'top' ? 'bottom' : 'top';
        const x = alignment === 'start' ? 'left' : alignment === 'end' ? 'right' : 'center';
        return `${y} ${x}`;
    }
    const x = side === 'left' ? 'right' : 'left';
    const y = alignment === 'start' ? 'top' : alignment === 'end' ? 'bottom' : 'center';
    return `${y} ${x}`;
}

interface UseBoardMenuOverlayOptions {
    /** Controlled open state — omit for the hook to manage its own state. */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    placement?: Placement;
    /** Distance in px between the trigger and the floating panel. */
    offsetPx?: number;
    /** ARIA role of the floating element — 'menu' for dropdown menus (the
     * default), 'dialog' for larger panels like the facilitator tabs. */
    role?: 'menu' | 'dialog';
    disabled?: boolean;
}

export interface UseBoardMenuOverlay {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** Floating UI context, needed by `FloatingFocusManager`. */
    context: UseFloatingReturn['context'];
    refs: UseFloatingReturn['refs'];
    floatingStyles: UseFloatingReturn['floatingStyles'];
    getReferenceProps: (props?: Record<string, unknown>) => Record<string, unknown>;
    getFloatingProps: (props?: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Shared anchored-overlay behavior for the board's menus and popovers (options
 * menu, facilitator menu, card menu, column header menu — `research.md` §3,
 * Constitution Principle II) — consolidates the positioning/outside-click/
 * Escape-dismissal logic each of those previously hand-rolled independently.
 *
 * Positioning is delegated to Floating UI (Constitution III, same foundation
 * `useEmojiPicker` already established for the reaction picker): the panel is
 * placed at the trigger with `offset`, kept in the viewport with `flip`/
 * `shift`, height-capped so it scrolls internally instead of overflowing the
 * viewport, and `autoUpdate` repositions it while open on scroll/resize.
 * `useDismiss` covers both outside-press and Escape-key dismissal (FR-012).
 * Consumers render the floating panel inside `FloatingPortal`/
 * `FloatingFocusManager` (using the returned `context`) for focus-trap and
 * return-to-trigger behavior, matching `ReactionPicker.tsx`'s existing pattern.
 */
export function useBoardMenuOverlay(options: UseBoardMenuOverlayOptions = {}): UseBoardMenuOverlay {
    const {
        open: controlledOpen,
        onOpenChange,
        placement = 'bottom-end',
        offsetPx = 8,
        role: roleOption = 'menu',
        disabled = false,
    } = options;

    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const open = controlledOpen ?? uncontrolledOpen;

    // Stable identity across renders (feature 038) — callers that need `setOpen` in a
    // `useEffect` dependency array (e.g. RetrospectiveTopbar.tsx's success→auto-close
    // effect) would otherwise re-run that effect on every render, since an inline
    // function has a new identity each time.
    const setOpen = useCallback(
        (next: boolean) => {
            if (disabled) return;
            if (controlledOpen === undefined) setUncontrolledOpen(next);
            onOpenChange?.(next);
        },
        [disabled, controlledOpen, onOpenChange]
    );

    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement,
        middleware: [
            offset(offsetPx),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            // Cap the panel height to the space available in the viewport so it
            // never overflows the fold; the panel scrolls internally instead.
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
    const role = useRole(context, { role: roleOption });
    const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

    return {
        open,
        setOpen,
        context,
        refs,
        floatingStyles: {
            ...floatingStyles,
            transformOrigin: transformOriginFromPlacement(context.placement),
        },
        getReferenceProps,
        getFloatingProps,
    };
}
