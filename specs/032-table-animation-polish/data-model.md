# Data Model: Mis Tableros Table Motion Refinement

This feature has no persisted data model — it is a client-side motion refinement of an existing, already-persisted board list. The "entities" below are the spec's Key Entities, expressed as UI/interaction state (per research.md R1-R2), since that state is what the refined transitions must key off.

## Board Row List

The ordered, filtered, and paginated set of board summaries currently rendered as table rows. Already produced by the existing `useBoardListQuery` hook (scope filter, search, sort) and `Dashboard`'s pagination slice — this feature does not change what boards are included, only how their appearance/disappearance/reordering is animated.

| Field | Type | Notes |
|---|---|---|
| `id` | string | Board identifier; used as the React/AnimatePresence key. Identity, not just content, determines mount vs. reflow vs. exit. |
| `index` | number | Row's position within the *currently rendered* page slice. Currently double-duties as a stagger-delay input (research.md R1) — under the refined model it drives stagger only for true first-mount rows. |

**Membership/order changes on**: scope-filter change, search-text change, sort-key/sort-direction change, page-number change, items-per-page change. All are already funneled through the same derivation (`useBoardListQuery` → `paginatedBoards`), confirmed in research.md R5 — no new derivation is introduced by this feature.

## Row Transition State

Per-row classification of *why* a given row is animating on a given render — the missing distinction identified in research.md R1/R2. Not a persisted concept; derived at render time from whether a row's key is newly present, already present (but at a different position), or about to be removed.

| State | Meaning | Motion treatment |
|---|---|---|
| `mounting` | Row's `id` was not in the previously rendered set at all (true first appearance — e.g. initial page load). | Fade + slide entrance, with existing index-based stagger (unchanged; out of scope per spec Assumptions). |
| `reflowing` | Row's `id` was already rendered; only its position within the page slice changed (other rows left/entered around it). | Fast, undelayed `layout` transition — no stagger (research.md R2). |
| `exiting` | Row's `id` is present in the previous render but absent from the new one (no longer matches filter/sort/page). | Fast, undelayed exit transition — no inherited entrance delay (research.md R2). |

**Transition rules**:
- A row MUST NOT be in more than one state on a given render.
- `exiting` rows MUST begin animating immediately (no delay derived from list position), per FR-004/FR-005.
- `reflowing` rows MUST NOT replay the `mounting` fade+slide+stagger treatment — only their position changes.
- `mounting` treatment is reserved for rows genuinely new to the DOM; it MUST NOT fire as a side effect of a filter/sort/page change surfacing a row that was simply hidden by pagination (this is the current defect per research.md R1).

## Filter/Sort/Pagination Interaction Event

A discrete user action that changes Board Row List membership or order: selecting a scope filter segment, changing sort key or direction, clicking a pagination control, or changing items-per-page. (Search-text changes also flow through the same list derivation but are out of scope per spec Assumptions, unless directly implicated.)

| Field | Type | Notes |
|---|---|---|
| `trigger` | `'scope' \| 'sort' \| 'page' \| 'itemsPerPage'` | Which control fired the change — informs FR-010's requirement that sort gets the same treatment as scope/pagination, not a distinguishing factor for the motion itself (research.md R5: one shared mechanism regardless of trigger). |
| `timestamp` | implicit (render order) | Used only to reason about interruption handling (FR-005) — a new event arriving before a prior transition settles must not leave the table in a broken state; no new persisted/ordered field is introduced. |

**Validation rules**: None beyond what `useBoardListQuery` and `Pagination` already enforce (valid scope values, valid sort keys, page bounds, items-per-page options). This feature adds no new inputs or validation surface.
