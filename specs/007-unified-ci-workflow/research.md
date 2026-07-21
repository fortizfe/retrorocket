# Research: Unified CI Pipeline Workflow

## 1. Expressing sequential stage gating across parallel first-stage jobs in one workflow

**Decision**: Use native `needs: [analyze, checks, e2e]` on the deploy jobs, and `needs: [deploy-preview]` / `needs: [deploy-production]` (as applicable) on the version job, all within a single `ci.yml`. GitHub Actions runs `analyze`, `checks`, and `e2e` in parallel (no `needs:` between them) since none depends on another's output, and only proceeds to a job once every job listed in its `needs:` array has reported `success`.

**Rationale**: `needs:` is GitHub Actions' native dependency mechanism — a downstream job is skipped automatically unless every upstream dependency succeeded (default behavior, no extra `if:` needed to get "stop on failure"). This directly satisfies FR-003/FR-006/FR-008 ("subsequent stage MUST be skipped if a prior stage did not succeed") without any custom polling or scripting.

**Alternatives considered**:
- *Keep `wait-on-check-action` polling* (today's approach): rejected — it exists specifically to bridge *separate* workflow runs (each workflow only sees its own jobs as `needs:`-able); once everything is one workflow, the check-name polling it does is redundant and only adds latency (15s poll interval, 15-minute timeout) and an extra third-party action dependency.
- *A single monolithic job running everything sequentially in one script*: rejected — loses parallelism between CodeQL/tests/E2E, loses per-job visibility in the Actions UI and in branch-protection required-checks (which key off job names), and contradicts the existing job structure the constitution's Development Workflow section names explicitly.

## 2. Conditional preview vs. production deploy within one workflow

**Decision**: Keep `deploy-preview` and `deploy-production` as two distinct jobs (mirroring today's `deploy.yml`), each with its own `if:` condition (`github.event_name == 'pull_request'` / `github.event_name == 'push' && github.ref == 'refs/heads/main'`), both depending via `needs:` on the three quality-check jobs. The version job depends on whichever deploy job is relevant to a push-to-main event (`deploy-production`).

**Rationale**: A job whose `if:` evaluates to false is *skipped*, and a skipped job does not satisfy a downstream `needs:` by default (GitHub Actions treats a skipped required job as blocking the dependent job from running, which is the desired "don't run" behavior for the event type that doesn't apply). Keeping them as two named jobs also preserves today's exact check names, satisfying the "no branch-protection reconfiguration" constraint — and keeps each deploy path's steps (preview vs. `--prod` build/deploy, PR-comment step) simple and readable rather than branching mid-job.

**Alternatives considered**:
- *Single `deploy` job with in-step branching on event type*: rejected — makes the job's own required-check semantics ambiguous (one job now represents two different deploy targets), and complicates the version job's `needs:` (it should only ever depend on the production path, not preview).

## 3. Preserving branch-protection required status checks through the consolidation

**Decision**: Reuse the exact existing job `name:` values (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`) and preserve CodeQL's check identity by keeping the `github/codeql-action/analyze@v3` step's `category` and the job structure equivalent to today's `codeql.yml`, so the GitHub-native `CodeQL` code-scanning check continues to be produced the same way.

**Rationale**: Branch protection on `main` (constitution §Development Workflow & Quality Gates) references required checks **by name**. Renaming jobs during this refactor — even though the underlying commands are identical — would silently break branch protection (required checks would never report against new PRs) until someone manually updates the repository's branch protection settings. Preserving names makes this a zero-touch, safe migration for repository settings.

**Alternatives considered**:
- *Rename jobs for clarity as part of this refactor* (e.g., shorter names): rejected for this feature — explicitly out of scope per the spec's Assumptions (naming/branch-protection updates are a separate operational follow-up), and combining a rename with a structural refactor increases the risk of an accidental required-check gap.

## 4. CodeQL stage gate semantics (resolves spec Clarification)

**Decision**: The `analyze` job's own success/failure (did the CodeQL Action run to completion without error) is what the pipeline's `needs:` graph checks — nothing more. No additional step queries the code-scanning alerts API for severity.

**Rationale**: This was resolved directly with the user during `/speckit-clarify` (Option A) — severity-based blocking (High/Critical findings) is a distinct GitHub feature (the repository's code-scanning branch-protection check) that already runs independently of this workflow and is unaffected by how the workflow's own jobs are wired together.

**Alternatives considered**:
- *Option B (severity-aware gate)*: rejected by the user — would require re-implementing alert-severity polling (what `wait-on-check-action` against the `'CodeQL'` check name effectively did today) inside the new pipeline, adding complexity the consolidation is meant to remove, for a guarantee branch protection already provides.
