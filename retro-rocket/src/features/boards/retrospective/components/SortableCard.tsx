import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, EmojiReaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';
import SelectableCard from '@/features/boards/retrospective/components/SelectableCard';
import { useItemDragFeedback } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import { useLanguage } from '@/lib/hooks/useLanguage';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

/**
 * 059-drag-to-group-cards, US1 (T040) — design & motion decisions (`apple-design` for
 * hierarchy/material/depth, `animate` for the motion gate; contracts/drag-group-ui.md B1-B5).
 *
 * Armed target (B3). Purpose: state indication ("releasing here groups"). It appears once
 * per deliberate 180 ms dwell, so a small, quick entrance is right; it never moves content.
 * Ring `ring-2 ring-action` with `ring-offset-2 ring-offset-surface` (the offset gap makes
 * the ring sit against `surface`, the action/surface pairing the contrast suite already
 * verifies at >=3:1 in both themes). Frosted veil `bg-surface-raised/80 backdrop-blur-md`
 * over the card: the card is deferred to (stays readable, no layout shift) while the veil
 * marks it as the receiving surface. Badge: a solid `bg-action text-text-inverse` chip
 * (4.5:1 pairing) with the "Drop to group" TEXT, so colour is never the only cue; the whole
 * veil is aria-hidden because dnd-kit's live region already announces "Over card ...".
 * Scale: 1.02 on the wrapper via the individual CSS `scale` property, NOT a spring and NOT
 * a framer `transform`. dnd-kit owns `transform` on this element (sortable displacement)
 * and framer would overwrite it; `scale` composes with it. A CSS transition retargets from
 * the live value (interruptible when the pointer leaves), 180 ms with the project's strong
 * ease-out cubic-bezier(0.23, 1, 0.32, 1); a 2% scale has no room for visible overshoot, so
 * a spring would add cost, not feel. Veil + badge entrance are Tailwind keyframes
 * (`animate-drop-arm-in`, `animate-drop-badge-in`: opacity 150 ms; the badge also eases from
 * scale(0.9)); removal is instant so a quick target change never leaves a ghost.
 * Reduced motion: the scale and the badge's scale are dropped (`useReducedMotion` /
 * `motion-safe:`); ring, veil and badge stay.
 *
 * Insertion line (B1). A 2px `bg-action` rounded bar centred in the 12px inter-card gap
 * (non-text, >=3:1 against `surface` like the ring), with a 6px dot at its start so the
 * edge reads at a glance. NOT animated on purpose: it re-targets continuously with the
 * pointer (tens of times per drag), so any easing would only add lag to direct feedback.
 */

interface SortableCardProps {
    card: Card;
    onUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onDelete: (cardId: string) => Promise<void>;
    onVote: (cardId: string, increment: boolean) => Promise<void>;
    onLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onReactionRemove: (cardId: string, userId: string) => Promise<void>;
    currentUser?: string;
    canEdit?: boolean;
    isGroupingMode?: boolean;
    isSelected?: boolean;
    onSelect?: (cardId: string) => void;
    // Props para elementos de acción
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardId: string, assignedTo?: string, assignedToName?: string) => void;
}

const SortableCard: React.FC<SortableCardProps> = ({
    card,
    onUpdate,
    onDelete,
    onVote,
    onLike,
    onReaction,
    onReactionRemove,
    currentUser,
    canEdit = true,
    isGroupingMode = false,
    isSelected = false,
    onSelect,
    participants,
    canConvertToAction,
    onConvertToAction,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        // Prefixed so cards and groups share one id space in the column's sortable list
        // (spec 059, research §1). Handlers still receive the raw `card.id`.
        id: `card:${card.id}`,
        data: {
            type: 'card',
            card,
        },
    });

    const { t } = useLanguage();
    const reducedMotion = useReducedMotion();
    const { isArmed, isBusy, insertionEdge } = useItemDragFeedback(`card:${card.id}`);

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        // dnd-kit's displacement transition, plus the armed scale on its own property so the
        // two never fight over `transform`.
        transition: [transition, 'scale 180ms cubic-bezier(0.23, 1, 0.32, 1)'].filter(Boolean).join(', '),
        opacity: isDragging ? 0.5 : 1,
        scale: isArmed && !reducedMotion ? '1.02' : '1',
    };

    // Drag activation lives on a dedicated handle inside the card (not the whole
    // wrapper) so the card container is not an interactive `role="button"` that
    // nests the card's own controls (WCAG nested-interactive) and so the keyboard
    // sensor does not swallow Enter/Space meant for those controls.
    const dragHandleProps = { attributes, listeners, setActivatorNodeRef };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative ${isArmed ? 'rounded-2xl ring-2 ring-action ring-offset-2 ring-offset-surface' : ''}`}
            data-group-target={isArmed ? 'armed' : undefined}
            data-insertion-line={insertionEdge ?? undefined}
            aria-busy={isBusy ? true : undefined}
        >
            <SelectableCard
                dragHandleProps={dragHandleProps}
                card={card}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onVote={onVote}
                onLike={onLike}
                onReaction={onReaction}
                onReactionRemove={onReactionRemove}
                currentUser={currentUser}
                canEdit={canEdit}
                isDragging={isDragging}
                isSortableDragging={isDragging}
                isGroupingMode={isGroupingMode}
                isSelected={isSelected}
                onSelect={onSelect}
                participants={participants}
                canConvertToAction={canConvertToAction}
                onConvertToAction={onConvertToAction}
            />
            {isArmed && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-surface-raised/80 backdrop-blur-md animate-drop-arm-in"
                >
                    <span className="rounded-full bg-action px-3 py-1 text-sm font-medium text-text-inverse shadow-sm motion-safe:animate-drop-badge-in">
                        {t('retrospective.dragGroup.dropToGroup')}
                    </span>
                </div>
            )}
            {insertionEdge && (
                <div
                    aria-hidden="true"
                    data-testid="insertion-line"
                    className={`pointer-events-none absolute inset-x-0 z-10 h-0.5 rounded-full bg-action ${
                        insertionEdge === 'before' ? '-top-[7px]' : '-bottom-[7px]'
                    }`}
                >
                    <span className="absolute -left-0.5 -top-[2px] h-1.5 w-1.5 rounded-full bg-action" />
                </div>
            )}
        </div>
    );
};

export default SortableCard;
