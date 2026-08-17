# Implementation Plan: Working Firebase-Backed Preview Deployments

**Branch**: `048-firebase-preview-deploy-config` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/048-firebase-preview-deploy-config/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

The preview-deploy pipeline built by [005-gated-vercel-deploys](../005-gated-vercel-deploys/spec.md) and [008-firebase-preview-domains](../008-firebase-preview-domains/spec.md) already runs on every PR, but the environment it deploys into is incompletely wired: several backend secrets exist for Vercel's Production scope but were never added to Preview, and the app's sign-in flow has no mechanism to work against a preview deployment's unique, per-build URL. This plan closes those gaps entirely through configuration — Firebase project settings on `retrorocket-staging`, GitHub Actions secrets, Vercel Preview environment variables, and small additions to the existing `ci.yml` workflow (in the same category as 008's own CI-only automation scripts, not application code) — with no changes to `retro-rocket/src`, `retro-rocket/server/src`, or `retro-rocket/api`. The central technical finding from research is that a small, fixed pool of per-PR-slot alias domains (`vercel alias set`, assigned round-robin by PR number) is the only config-only mechanism available to give sign-in a stable, pre-registerable redirect address, because neither Google's nor GitHub's OAuth app settings expose a public API to manage their redirect-URI allowlist — that part stays a one-time manual console step, not automation.

## Technical Context

**Language/Version**: No application-facing language/runtime changes. The new PR Preview Alias Slot assignment logic is a small Node.js 22 ESM script (`retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs`), matching the existing `actions/setup-node` version and directly following the precedent feature 008 set (`domain-diff.mjs`): even simple pure logic gets extracted into a tested script rather than left inline in `ci.yml`, per Constitution Principle I (`/speckit-analyze`, 2026-08-17 — finding E1).

**Primary Dependencies**: Vercel CLI (`vercel pull` / `vercel build` / `vercel deploy` / `vercel alias`, already used in `ci.yml`), the Identity Toolkit Admin API (already called by 008's `sync-domain.mjs`, unchanged), `google-github-actions/auth` (already used, unchanged). No new runtime dependency — `assign-alias.mjs` uses Node's built-in `fetch`/`child_process`, following 008's existing pattern exactly.

**Storage**: N/A for application data — Firestore itself is unchanged by this feature; what's missing is that `retrorocket-staging`'s Firestore *database* and security rules must actually be provisioned/deployed (see [research.md §2](./research.md)), a one-time project-setup action, not a schema change.

**Testing**: `assign-alias.mjs`'s slot-computation logic and its own argument-validation/exit-code behavior get the same Vitest-with-mocked-`fetch` treatment as 008's `sync-domain.test.ts`, written and confirmed failing before the script is implemented (Constitution Principle I). Everything else in this feature (Firebase console settings, GitHub secrets, other Vercel env vars, the `ci.yml` wiring around the script) has no application logic to unit-test and is instead validated live, end-to-end, per spec FR-009/User Story 3.

**Target Platform**: Vercel Preview environment (Node.js Vercel Functions, unchanged runtime), the `retrorocket-staging` Firebase/Identity Platform project, and GitHub Actions (`ubuntu-latest`, extending the existing `ci.yml`).

**Project Type**: Infrastructure/configuration change to an existing web application — no new frontend or backend surface, no UI.

**Performance Goals**: Not throughput-sensitive. The only timing bound is SC-002: sign-in usable within 2 minutes of a preview being reported ready.

**Constraints**:
- No changes to `retro-rocket/src`, `retro-rocket/server/src`, or `retro-rocket/api` (Clarifications, 2026-08-17) — every change here is Firebase/Vercel/GitHub project configuration or `ci.yml` workflow steps/scripts, the same category 008 already used for its own automation.
- Production Firebase and production Vercel configuration MUST remain untouched (FR-007).
- Neither Google Cloud (OAuth 2.0 Client redirect URIs) nor GitHub (OAuth App callback URLs) currently exposes a reliable public API for programmatically managing their redirect-URI allowlist — both must be edited by hand in their respective consoles. This bounds how many *concurrently distinct* OAuth-capable preview slots this feature can support without an unbounded per-PR list (see [research.md §1](./research.md)).
- All new configuration must be verified against the real `retrorocket-staging` project rather than assumed correct because a same-named secret/variable already existed (Edge Cases, spec.md).

**Scale/Scope**: Bounded by this repo's typical number of concurrently open pull requests (small, single digits) — the fixed-size alias-slot pool (default 5, see research.md §1) is sized for that, not for large-scale concurrent preview fleets.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | **PASS** | `assign-alias.mjs` gets a preceding Vitest test (`assign-alias.test.ts`) exactly like 008's `sync-domain.mjs`/`cleanup-orphans.mjs`, resolved as a committed decision rather than a conditional one after `/speckit-analyze` (2026-08-17, finding E1) flagged that leaving the slot-computation logic untested inside `ci.yml` broke with 008's own precedent for this exact class of change. The rest of this feature (Firebase console settings, GitHub secrets, other Vercel env vars) has no application code to precede with a test — validated live instead (FR-009), same as 008's own workflow-level behavior. |
| II. Library-First | **N/A** | No new product capability under `src/features` or `src/lib`. |
| III. Prefer Proven Third-Party Libraries | **PASS** | Reuses the Vercel CLI and the already-adopted `google-github-actions/auth` action; `assign-alias.mjs` uses only Node's built-in `fetch`/`child_process`, following 008's precedent of no new runtime dependency. |
| IV. SOLID | **N/A** | No domain/service code is added or changed. |
| V. Simplicity (KISS + YAGNI) | **PASS** | No new workflow file, no new datastore, one small script. The alias-slot-pool mechanism (research.md §1) is deliberately the smallest config-only construct that can give sign-in a stable, pre-registerable address — a full per-PR dynamic OAuth redirect would require a code change, which is explicitly out of scope. |
| VI. Coverage Floor (NON-NEGOTIABLE) | **PASS** | No `src/` or `server/src` coverage is affected. `assign-alias.mjs`/`assign-alias.test.ts` live under `retro-rocket/scripts/`, which `vitest.config.ts`'s coverage config does not exclude — same as 008's scripts. |
| VII. E2E Playwright (NON-NEGOTIABLE) | **N/A** | This feature doesn't add or change an in-app user flow; existing Playwright/emulator coverage of sign-in is unaffected. |
| VIII. Accessibility (WCAG 2.1 AA) | **N/A** | No user-facing surface is added or changed. |
| IX. Apple-Inspired Design & Motion Tooling | **N/A** | No frontend visual design or motion work. |
| Technology Stack: Real-Time Data Security | **PASS** | FR-002 requires `retrorocket-staging`'s Firestore security rules to match production's intent; this feature deploys the existing, unmodified `firestore.rules` to the staging project rather than writing new rules. |

No violations requiring the Complexity Tracking table below.

**Post-Phase-1 re-check**: research.md and data-model.md confirm no product-facing surface or new runtime dependency is introduced. The one addition — `assign-alias.mjs` — is CI-only tooling (not `src/`/`server/src`/`api/`) and, per the `/speckit-analyze` correction above, ships with a preceding test; the table's conclusions are otherwise unchanged after design.

## Project Structure

### Documentation (this feature)

```text
specs/048-firebase-preview-deploy-config/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── preview-environment-variables.md
│   ├── firebase-staging-project-checklist.md
│   └── pr-preview-alias-cli.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
retro-rocket/
├── scripts/
│   └── firebase-preview-domains/     # UNCHANGED (008's existing scripts) unless
│       │                             # research.md §1's live verification shows the
│       │                             # authorized-domain target needs to track the
│       │                             # new PR-slot alias instead of the raw per-deploy
│       │                             # URL — a possible follow-up, not assumed here.
│       └── ... (existing files)
│   └── firebase-preview-alias/       # NEW — mirrors 008's scripts/ pattern exactly
│       ├── assign-alias.mjs          # computes the slot (pr_number % 5 + 1), builds
│       │                             # OAUTH_REDIRECT_BASE_URL, and runs
│       │                             # `vercel alias set` for that PR's deployment
│       └── assign-alias.test.ts      # Vitest, written and failing before assign-alias.mjs
│                                     # exists (Constitution Principle I / analyze finding E1)
└── (no other app source changes — src/, server/src/, api/ untouched per Clarifications)

.github/workflows/
└── ci.yml                # MODIFIED, not replaced:
                           #   - deploy-preview job: between `vercel pull` and `vercel build`,
                           #     invoke assign-alias.mjs to inject OAUTH_REDIRECT_BASE_URL as a
                           #     build-time override; after `vercel deploy` returns its URL,
                           #     invoke assign-alias.mjs again to run `vercel alias set`
                           #   - cleanup on PR close: release/no-op the slot (no new
                           #     external state beyond what 008 already tracks per PR)

# No file changes outside ci.yml and (conditionally) the new scripts/ directory above.
# Firebase project settings (Firestore provisioning, security rules deploy, IAM role),
# GitHub Actions secrets, Vercel Preview environment variables, and the Google/GitHub
# OAuth app console settings are configured directly in those systems, not as repo files
# — tracked instead by contracts/*.md and validated via quickstart.md.
```

**Structure Decision**: Same "no frontend/backend split" shape as 008: this feature adds nothing under `retro-rocket/src` (frontend) or `retro-rocket/server/src`+`retro-rocket/api` (backend), consistent with the Clarifications' configuration-only scope. Everything either lives in already-established locations (`.github/workflows/ci.yml`, `retro-rocket/scripts/`) or is external system configuration (Firebase console, GitHub repo/organization secrets, Vercel project settings, Google Cloud / GitHub OAuth app consoles) with no corresponding repository file — those are documented as contracts and validated live rather than represented as source.

## Complexity Tracking

*No entries — Constitution Check reported no violations.*
