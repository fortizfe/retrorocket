# Implementation Plan: Automated Firebase Preview Domain Lifecycle

**Branch**: `008-firebase-preview-domains` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-firebase-preview-domains/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Preview deployments on Vercel are unusable for any sign-in flow because each PR's preview gets its own never-seen-before URL, and Firebase Auth only allows sign-in from URLs on its "authorized domains" allowlist. This feature adds two small Node scripts plus new jobs in the existing `ci.yml` workflow that call the Identity Toolkit Admin API to register a PR's preview URL as an authorized domain the moment it deploys, deregister the previous URL when the PR redeploys, and deregister the URL entirely when the PR closes — all scoped exclusively to the dedicated staging Firebase project, never production, and all inside the one existing workflow file (no new workflow files).

## Technical Context

**Language/Version**: Node.js 22 (matches the `actions/setup-node` version already used in `ci.yml`) for two small ESM scripts; no TypeScript build step for them (see [research.md §5](./research.md)) — the rest of the app is unaffected (TypeScript 5.x, strict mode, unchanged).

**Primary Dependencies**: `google-github-actions/auth` (official GitHub Action, GCP OAuth token exchange), `actions/cache` (official GitHub Action, cross-run PR→domain state), Node 22's built-in `fetch` for the two Google REST API calls. One new devDependency, `@actions/cache` (the official GitHub Actions toolkit npm package, justified per Principle III), is added to `retro-rocket/package.json` — needed only by `cleanup-orphans.mjs`, which must resolve multiple other jobs' cache entries programmatically (`gh cache`/`GH_TOKEN` only exposes cache metadata, not content — see `contracts/cleanup-orphans-cli.md`).

**Storage**: N/A for application data (no Firestore/product schema change). The only "state" this feature owns is (a) one string per open PR in a GitHub Actions cache entry, and (b) the shared `authorizedDomains` array on the staging Firebase project's Identity Toolkit config — see [data-model.md](./data-model.md).

**Testing**: Vitest (already the project's test runner) for both the pure list-diff logic and the two CLIs' own argument-validation/HTTP-status-branching logic (`scripts/firebase-preview-domains/*.test.ts` colocated with the scripts, `fetch`/`@actions/cache` mocked — see [research.md §5](./research.md)). Only the actual network calls to Google's/GitHub's live services, and the surrounding workflow-level behavior (jobs actually firing, Firebase actually updated), are validated by hand per [quickstart.md](./quickstart.md), the same way the rest of `ci.yml`'s deploy jobs are validated — there is no practical way to "unit test" a GitHub Actions workflow trigger or a third party's live API.

**Target Platform**: GitHub Actions (`ubuntu-latest`, matching every other job in `ci.yml`), calling the Identity Toolkit Admin API (`identitytoolkit.googleapis.com`).

**Project Type**: CI/CD automation (build-script category) — no new frontend/backend surface, no UI.

**Performance Goals**: Not throughput-sensitive; each add/remove call should complete within a normal CI step (seconds), well inside `deploy-preview`'s existing budget. SC-001 sets the only real time bound: sign-in usable within 2 minutes of the preview being reported ready.

**Constraints**:
- MUST only ever touch the staging Firebase project's config — never production (FR-004), enforced structurally by scoping the service account's IAM to the staging project only, not just by code convention.
- MUST NOT add a new workflow file — everything is additional jobs/steps inside the existing `ci.yml` (FR-010, this feature's own clarified constraint).
- MUST serialize concurrent writes to the shared `authorizedDomains` array across different PRs' jobs (FR-005) — via a GitHub Actions `concurrency` group scoped to just the domain-mutating jobs (see [research.md §4](./research.md)).
- MUST authorize the new URL without depending on the old URL's removal having succeeded first (FR-006).
- A failed registration MUST fail the CI job, not degrade silently (FR-007, resolved via `/speckit-clarify`).
- Orphan cleanup (FR-008) is on-demand/manual (`workflow_dispatch`) only for this version — no scheduled job (resolved via `/speckit-clarify`).

**Scale/Scope**: Bounded by this repo's number of concurrently open pull requests (small, single digits in normal operation) — no design work needed for high concurrency or large domain lists.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | **PASS** | The pure diff logic (`computeNextDomains`) is tested before implementation (Foundational phase). The two CLIs' own I/O-adjacent branches (argument validation, missing-token handling, non-2xx `GET`/`PATCH` handling, `restoreCache()` failures) are also covered by preceding, fetch/cache-mocked Vitest tests (`sync-domain.test.ts`, `cleanup-orphans.test.ts` — see `tasks.md`), so no part of either script ships without a preceding test. This closes the gap flagged in `/speckit-analyze` (finding C1): a plan-level scope narrowing is not an acceptable substitute for the NON-NEGOTIABLE preceding-test requirement, so the thin I/O layer is tested directly instead of being carved out. |
| II. Library-First | **N/A** | No new product capability under `src/features` or `src/lib` — this feature has no UI or app-domain surface; it is CI tooling that never ships in the app bundle. |
| III. Prefer Proven Third-Party Libraries | **PASS** | Uses Google's own `google-github-actions/auth` action, GitHub's own `actions/cache` action, and the official `@actions/cache` npm package (in `cleanup-orphans.mjs`, to programmatically resolve other jobs' cache content — see `research.md` §3 and `contracts/cleanup-orphans-cli.md`) rather than hand-rolling OAuth token exchange, a bespoke state store, or an unsupported `gh cache`-content read. TypeScript-for-scripts tooling remains explicitly rejected as unjustified (see [research.md §5](./research.md)). |
| IV. SOLID | **PASS (light)** | The two scripts each have one job (sync one PR's domain; sweep orphans) and the pure diff logic is factored out from the I/O so it doesn't couple GitHub-specific concerns (cache) to the Firebase-specific concerns (REST calls) — see the "Non-goals" section of [contracts/sync-domain-cli.md](./contracts/sync-domain-cli.md). Firestore/UI coupling rules don't apply — no Firestore access is added by this feature. |
| V. Simplicity (KISS + YAGNI) | **PASS** | No new datastore, no scheduled cron job (explicitly deferred per the resolved clarification), no new workflow file, no new runtime dependency. Every mechanism used (Actions cache, Actions concurrency groups, Node's built-in fetch) already exists in the ecosystem or the runner image. |
| VI. Coverage Floor (NON-NEGOTIABLE) | **PASS** | The new scripts live under `retro-rocket/scripts/`, which `vitest.config.ts`'s coverage config does not exclude — their tests contribute to (and must not regress) the existing coverage thresholds. |
| VII. E2E Playwright (NON-NEGOTIABLE) | **N/A** | This feature doesn't add or change an in-app user flow; the sign-in flow itself is already (or separately) covered by the existing Playwright/emulator suite. There is nothing new here for Playwright to exercise — the thing being tested is a GitHub Actions workflow, not the app. |
| Technology Stack: Strict Type Safety | **N/A for this feature's scripts** | The "TypeScript strict mode MUST remain on" rule governs the app's existing compiled surface (`retro-rocket/src`, under its `tsconfig`); the new scripts sit outside that boundary by design (see research.md §5) and don't touch or weaken the app's tsconfig. Nothing under `src/` changes type-safety posture. |
| Technology Stack: Real-Time Data Security | **N/A** | `firestore.rules` and Firestore access patterns are untouched by this feature. |

No violations requiring the Complexity Tracking table below.

## Project Structure

### Documentation (this feature)

```text
specs/008-firebase-preview-domains/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── sync-domain-cli.md
│   └── cleanup-orphans-cli.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── package.json                     # MODIFIED: adds @actions/cache as a devDependency
├── scripts/
│   └── firebase-preview-domains/
│       ├── domain-diff.mjs          # pure logic: compute next authorizedDomains array
│       ├── domain-diff.test.ts      # Vitest unit tests for domain-diff.mjs
│       ├── sync-domain.mjs          # CLI: GET/PATCH authorizedDomains (see contracts/sync-domain-cli.md)
│       ├── sync-domain.test.ts      # Vitest tests for sync-domain.mjs's own logic (fetch mocked)
│       ├── cleanup-orphans.mjs      # CLI: on-demand orphan sweep (see contracts/cleanup-orphans-cli.md)
│       └── cleanup-orphans.test.ts  # Vitest tests for cleanup-orphans.mjs (fetch + @actions/cache mocked)
└── (no other app source changes)

.github/workflows/
└── ci.yml                # MODIFIED, not replaced — new jobs added, no new workflow file (FR-010):
                           #   - trigger `on.pull_request.types` gains `closed`; `on.workflow_dispatch` added
                           #   - the pre-existing `analyze`/`checks`/`e2e`/`deploy-preview` jobs gain
                           #     guards so they don't misfire on those two new triggers
                           #     (/speckit-analyze finding I1)
                           #   - new job `sync-preview-domain` (needs: deploy-preview; skipped on `closed`)
                           #   - new job `cleanup-preview-domain` (runs only on `closed`)
                           #   - new job `cleanup-orphan-preview-domains` (workflow_dispatch only)
                           #   - the three jobs above share one `concurrency.group` for the
                           #     Firebase-writing step (FR-005/research.md §4)
```

**Structure Decision**: This feature has no frontend/backend split and adds no product-facing code — it lives entirely as (a) small CI-only Node scripts under `retro-rocket/scripts/firebase-preview-domains/`, reusing the already-present (currently empty) `retro-rocket/scripts/` directory rather than inventing a new top-level location, and (b) additional jobs inside the single existing `.github/workflows/ci.yml`. This keeps the change inside the two places that already own this kind of concern (CI orchestration lives in `ci.yml`; anything that isn't `src/` product code and isn't a `.specify` template lives in `scripts/`) instead of creating a new "ops" location.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
