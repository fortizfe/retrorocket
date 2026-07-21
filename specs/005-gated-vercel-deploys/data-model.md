# Data Model: Gated Vercel Deployments

This feature introduces no application data model — no Firestore collections, documents, or UI-facing entities are added or changed. The "entities" below are configuration/process artifacts relevant to verifying the feature's requirements; they are documented here for traceability rather than as a persistence schema.

## Quality Gate Result

Represents the pass/fail state of one required check for a specific commit (FR-001, FR-002, FR-005, FR-006, FR-007).

| Attribute | Description |
|---|---|
| `check_name` | One of `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL` — the exact names already required by branch-protection ruleset `main protection` (id `19373841`). |
| `commit_sha` | The exact commit the check result applies to. |
| `conclusion` | `success`, `failure`, `cancelled`, or not-yet-completed. |

**Validity rule**: A deployment (preview or production) for `commit_sha` MUST NOT start unless every `check_name`'s `conclusion` is `success` for that exact `commit_sha` (FR-001, FR-002, FR-005). A `conclusion` recorded against a different, superseded commit MUST NOT be treated as satisfying the gate for a new commit (FR-006).

## Deployment Attempt

Represents one invocation of the gated deploy workflow (FR-003, FR-004, FR-010).

| Attribute | Description |
|---|---|
| `trigger_event` | `pull_request` or `push` (to `main`). |
| `target_environment` | `preview` (when `trigger_event = pull_request`) or `production` (when `trigger_event = push`). |
| `gate_result` | Derived from the three `Quality Gate Result` records for the same `commit_sha` — `satisfied` only when all three are `success`. |
| `preview_link_posted` | Boolean — whether a status check/comment with a direct link to the deployment was posted/updated on the pull request (applies to `target_environment = preview` only). |

**Validity rule**: `target_environment` MUST be `preview` if and only if `trigger_event = pull_request`, and `production` if and only if `trigger_event = push` (FR-003, FR-004) — a `Deployment Attempt` MUST NOT exist unless `gate_result = satisfied`. For `target_environment = preview`, `preview_link_posted` MUST be `true` on success (FR-010).
