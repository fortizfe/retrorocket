import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DragEndEvent, DragMoveEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { DWELL_MS, nextIntent } from './dragIntent';
import type { DragIntent, DragIntentInput, OverKind } from './dragIntent';

type DragEvent = DragMoveEvent | DragOverEvent | DragEndEvent;

interface UseDragIntentOptions {
    /** False in `user` mode or without edit permission: the intent never arms a group. */
    groupingEnabled: boolean;
}

const IDLE: DragIntent = { kind: 'idle' };

function overKindOf(id: string, type: unknown): OverKind {
    if (id.startsWith('card:')) return 'card';
    if (id.startsWith('group:')) return 'group';
    return type === 'card' || type === 'group' ? type : 'column';
}

/**
 * Binds the pure `nextIntent` machine to dnd-kit drag events (spec 059, research §3).
 * `intentRef` always holds the latest intent (for the sorting strategy, announcements and
 * the drop handler); React state changes only on actual intent transitions, so a pointer
 * move that keeps the same intent does not re-render. A dwell timer promotes
 * pendingGroup to group after DWELL_MS even when the pointer stops moving.
 * Drag end/cancel only stop the timer: the provider reads `intentRef`, then calls `reset`.
 */
export function useDragIntent({ groupingEnabled }: UseDragIntentOptions) {
    const [intent, setIntent] = useState<DragIntent>(IDLE);
    const intentRef = useRef<DragIntent>(IDLE);
    const lastInputRef = useRef<DragIntentInput | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const groupingEnabledRef = useRef(groupingEnabled);
    groupingEnabledRef.current = groupingEnabled;

    const clearTimer = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const apply = useCallback(
        (next: DragIntent) => {
            clearTimer();
            const prev = intentRef.current;
            intentRef.current = next;
            if (JSON.stringify(prev) !== JSON.stringify(next)) setIntent(next);
            if (next.kind === 'pendingGroup') {
                const remaining = Math.max(0, DWELL_MS - (Date.now() - next.since));
                timerRef.current = setTimeout(() => {
                    timerRef.current = null;
                    const input = lastInputRef.current;
                    if (input) apply(nextIntent(intentRef.current, input, Date.now()));
                }, remaining);
            }
        },
        [clearTimer],
    );

    const evaluate = useCallback(
        (event: DragEvent, toggle = false) => {
            const { active, over, activatorEvent } = event;
            const draggedRect = active.rect.current.translated;
            if (!draggedRect) return;

            const overId = over ? String(over.id) : null;
            // Over its own slot: nothing to target. Never arm grouping on yourself.
            if (overId !== null && overId === String(active.id)) {
                lastInputRef.current = null;
                apply(IDLE);
                return;
            }

            const input: DragIntentInput = {
                over: over && overId !== null ? { id: overId, kind: overKindOf(overId, over.data.current?.type), rect: over.rect } : null,
                draggedRect,
                groupingEnabled: groupingEnabledRef.current,
                inputMode: activatorEvent instanceof KeyboardEvent ? 'keyboard' : 'pointer',
                sourceGroupId: active.data.current?.groupId as string | undefined,
                toggle,
            };
            lastInputRef.current = input;
            apply(nextIntent(intentRef.current, input, Date.now()));
        },
        [apply],
    );

    const reset = useCallback(() => {
        lastInputRef.current = null;
        apply(IDLE);
    }, [apply]);

    const toggleKeyboardIntent = useCallback(() => {
        const input = lastInputRef.current;
        if (!input || input.inputMode !== 'keyboard') return;
        apply(nextIntent(intentRef.current, { ...input, groupingEnabled: groupingEnabledRef.current, toggle: true }, Date.now()));
    }, [apply]);

    const handlers = useMemo(
        () => ({
            onDragStart: (_event: DragStartEvent) => reset(),
            onDragMove: (event: DragMoveEvent) => evaluate(event),
            onDragOver: (event: DragOverEvent) => evaluate(event),
            onDragEnd: (_event: DragEndEvent) => clearTimer(),
            onDragCancel: (_event: unknown) => clearTimer(),
        }),
        [reset, evaluate, clearTimer],
    );

    useEffect(() => clearTimer, [clearTimer]);

    return { intent, intentRef, handlers, reset, toggleKeyboardIntent };
}
