import { describe, it, expect, afterEach } from 'vitest';
import { getPostDeleteFocusTarget } from '@/features/boards/retrospective/utils/postDeleteFocus';

/**
 * T005 (058-card-owner-action-hub, RED phase): `getPostDeleteFocusTarget` does not
 * exist yet (it is T009's job) — this whole file is expected to fail to import until
 * then. Contract: contracts/owner-action-menu.md §5; rationale: research.md §7.
 *
 * Plain DOM fixtures only (Constitution Principle II: a pure helper gets a pure unit
 * test) — no React, no render(). `getPostDeleteFocusTarget` walks the real DOM via
 * `[data-card-column]` / `[data-card-focus-target]` / `[data-add-card-trigger]`
 * markers that `GroupableColumn.tsx` (T016) and `DraggableCard.tsx` (T015) will add.
 */

function createCard(testId: string): HTMLDivElement {
    const card = document.createElement('div');
    card.setAttribute('data-card-focus-target', '');
    card.tabIndex = -1;
    card.setAttribute('data-testid', testId);
    return card;
}

function createColumn(): HTMLDivElement {
    const column = document.createElement('div');
    column.setAttribute('data-card-column', '');
    document.body.appendChild(column);
    return column;
}

function createAddTrigger(column: HTMLElement): HTMLButtonElement {
    const addTrigger = document.createElement('button');
    addTrigger.setAttribute('data-add-card-trigger', '');
    column.appendChild(addTrigger);
    return addTrigger;
}

describe('getPostDeleteFocusTarget', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('prefers the next card in the column when deleting a middle card', () => {
        const column = createColumn();
        const first = createCard('card-1');
        const middle = createCard('card-2');
        const last = createCard('card-3');
        column.append(first, middle, last);
        createAddTrigger(column);

        expect(getPostDeleteFocusTarget(middle)).toBe(last);
    });

    it('falls back to the previous card when deleting the last card', () => {
        const column = createColumn();
        const first = createCard('card-1');
        const middle = createCard('card-2');
        const last = createCard('card-3');
        column.append(first, middle, last);
        createAddTrigger(column);

        expect(getPostDeleteFocusTarget(last)).toBe(middle);
    });

    it("falls back to the column's add-card trigger when deleting the only card", () => {
        const column = createColumn();
        const onlyCard = createCard('card-1');
        column.appendChild(onlyCard);
        const addTrigger = createAddTrigger(column);

        expect(getPostDeleteFocusTarget(onlyCard)).toBe(addTrigger);
    });

    it('returns null when the card has no [data-card-column] ancestor', () => {
        // Deliberately not appended under any [data-card-column] root — e.g. a
        // detached node, or a card rendered outside the expected column structure
        // (grouping-suggestion previews, which never call this helper at all, but
        // the helper itself must still degrade safely rather than throw).
        const orphanCard = createCard('orphan');
        document.body.appendChild(orphanCard);

        expect(getPostDeleteFocusTarget(orphanCard)).toBeNull();
    });

    it('orders nested group members by DOM position, not nesting depth', () => {
        const column = createColumn();
        const standaloneBefore = createCard('standalone-before');
        column.appendChild(standaloneBefore);

        // A card group wraps some of its member cards one level deeper than the
        // column's other direct children (research.md §10) — the helper must still
        // read document order across that extra nesting level.
        const groupWrapper = document.createElement('div');
        groupWrapper.setAttribute('data-testid', 'group-wrapper');
        column.appendChild(groupWrapper);
        const groupMemberFirst = createCard('group-member-1');
        const groupMemberSecond = createCard('group-member-2');
        groupWrapper.append(groupMemberFirst, groupMemberSecond);

        const standaloneAfter = createCard('standalone-after');
        column.appendChild(standaloneAfter);
        createAddTrigger(column);

        // DOM order is: standaloneBefore, groupMemberFirst, groupMemberSecond, standaloneAfter.
        expect(getPostDeleteFocusTarget(groupMemberFirst)).toBe(groupMemberSecond);
        expect(getPostDeleteFocusTarget(groupMemberSecond)).toBe(groupMemberFirst);
        expect(getPostDeleteFocusTarget(standaloneAfter)).toBe(groupMemberSecond);
    });
});
