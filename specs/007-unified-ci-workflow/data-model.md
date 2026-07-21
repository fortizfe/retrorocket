# Data Model: Unified CI Pipeline Workflow

This feature has no application data model. The entities below are the CI pipeline's own structural concepts (from the spec's Key Entities section), expressed as the GitHub Actions constructs that realize them.

## Pipeline Run

A single execution of `ci.yml`, triggered by one of two events.

| Attribute | Description |
|---|---|
| `trigger_event` | `pull_request` (targeting `main`) or `push` (to `main`) |
| `commit_sha` | The commit being validated/deployed |
| `stages` | Ordered progression: quality-checks → deploy → versioning |
| `outcome` | Derived from the terminal state of whichever stages actually ran (skipped stages do not count as failures) |

## Stage

A named phase whose jobs must all succeed before the next stage's jobs are allowed to start. Maps to a `needs:` dependency level in the workflow.

| Stage | Jobs | Runs on | Gated by |
|---|---|---|---|
| Quality Checks | `analyze` (CodeQL), `checks` (type-check + lint + test:coverage), `e2e` (Playwright) | `pull_request`, `push:main` | Nothing (entry stage); jobs run in parallel |
| Deploy | `deploy-preview`, `deploy-production` | `deploy-preview`: `pull_request` only. `deploy-production`: `push:main` only | All three Quality Checks jobs succeeding (`needs: [analyze, checks, e2e]`); `deploy-production` additionally requires the push not be a version-bump commit |
| Versioning | `version` | `push:main` only | `deploy-production` succeeding (`needs: [deploy-production]`); additionally skipped if the triggering commit message contains `[version bump]` |

## Job (implementation unit of a Stage)

| Attribute | Description |
|---|---|
| `name` | Display name shown in the GitHub Checks UI; MUST be preserved from the current three workflows for the three branch-protection-required jobs (see research.md §3) |
| `needs` | Array of job ids that must report `success` before this job is scheduled |
| `if` | Optional condition narrowing which trigger event this job applies to (used to split preview vs. production deploy, and to scope `version` to `push:main`) |
| `permissions` | Job-scoped GitHub token permissions (e.g., `security-events: write` for `analyze`, `contents: write` for `version`), carried over unchanged from today's per-workflow `permissions:` blocks |

## Relationships

```text
analyze ─┐
checks ──┼──► deploy-preview   (if: pull_request)
e2e ─────┘
analyze ─┐
checks ──┼──► deploy-production (if: push to main) ──► version (if: push to main, no [version bump])
e2e ─────┘
```

No state transitions beyond this linear stage progression exist; there is no retry/resume state machine introduced by this feature.
