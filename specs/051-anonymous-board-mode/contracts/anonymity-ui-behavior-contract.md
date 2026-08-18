# UI Behavior Contract (FR-003, FR-004, FR-012, FR-013)

This is not a network contract — it's the set of observable UI behaviors
this feature is verified against, since the spec's success criteria
(SC-002, SC-003, SC-006, SC-007) are stated in terms of what appears on
screen and in exported files, not wire shape.

## Card author display (FR-003, SC-002)

| Board state | Card author label |
|---|---|
| `isAnonymous: false` | Rendered exactly as today (`CardHeader`'s `author` prop populated from `createdByName`/`resolveDisplayName`) |
| `isAnonymous: true` | Not rendered, for **every** viewer including the facilitator — no role-based exception (spec Clarification, 2026-08-18) |

Applies uniformly to every card, in every column, in every grouping view —
including inside a "suggested groupings" panel, which must not leak
authorship through a group's member list either.

## "Group by user" grouping option (FR-004, SC-003)

| Board state | Grouping menu (`getGroupingOptions()`) |
|---|---|
| `isAnonymous: false` | `none`, `user`, `suggestions` — unchanged |
| `isAnonymous: true` | `none`, `suggestions` only — `user` entry omitted entirely (not shown disabled) |

If a column's *persisted* grouping is `user` when the board is anonymous,
the column renders as if it were `none` (research.md §5) — the menu
control itself still only offers `none`/`suggestions` while anonymous.

## Exports (FR-012, SC-006)

| Board state at export time | TXT/DOCX/PDF output |
|---|---|
| `isAnonymous: false` | Includes the existing "Autor: …" line/field per card, unchanged |
| `isAnonymous: true` | Omits it — same card content, votes, likes, reactions, and metadata otherwise |

The export reflects whichever state the board is in **at the moment the
export runs**, not the state it may have been in when a card was created,
and not any earlier export of the same board (Assumptions).

## Persistent anonymity indicator (FR-013, SC-007)

| Board state | Indicator |
|---|---|
| `isAnonymous: false` | Absent |
| `isAnonymous: true` | Visible to every participant (not facilitator-gated), in `RetrospectiveTopbar.tsx`, using a text label as the primary signal (not color/icon alone, per constitution Principle VIII) |

## Facilitator toggle control (FR-008, FR-009, FR-011)

| Viewer | Control visibility |
|---|---|
| Facilitator (`uid === createdBy`) | Visible in the facilitator menu, reflects current `isAnonymous`, changes call `PUT /api/retrospectives/:id/anonymity` |
| Any other participant | Not rendered — same gating pattern already used for the countdown-timer controls in `ControlsTab.tsx` |

A toggle click updates the local view optimistically or waits for the
realtime `entity_change` (implementation choice, not a contract this spec
constrains) but MUST surface a visible error and leave the board's
displayed state unchanged if the request fails — per the constitution's
existing "every operation... MUST explicitly handle loading, error, and
reconnection states" standard (no new exception is created for this
control).
