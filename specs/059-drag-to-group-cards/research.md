# Research: Drag-to-Group Cards with Inline Group Title Editing

**Feature**: 059-drag-to-group-cards | **Date**: 2026-10-21 (revised after `/speckit-clarify` session 2026-10-21) | **Spec**: [spec.md](./spec.md)

This file records the current state of the code and the decisions that resolve every open technical question for the plan. Paths are relative to `retro-rocket/`.

This revision incorporates the five clarifications:

- drag-out and moves between groups are **in scope** (Story 6, FR-029–FR-032);
- any participant may group or rename;
- leaving the "suggestions" mode asks for confirmation when **manual** groups exist (FR-033);
- groups and ungrouped cards share **one interleaved column order** (FR-034–FR-036);
- there is no explicit Undo.

---

## §0 Current state (baseline audit)

| Area | Today | Gap vs. spec |
|---|---|---|
| Drag surface | `DragDropColumn.tsx` owns a **`DndContext` per card list**. `GroupedCardList` renders one `DragDropColumn` for mode `none`, and one per author section for mode `user`. Sensors: `PointerSensor` (distance 8) and `KeyboardSensor` (`sortableKeyboardCoordinates`). Collision: `closestCorners`. `handleDragEnd` only reorders, and returns early on a column mismatch. | Groups (`GroupCard`) render **outside** any `DndContext`, so nothing can be dropped on them, and there is no intent model. |
| Column layout | `GroupableColumn` renders **all groups first**, then `GroupedCardList` with the ungrouped cards. Groups are never sorted: they render in array order, and every group has `order: 0`. | FR-034/FR-035 need a single interleaved sequence. |
| Ordering values | Card `order` is set to `Date.now()` on create (`FirestoreCardAdapter.createCard`). It is rewritten to `0..n` by `POST /api/retrospectives/:id/cards/reorder`, an atomic batch that accepts any subset of `{cardId, order, column?}`. Group `order` is hardcoded to `0` in `FirestoreCardGroupAdapter.createGroup`. | Groups need a real position in the same numeric space as the cards. |
| Cross-column | Each list has its own `DndContext`, so a drag never reaches another column: `over` is `null` there. Default `dropAnimation`. | No "not allowed" cursor, and the outside-column state can't be detected. |
| Grouped cards | `GroupCard` renders `DraggableCard` with no drag handle, so grouped cards can't be dragged. The owner's "Delete" on a grouped card is wired to `handleRemoveCard`: it removes the member, or disbands the whole group when used on the primary card, with a `window.confirm`. | Story 6 needs grouped cards to be draggable (FR-007, FR-029/FR-030). The quirk where the primary card's "Delete" disbands the group is pre-existing and stays as it is (FR-026). |
| Group creation | `POST /api/retrospectives/:id/groups` → `createCardGroup` → a single `WriteBatch`. The column is derived from the head card. | **No check** for same column, same retrospective, or cards already grouped. A missing card fails the batch with a generic error. |
| Add / remove | `POST /api/groups/:id/cards` and `DELETE /api/groups/:id/cards/:cardId` are plain batches with no checks. Removing a member never dissolves a group left with only the head. | A card can be added while it's still in another group (an orphan reference), and a group can be left with a single card (FR-031). |
| Rename | **None.** `PATCH /api/groups/:id` accepts only `isCollapsed` and coerces a missing value to `false`. | Partial PATCH plus `title`. |
| Origin | Not recorded. Until now, groups could only be created by accepting a suggestion. | FR-033 needs to tell *manual* from *suggestion* groups. |
| Mode teardown | `GroupableColumn` calls `setGroupingCriteria`, **then** `handleGroupingModeTeardown`, which disbands every group in the column with no confirmation. | FR-033: confirm first when there are manual groups, and on cancel neither switch the mode nor disband. |
| Title display | `GroupCard` shows `group.title`, or else `groupOfCards`. The three export services each hardcode a different Spanish fallback. | One localized default, `defaultGroupTitle` (FR-011). |
| Realtime | `FirestoreRealtimeGatewayAdapter` sends `entity_change` events for `cards` and `groups`, which `useRetrospectiveRealtimeSync` upserts. | No change needed. New fields (`origin`, a meaningful `order`, `title`) ride along. |
| Keyboard alternative | `OwnerActionMenu` (owner only) and `CardMenu` (facilitator only) are in the footer `actions` slot. | No participant-wide entry point exists (FR-018, FR-032). |
| Aggregations | `calculateGroupAggregations` sums votes, likes and reactions. | Unchanged (FR-025). |

---

## §1 One drag context per column, with one interleaved item list

**Decision**: Move `DndContext` out of `DragDropColumn` into a new `ColumnDndProvider`, rendered once per column by `GroupableColumn`.

In modes `none` and `suggestions`, the column body becomes **one** `SortableContext` (`id: 'column-items:<columnId>'`) over a merged, sorted list of **column items**, rendered by a new `ColumnItemList`:

```ts
type ColumnItem = { kind: 'card'; id: `card:${string}`; card: Card } | { kind: 'group'; id: `group:${string}`; group: CardGroup };
```

- **Ungrouped cards** use `useSortable` as today, so they are draggable and sortable.
- **Groups** use `useSortable({ id: 'group:<id>', disabled: { draggable: true, droppable: false } })`. They are not draggable (FR-007), but they take part in the sortable layout, so they shift when a card is dragged past them, and they are droppable targets (FR-006, FR-036). This is a supported shape in `@dnd-kit/sortable` 10 (`disabled?: boolean | { draggable; droppable }`).
- **Grouped cards** (the members inside a `GroupCard`) use plain `useDraggable({ id: 'member:<cardId>', data: { type: 'member', groupId } })` through the card's existing drag handle. They are not part of the column's sortable list (see §17).
- A **column catch-all** droppable, `column:<columnId>`, on the body makes `over === null` mean "outside the column" (FR-008).

**Mode `user`**: groups stay above the author sections, as today (spec edge case "By-user mode layout"). Each section is a `SortableContext` (`section:<authorId>`) under the same provider. Reordering is confined by `containerId` equality, as it was before, and grouping and moving are disabled (FR-010).

**Rationale**:

- A single context per column is what lets groups receive drops.
- A single sortable list is what lets groups and cards interleave and shift together (FR-034).
- Keeping the context per column, rather than board-wide, makes cross-column drops structurally impossible (FR-008/FR-009).

**Alternatives considered**: a board-wide context (it weakens the structural guarantee), and nested contexts (they can't share a drag).

---

## §2 Intent resolution: zones and dwell

**Decision**: Add a pure module, `clustering/dnd/dragIntent.ts`, plus a hook, `useDragIntent`, driven from `onDragMove`/`onDragOver`.

- **Zone**: compute it from the dragged rect's vertical centre (`active.rect.current.translated`) relative to `over.rect`. Let `ratio = (centerY - over.top) / over.height`. A ratio below 0.25 is `before`, above 0.75 is `after`, and anything else is `center`.
- This applies to **both** card and group targets. Groups now have reorder edges too (FR-036).
- For a tall, expanded group, 25% of its height can be large. The edge band is capped at `min(25%, 16px)`, so the group zone stays dominant while edges remain reachable. This is a tuning constant, `GROUP_EDGE_MAX_PX = 16`, covered by tests. 16px keeps the group header (about 56px tall) fully inside the group zone, as Story 3 requires (drop on the header or body), while cards keep the plain 25/50/25 split.
- **Dwell**: entering `center` starts a 180 ms timer (`DWELL_MS`), and leaving it or changing target clears it. Timers live in a ref and are cleared on end and cancel.
- **Disabled**: when the displayed criteria is `'user'`, the intent is always `reorder`.
- **Own group**: a grouped source over its **own** group resolves to `none`. A release there is a no-op (Story 6 #5).

**State machine** (all transitions unit-tested):

```
idle ──dragStart──▶ reorder(over, before|after)
reorder ──enter center of T (T ≠ own group)──▶ pendingGroup(T) [180ms]
pendingGroup(T) ──timer──▶ group(T)
pendingGroup | group ──leave center / change over──▶ reorder | outside
any ──over = null──▶ outside
any ──dragEnd/dragCancel──▶ idle
```

**Rationale**: this follows the Springboard folder pattern the story cites, and 180 ms sits mid-range in the requested 150–200 ms. A pure module keeps the TDD surface small (Principles I/II).

**Alternatives**: a modifier key to group (not discoverable), and stacked droppable sub-zones per card (they conflict with sortable collision).

---

## §3 Displacement control and collision

- **Ungrouped-card drags**: use `intentAwareSortingStrategy(getIntent)`. It wraps `verticalListSortingStrategy` and returns `null` for every item while the intent is `pendingGroup` or `group`, so the target stays still under the pointer. Rects are measured without transforms, so zones are computed on stable layout rects.
- **Grouped-card drags** (`member:*`, not in the sortable list): no displacement. The prospective position shows only as the 2px accent **insertion line** on the over item's edge. That keeps the multi-container complexity out (see §17).
- **Collision**: a custom `intentCollision` function that uses `pointerWithin` and falls back to `closestCenter` for pointer drags. Keyboard drags keep `closestCorners` with `sortableKeyboardCoordinates`.

---

## §4 Feedback, cursor and spring-back (motion values come from the Principle IX skills)

- **Armed target**: `data-group-target="armed"` on the target card or group, with a spring scale to ≈1.02, `ring-2 ring-action`, `bg-surface-raised/80 backdrop-blur-md`, and a floating "Drop to group" badge that is `aria-hidden` because the live region speaks. Reduced motion is handled by the app-root `MotionConfig reducedMotion="user"`, which strips the transform.
- **Insertion line**: an accent line on the `before`/`after` edge of the over item.
- **Not-allowed cursor**: `document.body.style.cursor = 'not-allowed'` while the intent is `outside`, restored on end or cancel.
- **Spring-back**: `DragOverlay dropAnimation`, which returns the overlay to the source rect on `outside`, no-op and rejected drops. Tuned with `animate`.
- **Position-preserving creation**: the new group takes the target's position (§16). Wrapping `ColumnItemList` items in `motion.div layout` plus `AnimatePresence` makes the target card cross-fade into the group shell in place rather than jumping.

---

## §5 Keyboard dragging with two intents

Keyboard drags (`activatorEvent instanceof KeyboardEvent`) skip geometry and dwell.

- The intent defaults to `reorder`.
- **`G`** toggles `reorder ⇄ group(target)` while over a card or group target. It's handled by a `keydown` listener on `document` that lives only for the duration of the keyboard drag.
- Arrow keys move, Space/Enter drop with the current intent, and Escape cancels.
- The screen-reader instructions mention G.
- Grouped sources can also be keyboard-dragged. Their arrow movement uses `closestCorners` over the column items, because they aren't in the sortable list.

**Alternatives**: Shift+Space (undiscoverable), and treating "landing on an item" as group (it makes keyboard reorder impossible).

---

## §6 Live announcements

Pass `accessibility={{ announcements, screenReaderInstructions }}` from a pure `buildDragAnnouncements(t, getLabel, getIntent)` to the column `DndContext`.

- Transitions that have no dnd-kit event (the dwell timer firing, the `G` toggle) are spoken through a provider-owned `VisuallyHidden aria-live="polite"` node.
- Labels: a card's first 40 characters, or a group's displayed title.
- Results are announced after the server confirms: created, added, moved, removed, group dissolved, reordered, cancelled. A rejection announces the conflict text.

---

## §7 One atomic server operation for every drag/picker outcome: `moveCard`

**Problem**: Story 6 combines operations that are separate endpoints today. For example, "remove from G1 and add to G2", or "remove from G1 and create a group with X", or "remove from G1 and place at position p, dissolving G1 if a single card is left". Chaining existing calls can't be atomic, and under concurrency it leaves orphans (SC-005).

**Decision**: add one transactional use case and endpoint:

```
POST /api/retrospectives/:id/cards/:cardId/move
body: { target: { kind: 'position'; order: number }
              | { kind: 'card'; cardId: string }
              | { kind: 'group'; groupId: string } }
```

The use case `moveCard` calls `CardGroupPort.moveCard(retrospectiveId, cardId, target)`, which runs one `db.runTransaction`:

1. **Read** the source card, its current group (if any), and the target card or group. All reads come before the writes, as Firestore transactions require.
2. **Validate**:
   - every entity exists (otherwise 404);
   - everything is in the same retrospective and the **same column** (otherwise `409 group_conflict`);
   - a target card is ungrouped, and isn't the source;
   - a target group isn't the source's own group (otherwise 400 `invalid_request`, because the client treats that case as a no-op and never sends it).
3. **Detach** the card from its source group, if it has one:
   - remove it from `memberCardIds`, or, if it was the head, promote the first member;
   - reindex `groupOrder`;
   - if **one card is left**, dissolve the group (FR-031): delete the group, clear the remaining card's grouping fields, and give that card `order = group.order`;
   - if no card is left, delete the group.
4. **Attach**, depending on the target:
   - `position`: set the card's `order = target.order`, and clear its grouping fields.
   - `card`: create the group doc with `headCardId = target`, `memberCardIds = [source]`, `column`, `origin: 'manual'`, `order = targetCard.order`, and no title. Set the grouping fields on both cards.
   - `group`: append to `memberCardIds`, and set `groupOrder` and `groupId`.
5. **Return** `{ createdGroupId?: string; dissolvedGroupIds: string[] }`, so the client can set `pendingEditGroupId` and announce the result.

Firestore retries contended transactions automatically, up to 5 times. Two concurrent drops onto the same card B therefore serialise: the second one sees `B.groupId` and gets 409 (spec edge case).

**Existing endpoints**:

- `POST /groups` (suggestion accept) and `POST /groups/:id/cards` are **hardened in place** with the same validations: transactions, 409 on conflict.
- `POST /groups` additionally sets `origin: 'suggestion'` and `order = headCard.order`, so accepted suggestions also stay in place (FR-034).
- `DELETE /groups/:id/cards/:cardId` (the control-based removal) becomes transactional. It dissolves a group left with one card (FR-031), and places the removed card right after its former group (FR-035, §16).

**Client**: `useCardGroups.moveCard(cardId, target)`. A `BackendRequestError` with status 409 or 404 is mapped to `GroupingConflictError`, which produces a non-blocking `toast(dragGroup.conflict)` plus an announcement. There's no rollback, because realtime sync is the source of truth.

**Alternatives**:

- *Chain the existing endpoints*: not atomic, and it produces orphans.
- *Client-side pre-checks only*: racy, and the constitution forbids client-only validation.
- *Firestore rules*: these writes are made by the Admin SDK, which bypasses rules.

---

## §8 Group rename: API and semantics

`PATCH /api/groups/:id` becomes a **partial** update with body `{ isCollapsed?: boolean; title?: string | null }`, applying only the fields that are present.

- A new use case, `updateCardGroup`, and a new port method, `setGroupTitle(groupId, title | null)`.
- Normalisation happens on the server: trim the title; an empty result becomes `null`, which means `FieldValue.delete()`; more than 60 characters → 400.
- The last write wins.
- A missing group returns 404, and the client closes the editor silently.
- **Client**: an optimistic display value, which reverts with `toast.error(renameError)` on failure.

---

## §9 Default title and auto-edit after creation

- Add `retrospective.groupCard.defaultGroupTitle` ("New group" / "Nuevo grupo"). `GroupCard` renders `title?.trim() || t(defaultGroupTitle)`.
- The three export fallbacks switch to this key. The resolved string is passed in when an export service has no `t`.
- Manual groups are created without a title, so each viewer sees the default in their own language.
- **Auto-edit** (FR-012): `GroupableColumn` holds `pendingEditGroupId`, taken from `moveCard`'s `createdGroupId`. `GroupCard` with `autoEditTitle` opens `GroupTitleEditor`, calls `focus({ preventScroll: true })` and `select()`, and then consumes the flag. This works whichever arrives first, the realtime group or the response. It applies only to the creating client.

---

## §10 Inline title editor (`GroupTitleEditor`)

- **Display state**: a `<button>` inside the existing `<h3>`, styled as the title, `w-full text-left truncate`, with accessible name `renameGroupLabel`.
- **Edit state**: an `<input maxLength={60}>` with the same font, line-height, padding and box, `focus-visible:ring-2 ring-focus`.
- **Keys**: Enter or blur commit, and Escape cancels: it restores `valueAtEditStart` and stops propagation.
- Focus returns to the display button after Enter or Escape.
- Read-only renders plain text.

---

## §11 Keyboard and screen-reader alternative: `CardGroupingMenu`

**Decision**: add one participant-wide footer trigger, `clustering/components/CardGroupingMenu.tsx`, rendered in `DraggableCard`'s `actions` slot when grouping is enabled. The slot condition becomes `canEditCard || canConvert || canGroup`. It has two variants:

- **Ungrouped card → "Group with…"**: a listbox of the column's groups (title and count), then its other ungrouped cards (an excerpt; the author is omitted on anonymous boards). Choosing an option calls `moveCard(source, {group|card})`.
- **Grouped card → "Move to group…"**: a listbox of the column's other groups and its ungrouped cards. Choosing one calls `moveCard(source, {group|card})`. A separate menu item, **"Remove from group"**, calls `moveCard(source, { position: afterGroup })`, or the hardened `DELETE`, which is equivalent.

It uses the panel from the shared `useBoardMenuOverlay`. Keyboard model: arrow keys, Home/End, Enter, and Escape, which returns focus to the trigger.

The trigger isn't rendered when there are no candidates and nothing to remove, or in mode `user` (FR-010). The icon and placement are decided with `apple-design`/`emil-design-eng`, and must stay distinct from `Settings2` and `MoreVertical`.

**Alternatives**: putting the action in `OwnerActionMenu` (owner only, so it would violate Principle VIII for non-owners) or in `CardMenu` (facilitator only).

**Data access**: through `ColumnGroupingContext` (see §12), so there's no prop drilling through the generic list components.

---

## §12 Column orchestration: `ColumnGroupingContext` and `requestMove`

`GroupableColumn` provides `ColumnGroupingContext`:

```ts
{ columnId, groupingEnabled, items: ColumnItem[], groups, ungroupedCards,
  armedTargetId, pendingEditGroupId, consumePendingEdit(),
  requestMove(sourceCardId, target: MoveTarget): Promise<void>,
  computeOrder(placement: { beforeId?: string; afterId?: string }): number }
```

`requestMove` is the **single path** for drag drops and both menus.

1. It runs local guards: grouping enabled, same column, and not the source's own group. A failed guard is a no-op with an announcement.
2. It calls `moveCard`.
3. On success, it sets `pendingEditGroupId` when a group was created, and announces the result.
4. On a `GroupingConflictError`, it shows the toast and announces it.

While the request is in flight, the target shows `aria-busy`. There is no optimistic restructuring, which keeps the model simple (Principle V).

**Plain reorder of an ungrouped card** (no grouping involved) also goes through `requestMove(source, { position: computeOrder(...) })`. It writes a single card through the same endpoint, which replaces the full-column rewrite through `/cards/reorder` for the interleaved list. That is needed because reordering with `0..n` indices would collide with group orders (§16). Mode `user` keeps `/cards/reorder` for its section-local reorders, which have no groups.

---

## §13 Origin and the mode-switch safeguard (FR-033)

- New optional field `groups.origin: 'manual' | 'suggestion'`. When it's absent, the group is treated as `'suggestion'`, because every legacy group came from suggestions.
- `moveCard` writes `'manual'`. `POST /groups` writes `'suggestion'` when no `origin` is sent, so the suggestion client needs no change. `CardGroup` and `CardGroupDTO` gain `origin?`.
- **Teardown flow** in `GroupableColumn.onGroupingChange`:
  1. If `previousCriteria === 'suggestions'` and the new criteria differs, count `manualGroups` among `columnGroups`.
  2. If the count is above 0, open an accessible confirmation (`retrospective.grouping.confirmTeardown`, "{{count}} groups will be undone"). Use the project's existing confirmation idiom: `window.confirm`, as `GroupCard`'s disband already does. Native dialogs are keyboard and screen-reader operable. If `apple-design` review prefers it, use the in-panel `Button` confirm pattern from 058; the contract is the same either way.
  3. **Only on confirm**, call `setGroupingCriteria`, then the existing `handleGroupingModeTeardown`. On cancel, do nothing: the mode stays `suggestions` and the groups stay.
  4. With no manual groups, keep today's flow unchanged.
- The order is fixed today: the persisted criteria is written before teardown. Moving `setGroupingCriteria` after the confirmation is required, so that cancelling never persists the switch.

---

## §14 Column order model (FR-034/FR-035)

**Decision**: groups and ungrouped cards share **one numeric `order` space** per column. The display sorts ascending by `order`, with ties broken as **groups first**, then by `createdAt`, then by `id`.

That tie-break reproduces today's visual order for legacy columns, where groups have `order: 0` and cards have `0..n` or `Date.now()`. So no migration is needed (spec edge case "Legacy ordering").

**Placement by fractional midpoint**: to place an item between neighbours `a` and `b`, the client computes `order = (a.order + b.order) / 2`. At the start of the column it uses `b.order - 1`, and at the end `a.order + 1`. This is one write per move, and it never rewrites the whole column.

**Precision guard**: card orders can be about `1.7e12` (`Date.now()`), where a double resolves to about `2.4e-4`. Before using a midpoint, `computeOrder` checks that `b.order - a.order > 1e-3`. If not, it **renormalises** the column. It sends one atomic `POST /api/retrospectives/:id/column-order` with `{ columnId, items: [{kind:'card'|'group', id, order}] }`, spaced `1024` apart, and then retries the placement. The new endpoint and use case `renormalizeColumnOrder` run one transaction that validates every item is in that column. Renormalisation is rare, and it is covered by unit tests on `computeOrder`.

**Server-side placements** (where the client doesn't know the result in advance):

- **Group creation**: `group.order = targetCard.order`, so it takes the target's slot.
- **Dissolution**: the remaining card gets `order = group.order`, so it takes the group's slot.
- **Removal through a control**: inside the same transaction, read the retrospective's `cards` and `groups` with the existing single-field `retrospectiveId ==` query and pick, in memory, the column's next item after the group (`order > group.order`). This needs no composite index: the repo has no `firestore.indexes.json`. The card gets the midpoint between `group.order` and that next order, or `group.order + 1` if there's no next item. If the gap is below the precision guard, it uses `group.order + gap/2` anyway, and the next client renormalisation fixes it. This is acceptable because ties are still deterministic.

**Alternatives**:

- *A per-column `itemOrder: string[]` document*: it needs a new document and becomes a single contended write hotspot.
- *LexoRank strings*: a new dependency, or a reimplementation, for little gain at this scale.
- *Full `0..n` rewrite on every move*: it touches every item and races with concurrent moves.

---

## §15 Grouped cards as drag sources (Story 6)

- Inside `GroupCard`, each card (head and members) gets the **same drag handle** affordance as ungrouped cards, wired to `useDraggable({ id: 'member:<cardId>' })`. The `DragOverlay` shows the card being dragged, and the original card dims, as with sortable cards today.
- Drop resolution for a member source:
  - an edge of an item → `position` (midpoint);
  - the centre of an ungrouped card → `card`;
  - the centre of another group → `group`;
  - the centre or edge of its **own** group → no-op;
  - the catch-all (empty column space below the items) → `position` at the end;
  - outside → no-op with spring-back.
- Reordering members **within** a group is out of scope: a drop on its own group is a no-op.
- In mode `user`, member drag handles are not rendered (FR-010; Story 6 #6).

---

## §16 Testing strategy

| Layer | Files | Covers |
|---|---|---|
| Pure units | `src/test/features/boards/clustering/dnd/{dragIntent,dragAnnouncements,intentAwareSortingStrategy,columnOrder}.test.ts` | Zones (including the 16px group edge cap), dwell with fake timers, the state machine, own-group no-op, keyboard `G` toggle; `computeOrder` midpoints, ends, precision guard → renormalise; `buildColumnItems` sort and tie-break (legacy order preserved) |
| Components | `GroupTitleEditor.test.tsx`, `CardGroupingMenu.test.tsx`, `ColumnItemList.test.tsx` (new); `GroupCard`, `GroupableColumn`, `GroupedCardList`, `DraggableCard` tests (updated) | Editor keys and auto-edit; menu variants and keyboard model; interleaved rendering; member drag handle gating; teardown confirm and cancel (FR-033); conflict toast |
| Hook | `useCardGroups` test (updated) | `moveCard`, `renameGroup`, `renormalizeColumn`, 409/404 mapping |
| Server use cases | `CardGrouping.test.ts` (updated, plus fakes) | `moveCard` for every source × target pair; dissolution at one card; `updateCardGroup` partial + normalisation; `renormalizeColumnOrder` validation; `origin` defaults |
| Server adapter (emulator) | `FirestoreCardGroupAdapter.test.ts` (updated) | Transactional invariants I1–I4; concurrent double drop leaves exactly one group; remove-through-control placement after the group; delete-on-null title |
| Routes | `retrospectives.test.ts` (updated) | New `move` and `column-order` routes, PATCH partial, 409 mapping, input validation |
| E2E | `e2e/card-grouping-dnd.spec.ts` (new), `e2e/accessibility.spec.ts` (updated) | Stories 1–6 end to end; group created in place (no jump); drag-out and move-between; teardown confirm and cancel; two-browser rename; cross-column no-op; keyboard-only flows; axe on the armed target, editor and menu, in light and dark themes |

---

## §17 Performance

- Intent evaluation is O(1) per drag-move frame, and React state changes only on transitions.
- The armed state is keyed by id in context, so only two items re-render per transition.
- `buildColumnItems` is memoised on `cards` and `groups`, at O(n log n) per realtime update for about 20 items.
- `moveCard` transactions touch 2–5 documents. The removal path adds one per-retrospective read of tens of documents, and renormalisation is rare.
