# Research: Show Display Names Instead of User IDs on Retro Board Cards

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

All items below were unknowns identified while reading the spec's clarified decisions against the actual codebase (via targeted code exploration, not assumption). No `[NEEDS CLARIFICATION]` markers remain in the spec, so this phase confirms and documents the concrete technical approach rather than resolving open product questions.

## 1. Where and how to capture the author's display name

**Decision**: Add `createdByName` to the card-creation write path, populated server-side in `retro-rocket/server/src/http/routes/retrospectives.ts` (the `POST /api/retrospectives/:id/cards` handler) using that file's existing local `displayNameOf(session.user)` helper (identical logic already used by `server/src/http/routes/boards.ts` for boards).

**Rationale**: This exactly mirrors an established, already-shipped precedent in the same codebase (boards already store both `createdBy` and `createdByName`). The route already has `session.user` available via `requireSession`, so no new session/auth plumbing is needed. Keeping name derivation server-side (not client-supplied) preserves the same trust model already used for `createdBy`.

**Alternatives considered**:
- *Accept `createdByName` from the client request body* — rejected: spoofable, inconsistent with how `createdBy` is already derived from the authenticated session, not how the boards precedent works.
- *Extract `displayNameOf` into a shared module now (deduplicating the copy in `boards.ts` and `retrospectives.ts`)* — rejected as in-scope work: it's a pre-existing duplication unrelated to this bug; doing it here would expand the diff beyond the fix. Left as an optional future refactor.

## 2. Handling cards created before this fix ships (no `createdByName`)

**Decision**: Resolve the name at render time via the already-loaded `participants` list (`participants.find(p => p.userId === card.createdBy)?.name`), and only fall back to a generic, i18next-localized placeholder label if the author is also no longer an active participant.

**Rationale**: This reuses an existing, proven pattern already present in `ActionItemCard.tsx`, `CardMenu.tsx`, and `ActionItemsColumn.tsx` — no new lookup mechanism is introduced. The repo has no Firestore batch-migration tooling (the only precedent, `migrateUserProviders.ts`, is a manual one-off frontend script, not an automated pipeline), so backfilling every existing card document is not the idiomatic approach here.

**Alternatives considered**:
- *Firestore migration script to backfill `createdByName` on all existing cards* — rejected: no such tooling convention exists in this repo; introduces bulk-write risk for a problem that backfill-on-read already solves without touching stored data.
- *New backend endpoint to resolve historical uid→name mappings* — rejected: adds a new network round-trip and a new surface to test/secure for what should be an increasingly rare case (only cards from before this fix, authored by someone who has also left).

## 3. Grouping key vs. displayed/sorted label

**Decision**: `useColumnGrouping.ts`'s `groupCards` keeps grouping by the raw `createdBy` uid internally (for uniqueness), but resolves a display name per group (`createdByName`, else live participant lookup, else fallback label) for both the rendered header text and the sort order. Groups are sorted alphabetically by that resolved display name instead of the current `a.localeCompare(b, 'es')` sort over raw uids.

**Rationale**: Per FR-003, two participants who happen to share a display name must remain separate groups — grouping correctness cannot depend on the (non-unique) display name. Per the clarification session, the *visible order* must match the visible name, so the sort key must become the resolved name even though the grouping key stays the uid.

**Alternatives considered**:
- *Group directly by display name* — rejected: violates FR-003, risks silently merging two different people's cards if they share a name.
- *Keep the existing uid-based sort, only change the rendered label* — rejected: explicitly ruled out by the clarification answer (order must reflect the visible name, not the internal id).

## 4. Threading `participants` into the grouping computation

**Decision**: `GroupableColumn.tsx` already receives `participants` as a prop and already passes it to `GroupedCardList`/`CardMenu` for unrelated purposes — it will additionally be threaded into `useColumnGrouping`/`groupCards` (or resolved just before calling it) so the legacy-card fallback lookup has the data it needs at grouping time.

**Rationale**: No new data fetching is introduced; `participants` is already loaded and in scope in the same component tree, keeping the fix localized to existing data flow (Principle V — simplest solution that satisfies the requirement).

**Alternatives considered**:
- *Fetch participants separately inside `useColumnGrouping`* — rejected: would duplicate data already available one level up and couple a display-agnostic hook to a new data source unnecessarily.

## 5. Firestore rules and schema impact

**Decision**: No `firestore.rules` change is required.

**Rationale**: The existing `cards` rules in `retro-rocket/firestore.rules` are generic auth-only (not field-level validation), so adding a new optional string field does not require a rule update. This will still be reviewed as part of implementation, not skipped, but no change is anticipated.

## 6. New user-visible copy (fallback label)

**Decision**: The generic fallback label shown when no name can be determined at all is added as i18next keys across all supported locales, not a hardcoded string.

**Rationale**: The constitution's Internationalization standard prohibits hardcoded user-visible strings; this is new copy the fix introduces, so it must follow the existing i18next convention like all other user-facing text in the app.

---

**Output**: All unknowns relevant to this fix are resolved above; no `[NEEDS CLARIFICATION]` markers remain for Phase 1 design.
