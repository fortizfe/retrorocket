# Phase 0 Research: Remove Shell Scripts & Trigger CI on Main Push

## 1. Which shell scripts to remove

**Decision**: Delete all 10 `.sh` files at the root of `retro-rocket/`:
`deploy.sh`, `commands.sh`, `verify-firebase.sh`, `check-status.sh`,
`pre-deploy-check.sh`, `migrate-user-providers.sh`, `test.sh`,
`setup-firebase-auth.sh`, `start.sh`, `track-coverage.sh`.

**Rationale**: Every CI-relevant step (type-check, lint, `test:coverage`,
`e2e`) is already expressed as an npm script and invoked directly by
`.github/workflows/ci.yml`. These shell scripts only wrap/duplicate those
same npm scripts or provide manual deployment/local-setup convenience that
the user has confirmed is no longer needed now that everything is
CI-driven. None of them are referenced from any other part of the codebase
outside of each other and `package.json`'s `start` script.

**Alternatives considered**: Keep the scripts but mark them deprecated —
rejected because it contradicts the explicit removal request and the
constitution's Simplicity (KISS/YAGNI) principle: unused, duplicate tooling
left in the tree adds confusion without value.

## 2. Replacing `package.json`'s `start` script

**Decision**: Change the `"start"` script in `retro-rocket/package.json`
from `"./start.sh"` to a direct equivalent that launches the dev server
(the one behavior of `start.sh` that isn't optional convenience), e.g.
`"start": "npm run dev"`.

**Rationale**: `start.sh`'s other behavior (checking for Node/npm, running
`npm install` if `node_modules` is missing, prompting to copy `.env.example`
to `.env`, running a type-check before printing instructions) is one-time
developer-onboarding convenience, not something required for the app to
function correctly — consistent with the user's own stated rationale that
these scripts aren't necessary for correct operation. Reproducing that
ceremony as an inline npm script would reintroduce the duplication this
feature is meant to remove.

**Alternatives considered**: Reimplement the same checks as a chained npm
script (`node_modules` check, `.env` bootstrap, type-check) — rejected as
unnecessary complexity for a convenience path (violates Simplicity
principle). Leaving `"start"` pointing at the deleted file — rejected, it
would break `npm start` (violates FR-002).

## 3. Changing the CI trigger

**Decision**: In `.github/workflows/ci.yml`, replace the existing
`on.pull_request.branches: [main]` block with `on.push.branches: [main]`.
Both jobs (`checks`, `e2e`) and every step inside them are left unchanged —
only the trigger changes.

**Rationale**: This is the smallest possible change that satisfies
FR-004/FR-005/FR-006: the pipeline still runs the same full check suite, just
triggered by a push landing on `main` instead of a pull request event.

**Alternatives considered**: Adding a `push` trigger alongside the existing
`pull_request` trigger — rejected, FR-005 explicitly requires pull requests
to stop triggering the pipeline, not gain an additional trigger. Adding
`workflow_dispatch` as a manual fallback — rejected as out of scope; not
requested (YAGNI).

## 4. Conflict with the project constitution's PR gate

**Observation**: The constitution's *Development Workflow & Quality Gates*
section states: "Every PR MUST demonstrate TDD compliance... and MUST pass
the ESLint and TypeScript type-check gates before merge" and "CI MUST fail
the build if coverage drops below the thresholds." Those rules assume CI
runs automatically on every PR. After this feature ships, CI will no longer
run on pull request events at all (FR-005), so PRs can merge into `main`
without an automatic lint/type-check/coverage gate having run first.

**Decision**: Do not silently work around this by keeping a partial PR
trigger. Implement the trigger change exactly as specified (FR-004/FR-005),
and record the conflict as a documented, justified constitution exception
in `plan.md`'s Complexity Tracking section, per the constitution's own
Governance rule that exceptions must be explicitly justified rather than
silently bypassed.

**Rationale**: The user confirmed this trigger change twice — once in the
original feature description and once explicitly during `/speckit-clarify`
review — so unilaterally reinterpreting it (e.g., keeping a lightweight PR
check) would override a clear, repeated instruction. The correct venue to
formally reconcile the constitution's wording with this new workflow is a
future `/speckit-constitution` amendment, not a workaround bundled into
this feature.

**Alternatives considered**: Keep a lightweight PR-triggered job (lint +
type-check only) so the constitution's literal wording still holds —
rejected for this plan because it contradicts FR-005 as written and was not
what the user asked for; raising it would mean re-opening a question already
resolved during clarification. Amend the constitution as part of this
feature — rejected as out of scope; constitution changes happen only via
`/speckit-constitution`, not as a side effect of an unrelated feature plan.

## Summary

All unknowns from the Technical Context are resolved; no `NEEDS
CLARIFICATION` markers remain. The one open item — the constitution's PR
gate wording no longer matching reality — is not a research unknown but a
governance conflict, carried forward into `plan.md`'s Constitution Check and
Complexity Tracking sections for explicit, visible justification rather than
silent resolution.
