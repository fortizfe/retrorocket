# Phase 1 Data Model: Mis Tableros (Dashboard) Redesign

This feature is presentational; its "entities" are design-process and
view-state constructs used to plan and verify the rebuild, not new
persisted domain records. No Firestore schema changes; `Board` records
continue to be read/written exclusively through `backendBoardsClient.ts`.

## Entity: Visual Direction

One of the 2-3 genuinely distinct candidate redesigns explored via the
`prototype` skill before the product owner selects one to ship (FR-021).

| Field | Description |
|-------|-------------|
| `id` | Stable slug, e.g. `direction-a`, `direction-b`, `direction-c`. |
| `concept` | One-sentence description of the direction's core visual idea. |
| `distinguishingChoices` | What makes this direction genuinely different from the others explored — not a palette swap of the same layout (reachability mechanism per `research.md` §3, action-affordance treatment, materials/depth use, layout rhythm, motion character). |
| `reachabilityMechanism` | Which pattern this direction uses to keep every board reachable (FR-012) — e.g. "continuous scroll", "uniform pagination across layouts", "load more". Must satisfy `research.md` §3's constraint. |
| `newDependencies` | Any library beyond framer-motion/Tailwind/CSS this direction would require, with its Principle III justification (maintenance, bundle-size impact, license, non-duplication) — empty if none. |
| `status` | `explored`, `selected`, or `rejected`. Exactly one `Visual Direction` per feature has `status = selected`. |
| `reviewedBy` | Who reviewed it — per the constitution's design-exploration process, the product owner. |
| `rejectionReason` | Required when `status = rejected`; free text explaining why the product owner didn't choose it. |

**Validation rules**:
- Exactly 2 or 3 `Visual Direction` records exist for this feature (FR-021's "2-3").
- Exactly one has `status = selected`; the rest have `status = rejected` with a non-empty `rejectionReason`.
- Each `Visual Direction` (including rejected ones) MUST be functional enough to demonstrate the full board-list capability set — listing, search, filter, sort, create, join, rename, delete — against real `backendBoardsClient` data, not static mockups, per `contracts/visual-direction-review-contract.md`.
- Every `Visual Direction`'s `reachabilityMechanism` MUST keep 100% of a seeded 200+-board list reachable — no candidate that fails this may enter product-owner review.
- If `newDependencies` is non-empty for the `selected` direction, the Constitution Check's Principle III gate MUST be re-verified before implementation tasks are generated.

### Catalog (2026-08-08)

Built via `apple-design`/`emil-design-eng` (the `prototype` skill named in
FR-021 is not installed in this environment; substituted per the precedent
established in feature 029 — see `research.md` §7 and `plan.md`'s
Constitution Check row IX). Each is a real, working route
(`/dev/dashboard-directions`, dev-only, tab-switchable) wired to actual
`backendBoardsClient` data, with working search/filter/sort, create/join
(via the unchanged `CreateBoardFlow`/`JoinRetrospectiveModal`), and
owner-only rename/delete (via the unchanged `EditRetrospectiveModal` plus
each direction's own delete-confirmation UI).

| `id` | `concept` | `distinguishingChoices` | `reachabilityMechanism` | `newDependencies` | `status` | `reviewedBy` |
|---|---|---|---|---|---|---|
| `direction-a` | **Continuous Canvas** — deference-forward: chrome recedes, boards lead | Translucent floating toolbar (`backdrop-filter`) over a pure continuous-scroll list — no page boundary of any kind; flat full-width rows with depth introduced only on hover/focus (never decorative); action icons always rendered but visually quiet at rest (opacity-60 → 100 on hover/focus-within, never `opacity-0`) | Continuous scroll — every matching board renders in the DOM | None — existing Tailwind tokens/utilities + framer-motion only | `rejected` | Product owner (Fernando Ortiz) |
| `direction-b` | **Structured Table** — clarity-forward: dense, column-aligned, scannable | One single adaptive layout (no grid/list toggle) reflowing via CSS from a column-aligned desktop table to stacked mobile rows; real `role="radiogroup"`/`role="radio"` segmented scope control, arrow-key navigable; persistent trailing icon-button action cluster, never hover-gated | Classic numbered pagination, structurally always rendered (single layout, no view-mode gate) — fixes today's grid-view defect by construction | None | `selected` | Product owner (Fernando Ortiz) |
| `direction-c` | **Card Deck** — depth/materials-forward: elevated, layered, tactile | Glass cards (`backdrop-blur` + layered shadow) whose depth tier is driven by each board's recency rank across the full list (most-recent = "peak" of the deck, extra backing layers); always-visible kebab button opening a press/focus-revealed inline menu | "Load more" — chunks of the filtered/sorted array reveal on demand, growing monotonically until every match is reachable, with a back-to-top affordance | None | `rejected` | Product owner (Fernando Ortiz) |

**`rejectionReason`**:
- `direction-a`: Not selected — product owner chose Direction B's clarity-forward, single-layout approach over Continuous Canvas's deference/continuous-scroll treatment.
- `direction-c`: Not selected — product owner chose Direction B over Card Deck's depth/materials-forward, load-more treatment.

**Status**: **Resolved 2026-08-08** — product owner (Fernando Ortiz) reviewed all
three via a side-by-side comparison (screenshots against 40 seeded real
boards, plus the live dev-only route) and selected **Direction B
(Structured Table)**. Directions A and C are rejected. The product owner's
selection also serves as acknowledgment of the `prototype` → `apple-design`/
`emil-design-eng` skill substitution used to build all three candidates
(plan.md's Constitution Check row IX, research.md §7) — no separate
objection was raised to the substitution itself.

## Entity: Board List Item

The view-facing projection of a `Board` (as returned by
`backendBoardsClient.listBoards()`) rendered in this surface. Not a new
persisted shape — a rendering contract over the existing API response.

| Field | Description |
|-------|-------------|
| `id` | Board identifier, used for navigation (`/retro/:id`) and as the list `key`. |
| `title` | Board title — truncated gracefully in the UI when long (Edge Cases), full text available on demand. |
| `description` | Board description — same truncation behavior as `title`. |
| `createdAt` | Raw timestamp from the API. |
| `createdAtDisplay` | `createdAt` formatted via `Intl.DateTimeFormat`/date-fns using the **active `i18next` language**, not a fixed locale (FR-016, `research.md` §5). |
| `participantCount` | Number of participants, always displayed (FR-003). |
| `role` | `creator` \| `joined` — determines whether rename/delete controls render at all (FR-007, US3 Acceptance Scenario 3). |
| `templateId` | The template the board was created from; resolved to a display label via the existing template catalog. |
| `actionsReachability` | Always `always-visible` or `hover-and-focus-within` (never `hover-only`) for a board with `role = creator` — the FR-015 constraint from `research.md` §4. |

**Validation rules**:
- `actionsReachability` MUST NOT be `hover-only` for any owned board, in any layout, in the shipped direction.
- `role = joined` boards MUST render with no rename/delete control at all (not a disabled one — matches current and required behavior).
- `createdAtDisplay` MUST re-render correctly when `i18next` language changes, verified for both `en` and `es`.

## Entity: Board List Query

The client-side, in-memory view state driving what subset/order of boards is
currently shown — not persisted, reset on navigation away from the
dashboard.

| Field | Description |
|-------|-------------|
| `searchText` | Free-text query matched against `title` and `description` substrings (FR-009). |
| `scopeFilter` | `all` \| `created` \| `joined` (FR-010); each option's live count is derived from the full boards array, not the currently filtered subset. |
| `sortKey` | `name` \| `createdAt` (FR-011). |
| `sortDirection` | `asc` \| `desc`; toggles when the same `sortKey` is reselected. |
| `layoutMode` | The presentation mode(s) the selected `Visual Direction` offers (may be a single adaptive layout, or a toggle between distinct modes — an open UI decision per the spec's Assumptions). |
| `resultCount` | Count of boards matching `searchText` + `scopeFilter`, used to distinguish the empty-boards state from the no-results state (FR-013). |

**Validation rules**:
- Recomputing `Board List Query`'s derived output (filtered + sorted array) over a 200-board `Board List Item[]` MUST complete such that the visible list updates in under 300ms end-to-end (SC-001, `research.md` §2).
- `resultCount === 0` with a non-empty full boards array MUST render the no-results `List State` (not the zero-boards empty state); a genuinely empty full boards array MUST render the zero-boards empty state — these are distinct and MUST NOT be conflated (FR-013).

## Entity: List State

The mutually exclusive states the dashboard's board collection can be in,
each with its own required presentation (FR-013, FR-014).

| Field | Description |
|-------|-------------|
| `variant` | `loading` \| `loaded` \| `empty` (zero boards total) \| `no-results` (search/filter matches nothing) \| `error` (fetch/action failed). |
| `recoveryAction` | What the visitor can do from this state — e.g. `empty` offers create/join; `no-results` offers "clear search/filter"; `error` offers a retry or at minimum a clear, non-silent message (FR-014). |
| `accessibilityRequirement` | Each variant MUST independently satisfy WCAG 2.1 AA contrast/focus/no-color-only-meaning (FR-018) — states are not exempt from the accessibility bar just because they're transient or exceptional. |

**Validation rules**:
- Exactly one `variant` is active at a time for the board list region.
- `error` MUST never be silent — a toast alone is acceptable only if it is reliably visible and captured by accessibility tooling/tests (existing behavior per `research.md` inventory); this MUST be explicitly re-verified against `e2e/accessibility.spec.ts`'s error-state scan, not assumed to still hold after the rebuild.

## Entity: Design Token Extension

A new semantic color/gradient/material token added to `src/lib/theme/
tokens.ts` to support the selected direction, if the existing catalog
(introduced by feature 028/029) is insufficient.

| Field | Description |
|-------|-------------|
| `name` | Token name, following the existing `TokenName` union convention. |
| `role` | What it's used for (e.g. "card surface material", "action-affordance accent"). |
| `lightValue` / `darkValue` | RGB channel values per theme, same format as existing `TOKENS`. |
| `contrastPairing` | The `CONTRAST_PAIRINGS` entry (if any) this token must satisfy — omitted only if the token is purely decorative and never rendered under/behind text. |

**Validation rules**:
- Every `Design Token Extension` used behind or under text MUST have a `contrastPairing` that passes `contrast.tokens.test.ts` in both themes before the selected direction can ship (Constitution Principle VIII).
- Token additions are additive only — no existing `TokenName` value may be removed or repurposed (would regress other surfaces already built on the 028/029 token system).
