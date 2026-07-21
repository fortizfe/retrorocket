# Research: Gated Vercel Deployments

## 1. Mechanism for gating Vercel deployments on quality gates

**Decision**: Disable Vercel's native, automatic Git-triggered deployments entirely (see item 2), and add a new GitHub Actions workflow (`deploy.yml`) that waits for the existing required status checks to succeed on the triggering commit, then explicitly deploys via the Vercel CLI.

**Rationale**: The request is that deployments "solamente se desencadenen si se superan las quality gates" — deployments must only be *triggered* once gates pass, not merely made visible/aliased afterward. Vercel's native Git integration currently builds and deploys immediately on every push/PR (confirmed: the "Preview" and "Production" GitHub Environments already exist with no protection rules, and zero GitHub Actions secrets exist for Vercel credentials — i.e., no Actions-based deploy exists today). Only an Actions-triggered CLI deploy, started after the gate is satisfied, matches "MUST NOT start a deployment until gates pass" (FR-001/FR-002) literally.

**Alternatives considered**:
- Vercel's "Deployment Checks" feature (`vercel project checks`, `vercel/repository-dispatch/actions/status@v1`) — lets external checks block *alias assignment* (visibility) on a deployment that Vercel's native integration still builds immediately on every push/PR. Rejected: the deployment itself would still start before gates pass (wasting build minutes on doomed PRs and not matching the literal "MUST NOT start" requirement), only its visibility would be delayed.
- A custom "ignored build step" script inside `vercel.json`'s native build path that polls GitHub for check status before allowing Vercel's own build to proceed — rejected: Vercel's ignored-build-step mechanism is designed for fast path-based skip decisions, not for polling asynchronous, multi-minute external CI/CodeQL runs; using it this way risks build-step timeouts and duplicates logic an Actions workflow already does more naturally.

## 2. Disabling Vercel's native automatic Git deployments

**Decision**: Add `"git": { "deploymentEnabled": false }` to `retro-rocket/vercel.json`.

**Rationale**: This is Vercel's documented, first-class configuration for disabling *all* automatic Git-triggered deployments (both preview and production) across every branch, while still allowing deployments created via the CLI/API — exactly what's needed so `deploy.yml` becomes the sole deployment path. It is an in-repo, version-controlled change (consistent with how `ci.yml`/`codeql.yml` are already version-controlled) rather than an out-of-band dashboard toggle.

**Alternatives considered**:
- Per-branch `deploymentEnabled: { "main": false }` — only disables automatic production deploys from `main`; preview deployments from arbitrary PR branches would still auto-trigger ungated. Rejected: doesn't cover the preview-gating requirement (FR-001).
- Legacy `github.enabled: false` — Vercel's own docs mark this deprecated in favor of `git.deploymentEnabled`. Rejected in favor of the current, supported property.
- Disabling the Git integration entirely from the Vercel dashboard (unlinking the repo) — would also remove PR-comment/status functionality and is a manual, non-reviewable dashboard action rather than an in-repo, auditable config change. Rejected in favor of the declarative `vercel.json` setting.

## 3. Waiting for the quality gates without re-implementing severity logic

**Decision**: In `deploy.yml`, wait for the same three named checks the existing branch-protection ruleset (`main protection`, id `19373841`) already requires: `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and `CodeQL` — using a proven "wait for GitHub check" Action (e.g. `lewagon/wait-on-check-action`) against the triggering commit SHA, one step per check name.

**Rationale**: The `CodeQL` check referenced by branch protection is populated by the separate "GitHub Advanced Security" app based on alert severity (`security_alerts_threshold: high_or_higher`) — it is **not** the same as the `codeql-action`/`analyze` workflow job's own exit status, which can stay green even when a High-severity finding fails the app-level `CodeQL` check (documented and verified in feature 004's quickstart, PR #5). Waiting on the check *name* `CodeQL` (rather than `needs:` on the `codeql-analyze` job) means FR-007's severity threshold is satisfied for free — deployment inherits exactly the same pass/fail signal already enforced for merge, with zero duplicated severity logic.

`lewagon/wait-on-check-action` is MIT-licensed and actively maintained with wide adoption for exactly this "wait for another check" use case, satisfying Principle III's maintenance/license validation; re-confirm the exact action/version at implementation time (T006) in case a better-maintained alternative has since emerged.

**Alternatives considered**:
- `needs:` job dependency within a single combined workflow — would require merging `ci.yml`/`codeql.yml`'s jobs into `deploy.yml` (restructuring existing, working workflows) and would still only reflect the `codeql-action` job's own success, not the severity-aware `CodeQL` app check — silently under-gating FR-007. Rejected.
- `workflow_run` trigger keyed off completion of `ci.yml`/`codeql.yml` — requires tracking two independent upstream workflow completions and still doesn't observe the asynchronous, app-level `CodeQL` check conclusion (which can resolve slightly after the workflow job finishes). Rejected as more complex and no more correct than checking the named check directly.
- A custom script calling the CodeQL alerts API directly to compute severity — rejected as unnecessary custom logic duplicating what branch protection's `code_scanning` rule and its resulting `CodeQL` check already compute (Simplicity/YAGNI).

## 4. Vercel CLI deployment flow for preview vs. production

**Decision**: Follow Vercel's documented GitHub Actions CLI pattern in `deploy.yml`, split into two jobs:
- `deploy-preview` (runs only `if: github.event_name == 'pull_request'`): `vercel pull --yes --environment=preview --token=$VERCEL_TOKEN` → `vercel build` → `vercel deploy --prebuilt`.
- `deploy-production` (runs only `if: github.event_name == 'push'`, on `main`): `vercel pull --yes --environment=production --token=$VERCEL_TOKEN` → `vercel build --prod` → `vercel deploy --prebuilt --prod`.

Both jobs run `working-directory: retro-rocket` (matching the existing `defaults.run.working-directory` convention in `ci.yml`) and require `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` as GitHub Actions secrets.

**Rationale**: This is Vercel's own documented, supported pattern for running your own CI first and deploying via the CLI from GitHub Actions (`vercel.com/docs/git/vercel-for-github`), so it needs no bespoke deployment scripting. The `if:` conditions on event type/ref directly and simply implement FR-003/FR-004's strict preview-vs-production separation.

**Alternatives considered**:
- A single job with branching shell logic (`if [ "$GITHUB_EVENT_NAME" = "pull_request" ]; then ... else ... fi`) — works but is less legible in the Actions UI (one job either way) and mixes two independently-triggerable concerns into one job; two small `if:`-gated jobs are simpler to reason about and match FR-003/FR-004's mutual exclusivity more directly.
- A third-party wrapper Action (e.g. `amondnet/vercel-action`) — adds an extra unmaintained-risk dependency for something the official CLI already does in four documented commands; rejected per Principle III (prefer the first-party tool already used by `npm run deploy`, over an unmaintained third-party wrapper).

## 5. Credential provisioning (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)

**Decision**: Treat provisioning these three values as GitHub Actions repository secrets as a required manual prerequisite (documented in `quickstart.md`), not something this feature's code changes can perform themselves.

**Rationale**: The repository currently has zero GitHub Actions secrets (confirmed via the GitHub API). `VERCEL_TOKEN` must be generated from the Vercel account/dashboard (a credential-issuance action outside repo/Actions scope), and `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` are obtained by running `vercel link` once against the existing project (writing `.vercel/project.json`, which is never committed). This mirrors how feature 004 treated `git filter-repo`/branch-protection configuration as explicit, human-confirmed setup steps rather than something the plan could execute unattended.

**Alternatives considered**: None — credential issuance inherently requires a human with Vercel account access; there is no code-only alternative.

## 6. Surfacing the preview link on the pull request (FR-010)

**Decision**: Rely on Vercel's native PR-comment behavior, which already applies to CLI-triggered deployments that retain Git commit metadata (via `vercel pull`/`vercel deploy` running against the linked project inside the PR's own Actions run). Verify this behavior explicitly during implementation (quickstart.md), with a documented fallback of an explicit `gh pr comment` step (using the deployment URL that `vercel deploy` prints to stdout) if the native comment does not reliably appear once the native auto-deploy trigger is disabled.

**Rationale**: Vercel's GitHub integration is documented to comment on PRs for deployments it can associate with a commit via Git metadata, independent of whether that deployment was auto-triggered or CLI-triggered — this is the same mechanism already relied on informally today (per the project's README, which references automatic preview links). Keeping this native behavior avoids adding custom commenting logic unless verification shows it's actually needed.

**Alternatives considered**: Always adding a custom `gh pr comment` (or `marocchino/sticky-pull-request-comment`) step regardless of native behavior — rejected as premature (YAGNI) until verification shows the native comment doesn't appear; kept as a documented fallback rather than default behavior.

## 7. Workflow file placement

**Decision**: Add a new `.github/workflows/deploy.yml`, leaving `ci.yml` and `codeql.yml` untouched.

**Rationale**: The repository already uses one workflow file per concern (`ci.yml` for checks/tests, `codeql.yml` for security scanning); a third file for deployment continues that pattern and keeps the blast radius of this feature's changes isolated from the existing, already-required checks — reducing the risk of accidentally breaking a check that branch protection depends on.

**Alternatives considered**: Adding deploy jobs directly into `ci.yml` — rejected because `ci.yml`'s jobs are themselves required checks; adding unrelated deployment jobs to the same file increases the chance of an unrelated change accidentally affecting a required check's job name or trigger scope.
