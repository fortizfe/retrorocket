# Implementation Plan: Drag-to-Group Cards with Inline Group Title Editing

**Branch**: `059-drag-to-group-cards` | **Date**: 2026-10-21 (revised after `/speckit-clarify` 2026-10-21) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/059-drag-to-group-cards/spec.md` (source story US-RETRO-059, Epic: Retrospective Board Interaction & Clustering, P1/M)

## Summary

Participants will be able to:

- group cards by dragging one onto another in the same column;
- add cards to a group, take them out, or move them between groups by dragging;
- rename any group inline.

Groups and ungrouped cards become **one interleaved, ordered list per column**, so a new group appears in the target card's place.

**Frontend**: one `DndContext` per column (`ColumnDndProvider`) over a single `SortableContext` of column items. Ungrouped cards are sortable, groups are sortable but not draggable (so they shift and accept drops), and grouped cards are plain draggables.

- A pure intent module splits each target into edge/centre zones and arms *group* after a **180 ms dwell**.
- A wrapped sorting strategy freezes displacement while a centre is hovered.
- Keyboard drags toggle the intent with **G**.
- A participant-wide `CardGroupingMenu` ("Group with…" / "Move to group…" / "Remove from group") gives non-drag equivalents.
- `GroupTitleEditor` does inline renaming, and untitled groups show a localized default.
- Leaving the "suggestions" mode asks for confirmation when manual groups exist.

**Server**: one new **transactional `moveCard`** operation covers every drag and menu outcome. It validates column, retrospective and membership, dissolves a group left with one card, and returns `409 group_conflict` on conflicts. The existing create, add and remove operations are hardened the same way. `PATCH /groups/:id` becomes partial and gains `title`. Groups gain `origin`, and their `order` shares the cards' order space, with client-side midpoint placement and a rare renormalisation endpoint.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 18.2 (frontend); Express 5 on Node (server, same `package.json`)

**Primary Dependencies**:
- `@dnd-kit/core` 6.3, `@dnd-kit/sortable` 10 (`useSortable` `disabled: { draggable }`), `@dnd-kit/utilities` 3;
- framer-motion 10 (`MotionConfig reducedMotion="user"`);
- `@floating-ui/react`, through `useBoardMenuOverlay`;
- react-i18next, react-hot-toast, lucide-react, Tailwind with semantic tokens;
- `firebase-admin` 14 (transactions).

**No new dependencies.**

**Storage**: Firestore `groups`/`cards`, written by the server's Admin SDK only.
- New optional `groups.origin`; `groups.order` becomes meaningful; `groups.title` becomes mutable.
- No migration: legacy data keeps its layout through the sort tie-break.
- No new composite index: the repo has no `firestore.indexes.json`, and the new reads reuse the `retrospectiveId ==` equality query.
- No `firestore.rules` change.

**Testing**:
- Vitest + Testing Library (frontend, `src/test/features/boards/**`);
- Vitest server tests, including the emulator-backed adapter (`server/test/**`);
- Playwright: a new `e2e/card-grouping-dnd.spec.ts` and an extended `e2e/accessibility.spec.ts`.

**Target Platform**: Web SPA (Vite → Vercel) plus the Express API (Vercel). Desktop and touch browsers.

**Project Type**: Web application. `retro-rocket/src` (React) and `retro-rocket/server` (hexagonal: domain / application / adapters / http).

**Performance Goals**:
- O(1) intent work per drag frame, with state updates only on transitions.
- Changes visible to other participants in under 1 s (SC-003).
- A plain reorder is one document write, not a column rewrite.

**Constraints**:
- WCAG 2.1 AA in both themes.
- Principle IX skills for every visual and motion value.
- i18n es/en.
- Same column only.
- No grouping, moving or member-dragging in the displayed `user` mode.

**Scale/Scope**:
- **Frontend**: 5 new pure or hook modules (`columnOrder`, `dragIntent`, `intentAwareSortingStrategy`, `dragAnnouncements`, `useDragIntent`); 1 provider and 1 context; 3 new components (`ColumnItemList`, `GroupTitleEditor`, `CardGroupingMenu`); about 9 existing files edited, plus `backendRetrospectiveClient`, 3 export services and 2 locales.
- **Server**: 3 new use cases and port methods (`moveCard`, `updateCardGroup`, `renormalizeColumnOrder`); 3 adapter methods made transactional; 2 new routes and 1 changed.
- **i18n**: about 27 new keys per locale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Assessment | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Contract IDs are written as failing tests first: B1–B9, D1–D7, K1–K5, T1–T9, G1–G7, S1–S4, X1; C0 M1–M7, C1 P1–P6, C2/C2b, C3, C4 R1–R3; invariants I1–I5. The order is pure modules, then the server, then components, then e2e. `/speckit-tasks` puts every test first. | ✅ PASS |
| II. Library-First | Ordering, intent, strategy and announcements are pure modules in `clustering/dnd/`, tested before they're wired in. The editor and menu are self-contained components. | ✅ PASS |
| III. Proven Libraries | Only dnd-kit primitives (disabled-draggable sortable, `useDraggable`, `accessibility`, `useDndMonitor`, `dropAnimation`), Floating UI and framer-motion. No ranking library: a numeric midpoint is enough at this scale (research §14). | ✅ PASS |
| IV. SOLID | Persistence stays behind `CardGroupPort`, and the UI goes through `useCardGroups` → client → API. Invariants live in the adapter that owns atomicity, input normalisation in the use cases, and orchestration in `ColumnGroupingContext`. | ✅ PASS |
| V. KISS / YAGNI | No optimistic restructuring, no undo (Clarification Q5), no group dragging or merging, no reorder within a group, no board-wide context, no per-column order document. Added structure is justified below. | ✅ PASS (justified) |
| VI. Unit tests & 80% floor | Every new module and component has tests, and the server use cases and adapter are extended. Thresholds are unchanged. | ✅ PASS |
| VII. Playwright E2E | Grouping is a named critical flow. `card-grouping-dnd.spec.ts` covers Stories 1–6, the teardown confirm and cancel, the interleaved order after reload, keyboard-only use, and the conflict path. | ✅ PASS |
| VIII. WCAG 2.1 AA | A keyboard equivalent exists for every pointer outcome (`CardGroupingMenu` plus G), live announcements cover every state, the armed cue is text plus ring, the confirmation is accessible, focus is restored, there are 44px targets, and axe runs in both themes. | ✅ PASS |
| IX. Apple design & motion | `animate`: armed spring, insertion line, in-place group cross-fade, spring-back, member insert. `apple-design`/`emil-design-eng`: badge, material, menu icon, editor affordance, member drag handle. `review-animations` before the PR, which lists the skills. | ✅ PASS (enforced in tasks) |
| Real-Time Data Security | No rules change. Server validation is **strengthened**: transactional I1–I5 and 409s. The client check is only a fast path. The by-user restriction is a display rule, not a data invariant. | ✅ PASS (improves) |
| Error Handling & Resilience | 409/404 produce a toast plus an announcement, a failed rename reverts with a toast, and renormalisation failures surface the conflict toast. Nothing fails silently, and realtime stays the source of truth. | ✅ PASS |
| i18n | About 27 keys × es/en. The export services' hardcoded Spanish fallbacks are replaced. | ✅ PASS (improves) |
| Performance | Validated on a column of about 20 items (research §17). | ✅ PASS |

**Post-design re-check (after Phase 1)**: still passes.
- **No new dependency, collection or index.**
- **API changes are additive**: two new routes, plus a partial PATCH that is a superset for the existing caller.
- **One behaviour change to existing endpoints**: removing a card through a control now dissolves a group left with one card (I5), and accepted suggestion groups now take the head card's slot instead of the top of the column. Both follow directly from FR-031/FR-034 and are documented in contracts C1/C2b.

## Project Structure

### Documentation (this feature)

```text
specs/059-drag-to-group-cards/
├── plan.md              # This file
├── spec.md              # Feature spec (+ Clarifications 2026-10-21)
├── research.md          # Phase 0: baseline audit + decisions §0–§17
├── data-model.md        # Phase 1: entities, column order, invariants I1–I5, move transitions
├── quickstart.md        # Phase 1: end-user summary + validation guide
├── contracts/
│   ├── group-api.md     # C0 move, C1/C2/C2b hardened, C3 partial PATCH, C4 renormalise
│   └── drag-group-ui.md # B/D/K/T/G/S/X behaviors, components, a11y, i18n keys
├── checklists/requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root: `retro-rocket/`)

```text
src/features/boards/
├── clustering/
│   ├── dnd/                                    # NEW library-first module
│   │   ├── columnOrder.ts                      # buildColumnItems, computeOrder, renormalise
│   │   ├── dragIntent.ts                       # zones, dwell, state machine
│   │   ├── intentAwareSortingStrategy.ts
│   │   ├── dragAnnouncements.ts
│   │   ├── useDragIntent.ts
│   │   ├── ColumnDndProvider.tsx               # DndContext, overlay, cursor, G key, live region, drop→requestMove
│   │   └── ColumnGroupingContext.ts
│   ├── components/
│   │   ├── ColumnItemList.tsx                  # NEW interleaved groups + cards
│   │   ├── GroupTitleEditor.tsx                # NEW
│   │   ├── CardGroupingMenu.tsx                # NEW Group with… / Move to group… / Remove
│   │   ├── GroupCard.tsx                       # editor, member drag handles, armed state
│   │   ├── GroupableColumn.tsx                 # provider + context, mode-specific layout, teardown confirm
│   │   └── GroupedCardList.tsx                 # used for 'user' mode only (section SortableContexts)
│   └── hooks/useCardGroups.ts                  # moveCard, renameGroup, renormalizeColumn, conflict mapping
├── retrospective/
│   ├── components/{DragDropColumn,SortableCard,DraggableCard,RetrospectiveBoard}.tsx
│   └── services/backendRetrospectiveClient.ts  # moveCard, updateCardGroup, renormalizeColumnOrder, origin
├── types/card.ts                               # CardGroup.origin?
├── export/services/{txt,pdf,docx}ExportService.ts
src/locales/{en,es}.json

server/src/
├── application/ports/cards.ts                  # moveCard, setGroupTitle, renormalizeColumnOrder, origin
├── application/use-cases/retrospective/CardGrouping.ts
├── adapters/firebase/FirestoreCardGroupAdapter.ts  # transactions + detach/attach helpers
├── domain/errors.ts                            # ConflictError code param
└── http/routes/retrospectives.ts               # POST …/cards/:cardId/move, POST …/column-order, PATCH partial

tests: src/test/features/boards/clustering/{dnd/*,ColumnItemList,GroupTitleEditor,CardGroupingMenu,GroupCard,GroupableColumn,GroupedCardList}.test.*,
       src/test/features/boards/retrospective/DraggableCard.test.tsx,
       server/test/application/use-cases/retrospective/CardGrouping.test.ts (+ retrospectiveFakes.ts),
       server/test/adapters/firebase/FirestoreCardGroupAdapter.test.ts,
       server/test/http/routes/retrospectives.test.ts,
       e2e/card-grouping-dnd.spec.ts (NEW), e2e/accessibility.spec.ts
```

**Structure Decision**: this is the existing web-app layout (React SPA plus hexagonal Express in one package). The drag, ordering and intent logic is a `clustering/dnd/` sub-module because it belongs to the clustering feature. `DragDropColumn` stays the generic sortable list and is now only used for `user`-mode sections.

## Implementation phases (input for `/speckit-tasks`)

1. **Server foundation** (independently shippable): tests, then the implementation, for I1–I5 in the fakes and the adapter.
   - Transactional `createGroup`/`addCardToGroup`/`removeCardFromGroup`, with the new `origin`/`order` and the dissolve-at-1 rule.
   - `moveCard` (C0), `updateCardGroup` (C3), `renormalizeColumnOrder` (C4), and the routes plus 409 mapping.
   - Owner: backend-agent; tests: qa-agent.
2. **Pure modules**: `columnOrder`, `dragIntent`, `intentAwareSortingStrategy`, `dragAnnouncements`, `useDragIntent`, test-first.
3. **Structural lift** (a refactor with no new UX): `ColumnDndProvider` plus context, `ColumnItemList` (interleaved rendering with legacy tie-break), and `DragDropColumn` reduced to a SortableContext for `user` mode. Reorder goes through `requestMove({position})`. Regression gates: the existing column/list tests plus new B8/B9 tests.
4. **Stories 1 + 4 (P1)**: zones, dwell and armed feedback; drop → create **in place**; title auto-edit; outside cursor and spring-back; by-user disable. Motion via `animate`.
5. **Story 2 (P1)**: `GroupTitleEditor`, rename (C3), default title in `GroupCard` and the 3 exports, i18n.
6. **Story 5 (P1)**: `CardGroupingMenu` "Group with…", the `G` toggle and the announcements.
7. **Story 3 (P2)**: group droppable centre and edges (the 16px cap), append plus animation.
8. **Story 6 (P2)**: member drag handles, D1–D7, the "Move to group…" / "Remove from group" menu variant.
9. **FR-033 safeguard**: `origin`-aware teardown confirm; `setGroupingCriteria` moved after the confirmation.
10. **E2E, a11y and polish**: `card-grouping-dnd.spec.ts`, the axe additions, `review-animations`, the Getting Started guide entry (docs-agent), and a PR description that lists the Principle IX skills.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| The structural lift regresses reorder or the by-user layout | Phase 3 is a no-UX refactor gated by the existing tests plus B8/B9; the user mode keeps `DragDropColumn` and `/cards/reorder` |
| Sortable displacement fights centre-hover | `intentAwareSortingStrategy`, unit-tested; E2E holds over a centre and asserts no reorder write |
| Grouped-source drags in a sortable world (multi-container complexity) | Members are plain draggables with no displacement, insertion line only (research §3/§15) |
| Order precision with `Date.now()`-scale values | `computeOrder` precision guard → atomic renormalise (C4); unit-tested at 1.7e12 magnitudes |
| Concurrent moves and renormalise race | Every write is transactional and validated; conflicts give 409 + toast; realtime converges every client |
| Suggestion-accepted groups now appear in place instead of at the top | Intentional per FR-034; called out in the PR description and the release notes |
| Control-based removal now dissolves 2-card groups | Required by FR-031/I5; existing confirmation copy reviewed; a test pins it |
| Transaction contention on busy boards | 2–5 documents per transaction; Firestore auto-retries; 409 is harmless and visible |

## Complexity Tracking

| Addition | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| `ColumnGroupingContext` | `CardGroupingMenu`, the armed state and `requestMove` are needed 5 levels below `GroupableColumn` | Prop-drilling about 6 props through generic list components couples them to grouping; a global store is YAGNI |
| One `DndContext` per column with an interleaved `SortableContext` | Groups must accept drops and shift with cards (FR-006, FR-034, FR-036) | Nested contexts can't share drags; a board-wide context weakens the structural same-column guarantee |
| A single transactional `moveCard` endpoint | Story 6 combines detach + attach + dissolve, which must be atomic (FR-024, SC-005) | Chaining the existing endpoints isn't atomic and leaves orphans under concurrency |
| Midpoint ordering + renormalise endpoint | Groups and cards must share one persisted order with one write per move | A per-column order document is a contended hotspot; LexoRank adds a dependency; a full rewrite on every move races |
