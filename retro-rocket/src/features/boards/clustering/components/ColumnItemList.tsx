import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GroupCard } from '@/features/boards/clustering/components/GroupCard';
import SortableCard from '@/features/boards/retrospective/components/SortableCard';
import { useColumnGroupingBase, useDragIntentRef } from '@/features/boards/clustering/dnd/ColumnGroupingContext';
import type { ColumnItem } from '@/features/boards/clustering/dnd/columnOrder';
import { intentAwareSortingStrategy } from '@/features/boards/clustering/dnd/intentAwareSortingStrategy';
import type { Card, CardGroup, EmojiReaction } from '@/features/boards/types/card';
import type { Participant } from '@/features/boards/types/participant';

interface ColumnItemListProps {
    /** `buildColumnItems()` output, already in display order. */
    items: ColumnItem[];
    /** Every card of the column (grouped ones included), to resolve each group's cards. */
    cards: Card[];
    onCardUpdate: (cardId: string, updates: Partial<Card>) => Promise<void>;
    onCardDelete: (cardId: string) => Promise<void>;
    onCardVote: (cardId: string, increment: boolean) => Promise<void>;
    onCardLike: (cardId: string, userId: string, username: string) => Promise<void>;
    onCardReaction: (cardId: string, userId: string, username: string, emoji: EmojiReaction) => Promise<void>;
    onCardReactionRemove: (cardId: string, userId: string) => Promise<void>;
    currentUser?: string;
    participants?: Participant[];
    canConvertToAction?: boolean;
    onConvertToAction?: (cardId: string, assignedTo?: string, assignedToName?: string) => void;
    onGroupToggleCollapse: (groupId: string) => void;
    onGroupDisband: (groupId: string) => void;
    onCardRemoveFromGroup: (cardId: string) => void;
    onRenameGroup: (groupId: string, title: string | null) => Promise<void>;
}

interface SortableGroupProps extends Pick<
    ColumnItemListProps,
    | 'cards' | 'onCardUpdate' | 'onCardVote' | 'onCardLike' | 'onCardReaction' | 'onCardReactionRemove'
    | 'currentUser' | 'onGroupToggleCollapse' | 'onGroupDisband' | 'onCardRemoveFromGroup' | 'onRenameGroup'
> {
    group: CardGroup;
}

/**
 * A group is a drop TARGET and a slot in the column order, never a drag source: only
 * `draggable` is disabled, so it still participates in sortable displacement and collision
 * detection. No dnd-kit attributes/listeners are spread, so it exposes no drag affordance
 * (spec 059, research §1, T032).
 */
const SortableGroup: React.FC<SortableGroupProps> = ({
    group, cards, onGroupToggleCollapse, onGroupDisband, onCardRemoveFromGroup, onRenameGroup,
    onCardUpdate, onCardVote, onCardLike, onCardReaction, onCardReactionRemove, currentUser,
}) => {
    const { pendingEditGroupId, consumePendingEdit } = useColumnGroupingBase();
    const { setNodeRef, transform, transition } = useSortable({
        id: `group:${group.id}`,
        disabled: { draggable: true },
        data: { type: 'group', group },
    });
    const groupCards = cards.filter((card) => card.id === group.headCardId || group.memberCardIds.includes(card.id));

    return (
        <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
            <GroupCard
                group={group}
                cards={groupCards}
                onToggleCollapse={onGroupToggleCollapse}
                onDisbandGroup={onGroupDisband}
                onRemoveCardFromGroup={onCardRemoveFromGroup}
                onCardUpdate={onCardUpdate}
                onCardVote={onCardVote}
                onCardLike={onCardLike}
                onCardReaction={onCardReaction}
                onCardReactionRemove={onCardReactionRemove}
                currentUserId={currentUser}
                isReadOnly={false}
                autoEditTitle={pendingEditGroupId === group.id}
                onAutoEditConsumed={consumePendingEdit}
                onRenameGroup={onRenameGroup}
            />
        </div>
    );
};

/**
 * Slot motion (059, T041; `animate` skill). Purpose: preventing a jarring change + spatial
 * consistency. When a drop groups B with A, B's slot is taken over by the new group: the
 * exiting card and the entering group CROSS-FADE in the same place instead of one popping
 * out and the other popping in. Tier: occasional (a deliberate drop), so standard motion.
 * Tool: framer-motion, because exit animations and layout need it and it is already adopted.
 * `AnimatePresence mode="popLayout"` takes the exiting slot out of the flow (absolute, at
 * its last box) so the entering one occupies the same position with no height jump;
 * `layout="position"` glides the siblings that shift up when A leaves. Properties: opacity
 * (+ framer's layout transform on the SLOT, never on the dnd-kit element inside it, so the
 * sortable displacement transform is untouched). 180 ms, cubic-bezier(0.23, 1, 0.32, 1)
 * (strong ease-out for enter/exit; framer retargets from the current value, so a second
 * drop mid-fade is interruptible). Reduced motion: the app-root MotionConfig
 * (`reducedMotion="user"`) strips the layout transform; the opacity cross-fade remains.
 * The slot is also a `space-y-3` context so its single child keeps the list's rhythm
 * selector contract (`.space-y-3 > *` is the card/group root, as ColumnItemList.test relies on).
 */
const SLOT_TRANSITION = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const;

/**
 * Groups and ungrouped cards interleaved in ONE SortableContext (`column-items:<columnId>`),
 * used in modes `none`/`suggestions` (spec 059, T032, contracts/drag-group-ui.md).
 * The sorting strategy reads the live drag intent lazily through the ref provided by
 * ColumnDndProvider (DragIntentRefContext): displacement is suppressed while the user is
 * hovering to group. Outside a provider the ref stays idle (plain vertical list).
 */
const ColumnItemList: React.FC<ColumnItemListProps> = ({ items, cards, onRenameGroup, onGroupToggleCollapse, onGroupDisband, onCardRemoveFromGroup, ...cardProps }) => {
    const { columnId } = useColumnGroupingBase();
    const intentRef = useDragIntentRef();
    const strategy = React.useMemo(() => intentAwareSortingStrategy(() => intentRef.current), [intentRef]);
    const itemIds = React.useMemo(() => items.map((item) => item.id), [items]);

    return (
        <SortableContext id={`column-items:${columnId}`} items={itemIds} strategy={strategy}>
            <div className="relative space-y-3">
                {/* AnimatePresence must directly parent the list whose members mount/unmount
                    for a card's or group's exit animation to run (spec 028 audit finding). */}
                <AnimatePresence mode="popLayout" initial={false}>
                    {items.map((item) => (
                        <motion.div
                            key={item.id}
                            layout="position"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={SLOT_TRANSITION}
                            className="space-y-3"
                        >
                        {item.kind === 'group' ? (
                            <SortableGroup
                                group={item.group}
                                cards={cards}
                                onGroupToggleCollapse={onGroupToggleCollapse}
                                onGroupDisband={onGroupDisband}
                                onCardRemoveFromGroup={onCardRemoveFromGroup}
                                onRenameGroup={onRenameGroup}
                                onCardUpdate={cardProps.onCardUpdate}
                                onCardVote={cardProps.onCardVote}
                                onCardLike={cardProps.onCardLike}
                                onCardReaction={cardProps.onCardReaction}
                                onCardReactionRemove={cardProps.onCardReactionRemove}
                                currentUser={cardProps.currentUser}
                            />
                        ) : (
                            <SortableCard
                                card={item.card}
                                onUpdate={cardProps.onCardUpdate}
                                onDelete={cardProps.onCardDelete}
                                onVote={cardProps.onCardVote}
                                onLike={cardProps.onCardLike}
                                onReaction={cardProps.onCardReaction}
                                onReactionRemove={cardProps.onCardReactionRemove}
                                currentUser={cardProps.currentUser}
                                canEdit={true}
                                participants={cardProps.participants}
                                canConvertToAction={cardProps.canConvertToAction}
                                onConvertToAction={cardProps.onConvertToAction}
                            />
                        )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </SortableContext>
    );
};

export default ColumnItemList;
