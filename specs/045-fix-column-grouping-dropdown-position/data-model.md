# Phase 1 Data Model: Column Grouping Menu Anchored Positioning

This feature introduces no persisted domain entities, no Firestore document/collection changes, and no data model changes of any kind. It is a purely client-side, transient UI presentation fix.

## Transient UI State (for reference only — not persisted, not new)

The following state already exists (owned by the shared `useBoardMenuOverlay` hook and Floating UI) and is unchanged by this fix; it is documented here only to make the "no new state" claim explicit and auditable:

| State | Owner | Description | Changed by this feature? |
|---|---|---|---|
| `open` | `useBoardMenuOverlay` (per `ColumnHeaderMenu` instance) | Whether the grouping-mode menu is currently shown | No |
| `floatingStyles` | Floating UI (`@floating-ui/react`) | Computed CSS position (via `transform`) anchoring the menu panel to its trigger button | No — the value itself is already computed correctly; this fix only ensures the DOM node it is applied to isn't also being overwritten by Framer Motion |
| `currentGrouping` | `GroupableColumn.tsx` (parent, passed in as a prop) | The selected grouping criteria (none / by-author / by-color / suggestions) | No |

No new entities, fields, relationships, or state transitions are introduced.
