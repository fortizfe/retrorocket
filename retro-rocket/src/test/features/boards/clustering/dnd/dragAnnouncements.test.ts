import { describe, it, expect, vi } from 'vitest';
import { buildDragAnnouncements } from '@/features/boards/clustering/dnd/dragAnnouncements';
import type { DragIntent } from '@/features/boards/clustering/dnd/dragIntent';

/**
 * CONTRACT: buildDragAnnouncements(t, getLabel, getIntent)
 *  - t(key, params?) is i18next-like; keys are FULL keys, e.g. 'retrospective.dragGroup.a11y.pickedUp'.
 *  - getLabel(id) receives the dnd-kit id of the item (`active.id` / `over.id`, e.g. 'card:c2' / 'group:g1')
 *    and returns the spoken label (card excerpt or group title).
 *  - getIntent() returns the current DragIntent at call time.
 *  - reorder position/total come from dnd-kit sortable data: over.data.current.sortable = { index, items }
 *    -> position = index + 1, total = items.length.
 *  - onDragEnd announces only the cancel-like outcomes (intent none/outside -> a11y.cancelled);
 *    successful outcomes are announced by the provider after the server confirms (research §6).
 */

const t = vi.fn((key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key));
const labels: Record<string, string> = { 'card:c1': 'First card', 'card:c2': 'Second card', 'group:g1': 'Quick wins' };
const getLabel = (id: string | number) => labels[String(id)] ?? String(id);

const P = 'retrospective.dragGroup.a11y.';
const active = { id: 'card:c1' };
const overCard = { id: 'card:c2', data: { current: { sortable: { index: 1, items: ['card:c1', 'card:c2', 'card:c3'] } } } };
const overGroup = { id: 'group:g1' };

function build(intent: DragIntent) {
    return buildDragAnnouncements(t as never, getLabel, () => intent);
}
// dnd-kit announcements take ({ active, over }); cast loosely to avoid rebuilding full Active/Over objects.
const ev = (over: unknown) => ({ active, over }) as never;

describe('buildDragAnnouncements', () => {
    it('returns the announcements and the screen-reader instructions', () => {
        const result = build({ kind: 'idle' });
        expect(Object.keys(result.announcements).sort()).toEqual(['onDragCancel', 'onDragEnd', 'onDragOver', 'onDragStart']);
        expect(typeof result.screenReaderInstructions.draggable).toBe('string');
    });

    it('uses the a11y.instructions message (which mentions G) for the draggable instructions', () => {
        expect(build({ kind: 'idle' }).screenReaderInstructions.draggable).toContain(`${P}instructions`);
    });

    it('onDragStart announces pickedUp', () => {
        expect(build({ kind: 'reorder', overId: 'card:c1', edge: 'before' }).announcements.onDragStart!({ active } as never)).toContain(`${P}pickedUp`);
    });

    it('onDragOver with a card group target announces overTargetGroup with the label', () => {
        const msg = build({ kind: 'group', target: { kind: 'card', cardId: 'c2' } }).announcements.onDragOver!(ev(overCard));
        expect(msg).toContain(`${P}overTargetGroup`);
        expect(msg).toContain('Second card');
    });

    it('onDragOver with a group group target announces overGroupGroup with the group label', () => {
        const msg = build({ kind: 'group', target: { kind: 'group', groupId: 'g1' } }).announcements.onDragOver!(ev(overGroup));
        expect(msg).toContain(`${P}overGroupGroup`);
        expect(msg).toContain('Quick wins');
    });

    it('onDragOver with reorder announces overTargetReorder with 1-based position and total', () => {
        const msg = build({ kind: 'reorder', overId: 'card:c2', edge: 'after' }).announcements.onDragOver!(ev(overCard));
        expect(msg).toContain(`${P}overTargetReorder`);
        expect(msg).toContain('"position":2');
        expect(msg).toContain('"total":3');
    });

    it('onDragOver with intent none announces ownGroup', () => {
        expect(build({ kind: 'none' }).announcements.onDragOver!(ev(overGroup))).toContain(`${P}ownGroup`);
    });

    it('onDragOver with intent outside (or no over) announces outside', () => {
        expect(build({ kind: 'outside' }).announcements.onDragOver!(ev(null))).toContain(`${P}outside`);
    });

    it('does not announce group wording while the intent is still pendingGroup (not yet armed)', () => {
        const msg = build({ kind: 'pendingGroup', target: { kind: 'card', cardId: 'c2' }, since: 1 }).announcements.onDragOver!(ev(overCard));
        expect(msg ?? '').not.toContain(`${P}overTargetGroup`);
    });

    it('reads the intent lazily at announcement time', () => {
        let intent: DragIntent = { kind: 'reorder', overId: 'card:c2', edge: 'after' };
        const { announcements } = buildDragAnnouncements(t as never, getLabel, () => intent);
        expect(announcements.onDragOver!(ev(overCard))).toContain(`${P}overTargetReorder`);
        intent = { kind: 'group', target: { kind: 'card', cardId: 'c2' } };
        expect(announcements.onDragOver!(ev(overCard))).toContain(`${P}overTargetGroup`);
    });

    it('onDragCancel announces cancelled', () => {
        expect(build({ kind: 'reorder', overId: 'card:c2', edge: 'after' }).announcements.onDragCancel!(ev(overCard))).toContain(`${P}cancelled`);
    });

    it.each<DragIntent>([{ kind: 'outside' }, { kind: 'none' }])('onDragEnd with intent $kind announces cancelled (release is a no-op)', (intent) => {
        expect(build(intent).announcements.onDragEnd!(ev(null))).toContain(`${P}cancelled`);
    });
});
