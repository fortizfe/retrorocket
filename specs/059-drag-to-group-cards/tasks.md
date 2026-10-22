---

description: "Task list for 059-drag-to-group-cards"
---

# Tasks: Drag-to-Group Cards with Inline Group Title Editing

**Input**: Design documents from `/specs/059-drag-to-group-cards/`

**Prerequisites**: plan.md, spec.md (incl. Clarifications 2026-10-21), research.md, data-model.md, contracts/group-api.md, contracts/drag-group-ui.md, quickstart.md

**Tests**: Required. The constitution makes TDD NON-NEGOTIABLE (Principle I). Every test task MUST be written, and seen failing, before its implementation task.

**Organization**: Tasks are grouped by user story (US1–US6 from spec.md), so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on unfinished tasks)
- **[Story]**: The user story the task belongs to (US1–US6)

## Path Conventions

- **Web app, single package**:
  - frontend source is under `retro-rocket/src/`;
  - frontend tests are under `retro-rocket/src/test/` (mirroring the feature path);
  - server source is under `retro-rocket/server/src/`, and server tests under `retro-rocket/server/test/`;
  - E2E tests are under `retro-rocket/e2e/`.
- **Commands**, run from `retro-rocket/`:
  - frontend tests: `npm run test:run -- <pattern>`;
  - server tests: `npm run test:server -- <pattern>`;
  - coverage: `npm run test:coverage` and `npm run test:server:coverage`;
  - checks: `npm run type-check`, `npm run type-check:server`, `npm run lint`;
  - E2E: `npm run e2e -- <spec>`.
- **References**:
  - research decisions are `research.md §N`;
  - HTTP checks are `contracts/group-api.md` (C0 M1–M7, C1 P1–P6, C2, C2b, C3, C4 R1–R3);
  - UI behaviours are `contracts/drag-group-ui.md` (B*, D*, K*, T*, G*, S*, X*);
  - invariants I1–I5 and placement rules are in `data-model.md`.
- **Principle IX**: any task that sets visual or motion values MUST use the named skill (`animate`, `apple-design`, `emil-design-eng`) and record the decision in a short comment block at the top of the component, following the 058 precedent in `OwnerActionMenu.tsx`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A green baseline, plus the strings and types every later phase relies on.

- [X] T001 Run `npm run type-check && npm run type-check:server && npm run lint && npm run test:run && npm run test:server` in `retro-rocket/`, and record any failures that already exist in a "Baseline notes" section at the end of `specs/059-drag-to-group-cards/tasks.md`.
- [X] T002 [P] Add every i18n key listed in `contracts/drag-group-ui.md` § i18n keys to `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json`. That covers `retrospective.groupCard.*`, `retrospective.grouping.confirmTeardown` and `retrospective.dragGroup.*`, including `a11y.*`. Keep es and en key sets identical.
- [X] T003 [P] Add `origin?: 'manual' | 'suggestion'` to `CardGroup` in `retro-rocket/src/features/boards/types/card.ts`. Add the exported types `MoveTarget` and `MoveCardResult` (`{ createdGroupId?: string; dissolvedGroupIds: string[] }`) next to it, as shaped in data-model.md.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The transactional server, the client API, the pure drag and order modules, and the structural lift to one drag context per column with an interleaved item list. No new UX is visible at the end of this phase; reorder must behave exactly as before.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Server: tests first

- [X] T004 [P] Extend the fake `CardGroupPort` in `retro-rocket/server/test/application/use-cases/retrospective/retrospectiveFakes.ts`:
  - add in-memory `moveCard`, `setGroupTitle` and `renormalizeColumnOrder`;
  - enforce invariants I1–I5 (it throws `ConflictError` with code `group_conflict`, or `NotFoundError`);
  - support `origin`/`order` on create, and apply the data-model placement rules.
- [X] T005 [P] Write failing use-case tests in `retro-rocket/server/test/application/use-cases/retrospective/CardGrouping.test.ts`:
  - `moveCard` for every source × target cell in the data-model "State transitions" table, including dissolve-at-1 and head promotion;
  - M1 and M6 input validation;
  - `updateCardGroup` partial semantics: title-only never touches `isCollapsed`; trim; empty or `null` → delete; more than 60 chars → 400;
  - `renormalizeColumnOrder` R1;
  - `createCardGroup` P1 and P6, defaulting `origin` to `'suggestion'`.
- [X] T006 [P] Write failing emulator tests in `retro-rocket/server/test/adapters/firebase/FirestoreCardGroupAdapter.test.ts`:
  - transactional create/add/remove/move enforcing P2–P5, A1–A4 and M2–M5/M7;
  - `group.order = target.order` on create;
  - the remaining card gets `order = group.order` on dissolve;
  - control-based removal places the card after the group (C2b);
  - two concurrent `moveCard` calls onto the same target card leave exactly one group and one 409;
  - `setGroupTitle(null)` deletes the field;
  - `renormalizeColumnOrder` validates R2/R3;
  - `toCardGroup` maps `origin`.
- [X] T007 [P] Write failing route tests in `retro-rocket/server/test/http/routes/retrospectives.test.ts` (using `retrospectivesTestApp.ts`):
  - `POST /api/retrospectives/:id/cards/:cardId/move` (200 body shape, 400, 404, 409);
  - `POST /api/retrospectives/:id/column-order` (204, 400, 409);
  - `PATCH /api/groups/:id` with `{title}` only leaves `isCollapsed` untouched, and an empty body gives 400;
  - `POST /api/retrospectives/:id/groups` with 51 members gives 400.

### Server: implementation

- [X] T008 Add `code` as an optional constructor argument to `ConflictError` in `retro-rocket/server/src/domain/errors.ts`. The default stays `'conflict'`, and existing callers are unchanged.
- [X] T009 Extend `retro-rocket/server/src/application/ports/cards.ts`:
  - add `origin?` to `CardGroupDTO` and `CreateCardGroupInput`;
  - add the `MoveTarget`/`MoveCardResult`/`ColumnOrderItem` types;
  - add `CardGroupPort.moveCard(retrospectiveId, cardId, target)`, `setGroupTitle(groupId, title: string | null)` and `renormalizeColumnOrder(retrospectiveId, columnId, items)`.
- [X] T010 Rewrite `createGroup`, `addCardToGroup` and `removeCardFromGroup` in `retro-rocket/server/src/adapters/firebase/FirestoreCardGroupAdapter.ts` as `db.runTransaction`, with all reads before any writes.
  - Add private helpers `detachInTx` and `attachInTx`, which implement head promotion, `groupOrder` reindexing, dissolve-at-1 (I5), and order placement per data-model.
  - `createGroup` writes `origin` (default `'suggestion'`) and `order = headCard.order`.
  - `removeCardFromGroup` picks the next column item in memory from the `retrospectiveId ==` reads.
  - Map `origin` in `toCardGroup`. Makes T006 pass for create/add/remove.
- [X] T011 Implement `moveCard`, `setGroupTitle` and `renormalizeColumnOrder` in `retro-rocket/server/src/adapters/firebase/FirestoreCardGroupAdapter.ts`, reusing `detachInTx`/`attachInTx`. They return `{ createdGroupId?, dissolvedGroupIds }`. Makes the rest of T006 pass.
- [X] T012 Add the use cases `moveCard`, `updateCardGroup` and `renormalizeColumnOrder` to `retro-rocket/server/src/application/use-cases/retrospective/CardGrouping.ts`, and harden the input validation in `createCardGroup` (P1, P6, member cap 50, `origin`). Title normalisation lives here. Makes T005 pass.
- [X] T013 Update `retro-rocket/server/src/http/routes/retrospectives.ts`:
  - add `POST /api/retrospectives/:id/cards/:cardId/move` and `POST /api/retrospectives/:id/column-order`;
  - make `PATCH /api/groups/:id` a partial update through `updateCardGroup`;
  - pass `origin` through on `POST …/groups`;
  - `serializeGroup` includes `origin`.
  - Also update the wiring in `retro-rocket/server/src/http/retrospective-wiring.ts` if it is needed. Makes T007 pass.

### Client API: tests first, then implementation

- [X] T014 [P] Write failing tests for `moveCard`, `updateCardGroup`, `renormalizeColumnOrder` and the `origin` mapping in `cardGroupFromDTO`, in `retro-rocket/src/test/features/boards/retrospective/backendRetrospectiveClient.test.ts`.
- [X] T015 Implement `moveCard(retrospectiveId, cardId, target)`, `updateCardGroup(groupId, patch)` and `renormalizeColumnOrder(retrospectiveId, columnId, items)`, and map `origin`, in `retro-rocket/src/features/boards/retrospective/services/backendRetrospectiveClient.ts`. Makes T014 pass.
- [X] T016 Write failing tests in `retro-rocket/src/test/features/boards/clustering/useCardGroups.test.ts` (create it if missing) for the new `moveCard`, `renameGroup` and `renormalizeColumn` methods. A `BackendRequestError` with status 409 or 404 must reject with an exported `GroupingConflictError`.
- [X] T017 Implement `moveCard`, `renameGroup`, `renormalizeColumn` and `GroupingConflictError` in `retro-rocket/src/features/boards/clustering/hooks/useCardGroups.ts`, and expose them in `UseCardGroupsReturn`. Makes T016 pass.

### Pure drag and order modules: tests first

- [X] T018 [P] Write failing tests in `retro-rocket/src/test/features/boards/clustering/dnd/columnOrder.test.ts`:
  - `buildColumnItems` sorts by order, then groups-first on ties, then `createdAt`, then `id`;
  - legacy data (groups at order 0, cards at `0..n` or `Date.now()`) reproduces today's layout;
  - only ungrouped cards and the column's groups are included;
  - `computeOrder` handles the midpoint, the start (`b-1`) and the end (`a+1`), and returns `{renormalize}` (items spaced 1024) when the gap is at most 1e-3, including at 1.7e12 magnitudes.
- [X] T019 [P] Write failing tests in `retro-rocket/src/test/features/boards/clustering/dnd/dragIntent.test.ts`:
  - `resolveZone` boundaries 0.25/0.75 for cards;
  - the group edge band `min(25%, GROUP_EDGE_MAX_PX = 16)`;
  - the `nextIntent` state machine from research §2, with fake timers for `DWELL_MS = 180`;
  - leaving the centre or changing target resets the timer;
  - `groupingEnabled = false` always reorders;
  - a grouped source over its own group gives `none`;
  - `over = null` gives `outside`;
  - keyboard mode ignores geometry and toggles on `G`.
- [X] T020 [P] Write failing tests in `retro-rocket/src/test/features/boards/clustering/dnd/intentAwareSortingStrategy.test.ts`. It returns `null` for every item while the intent is `pendingGroup` or `group`, and delegates to `verticalListSortingStrategy` otherwise.
- [X] T021 [P] Write failing tests in `retro-rocket/src/test/features/boards/clustering/dnd/dragAnnouncements.test.ts`. `buildDragAnnouncements` returns the localized `onDragStart`/`onDragOver`/`onDragEnd`/`onDragCancel` messages for each intent (card target, group target, reorder position, own group, outside), and `screenReaderInstructions` mentions G.

### Pure drag and order modules: implementation

- [X] T022 [P] Implement `retro-rocket/src/features/boards/clustering/dnd/columnOrder.ts` (`ColumnItem`, `buildColumnItems`, `computeOrder`). Makes T018 pass.
- [X] T023 [P] Implement `retro-rocket/src/features/boards/clustering/dnd/dragIntent.ts` (`ZONE_EDGE`, `GROUP_EDGE_MAX_PX`, `DWELL_MS`, `DragIntent`, `resolveZone`, `nextIntent`). Makes T019 pass.
- [X] T024 [P] Implement `retro-rocket/src/features/boards/clustering/dnd/intentAwareSortingStrategy.ts`. Makes T020 pass.
- [X] T025 [P] Implement `retro-rocket/src/features/boards/clustering/dnd/dragAnnouncements.ts`. Makes T021 pass.
- [X] T026 Implement `retro-rocket/src/features/boards/clustering/dnd/useDragIntent.ts`, which wraps `nextIntent` with a ref, the dwell timer (cleared on end, cancel and unmount) and `toggleKeyboardIntent`. Add `retro-rocket/src/test/features/boards/clustering/dnd/useDragIntent.test.ts` first, with `renderHook` and fake timers, so that state updates happen only on intent transitions.

### Structural lift (no new UX): tests first

- [X] T027 [P] Write failing tests in `retro-rocket/src/test/features/boards/clustering/ColumnItemList.test.tsx`. It renders groups and ungrouped cards interleaved in `buildColumnItems` order, groups are not draggable but are droppable (`useSortable` disabled draggable), and the existing card controls render unchanged.
- [X] T028 [P] Add regression tests for B8 and B9 in `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx` and `retro-rocket/src/test/features/boards/clustering/GroupedCardList.test.tsx`:
  - in modes `none`/`suggestions`, a reorder drop calls `onCardMove(cardId, {kind:'position', order})` with the midpoint, plus `onColumnRenormalize` first when the guard trips;
  - in mode `user`, reorder stays confined to the author section and still calls `onCardsReorder`.

### Structural lift: implementation

- [X] T029 Create `retro-rocket/src/features/boards/clustering/dnd/ColumnGroupingContext.ts`, holding the context and `useColumnGroupingContext()` (which throws outside a provider), with the value shape from data-model.md § ColumnGroupingContext.
- [X] T030 Create `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`. It owns:
  - the column `DndContext`, with the PointerSensor (distance 8) and KeyboardSensor (`sortableKeyboardCoordinates`) moved from `DragDropColumn`;
  - the custom `intentCollision` (`pointerWithin` → `closestCenter` for pointer drags, `closestCorners` for keyboard drags);
  - the `column:<id>` catch-all droppable;
  - the `DragOverlay`, moved from `DragDropColumn` with its existing lift motion;
  - `useDragIntent` wiring;
  - `accessibility` from `buildDragAnnouncements`, plus a polite `aria-live` node;
  - drop resolution into `requestMove`.
  
  In this phase only the reorder intent is acted on: grouping intents are computed but ignored.
- [X] T031 Reduce `retro-rocket/src/features/boards/retrospective/components/DragDropColumn.tsx` to a `SortableContext` (accepting `id` and `strategy` props) plus the card list. Remove its `DndContext`, sensors and `DragOverlay`, and keep the `AnimatePresence` list behaviour.
- [X] T032 Create `retro-rocket/src/features/boards/clustering/components/ColumnItemList.tsx`, a single `SortableContext` (`column-items:<columnId>`, `intentAwareSortingStrategy`) rendering `SortableCard` for cards and a sortable-disabled-draggable wrapper around `GroupCard` for groups. Makes T027 pass.
- [X] T033 Update `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`:
  - provide `ColumnGroupingContext`, with `requestMove` calling a new `onCardMove` prop and `computeOrder` calling `onColumnRenormalize` when needed;
  - wrap the body in `ColumnDndProvider`;
  - render `ColumnItemList` in modes `none`/`suggestions`, and groups above `GroupedCardList` in mode `user`;
  - add the props `onCardMove`, `onGroupRename` and `onColumnRenormalize`.
  
  Update `retro-rocket/src/features/boards/clustering/components/GroupedCardList.tsx` to pass section ids (`section:<authorId>`) to `DragDropColumn`, for use in mode `user` only. Makes T028 pass.
- [X] T034 Wire `moveCard`, `renameGroup` and `renormalizeColumn` from `useCardGroups` into `GroupableColumn` as `onCardMove`, `onGroupRename` and `onColumnRenormalize`, in `retro-rocket/src/features/boards/retrospective/components/RetrospectiveBoard.tsx`.
- [X] T035 Run the full frontend and server suites plus `npm run e2e -- retrospective-board card-lifecycle`. Reorder and existing grouping (suggestion accept, disband, collapse) MUST behave as before, apart from suggestion groups appearing in their head card's slot (FR-034).

**Checkpoint**: the transactional server, the client API, the pure modules and the per-column context are in place. Reorder works in the interleaved list, and stories can now begin.

---

## Phase 3: User Story 1 - Create a group by dropping one card onto another (Priority: P1) 🎯 MVP

**Goal**: Hold card A over the centre of card B for 180 ms, see the armed feedback, and release. A group appears **in B's place** with its title in edit mode, with the text selected, on the creating client.

**Independent Test**: Two ungrouped cards in a `none`-mode column. Drag, hold and release, and verify that the group appears in place for both browsers and that only the creator's title is in edit mode (quickstart scenario 1). A fast fly-over doesn't group (scenario 2).

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T036 [P] [US1] Component tests in `retro-rocket/src/test/features/boards/clustering/ColumnItemList.test.tsx` and `retro-rocket/src/test/features/boards/retrospective/SortableCard.test.tsx` (create it if missing):
  - B2: no displacement and no feedback before 180 ms;
  - B3: `data-group-target="armed"` plus the visible "Drop to group" badge after 180 ms;
  - B4: feedback is removed on leaving;
  - B1: insertion line in the edges.
- [X] T037 [P] [US1] Tests in `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx`:
  - B5: releasing on an armed card target calls `onCardMove(src, {kind:'card', cardId})`;
  - on a resolved `createdGroupId`, `pendingEditGroupId` is set and the matching `GroupCard` receives `autoEditTitle`;
  - other groups don't get it;
  - X1: a `GroupingConflictError` shows the `dragGroup.conflict` toast and sets no pending edit.
- [X] T038 [P] [US1] Tests in `retro-rocket/src/test/features/boards/clustering/GroupCard.test.tsx`:
  - T7: an untitled group renders `defaultGroupTitle`, not `groupOfCards`;
  - with `autoEditTitle`, the title input is focused and its whole text is selected (T2);
  - the group renders in place within `ColumnItemList`.

### Implementation for User Story 1

- [X] T039 [US1] Act on the `group` intent in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`: resolve a drop on `group(card T)` to `requestMove(src, {kind:'card', cardId: T})`, and publish `armedTargetId` through context. Set `aria-busy` on the target while the request is in flight.
- [X] T040 [US1] Render the armed feedback and the edge insertion line in `retro-rocket/src/features/boards/retrospective/components/SortableCard.tsx`: the `data-group-target` attribute, the ring and frosted surface, and the `aria-hidden` badge "Drop to group". **Use `animate` and `apple-design`** for the spring scale (≈1.02), the badge entrance and the 2px insertion line. Reduced motion must keep the ring, surface and badge.
- [X] T041 [US1] Add `motion.div layout` with `AnimatePresence` to the items in `retro-rocket/src/features/boards/clustering/components/ColumnItemList.tsx`, so the target card cross-fades into the new group in the same slot with no jump. **Use `animate`** for the curve and duration, interruptible, with no layout motion under reduced motion.
- [X] T042 [US1] In `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`:
  - hold `pendingEditGroupId` / `consumePendingEdit` from `requestMove`'s `createdGroupId`;
  - pass `autoEditTitle`/`onAutoEditConsumed` to `GroupCard`;
  - show the conflict toast and announcement on `GroupingConflictError`.
- [X] T043 [US1] In `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx`, render the title as `title?.trim() || t('retrospective.groupCard.defaultGroupTitle')`. Accept the `autoEditTitle`/`onAutoEditConsumed` props. Story 2's editor plugs in at T053; for US1, a minimal focused, selected input that commits through `onRenameGroup` is acceptable as long as it uses the same props. Makes T036–T038 pass.

**Checkpoint**: Story 1 is functional and independently testable (quickstart 1–2).

---

## Phase 4: User Story 4 - Grouping stays inside the column and respects "group by user" (Priority: P1)

**Goal**: Dragging out of the column shows a not-allowed cursor and springs back with no writes. In the displayed mode `user` there is no grouping at all. On anonymous boards, the displayed mode decides.

**Independent Test**: quickstart scenarios 5 and 6.

### Tests for User Story 4 ⚠️

- [X] T044 [P] [US4] Tests in `retro-rocket/src/test/features/boards/clustering/dnd/ColumnDndProvider.test.tsx`:
  - B6: when `over` becomes `null`, `document.body.style.cursor === 'not-allowed'`, restored on end and on cancel;
  - B7: releasing outside makes zero `onCardMove`/`onCardsReorder` calls.
- [X] T045 [P] [US4] Tests in `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx`:
  - B8: in displayed mode `user`, no armed feedback and no `{kind:'card'|'group'}` move, ever;
  - an anonymous board whose persisted mode is `user` (displayed as `none`) allows grouping;
  - the context's `groupingEnabled` is false in mode `user`.

### Implementation for User Story 4

- [X] T046 [US4] Implement the `outside` handling in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`: the cursor override and its restore, no indicator anywhere, and a `DragOverlay dropAnimation` spring-back to the source rect (**use `animate`**; instant under reduced motion).
- [X] T047 [US4] Derive `groupingEnabled` from `displayGroupingCriteria !== 'user'` (not from the persisted criteria) in `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`, and pass it to `ColumnDndProvider`/`useDragIntent`. Makes T044–T045 pass.

**Checkpoint**: US1 and US4 together form the safe MVP of the drag gesture.

---

## Phase 5: User Story 2 - Rename a group inline (Priority: P1)

**Goal**: Click, or Enter/Space, to edit in place. Enter or blur saves in real time, Escape cancels, an empty title falls back to the localized default, and titles are capped at 60 characters.

**Independent Test**: quickstart scenario 3, in two browsers.

### Tests for User Story 2 ⚠️

- [X] T048 [P] [US2] Tests in `retro-rocket/src/test/features/boards/clustering/GroupTitleEditor.test.tsx` covering T1–T9:
  - display button accessible name `renameGroupLabel`;
  - no layout shift (the same class box in both states);
  - `maxLength` 60;
  - a trimmed-empty title commits `null`;
  - an unchanged value doesn't commit;
  - Escape restores and stops propagation;
  - a failed commit reverts with the `renameError` toast;
  - read-only renders plain text;
  - unmounting mid-edit raises no error.
- [X] T049 [P] [US2] Tests in `retro-rocket/src/test/features/boards/clustering/GroupCard.test.tsx`: committing a title calls `onRenameGroup(groupId, title | null)`, and the optimistic title shows until the realtime prop updates.
- [X] T050 [P] [US2] Tests for the export fallbacks: an untitled group exports the localized `defaultGroupTitle` in the TXT, PDF and DOCX export service tests under `retro-rocket/src/test/features/boards/export/`. Use the existing test files for each service, adding cases.

### Implementation for User Story 2

- [X] T051 [US2] Implement `retro-rocket/src/features/boards/clustering/components/GroupTitleEditor.tsx` per research §10 and contract T1–T9: a `<button>` inside the `<h3>` and an `<input>` in the same box, with `focus-visible:ring-2 focus-visible:ring-focus`. **Consult `apple-design`/`emil-design-eng`** for the edit affordance. Makes T048 pass.
- [X] T052 [US2] Verify contrast for the title input and focus ring in light and dark themes (at least 4.5:1 text, at least 3:1 ring) by adding assertions to `retro-rocket/src/test/lib/utils/cardColors.a11y.test.ts`.
- [X] T053 [US2] Replace the title markup and the US1 interim input in `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx` with `GroupTitleEditor`, wiring `autoEdit`, `onAutoEditConsumed` and `onCommit → onRenameGroup`. Makes T049 pass.
- [X] T054 [US2] Replace the hardcoded Spanish group-title fallbacks with the localized `retrospective.groupCard.defaultGroupTitle` in `retro-rocket/src/features/boards/export/services/txtExportService.ts`, `pdfExportService.ts` and `docxExportService.ts`. Pass the resolved string from the callers (`retro-rocket/src/features/boards/export/hooks/useExportPdf.ts` and the export popover) where a service has no `t`. Makes T050 pass.
- [X] T055 [US2] Grep for `groupCard.groupOfCards`. If nothing uses it any more, remove it from `retro-rocket/src/locales/en.json` and `es.json`.

**Checkpoint**: US1, US2 and US4 are complete. Dragging creates a group and the title can be renamed straight away.

---

## Phase 6: User Story 5 - Group cards without dragging: keyboard and screen readers (Priority: P1)

**Goal**: Every participant has a "Group with…" picker on ungrouped cards, the keyboard drag `G` toggle works, and every drag state is announced.

**Independent Test**: quickstart scenario 7, using only the keyboard and with VoiceOver on.

### Tests for User Story 5 ⚠️

- [X] T056 [P] [US5] Tests in `retro-rocket/src/test/features/boards/clustering/CardGroupingMenu.test.tsx` (ungrouped variant), covering G1, G3, G4, G5 and G7:
  - the trigger is visible to a non-owner, non-facilitator participant;
  - it is hidden in mode `user` and when there are no candidates;
  - `role="listbox"`: groups first (with counts), then cards (no author on anonymous boards);
  - arrows, Home/End and Enter → `requestMove`;
  - Escape restores focus to the trigger;
  - after a create, focus moves to the new group's title input.
- [X] T057 [P] [US5] Tests in `retro-rocket/src/test/features/boards/retrospective/DraggableCard.test.tsx`: the footer `actions` slot renders for `canEditCard || canConvertToAction || canGroup`, and `CardGroupingMenu` renders alongside `OwnerActionMenu`/`CardMenu` without displacing them.
- [X] T058 [P] [US5] Tests in `retro-rocket/src/test/features/boards/clustering/dnd/ColumnDndProvider.test.tsx`:
  - K1–K5: a keyboard drag starts in `reorder`;
  - pressing `G` over a target toggles to `group` and announces `overTargetGroup`;
  - Space drops with that intent;
  - Escape cancels and announces `cancelled`;
  - the `keydown` listener is removed after the drag ends.

### Implementation for User Story 5

- [X] T059 [US5] Implement `retro-rocket/src/features/boards/clustering/components/CardGroupingMenu.tsx` (the ungrouped "Group with…" variant) on `useBoardMenuOverlay`. Use the same panel material as `OwnerActionMenu`, a listbox with `aria-activedescendant`, and 44px targets below `md`. **Use `apple-design`/`emil-design-eng`** for the trigger icon (distinct from `Settings2` and `MoreVertical`) and its placement, and **`animate`** for the panel enter and exit. Makes T056 pass.
- [X] T060 [US5] Render `CardGroupingMenu` in the footer `actions` slot of `retro-rocket/src/features/boards/retrospective/components/DraggableCard.tsx`, gated by `useColumnGroupingContext().groupingEnabled` and the candidate availability. Make the context optional for `DraggableCard` instances rendered outside a column, such as the `DragOverlay`. Makes T057 pass.
- [X] T061 [US5] Implement the keyboard `G` toggle in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx` (document `keydown` only during keyboard drags, through `toggleKeyboardIntent`), and push dwell-timer and `G` transitions to the provider's polite live region. Makes T058 pass.

**Checkpoint**: every P1 story is complete. This is a shippable increment.

---

## Phase 7: User Story 3 - Add a card to an existing group by dropping it (Priority: P2)

**Goal**: Hold an ungrouped card over a group's centre (header or body) for 180 ms and release, and it is appended with an insertion animation. The group's 16px edges reorder around the group.

**Independent Test**: quickstart scenario 4.

### Tests for User Story 3 ⚠️

- [X] T062 [P] [US3] Tests in `retro-rocket/src/test/features/boards/clustering/GroupCard.test.tsx` and `ColumnItemList.test.tsx`:
  - B5b: an armed group shows the badge, and release calls `onCardMove(src, {kind:'group', groupId})`;
  - the header area resolves to the group zone, not the edge;
  - the 16px edge resolves to `reorder`;
  - a collapsed group stays collapsed after the add, and its count increases;
  - the header totals include the new card (`calculateGroupAggregations`, unchanged).
- [X] T063 [P] [US3] Tests in `retro-rocket/src/test/features/boards/clustering/CardGroupingMenu.test.tsx`: choosing a group option calls `requestMove(src, {kind:'group'})`, and focus returns to the moved card's location.

### Implementation for User Story 3

- [X] T064 [US3] Resolve drops on `group(group G)` to `requestMove(src, {kind:'group', groupId})` in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`, passing `overKind: 'group'` to `resolveZone` so the edge cap applies.
- [X] T065 [US3] Render the armed feedback on `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx`: the same ring, surface and badge as the cards, with the spring scale ≈1.02 (**use `animate`**). Verify that a new member animates in through the existing `AnimatePresence`/`layout` (**`review-animations`** for the stagger cap). Makes T062–T063 pass.

**Checkpoint**: Stories 1–5 are complete.

---

## Phase 8: User Story 6 - Drag a card out of a group or into another group (Priority: P2)

**Goal**: Grouped cards can be dragged:

- to a position, which ungroups them there;
- onto another group, which moves them;
- onto an ungrouped card, which creates a new group in place.

A group left with one card dissolves. Keyboard users get "Move to group…" and "Remove from group".

**Independent Test**: quickstart scenario 9, in two browsers.

### Tests for User Story 6 ⚠️

- [X] T066 [P] [US6] Tests in `retro-rocket/src/test/features/boards/clustering/GroupCard.test.tsx`:
  - the head and member cards render a drag handle with `useDraggable` id `member:<cardId>` (D1);
  - no handles in mode `user` (D7);
  - the handle has an accessible name and a visible focus ring.
- [X] T067 [P] [US6] Tests in `retro-rocket/src/test/features/boards/clustering/dnd/ColumnDndProvider.test.tsx`:
  - D2: an edge drop gives `{kind:'position', order}` (midpoint);
  - D3: an armed card target gives `{kind:'card'}`;
  - D4: an armed other group gives `{kind:'group'}`;
  - D5: its own group gives intent `none` and no call;
  - D6: the catch-all gives `position` at the end;
  - no sortable displacement for `member:*` sources;
  - the result announcements `removedFromGroup` and `groupDissolved` come from `dissolvedGroupIds`.
- [X] T068 [P] [US6] Tests in `retro-rocket/src/test/features/boards/clustering/CardGroupingMenu.test.tsx` (grouped variant), covering G2 and G6: "Move to group…" lists the other groups and the ungrouped cards (never the card's own group), and "Remove from group" calls `requestMove(src, {kind:'position', order: right after the group})` and announces the result.

### Implementation for User Story 6

- [X] T069 [US6] Add drag handles for the head and member cards in `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx`. Use `useDraggable({ id: 'member:<cardId>', data: { type: 'member', groupId } })` through `DraggableCard`'s existing `dragHandleProps` contract, and dim the source while it is dragged. **Use `apple-design`** for handle visibility inside the group. Makes T066 pass.
- [X] T070 [US6] Handle `member:*` sources in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`: no displacement (strategy bypass), the insertion line only, the D2–D6 resolution, and the own-group `none`. Apply the `outside` handling from US4 unchanged. Makes T067 pass.
- [X] T071 [US6] Add the grouped variant ("Move to group…" plus the "Remove from group" item) to `retro-rocket/src/features/boards/clustering/components/CardGroupingMenu.tsx`. Compute "right after the group" with `computeOrder`. Makes T068 pass.
- [X] T072 [US6] Confirm that the existing remove and disband controls in `retro-rocket/src/features/boards/clustering/components/GroupCard.tsx` still work (FR-026), now backed by the hardened C2b, which dissolves at one card. Update the existing `GroupCard` tests whose expectations change because of I5.

**Checkpoint**: all six stories are complete.

---

## Phase 9: Mode-switch safeguard for manual groups (FR-033) (supports US1)

**Goal**: Switching a column away from "suggestions" while it has manual groups asks for an accessible confirmation first. Cancelling persists nothing.

**Independent Test**: quickstart scenario 10.

- [X] T073 [P] [US1] Tests in `retro-rocket/src/test/features/boards/clustering/GroupableColumn.test.tsx`:
  - S1: with at least one `origin === 'manual'` group, leaving `suggestions` shows the confirmation with `{{count}}` equal to all of the column's groups, **before** `setGroupingCriteria` is called;
  - S2: confirming calls `setGroupingCriteria`, then disbands every group;
  - S3: cancelling makes no `setGroupingCriteria` call, no disband, and the selector still shows `suggestions`;
  - S4: with no manual groups (including legacy groups with no `origin`), today's flow runs with no confirmation.
- [X] T074 [US1] Implement the safeguard in `onGroupingChange`/`handleGroupingModeTeardown` in `retro-rocket/src/features/boards/clustering/components/GroupableColumn.tsx`, moving `setGroupingCriteria` after the confirmation. Use the existing confirmation idiom (`window.confirm`, as in `GroupCard`), or the 058 in-panel `Button` confirm pattern if **`apple-design`** review prefers it. Makes T073 pass.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T075 [P] Write `retro-rocket/e2e/card-grouping-dnd.spec.ts`, covering quickstart scenarios 1–11 with two browser contexts and the Firebase emulators:
  - pointer drags via `page.mouse.down/move/up` with steps, holding for `DWELL_MS + 50`;
  - create in place (assert DOM order);
  - fly-over reorders;
  - two-browser rename;
  - add, drag out and move between groups, dissolve at one card;
  - cross-column no-op;
  - by-user disable;
  - keyboard-only picker and the `G` toggle;
  - concurrent delete → conflict toast with no orphan after reload;
  - teardown confirm and cancel;
  - interleaved order persists after reload.
- [X] T076 [P] Extend `retro-rocket/e2e/accessibility.spec.ts` with axe scans, in light and dark themes, of the armed target, the inline title editor, both `CardGroupingMenu` variants, and the member drag handles. Expect zero WCAG 2.1 AA violations (SC-007).
- [X] T077 Run **`review-animations`** over every motion added (armed spring, insertion line, in-place cross-fade, spring-back, member insert, menu panel), apply its findings, and record them in a short comment block in `retro-rocket/src/features/boards/clustering/dnd/ColumnDndProvider.tsx`.
- [X] T078 [P] Performance check (constitution): on a column with about 20 items and 2 groups, confirm in React Profiler that only the old and new armed items re-render per intent transition, and that no state update happens per drag-move frame. Record the result in `specs/059-drag-to-group-cards/quickstart.md` under "Done when".
- [X] T079 [P] Hand the Getting Started guide entry ("Group cards by dragging", including "Move to group…" and the mode-switch confirmation) to docs-agent, using `specs/059-drag-to-group-cards/quickstart.md` § "What it does" as the source, to update the in-app guide added in feature 057.
- [X] T080 Run `npm run type-check && npm run type-check:server && npm run lint && npm run test:coverage && npm run test:server:coverage && npm run e2e`, all green with coverage at least 80% and thresholds unchanged. Then write `specs/059-drag-to-group-cards/pr-description.md`, listing:
  - the Principle IX skills used;
  - the two behaviour changes: suggestion groups appear in place, and a control-based removal dissolves 2-card groups;
  - the new endpoints C0 and C4, and the partial PATCH.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and **blocks every story**. Inside it:
  - server tests T004–T007 → server implementation T008–T013;
  - client T014 → T015 → T016 → T017;
  - pure modules T018–T021 → T022–T025 → T026;
  - structural lift T027–T028 → T029–T034 → T035.
  
  The server, client-API and pure-module tracks can run in parallel; the structural lift needs T017 and T022–T026.
- **US1 (Phase 3)**: after Foundational.
- **US4 (Phase 4)**: after US1, because both share `ColumnDndProvider` drop resolution.
- **US2 (Phase 5)**: after Foundational. It is independent of US1/US4, except that T053 replaces T043's interim input, so it is best done after US1.
- **US5 (Phase 6)**: after US1, because it reuses `requestMove` and the auto-edit flow.
- **US3 (Phase 7)**: after US1.
- **US6 (Phase 8)**: after US1 and US4. Its grouped-variant menu (T071) needs US5's T059.
- **FR-033 safeguard (Phase 9)**: after Foundational. `origin` is written by the server from T010–T011.
- **Polish (Phase 10)**: after the stories you intend to ship.

### Story-level graph

```
Setup ─▶ Foundational ─┬─▶ US1 ─┬─▶ US4 ─┬─▶ US6
                       │        ├─▶ US5 ─┘
                       │        └─▶ US3
                       ├─▶ US2 (after US1 recommended)
                       └─▶ FR-033 safeguard
                                         all ─▶ Polish
```

### Within each story

Tests (must fail) → state and orchestration → rendering and motion → wiring → checkpoint.

### Parallel Opportunities

- Setup: T002 ∥ T003.
- Foundational:
  - T004 ∥ T005 ∥ T006 ∥ T007 (server tests);
  - T014 ∥ T018 ∥ T019 ∥ T020 ∥ T021 (client and pure-module tests);
  - T022 ∥ T023 ∥ T024 ∥ T025 (pure-module implementations);
  - T027 ∥ T028.
  - The whole server track (backend-agent) runs in parallel with the pure-module track (frontend-agent).
- US1: T036 ∥ T037 ∥ T038.
- US4: T044 ∥ T045.
- US2: T048 ∥ T049 ∥ T050.
- US5: T056 ∥ T057 ∥ T058.
- US3: T062 ∥ T063.
- US6: T066 ∥ T067 ∥ T068.
- After US1: US2, US3 and US5 can proceed in parallel by different developers. Their only shared files are `GroupCard.tsx` and `ColumnDndProvider.tsx`, so sequence edits to those.
- Polish: T075 ∥ T076 ∥ T078 ∥ T079.

## Parallel Example: Foundational kick-off

```bash
# Server track (backend-agent, tests first):
Task: "T005 CardGrouping use-case tests in server/test/application/use-cases/retrospective/CardGrouping.test.ts"
Task: "T006 FirestoreCardGroupAdapter emulator tests in server/test/adapters/firebase/FirestoreCardGroupAdapter.test.ts"
Task: "T007 Route tests in server/test/http/routes/retrospectives.test.ts"

# Frontend pure-module track (frontend-agent / qa-agent, tests first):
Task: "T018 columnOrder tests in src/test/features/boards/clustering/dnd/columnOrder.test.ts"
Task: "T019 dragIntent tests in src/test/features/boards/clustering/dnd/dragIntent.test.ts"
Task: "T020 intentAwareSortingStrategy tests in src/test/features/boards/clustering/dnd/intentAwareSortingStrategy.test.ts"
Task: "T021 dragAnnouncements tests in src/test/features/boards/clustering/dnd/dragAnnouncements.test.ts"
```

## Parallel Example: User Story 1

```bash
Task: "T036 Armed feedback/dwell tests in src/test/features/boards/retrospective/SortableCard.test.tsx"
Task: "T037 Drop → create + pendingEdit + conflict tests in src/test/features/boards/clustering/GroupableColumn.test.tsx"
Task: "T038 Default title + auto-edit tests in src/test/features/boards/clustering/GroupCard.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + its guard rails)

1. Phase 1 Setup → Phase 2 Foundational. The server hardening alone is shippable, and it already fixes the orphan and double-membership risks in today's suggestion grouping.
2. Phase 3 (US1) → Phase 4 (US4). The drag-to-group gesture is now safe to use.
3. **STOP and VALIDATE**: quickstart scenarios 1, 2, 5, 6 and 8.
4. Add Phase 5 (US2, rename) and Phase 6 (US5, keyboard). That completes every **P1** story and is the minimum releasable scope under the constitution (Principle VIII requires a keyboard equivalent before release).

### Incremental Delivery

1. Foundational: transactional server, interleaved order, per-column context (no UX change).
2. US1 + US4 + US2 + US5 → **release 1** (all P1).
3. US3 → release 2.
4. US6 + FR-033 safeguard → release 3. FR-033 is cheap and protects the manual groups that release 1 already creates, so pull it into release 1 if time allows.
5. Polish (E2E, a11y, review-animations, guide) runs before each release for the stories included.

### Parallel Team Strategy

- backend-agent: T004–T013, then reviews the C0/C4 usage in later phases.
- frontend-agent: T018–T034, then the US1 → US4 → US5/US6 rendering and motion tasks.
- qa-agent: owns every test-first task, plus T075/T076/T080.
- docs-agent: T079.

---

## Notes

- [P] tasks touch different files and don't depend on an unfinished task.
- Every test task must be seen failing before its implementation task (Principle I).
- Commit after each task or logical group, and stop at any checkpoint to validate a story on its own.
- Avoid concurrent edits to `ColumnDndProvider.tsx`, `GroupCard.tsx` and `GroupableColumn.tsx`. They are shared by several stories.

## Baseline notes

Baseline captured in `retro-rocket/` before any feature code (T002/T003 edits to locales and `card.ts` were in flight but none of the commands failed, so no in-flight attribution was needed). No pre-existing failures.

- `npm run type-check` -> pass (exit 0)
- `npm run type-check:server` -> pass (exit 0)
- `npm run lint` -> pass (exit 0, no warnings printed)
- `npm run test:run` -> pass: 212 files passed, 2 skipped (accuracy.bench, benchmark); 2775 tests passed, 3 skipped
- `npm run test:server` -> pass: 95 files, 672 tests passed
