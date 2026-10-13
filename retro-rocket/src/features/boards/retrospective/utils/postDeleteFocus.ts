/**
 * Post-delete focus target (058-card-owner-action-hub, T009).
 *
 * Contract: contracts/owner-action-menu.md §5. Rationale: research.md §7.
 *
 * When a card is deleted through the OwnerActionMenu hub, focus must land
 * somewhere sensible rather than being lost to `<body>` (WCAG 2.4.3 focus
 * order / Constitution Principle VIII). The preference order is: the next
 * card in the same column, then the previous card, then the column's
 * "Add card" trigger, then `null` if none of those exist (e.g. the card is
 * not inside a `[data-card-column]` at all — a detached node, or a card
 * rendered outside the expected column structure).
 *
 * This is a pure DOM helper (Constitution Principle II): it reads the real
 * document via the `data-card-column` / `data-card-focus-target` /
 * `data-add-card-trigger` markers that `GroupableColumn.tsx` (T016) and
 * `DraggableCard.tsx` (T015) add, and returns an element or `null` — it
 * never focuses anything itself, so the caller controls timing (resolve
 * before deleting, focus after the delete promise resolves).
 *
 * Nested group members (research.md §10): a card group wraps its member
 * cards one level deeper than the column's other direct children. Deleting
 * a member should keep focus inside that same group when another member is
 * available, rather than jumping out to an unrelated top-level card merely
 * because it happens to follow in flat document order — so the next/
 * previous neighbour that shares the deleted card's immediate parent
 * (`parentElement`) is preferred over one that doesn't. This reduces to the
 * plain "next, else previous" rule whenever nothing is nested (every card a
 * direct child of the column, as in the common case).
 */
export function getPostDeleteFocusTarget(cardEl: HTMLElement): HTMLElement | null {
    const column = cardEl.closest<HTMLElement>('[data-card-column]');
    if (!column) return null;

    const cards = Array.from(column.querySelectorAll<HTMLElement>('[data-card-focus-target]'));
    const index = cards.indexOf(cardEl);

    if (index !== -1) {
        const next = cards[index + 1] ?? null;
        const previous = cards[index - 1] ?? null;
        const sharesParent = (candidate: HTMLElement | null): boolean =>
            candidate !== null && candidate.parentElement === cardEl.parentElement;

        if (sharesParent(next)) return next;
        if (sharesParent(previous)) return previous;
        if (next) return next;
        if (previous) return previous;
    }

    return column.querySelector<HTMLElement>('[data-add-card-trigger]');
}
