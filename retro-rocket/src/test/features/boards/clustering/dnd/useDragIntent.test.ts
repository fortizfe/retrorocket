import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDragIntent } from '@/features/boards/clustering/dnd/useDragIntent';
import { DWELL_MS } from '@/features/boards/clustering/dnd/dragIntent';

type Rect = { top: number; left: number; width: number; height: number; bottom: number; right: number };

const rect = (top: number, height: number): Rect => ({ top, left: 0, width: 200, height, bottom: top + height, right: 200 });
const OVER_RECT = rect(100, 100); // edges at 125 / 175
/** A 20px-tall dragged rect centred on `centerY`. */
const translated = (centerY: number) => rect(centerY - 10, 20);

interface EventOptions {
    overId?: string | null;
    overType?: string;
    centerY?: number;
    keyboard?: boolean;
    groupId?: string;
    activeId?: string;
}

/** Builds the slice of a dnd-kit drag event the hook reads, cast loosely. */
function ev({ overId = 'card:c2', overType, centerY = 150, keyboard = false, groupId, activeId = 'card:c1' }: EventOptions = {}) {
    return {
        active: { id: activeId, data: { current: groupId ? { groupId } : {} }, rect: { current: { initial: null, translated: translated(centerY) } } },
        over: overId === null ? null : { id: overId, rect: OVER_RECT, data: { current: overType ? { type: overType } : {} } },
        activatorEvent: keyboard ? new KeyboardEvent('keydown') : new MouseEvent('pointermove'),
        delta: { x: 0, y: 0 },
        collisions: null,
    } as never;
}

describe('useDragIntent', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    const setup = (groupingEnabled = true) => {
        let renders = 0;
        const hook = renderHook(() => {
            renders += 1;
            return useDragIntent({ groupingEnabled });
        });
        return { ...hook, renders: () => renders };
    };

    it('starts idle', () => {
        const { result } = setup();
        expect(result.current.intent).toEqual({ kind: 'idle' });
        expect(result.current.intentRef.current).toEqual({ kind: 'idle' });
    });

    it('updates React state only on intent transitions, while intentRef always tracks', () => {
        const { result, renders } = setup();

        act(() => result.current.handlers.onDragMove(ev({ centerY: 110 })));
        expect(result.current.intent).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'before' });
        const afterFirst = renders();

        act(() => result.current.handlers.onDragMove(ev({ centerY: 112 })));
        act(() => result.current.handlers.onDragMove(ev({ centerY: 114 })));
        expect(renders()).toBe(afterFirst);

        act(() => result.current.handlers.onDragMove(ev({ centerY: 190 })));
        expect(result.current.intent).toEqual({ kind: 'reorder', overId: 'card:c2', edge: 'after' });
        expect(renders()).toBe(afterFirst + 1);
        expect(result.current.intentRef.current).toEqual(result.current.intent);
    });

    it('promotes pendingGroup to group after DWELL_MS via the timer, without further events', () => {
        const { result } = setup();

        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        expect(result.current.intent).toMatchObject({ kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' } });

        act(() => {
            vi.advanceTimersByTime(DWELL_MS - 1);
        });
        expect(result.current.intent.kind).toBe('pendingGroup');

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(result.current.intent).toEqual({ kind: 'group', target: { kind: 'card', cardId: 'c2' } });
        expect(result.current.intentRef.current.kind).toBe('group');
    });

    it('keeps the original dwell start when further moves stay in the centre', () => {
        const { result } = setup();

        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        act(() => {
            vi.advanceTimersByTime(100);
        });
        act(() => result.current.handlers.onDragMove(ev({ centerY: 152 })));
        act(() => {
            vi.advanceTimersByTime(DWELL_MS - 100);
        });
        expect(result.current.intent.kind).toBe('group');
    });

    it('clears the timer when leaving the centre before the dwell elapses', () => {
        const { result } = setup();

        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        expect(vi.getTimerCount()).toBe(1);
        act(() => result.current.handlers.onDragMove(ev({ centerY: 110 })));
        expect(vi.getTimerCount()).toBe(0);

        act(() => {
            vi.advanceTimersByTime(DWELL_MS * 2);
        });
        expect(result.current.intent.kind).toBe('reorder');
    });

    it('clears the timer on drag end', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        act(() => result.current.handlers.onDragEnd(ev({ centerY: 150 })));
        expect(vi.getTimerCount()).toBe(0);

        act(() => {
            vi.advanceTimersByTime(DWELL_MS * 2);
        });
        expect(result.current.intent.kind).toBe('pendingGroup');
    });

    it('clears the timer on drag cancel', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        act(() => result.current.handlers.onDragCancel(ev({ centerY: 150 })));
        expect(vi.getTimerCount()).toBe(0);
    });

    it('clears the timer on unmount', () => {
        const { result, unmount } = setup();
        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        expect(vi.getTimerCount()).toBe(1);
        unmount();
        expect(vi.getTimerCount()).toBe(0);
    });

    it('reset() returns to idle and clears the timer', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        act(() => result.current.reset());
        expect(result.current.intent).toEqual({ kind: 'idle' });
        expect(result.current.intentRef.current).toEqual({ kind: 'idle' });
        expect(vi.getTimerCount()).toBe(0);
    });

    it('onDragStart resets any previous intent', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ centerY: 110 })));
        act(() => result.current.handlers.onDragStart(ev({ overId: null })));
        expect(result.current.intent).toEqual({ kind: 'idle' });
    });

    it('is outside when there is no over target', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragOver(ev({ overId: null })));
        expect(result.current.intent).toEqual({ kind: 'outside' });
    });

    it('is idle (never a group target) while the dragged card is over its own slot', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ overId: 'card:c1', centerY: 150 })));
        expect(result.current.intent).toEqual({ kind: 'idle' });
        expect(vi.getTimerCount()).toBe(0);
    });

    it('derives the over kind from the id prefix (group:) and from data.type (column)', () => {
        const { result } = setup();

        act(() => result.current.handlers.onDragMove(ev({ overId: 'group:g1', centerY: 150 })));
        expect(result.current.intent).toMatchObject({ kind: 'pendingGroup', target: { kind: 'group', groupId: 'g1' } });

        act(() => result.current.handlers.onDragMove(ev({ overId: 'col1', overType: 'column', centerY: 150 })));
        expect(result.current.intent).toEqual({ kind: 'reorder', overId: 'col1', edge: 'after' });
    });

    it('reads sourceGroupId from active.data: over its own group is none', () => {
        const { result } = setup();
        act(() => result.current.handlers.onDragMove(ev({ overId: 'group:g1', groupId: 'g1', activeId: 'member:c9' })));
        expect(result.current.intent).toEqual({ kind: 'none' });
    });

    it('never arms when grouping is disabled', () => {
        const { result } = setup(false);
        act(() => result.current.handlers.onDragMove(ev({ centerY: 150 })));
        expect(result.current.intent.kind).toBe('reorder');
        expect(vi.getTimerCount()).toBe(0);
    });

    describe('toggleKeyboardIntent', () => {
        it('switches reorder -> group -> reorder for a keyboard drag', () => {
            const { result } = setup();

            act(() => result.current.handlers.onDragOver(ev({ keyboard: true })));
            expect(result.current.intent).toMatchObject({ kind: 'reorder', overId: 'card:c2' });
            expect(vi.getTimerCount()).toBe(0); // keyboard never dwells

            act(() => result.current.toggleKeyboardIntent());
            expect(result.current.intent).toEqual({ kind: 'group', target: { kind: 'card', cardId: 'c2' } });

            act(() => result.current.toggleKeyboardIntent());
            expect(result.current.intent).toMatchObject({ kind: 'reorder', overId: 'card:c2' });
        });

        it('does nothing before any drag event has been seen', () => {
            const { result } = setup();
            act(() => result.current.toggleKeyboardIntent());
            expect(result.current.intent).toEqual({ kind: 'idle' });
        });

        it('is ignored when grouping is disabled', () => {
            const { result } = setup(false);
            act(() => result.current.handlers.onDragOver(ev({ keyboard: true })));
            act(() => result.current.toggleKeyboardIntent());
            expect(result.current.intent.kind).toBe('reorder');
        });
    });
});
