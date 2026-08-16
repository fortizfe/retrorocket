# Phase 0 Research: Fix Suggested Grouping Card Loss

No unresolved `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature is a root-caused bug fix confined to code already read and traced during specification. This document records the key design decisions made in choosing *how* to fix it, each with rejected alternatives.

## 1. Where to derive a group's `column`

**Decision**: The server derives a new group's `column` authoritatively from its head card's actual `column` field (via `CardPort.getCard(headCardId)`), inside the `createCardGroup` use case (`CardGrouping.ts`). The client stops sending `column` in the create-group request entirely.

**Rationale**:
- Root cause of the bug: the client (`backendRetrospectiveClient.createCardGroup` / `useCardGroups.acceptSuggestion`) never populated `column`, and the server trusted whatever the client sent (defaulting to `''`), persisting a group nothing renders. Fixing only the client call site (making it pass `headCard.column`) would resolve today's symptom but leaves the same trust boundary in place — any future caller of this endpoint could reintroduce the exact same class of bug by forgetting the field again.
- The constitution's "Real-Time Data Security" standard requires data validation to not rely on the client alone. Deriving `column` server-side from the head card (a fact the server already has, or can fetch, and cannot be spoofed) removes an entire class of client/server drift, not just today's instance of it.
- The head card's `column` is definitionally the correct value: spec 044 (FR-006) already scopes grouping suggestions — and groups generally — to a single column, so "the head card's column" *is* "the group's column" by construction.

**Alternatives considered**:
- *Fix only the client to send the correct `column`.* Rejected: cheaper, but reintroducible; doesn't satisfy the constitution's server-side validation standard, and every other existing caller of the groups endpoint (manual grouping flows) would still be exposed to the same failure mode if they have the same gap.
- *Validate client-supplied `column` against the head card's column and reject on mismatch (400).* Rejected as the primary mechanism: adds a failure mode (a legitimate request could 400 if the client's local `Card` model is briefly stale) without adding correctness beyond simply deriving the value directly. Deriving is strictly simpler and can't drift.

## 2. How to repair already-broken existing groups (FR-009)

**Decision**: Self-heal on read, inside `GetBoardState`. After loading `cards` and `groups` for a retrospective, reconcile each group's `column` against its head card's actual `column`; if they differ (including today's `''` case), persist the corrected value via a new `CardGroupPort.repairGroupColumn(groupId, column)` call and return the corrected value in the response DTO for that same request (no stale read on the very call that heals it).

**Rationale**:
- This repo has no existing pattern or tooling for one-off data-migration scripts (`scripts/` contains only build/deploy scripts), so introducing one would add new operational surface (a runbook step, a "did someone remember to run it" risk) for a problem that already has a natural, safe trigger: every retrospective board is loaded through `GetBoardState` before a user can ever see it.
- The repair is idempotent and self-contained: comparing `group.column` to `headCard.column` and persisting a correction is safe to run on every board load indefinitely (a no-op once the value is already correct), so it needs no feature flag, no "have we migrated yet" tracking, and no separate deploy step.
- It satisfies SC-005 ("100% of pre-existing broken groups have their cards visible again... with no facilitator action required") precisely: the very next time *any* participant opens an affected retrospective, it heals — no admin action, no waiting for a batch job.
- Because the correction is persisted back to Firestore (not just patched in the in-memory response), every other reader of that data (other participants' realtime subscriptions, MCP read endpoints) also converges on the corrected value after the first heal, without needing the same reconciliation logic duplicated elsewhere.

**Alternatives considered**:
- *One-off Firestore migration script (Admin SDK, run manually against production).* Rejected: new operational tooling/pattern not otherwise present in this codebase, a manual step someone must remember to run, and strictly worse for SC-005 (broken groups stay broken until someone runs it, vs. self-healing immediately on next load).
- *Repair lazily on the client instead of the server.* Rejected: would need every client (including any future non-browser reader, e.g. MCP) to reimplement the same repair logic, and wouldn't persist the correction, so the same broken data would need re-detecting on every load by every client forever.
- *Repair inside `FirestoreCardGroupAdapter.listGroups()` directly.* Rejected: that adapter only has access to the `groups` collection, not `cards` — reconciling against the head card's actual column needs both, and `GetBoardState` is the one place in the codebase that already loads both together (Interface Segregation, constitution Principle IV: the adapter shouldn't need to know about cards).

## 3. Surfacing group-formation failure to the facilitator (FR-007a)

**Decision**: Reuse the existing `react-hot-toast` pattern (`toast.error(t('groupSuggestion.acceptError'))`) inside `GroupableColumn.tsx`'s `handleAcceptSuggestion` catch block, which today only does `console.error` and silently swallows the failure.

**Rationale**:
- `toast.error(...)` is already the established, WCAG-reviewed, i18n'd pattern for this exact kind of "an action the user just took failed" feedback elsewhere in the same feature area (`RetrospectiveBoard.tsx`, `RetrospectiveTopbar.tsx`, `BoardRow.tsx`). Constitution Principle III (prefer proven, already-adopted libraries) and the "Error Handling & Resilience" standard (no silent failures) both point at reusing it rather than introducing a new notification surface.
- No new component, animation, or visual design decision is introduced, so Principle IX (Apple-Inspired Design & Motion Tooling) does not apply — the toast component itself was already designed and reviewed when first adopted.

**Alternatives considered**:
- *Reuse the suggestions panel's existing `error`/`suggestionsError` state (the same one used for AI-analysis-unavailable).* Rejected: that state represents "the whole suggestions panel is broken," which would incorrectly discard the rest of the still-valid pending suggestions and close/blank the panel over a single suggestion's accept failure.
- *Silent failure (current behavior).* Rejected by the clarification session — this is precisely the ambiguity that was resolved in favor of a visible error.

## 4. Guarding against a missing/deleted head card

**Decision**: `createCardGroup` (server) now calls `cardPort.getCard(headCardId)` to derive the column; if the head card does not exist, the use case throws a `NotFoundError` (consistent with existing error handling elsewhere in this file, e.g. `removeCardFromGroup`/`disbandGroup`), which the existing HTTP error-handling middleware already converts to a 4xx response, which the client already surfaces via the new toast (Decision 3).

**Rationale**: This is a direct consequence of Decision 1 (deriving column from the head card) — the lookup can fail, and the codebase already has an established `NotFoundError` convention and HTTP mapping for exactly this shape of failure, so no new error-handling mechanism is needed.

**Alternatives considered**: None seriously considered — this follows mechanically from Decision 1 using patterns already present in the same file.
