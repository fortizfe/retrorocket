# Phase 1 Data Model: Retro Board Bug Fixes

This feature introduces **no new persisted entities and no Firestore schema changes**. All four fixes operate on existing data shapes and existing UI/local-state concepts. This document captures the UI-facing state shapes affected, so implementation and tests can be checked against a single source of truth for each entity named in spec.md's "Key Entities" section.

## Menu Panel (User Story 1)

Not a persisted entity — a transient overlay state owned by `useBoardMenuOverlay`.

| Field | Type | Notes |
|-------|------|-------|
| `open` | `boolean` | Controlled or uncontrolled per consumer; unchanged by this feature. |
| `placement` | Floating UI `Placement` (e.g. `'bottom-end'`) | Requested placement; unchanged. |
| `refs.reference` | DOM node ref | The trigger button. Unchanged. |
| `refs.floating` | DOM node ref | **Fix target**: must be attached to the outer, non-animated positioning wrapper, not to a node that also receives Framer Motion `animate` props. |
| `floatingStyles` | `React.CSSProperties` (includes `transform`) | Computed anchor position. Unchanged in the hook; consumers must stop letting a competing `transform` source overwrite it. |

**State transition**: closed → open (anchored below/above trigger per `flip`) → closed. No new states introduced; the fix does not change this state machine, only which DOM node the computed style is applied to.

## Column Header (User Story 2)

Not a persisted entity — a rendering of fields already present on the existing `column` config object and derived card/group counts.

| Field | Source | Row (post-fix) |
|-------|--------|-----------------|
| `column.icon` | existing column config | Row 1 |
| `column.title` | existing column config | Row 1 |
| `totalItems` (card + group count) | derived (`ungroupedCards.length + columnGroups.length`) | Row 1 |
| `columnGroups.length` ("N groups" badge) | derived | Row 1 (accompanies title/count; not an interactive control) |
| `column.description` | existing column config, optional | Row 2 (omitted entirely when absent — no reserved empty row) |
| Group control (`ColumnHeaderMenu`) | existing component | Row 3 |
| Add control (`Button`) | existing component | Row 3 |

**Validation rule**: Row 2 MUST NOT render (not even as an empty/collapsed element) when `column.description` is falsy — this is what FR-006 and Edge Cases require to avoid an awkward gap.

## Private Note (User Story 3)

Existing `FacilitatorNote` entity (unchanged shape: `id`, `content`, timestamps, owning facilitator). This feature adds a **local, non-persisted UI concept** on top of it:

| Local state | Type | Notes |
|-------------|------|-------|
| `isCreating` | `boolean` | Existing. Whether the create-note form is open. |
| `newNoteContent` | `string` | Existing. Bound to the create-note textarea. |
| *(new, implementation-level)* a way to distinguish "closing because saved" from "closing because cancelled" | e.g. a `closeReason` local variable/ref passed to the exit-animation branch | Needed so the fix in research.md §3 can skip/shorten the exit animation only on the save path, per FR-009/FR-010, without changing the persisted `FacilitatorNote` shape at all. |

**Invariant this feature enforces**: for any given note's content, **at most one** visible DOM representation of that text exists at any instant — either the in-progress edit surface (textarea) or the saved read-only surface (`<p>`), never both. This invariant does not exist as an explicit guard today; it is currently achieved only "by luck" of timing.

## Typing Indicator (User Story 4)

Existing `TypingIndicator` / `TypingStatusEntry` shape (unchanged: `userId`, `username`, `column`, `timestamp`/`lastActivity`, `isActive` on the underlying Firestore document). No fields are added.

| Concept | Scope | Notes |
|---------|-------|-------|
| Per-column inactivity timer | Client-local, keyed by `column` | Existing (`useTypingStatus`'s `debounceTimers`), unchanged — already correctly independent per column. |
| Per-column write serialization | Client-local, keyed by `${retrospectiveId}_${column}` | Existing (`OptimizedTypingStatusService.pendingWrites`), unchanged. |
| Bounded clear guarantee | **New requirement (FR-013)** on the existing clearing path | The fix must ensure the *visible* indicator clears within the bounded window (SC-004: 5s) even if one write attempt fails, without introducing a new persisted field — implementation may use a bounded local retry or a local-only fallback signal; either is acceptable as long as no new Firestore field/collection is required. |

**Invariant this feature enforces**: for a given `(userId, column)` pair, the indicator is visible if and only if that user has sent a keystroke in that column within the last `INACTIVITY_TIMEOUT_MS`, regardless of whether the most recent write attempting to reflect a stop-typing transition succeeded.
