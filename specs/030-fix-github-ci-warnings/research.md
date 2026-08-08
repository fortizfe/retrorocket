# Research: Eliminate GitHub CI/CD and Lint Warnings

## 1. GitHub Actions version targets

**Decision**: Bump only the four action families named in the reported warnings, wherever they appear in `.github/workflows/ci.yml`, to the earliest major version that resolves the flagged deprecation — not the latest major, to minimize unrelated behavior change:

| Action | Current | Target | Why this version (not later) |
|---|---|---|---|
| `actions/checkout` | `v4` (9 occurrences, every job) | `v5` | `v5.0.0` is the first release to declare `runs.using: node24` (confirmed by reading its `action.yml`); `v6`/`v7` add caching-detection and ESM changes not needed here. |
| `actions/setup-node` | `v4` (8 occurrences) | `v5` | Same node24 cutover point. `v5`'s only breaking change (automatic caching when a `packageManager` field is present in `package.json`) doesn't apply — this repo's `package.json` has no `packageManager` field, and every job already sets `cache: npm` explicitly, which takes precedence regardless. |
| `actions/setup-java` | `v4` (1 occurrence, `e2e` job) | `v5` | Matches the warning's own explicit instruction ("migrate to actions/setup-java@v5"); confirmed node24. Also the current latest major — no further bump needed. |
| `github/codeql-action/init`, `github/codeql-action/analyze` | `v3` (1 each, `analyze` job) | `v4` | Matches the warning's own explicit instruction. `v3`→`v4` changelog (checked via `github/codeql-action` releases/CHANGELOG.md) shows no breaking change relevant to this repo's usage (`languages: javascript-typescript`, `category` input) — only additive features and bundle-version bumps. Also the current latest major. |

**Rationale for scope boundary**: `actions/cache/restore@v4`, `actions/cache/save@v4` (used in `sync-preview-domain`/`cleanup-preview-domain`) and `google-github-actions/auth@v2` also run on node20-era majors and would likely surface the same annotation once those jobs run — but neither was named in the warnings the user pasted, and the spec's recorded assumption explicitly bounds this work to "actions/dependencies... named in the reported warnings." Left untouched. `FR-001`/`FR-002`/`FR-003` are satisfied without them since the CI run that produced the pasted warnings didn't flag them.

**Alternatives considered**: Jumping straight to latest majors (`checkout@v7`, `setup-node@v7`) — rejected because it pulls in unrelated changes (ESM migration, ESLint config changes, ESM-related ecosystem shifts) that increase regression surface for no warning-elimination benefit beyond `v5`, conflicting with Constitution Principle V (Simplicity/YAGNI) and spec `FR-004` (behavior equivalence).

## 2. `docxExportService.ts` unused imports

**Decision**: Delete `Table`, `TableRow`, `TableCell`, `BorderStyle` from the `docx` import block (lines 12–15). Confirmed via grep that none of the four are referenced anywhere else in the file — the export currently doesn't render an actual table structure, so these are dead imports, not a functionality gap.

**Alternatives considered**: None — straightforward dead-import removal, zero behavior risk.

## 3. `useColumnGrouping.ts` unused `removed` binding

**Decision**: Rename `removed` → `_removed` in the object-rest-destructure at line 139 (`const { [columnId]: removed, ...rest } = prev;`). This is the idiomatic "extract a key to drop it via rest spread" pattern; the project's ESLint config already allows underscore-prefixed unused bindings (`Allowed unused vars must match /^_/u`), so this is the minimal, convention-matching fix with zero behavior change.

**Alternatives considered**: Rewriting without destructuring (e.g., `delete rest[columnId]` on a shallow copy) — rejected, more code for no benefit; the existing pattern is standard and just needs the naming convention applied.

## 4. `GroupableColumn.tsx` `autoFocus` on the card-creation textarea

**Decision**: Replace the JSX `autoFocus` prop with an imperative focus set in a `useEffect` keyed on the `isCreating` flag (the state that gates whether the form is mounted), using a `ref` on the textarea. The field is only mounted after an explicit user click on "Add" (`setIsCreating(true)`), so this preserves today's UX (form appears, cursor is already in the field) while satisfying `jsx-a11y/no-autofocus` — the rule flags the declarative prop specifically because it fires unconditionally on mount regardless of *how* the element came to exist (including on initial page load), not imperative focus gated behind a real user action.

**Rationale**: Satisfies spec `FR-007` (no added friction) and Constitution Principle VIII (WCAG 2.1 AA) — the existing focus-ring styling is untouched, so the visible-focus-indicator requirement continues to be met; only the trigger mechanism changes.

**Alternatives considered**: Removing focus entirely (no replacement) — rejected, would add friction to the acceptance-tested "click add → type" flow (spec Edge Cases). No Apple-design-skill consultation was needed (Constitution Principle IX): this is a mechanical accessibility-pattern fix with a single well-established correct implementation, not a new visual-design or motion decision — no layout, styling, or animation curve is being chosen.

## 5. `GroupableColumn.tsx` `useMemo` unnecessary `columnState.criteria` dependency

**Decision**: Remove `columnState.criteria` from the dependency array at line 107; keep `[processCards, ungroupedCards, column.id, participants]`.

**Verification (traced, not assumed)**: `processCards` (from `useColumnGrouping.ts`) is a `useCallback` with deps `[getColumnState, groupCards]`; `getColumnState` is itself a `useCallback` with deps `[columnStates]`. Since `columnState.criteria` is read from `columnStates[column.id]`, any change to that criteria produces a new `columnStates` object, which changes `getColumnState`'s identity, which changes `processCards`'s identity — already covered by the existing `processCards` dependency. The extra `columnState.criteria` entry is therefore provably redundant, not just flagged by heuristic. Removing it cannot cause under-recomputation.

**Alternatives considered**: None needed — this is exactly what the ESLint suggestion recommends, and the dependency chain confirms it's safe.

## 6. `GroupCard.tsx` unused `onCardDelete` prop

**Decision** (per 2026-08-08 spec clarification — keep current "remove from group" behavior): Remove `onCardDelete` from `GroupCardProps` and from the destructured parameters in `GroupCard.tsx`. In `GroupableColumn.tsx`, remove **only** the `onCardDelete={onCardDelete}` line passed into `<GroupCard ... />` (the grouped-cards render block). 

**Important distinction traced**: `GroupableColumn.tsx` passes `onCardDelete` to two different children — `<GroupCard>` (unused inside; this occurrence is dead) and `<GroupedCardList>` (used inside — `GroupedCardList.tsx` forwards it to `DragDropColumn`'s `onDelete`, providing real delete for ungrouped cards). Only the `GroupCard` pass-through is removed; `GroupableColumn`'s own `onCardDelete` prop and the `GroupedCardList` pass-through are untouched, since real deletion for ungrouped cards must keep working (spec `FR-013`).

**Alternatives considered**: Wiring `onCardDelete` into `GroupCard`'s rendered cards (real delete while grouped) — this was the other clarification option; not selected. Prefixing with `_onCardDelete` instead of removing — rejected in favor of full removal per Constitution Principle V (Simplicity/YAGNI): an unused prop kept "just in case" is exactly the speculative-generality the principle prohibits, and the prop can always be re-added if the "wire up real delete" direction is chosen later.

## 7. `useLinkedProviders.ts` missing `refreshLinkedProviders` effect dependency

**Decision**: This is the highest-risk fix in the set. `refreshLinkedProviders` is currently declared as a plain `async` function inside the hook body (not wrapped in `useCallback`), so it gets a new identity on every render. **Naively adding it to the `useEffect` dependency array (the literal auto-fix) would make the effect re-run on every render** whenever `user?.email` is truthy — turning a change-driven refresh into an every-render refresh, which is a real regression (repeated fetches, potential flicker), not a cosmetic one.

The correct fix is two-part:
1. Wrap `refreshLinkedProviders` in `useCallback` with dependencies `[user?.email, userProfile?.providers]` — the exact two values its body actually reads (the early-return guard on `user?.email`, and the `userProfile?.providers` mapping). This gives it a stable identity that only changes when those two inputs change — matching the effect's *current* re-run semantics exactly.
2. Add the now-stable `refreshLinkedProviders` to the `useEffect` dependency array alongside the existing `user?.email`, `userProfile?.providers`.

**Verification**: Since `refreshLinkedProviders`'s new `useCallback` deps are the same two values already in the effect's dependency array, the effect's re-run conditions are unchanged before and after this fix — confirmed behavior-equivalent, not just lint-silenced.

**Why a preceding test matters here (Constitution Principle I, TDD)**: No dedicated unit test currently exists for `useLinkedProviders` (only for `LinkedProvidersCard`, a consumer, and `AuthButtonGroup`, which doesn't use this hook). Given the regression risk identified above, a unit test asserting (a) refresh fires when `user.email` or `userProfile.providers` changes, and (b) refresh does **not** re-fire on an unrelated re-render, MUST be written before this fix lands, per the project's non-negotiable TDD principle — this is carried into the task breakdown.

**Alternatives considered**: Omitting `refreshLinkedProviders` from the array with an `eslint-disable` comment — rejected; spec `FR-012` requires zero warnings, and this would leave the underlying staleness risk undocumented besides.

## 8. `AuthButtonGroup.tsx` unused `providerId` argument

**Decision**: `getProviderStyles(providerId: AuthProviderType)` ignores its argument and always returns the same constant class string (confirmed by reading the function body). Remove the parameter entirely and update the single call site (`getProviderStyles(provider.id)` → `getProviderStyles()`), rather than prefixing with `_providerId`.

**Rationale**: Per Constitution Principle V (Simplicity/YAGNI) — same reasoning as item 6: a parameter no implementation currently uses is speculative surface, not a documented future contract.

**Alternatives considered**: Prefix with `_providerId` to preserve the signature shape (in case per-provider styling is added later) — rejected as speculative; trivial to re-add a parameter when a real per-provider styling need exists.

## Summary of behavior-equivalence risk, ranked

1. **`useLinkedProviders.ts`** (item 7) — real regression risk if fixed naively; requires a new test first.
2. **`GroupCard.tsx` / `GroupableColumn.tsx`** (item 6) — requires precise which-occurrence editing (traced above) to avoid silently breaking ungrouped-card delete.
3. **`GroupableColumn.tsx` `autoFocus`** (item 4) — UX-preserving replacement identified; low risk given existing focus-ring styling is untouched.
4. **`useMemo` dependency** (item 5) — proven redundant via dependency-chain tracing; no risk.
5. **Docx imports, `removed` rename, `providerId` removal** (items 2, 3, 8) — mechanical, no behavior surface.
6. **GitHub Actions version bumps** (item 1) — config-only; verified via changelogs to carry no relevant breaking changes; full CI run after the change is still the acceptance gate (spec `SC-004`).
