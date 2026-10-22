import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingPortal } from '@floating-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combine, StickyNote, Unlink, Users } from 'lucide-react';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';
import { useBoardData } from '@/features/boards/retrospective/contexts/useBoardData';
import { resolveDisplayName } from '@/lib/utils/cardHelpers';
import { useOptionalColumnGroupingContext } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { GroupingConflictError } from '@/features/boards/clustering/hooks/useCardGroups';
import type { Card, MoveCardResult, MoveTarget } from '@/features/boards/types/card';

/**
 * 059-drag-to-group-cards, US5 (T059) — design & motion decisions (`apple-design` +
 * `emil-design-eng` for icon/placement/material, `animate` for the panel; research.md §11,
 * contracts G1-G7). Condensed in the 058 OwnerActionMenu precedent.
 *
 * Trigger icon: `Combine` (lucide, 16px, `text-text-secondary`): two squares merging, which
 * is exactly what the action does (join this card with another). Rejected: `Settings2`
 * (the owner hub) and `MoreVertical` (the facilitator CardMenu) are taken and would make
 * the three footer controls indistinguishable; `Group`/`Layers` read as "select/stack",
 * `Link` as a URL. The accessible name carries the meaning (`groupWith` / `moveToGroup`),
 * the icon is decorative.
 *
 * Placement: the LAST control of the footer `actions` row, after OwnerActionMenu and
 * CardMenu. Those two are per-role; this one is for everyone, so it sits at the trailing
 * edge where it never displaces them and never jumps when the role-dependent controls
 * appear. Always visible (never hover-only), 44px below `md`, 36px at `md`+, with the shared
 * focus ring and the same `active:scale-[0.97]` press feedback as its siblings.
 *
 * Panel: the OwnerActionMenu material (`bg-surface-raised/95 backdrop-blur-xl rounded-2xl
 * shadow-2xl border border-border-default/40`, `p-2`), placed `top-end` through
 * `useBoardMenuOverlay`. It is a `role="listbox"`, not a menu: the user is CHOOSING a
 * target, so options carry `aria-selected` and the listbox keeps DOM focus with
 * `aria-activedescendant` (focus never leaves it while the arrows move). Groups are marked
 * with `Users`, cards with `StickyNote`, "Remove from group" with `Unlink` and a hairline
 * above it, so the three kinds are distinguishable without colour or position alone.
 * Options are `min-h-11` (44px) below `md`, 36px at `md`+.
 *
 * Motion (animate gate): occasional, user-initiated, anchored to its trigger, so it
 * animates. Same as OwnerActionMenu: 150 ms, `cubic-bezier(0.23, 1, 0.32, 1)`, full
 * transform strings `scale(0.95) translateY(4px)` -> identity, `transformOrigin` from the
 * hook (the edge nearest the trigger), exit the mirror at the same duration. No per-option
 * stagger (a long list would blow the 200 ms cap). Interruptible: framer retargets from the
 * live value. Reduced motion needs no code here: the app-root `MotionConfig
 * reducedMotion="user"` strips the transform, leaving the opacity fade.
 *
 * Focus (G5/G7). No FloatingFocusManager: its return-focus-to-trigger would fight the
 * focus rules below. Escape / outside press / Tab / a rejected move return focus to the
 * trigger. A completed move does not (the card usually re-mounts elsewhere, so the menu
 * itself may be gone): after it settles the moved card's drag handle, else the card root,
 * else the column, takes focus; when a group was created the title editor's auto-edit owns
 * focus and the menu stays out of its way.
 */

/** Resolved once at module level so the panel keeps a stable component identity across
 * re-renders (the active option changes on every arrow key and must not remount the list). */
const MotionPanel = motion.div;

const EXCERPT_MAX = 60;

const excerptOf = (content: string): string => {
    const flat = content.replace(/\s+/g, ' ').trim();
    return flat.length > EXCERPT_MAX ? `${flat.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : flat;
};

type Option =
    | { kind: 'group'; key: string; groupId: string; title: string; count: number }
    | { kind: 'card'; key: string; cardId: string; excerpt: string; author: string }
    | { kind: 'remove'; key: string };

const nextFrame = (): Promise<void> =>
    new Promise((resolve) => {
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve());
        else setTimeout(resolve, 16);
    });

const cssAttr = (value: string): string => value.replace(/["\\]/g, '\\$&');

interface CardGroupingMenuProps {
    sourceCard: Card;
}

export const CardGroupingMenu: React.FC<CardGroupingMenuProps> = ({ sourceCard }) => {
    const { t } = useLanguage();
    const ctx = useOptionalColumnGroupingContext();
    const { retrospective, participants } = useBoardData();
    const isAnonymous = retrospective?.isAnonymous === true;

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const listboxRef = useRef<HTMLDivElement | null>(null);
    const columnRef = useRef<HTMLElement | null>(null);
    const sourceRootRef = useRef<HTMLElement | null>(null);
    // Set while a selection is in flight: the close that follows must not pull focus back to
    // the trigger (focus is decided once the move settles).
    const skipFocusReturnRef = useRef(false);
    // Bumped whenever the menu is opened again or a new selection starts: a pending
    // post-move focus restore from an earlier selection must then give way.
    const focusTokenRef = useRef(0);
    // Latest value, readable after the menu (and its closure) is long gone.
    const pendingEditRef = useRef<string | null>(null);
    pendingEditRef.current = ctx?.pendingEditGroupId ?? null;

    const groupedSource = !!sourceCard.groupId;

    const options: Option[] = [];
    if (ctx) {
        for (const item of ctx.items) {
            if (item.kind === 'group' && item.group.id !== sourceCard.groupId) {
                options.push({
                    kind: 'group',
                    key: item.id,
                    groupId: item.group.id,
                    title: item.group.title?.trim() || t('retrospective.groupCard.defaultGroupTitle'),
                    count: 1 + item.group.memberCardIds.length,
                });
            }
        }
        for (const item of ctx.items) {
            if (item.kind === 'card' && item.card.id !== sourceCard.id) {
                options.push({
                    kind: 'card',
                    key: item.id,
                    cardId: item.card.id,
                    excerpt: excerptOf(item.card.content),
                    author: isAnonymous
                        ? ''
                        : resolveDisplayName(item.card.createdBy, item.card.createdByName, participants, t('retrospective.grouping.unknownAuthor')),
                });
            }
        }
        if (groupedSource) options.push({ kind: 'remove', key: 'remove' });
    }

    const { setOpen, refs, floatingStyles, getReferenceProps, getFloatingProps } = useBoardMenuOverlay({
        open: isOpen,
        onOpenChange: (next) => {
            if (next) {
                columnRef.current = triggerRef.current?.closest<HTMLElement>('[data-card-column]') ?? null;
                sourceRootRef.current = triggerRef.current?.closest<HTMLElement>('[data-card-focus-target]') ?? null;
                setActiveIndex(0);
                focusTokenRef.current += 1;
            } else if (!skipFocusReturnRef.current) {
                triggerRef.current?.focus();
            }
            setIsOpen(next);
        },
        placement: 'top-end',
        role: 'menu',
    });

    const setTriggerRef = (el: HTMLButtonElement | null) => {
        triggerRef.current = el;
        refs.setReference(el);
    };

    // The listbox takes DOM focus the moment it mounts (the portal mounts one render after
    // `isOpen` flips, so a callback ref is the reliable hook, not an effect on `isOpen`).
    const setListboxRef = useCallback((el: HTMLDivElement | null) => {
        listboxRef.current = el;
        el?.focus({ preventScroll: true });
    }, []);

    const listboxId = `card-grouping-listbox-${sourceCard.id}`;
    const optionId = (index: number) => `${listboxId}-option-${index}`;

    useEffect(() => {
        if (!isOpen) return;
        document.getElementById(optionId(activeIndex))?.scrollIntoView?.({ block: 'nearest' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeIndex]);

    if (!ctx || !ctx.groupingEnabled || options.length === 0) return null;

    const dragHandleLabel = t('retrospective.card.dragHandle');

    /** Once the move settled, put focus where the card now lives (T063). */
    const restoreFocusAfterMove = async (token: number) => {
        await nextFrame();
        await nextFrame();
        if (token !== focusTokenRef.current) return;
        // Never steal focus the user has already moved on purpose: only restore when it was
        // lost (body, a removed node) or is still inside our own, exiting, listbox.
        const active = document.activeElement;
        const focusLost =
            !active || active === document.body || !active.isConnected || !!listboxRef.current?.contains(active);
        if (!focusLost) return;
        const selector = `[data-card-focus-target][data-card-id="${cssAttr(sourceCard.id)}"]`;
        const roots = Array.from(document.querySelectorAll<HTMLElement>(selector));
        // During a cross-fade the old slot can still be in the DOM: prefer any other match.
        const root = roots.find((el) => el !== sourceRootRef.current) ?? roots.find((el) => el.isConnected) ?? null;
        let target: HTMLElement | null = null;
        if (root) {
            target =
                Array.from(root.querySelectorAll<HTMLElement>('button[aria-label]')).find(
                    (el) => el.getAttribute('aria-label') === dragHandleLabel,
                ) ?? root;
        } else if (columnRef.current?.isConnected) {
            target = columnRef.current;
        }
        if (!target) return;
        if (!target.hasAttribute('tabindex') && !/^(BUTTON|A|INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) {
            target.setAttribute('tabindex', '-1');
        }
        target.focus();
    };

    const announceResult = (option: Option, result: MoveCardResult | void) => {
        if (!ctx.announce) return;
        const created = !!(result && result.createdGroupId);
        let message: string;
        if (option.kind === 'remove') message = t('retrospective.dragGroup.a11y.removedFromGroup');
        else if (option.kind === 'card' || created) message = t('retrospective.dragGroup.a11y.groupCreated');
        else message = t('retrospective.dragGroup.a11y.addedToGroup', { label: option.kind === 'group' ? option.title : '' });
        if (result && result.dissolvedGroupIds && result.dissolvedGroupIds.length > 0) {
            message = `${message} ${t('retrospective.dragGroup.a11y.groupDissolved')}`;
        }
        ctx.announce(message);
    };

    const select = async (option: Option) => {
        const { requestMove, computeOrder, items, announce } = ctx;
        let target: MoveTarget;
        if (option.kind === 'group') target = { kind: 'group', groupId: option.groupId };
        else if (option.kind === 'card') target = { kind: 'card', cardId: option.cardId };
        else {
            const ownIndex = items.findIndex((i) => i.id === `group:${sourceCard.groupId}`);
            const order = computeOrder({ beforeId: `group:${sourceCard.groupId}`, afterId: ownIndex >= 0 ? items[ownIndex + 1]?.id : undefined });
            target = { kind: 'position', order };
        }

        skipFocusReturnRef.current = true;
        const token = ++focusTokenRef.current;
        setOpen(false);
        let result: MoveCardResult | void;
        try {
            result = await requestMove(sourceCard.id, target);
        } catch (error: unknown) {
            // The column already toasted (X1); this is the screen-reader twin.
            if (error instanceof GroupingConflictError) announce?.(t('retrospective.dragGroup.conflict'));
            skipFocusReturnRef.current = false;
            if (triggerRef.current?.isConnected) triggerRef.current.focus();
            return;
        }
        skipFocusReturnRef.current = false;
        announceResult(option, result);
        // A created group's title editor takes focus itself: do not steal it back.
        if ((result && result.createdGroupId) || pendingEditRef.current) return;
        await restoreFocusAfterMove(token);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        const last = options.length - 1;
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActiveIndex((i) => (i >= last ? 0 : i + 1));
                return;
            case 'ArrowUp':
                event.preventDefault();
                setActiveIndex((i) => (i <= 0 ? last : i - 1));
                return;
            case 'Home':
                event.preventDefault();
                setActiveIndex(0);
                return;
            case 'End':
                event.preventDefault();
                setActiveIndex(last);
                return;
            case 'Enter':
            case ' ':
                event.preventDefault();
                void select(options[Math.min(activeIndex, last)]);
                return;
            case 'Tab':
                event.preventDefault();
                setOpen(false);
                return;
            default:
                return;
        }
    };

    const triggerLabel = t(groupedSource ? 'retrospective.dragGroup.moveToGroup' : 'retrospective.dragGroup.groupWith');
    const listboxLabel = t(groupedSource ? 'retrospective.dragGroup.moveTitle' : 'retrospective.dragGroup.pickerTitle');

    return (
        <>
            <button
                ref={setTriggerRef}
                {...getReferenceProps()}
                type="button"
                aria-label={triggerLabel}
                title={triggerLabel}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={isOpen ? listboxId : undefined}
                className="min-w-11 min-h-11 md:min-w-9 md:min-h-9 inline-flex items-center justify-center rounded-lg hover:bg-surface transition-[background-color,transform] active:scale-[0.97] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-1"
            >
                <Combine className="w-4 h-4 text-text-secondary" aria-hidden="true" />
            </button>

            <FloatingPortal preserveTabOrder={false}>
                <AnimatePresence>
                    {isOpen && (
                        // Positioning wrapper (Floating UI's ref/style); the animated listbox is
                        // nested so framer's transform never overwrites the positioning.
                        <div
                            ref={refs.setFloating}
                            style={floatingStyles}
                            {...getFloatingProps()}
                            role="presentation"
                            className="z-[9999]"
                        >
                            <MotionPanel
                                ref={setListboxRef}
                                id={listboxId}
                                role="listbox"
                                tabIndex={-1}
                                aria-label={listboxLabel}
                                aria-activedescendant={optionId(Math.min(activeIndex, options.length - 1))}
                                onKeyDown={handleKeyDown}
                                initial={{ opacity: 0, transform: 'scale(0.95) translateY(4px)' }}
                                animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                                exit={{ opacity: 0, transform: 'scale(0.95) translateY(4px)', transition: { duration: 0.1, ease: [0.23, 1, 0.32, 1] } }}
                                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                                style={{ transformOrigin: floatingStyles.transformOrigin }}
                                className="bg-surface-raised/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-border-default/40 w-[280px] max-w-[calc(100vw-16px)] max-h-[60vh] overflow-auto p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                            >
                                {options.map((option, index) => {
                                    const active = index === Math.min(activeIndex, options.length - 1);
                                    return (
                                        // Options are driven by the listbox's key handling
                                        // (aria-activedescendant); the click is the pointer path.
                                        // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                                        <div
                                            key={option.key}
                                            id={optionId(index)}
                                            role="option"
                                            tabIndex={-1}
                                            aria-selected={active}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            onClick={() => void select(option)}
                                            className={`flex items-center gap-2 px-3 min-h-11 md:min-h-9 rounded-lg cursor-pointer transition-colors ${
                                                active ? 'bg-surface ring-2 ring-focus ring-inset' : ''
                                            } ${option.kind === 'remove' ? 'mt-1 border-t border-border-default/40 rounded-t-none' : ''}`}
                                        >
                                            {option.kind === 'group' && (
                                                <>
                                                    <Users className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden="true" />
                                                    <span className="text-sm text-text-primary truncate">
                                                        {t('retrospective.dragGroup.pickerGroupOption', { title: option.title, count: option.count })}
                                                    </span>
                                                </>
                                            )}
                                            {option.kind === 'card' && (
                                                <>
                                                    <StickyNote className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden="true" />
                                                    <span className="min-w-0 flex flex-col py-1">
                                                        <span className="text-sm text-text-primary truncate">{option.excerpt}</span>
                                                        {option.author && (
                                                            <span className="text-xs text-text-secondary truncate">{option.author}</span>
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                            {option.kind === 'remove' && (
                                                <>
                                                    <Unlink className="w-4 h-4 shrink-0 text-text-secondary" aria-hidden="true" />
                                                    <span className="text-sm text-text-primary">
                                                        {t('retrospective.dragGroup.removeFromGroup')}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </MotionPanel>
                        </div>
                    )}
                </AnimatePresence>
            </FloatingPortal>
        </>
    );
};

export default CardGroupingMenu;
