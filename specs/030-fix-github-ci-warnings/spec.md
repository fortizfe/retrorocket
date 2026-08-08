# Feature Specification: Eliminate GitHub CI/CD and Lint Warnings

**Feature Branch**: `030-fix-github-ci-warnings`

**Created**: 2026-08-08

**Status**: Draft

**Input**: User description: "Quiero corregir todos estos warnings que tengo en github sobre el repositorio para dejarlo sin ningun warning. Investiga y corrige cada uno de ellos." (List of GitHub Actions deprecation warnings and ESLint/React warnings surfaced across the CodeQL Analysis, Type-check/lint/test, Playwright E2E, Deploy Production, and Automated Semantic Versioning workflow runs.)

## Clarifications

### Session 2026-08-08

- Q: GroupCard.tsx destructures `onCardDelete` but never calls it — every sibling handler is wired through to the card, but the card's delete button is instead wired to `handleRemoveCard` → `onRemoveCardFromGroup` (ungroup, not permanent delete). Should the fix preserve this behavior, or restore true delete for grouped cards? → A: Keep current behavior — treat "remove from group" as the existing intended design for a grouped card's delete action; scope the fix to dropping the unused `onCardDelete` prop from `GroupCard`'s interface and its callers, with no behavior change.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Clean, future-proof CI pipeline (Priority: P1)

As the repository maintainer, I want every GitHub Actions workflow run to complete without deprecation warnings, so that the CI/CD pipeline keeps working reliably after GitHub retires the currently-flagged runner/action versions instead of silently breaking later.

**Why this priority**: Deprecation warnings on `actions/checkout`, `actions/setup-node`, `actions/setup-java`, and `github/codeql-action` indicate the pipeline is running on borrowed time — GitHub has published fixed retirement dates (Node 20 runner deprecation, CodeQL Action v3 deprecation in December 2026). If these lapse, every job that depends on them (analysis, checks, e2e, deploys, releases) stops working, blocking all future merges and releases. This is the highest-impact, most time-sensitive item.

**Independent Test**: Trigger a full workflow run (push or PR) and confirm the run summary shows zero deprecation annotations for any job — the 5 jobs where the annotation was directly observed (CodeQL Analysis, Type-check/lint/test, Playwright E2E, Deploy Production, Automated Semantic Versioning) plus every other job that uses the same flagged actions (Deploy Preview, Sync Firebase preview domain, Remove Firebase preview domain, Clean up orphaned Firebase preview domains) — while all jobs still complete with the same pass/fail outcome as before the change.

**Acceptance Scenarios**:

1. **Given** a workflow run triggered by a push to `main`, **When** the run completes, **Then** no job in the run displays a "Node.js 20 is deprecated" annotation.
2. **Given** the CodeQL Analysis job runs, **When** it completes, **Then** no "CodeQL Action v3 will be deprecated" annotation appears, and the security scan still reports results as before.
3. **Given** the Playwright E2E job runs, **When** it completes, **Then** no "setup-java v4 is deprecated" annotation appears, and the emulator-backed E2E suite still passes.
4. **Given** all nine workflow jobs (`analyze`, `checks`, `e2e`, `deploy-preview`, `sync-preview-domain`, `cleanup-preview-domain`, `cleanup-orphan-preview-domains`, `deploy-production`, `version`) after the change, **When** compared against their pre-change behavior, **Then** each job's functional outcome (pass/fail, artifacts produced, deployments triggered) is unchanged — only the underlying action/runtime versions differ.

---

### User Story 2 - Zero-warning lint and type-check pass (Priority: P2)

As a developer working in this codebase, I want the "Type-check, lint, and test with coverage" job to report zero ESLint warnings, so that real issues aren't buried in a noisy warnings list and the codebase stays consistent with its own lint rules (unused-variable and accessibility conventions).

**Why this priority**: These are real, currently-flagged code-quality issues (unused imports, an unused destructured variable, an accessibility anti-pattern, an unused function argument, and two React Hook dependency-array issues) in shipped feature code. They don't block the pipeline the way the deprecations do, but leaving them in place means every future CI run keeps reporting the same clutter, making it harder to notice newly introduced warnings.

**Independent Test**: Run the project's lint check (as the CI job does) and confirm it reports zero warnings, then run the type-check and test suite and confirm both still pass with unchanged behavior for the affected features (DOCX export, column grouping/clustering, linked-provider display).

**Acceptance Scenarios**:

1. **Given** the DOCX export service module, **When** lint runs, **Then** no "defined but never used" warnings are reported for its imports, and exporting a retrospective to DOCX still produces an unchanged document.
2. **Given** the column-grouping rollback hook, **When** lint runs, **Then** no "assigned a value but never used" warning is reported, and restoring a previous grouping state still works as before.
3. **Given** the groupable-column card-creation textarea, **When** lint runs, **Then** no `autoFocus` accessibility warning is reported, and the card-creation UX remains usable (the field is still easy to reach and use, just not force-focused on render).
4. **Given** the groupable-column card list's `useMemo`, **When** lint runs, **Then** no "unnecessary dependency" warning is reported, and re-grouping/re-rendering behavior when grouping criteria change is unchanged.
5. **Given** the `GroupCard` component's props, **When** lint runs, **Then** no "defined but never used" warning is reported for the unused prop, and group-card rendering/behavior is unchanged.
6. **Given** the linked-providers hook's effect, **When** lint runs, **Then** no "missing dependency" warning is reported, and linked-provider data still refreshes correctly when the signed-in user or their linked providers change.
7. **Given** the auth button group's provider-styling helper, **When** lint runs, **Then** no "defined but never used" warning is reported for its unused argument, and provider button styling is unchanged.

---

### Edge Cases

- What happens if bumping `actions/checkout`, `actions/setup-node`, `actions/setup-java`, or `github/codeql-action` to their next major version introduces a breaking behavior change (e.g. different default inputs/outputs)? The pipeline must be re-verified end-to-end (all jobs green) after the bump, not just assumed compatible from the version number alone.
- What happens if silencing a lint warning by removing a genuinely-unused symbol would change runtime behavior (e.g. the unused hook dependency turns out to be load-bearing, or the unused prop is actually consumed via spread)? The fix must preserve existing behavior — verified by the existing automated test suite continuing to pass — not just make the warning disappear.
- What happens to the `autoFocus` removal from a UX standpoint? Users creating a new card should still be able to start typing without extra friction; the fix must not silently make the card-creation flow harder to use.
- What happens if a warning listed by the user no longer reproduces against the current code (already fixed or the line numbers shifted)? It should be verified against current source before being treated as still-open, and skipped with a note if already resolved.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The CI/CD workflow configuration MUST use action and runner versions that do not trigger "Node.js 20 is deprecated" annotations in any job — this applies to every job that uses the flagged actions (`actions/checkout`, `actions/setup-node`), not only the 5 jobs where the annotation was directly observed (CodeQL Analysis, Type-check/lint/test, Playwright E2E, Deploy Production, Automated Semantic Versioning); the flagged actions also appear, and must equally be fixed, in Deploy Preview, Sync Firebase preview domain, Remove Firebase preview domain, and Clean up orphaned Firebase preview domains.
- **FR-002**: The CI/CD workflow configuration MUST use a CodeQL Action version that does not trigger the "CodeQL Action v3 will be deprecated" annotation.
- **FR-003**: The CI/CD workflow configuration MUST use a Java setup action version that does not trigger the "setup-java v4 is deprecated" annotation.
- **FR-004**: After the workflow configuration changes, every job's functional behavior (checkout, dependency install/cache, type-check, lint, test with coverage, E2E suite, security analysis, preview/production deploy, semantic release) MUST remain equivalent to its pre-change behavior.
- **FR-005**: The DOCX export service module MUST NOT import symbols it does not use.
- **FR-006**: The column-grouping rollback hook MUST NOT leave a destructured variable assigned but unused.
- **FR-007**: The card-creation textarea in the groupable column component MUST NOT rely on the `autoFocus` prop, while still allowing a user to begin entering card content without added friction.
- **FR-008**: The card-list memoization in the groupable column component MUST only declare dependencies it actually uses for recomputation.
- **FR-009**: The group-card component MUST NOT declare a prop it does not use. Per the 2026-08-08 clarification, a grouped card's delete action MUST continue to mean "remove from group" (not permanent deletion) — the fix removes the unused `onCardDelete` prop from the component's interface and from its callers, without adding new delete behavior for grouped cards.
- **FR-010**: The linked-providers hook's effect MUST declare all values it references so linked-provider data refresh stays correct and predictable when the signed-in user or their linked providers change.
- **FR-011**: The auth button group's provider-styling helper MUST NOT declare an argument it does not use.
- **FR-012**: After all fixes, running the project's lint check MUST report zero warnings.
- **FR-013**: After all fixes, running the project's type-check and full automated test suite (frontend and backend) MUST continue to pass with no new failures.

### Key Entities

- **GitHub Actions workflow definition**: The CI/CD pipeline configuration describing all nine jobs (CodeQL Analysis, Type-check/lint/test, Playwright E2E, Deploy Preview, Sync Firebase preview domain, Remove Firebase preview domain, Clean up orphaned Firebase preview domains, Deploy Production, Automated Semantic Versioning) and the third-party actions/runtime versions each job depends on.
- **Lint warning**: A specific, file-and-line-located ESLint finding (unused import/variable/argument, accessibility rule violation, or React Hook dependency issue) reported during the project's lint check.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A GitHub Actions run triggered after the change shows 0 deprecation annotations across all jobs, down from the 7 currently reported (Node 20 deprecation across 5 workflow jobs, CodeQL Action v3 deprecation, setup-java v4 deprecation).
- **SC-002**: The "Type-check, lint, and test with coverage" job's lint step reports 0 warnings, down from the 10 currently reported.
- **SC-003**: 100% of existing automated tests (unit and E2E) continue to pass after the changes, with no reduction in test count.
- **SC-004**: 100% of previously-passing CI jobs (CodeQL Analysis, Type-check/lint/test, Playwright E2E, Deploy Preview, Deploy Production, Automated Semantic Versioning) continue to pass on the first run after the change.

## Assumptions

- "No warnings" refers to the specific GitHub Actions deprecation annotations and ESLint warnings enumerated by the user for this repository's current workflow run; it does not extend to categories of warnings not reported (e.g. npm audit advisories, Dependabot alerts) unless they resurface as part of this work.
- Upgrading `actions/checkout`, `actions/setup-node`, `actions/setup-java`, and `github/codeql-action` to non-deprecated major versions is an in-place configuration change with no required change to job logic, secrets, or permissions beyond what each action's migration notes call for.
- Removing the `autoFocus` prop is an acceptable UX tradeoff for accessibility compliance, consistent with the underlying ESLint accessibility rule's intent; no alternative focus-management mechanism is required unless a reasonable one is trivially available.
- The unused symbols identified (imports, destructured variable, function argument) are genuinely dead code in the current implementation, not stand-ins for planned-but-unfinished functionality. The one exception — the `onCardDelete` prop on `GroupCard` — was confirmed via the 2026-08-08 clarification to be intentionally unused going forward (grouped-card delete stays scoped to "remove from group"), not a wiring gap to fix.
- This work is a maintenance/quality effort scoped to the repository's own CI configuration and flagged source files; it does not include auditing or upgrading action *families* beyond the four named in the reported warnings (`actions/checkout`, `actions/setup-node`, `actions/setup-java`, `github/codeql-action`). It does, however, cover every *job* where a named action family appears — including jobs not explicitly listed in the pasted warnings (Deploy Preview, Sync/Remove Firebase preview domain, Clean up orphaned Firebase preview domains) — since leaving any occurrence on a deprecated version would simply resurface the same warning the next time that job runs. Other action families used in the workflow (`actions/cache`, `google-github-actions/auth`, `marocchino/sticky-pull-request-comment`) are out of scope even though some run on similarly old Node runtimes, because none were named in the reported warnings.
