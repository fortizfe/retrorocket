# Data Model: Purge Leaked Secrets & Add CodeQL Quality Gate

This feature introduces no application data model — no Firestore collections, documents, or UI-facing entities are added or changed. The "entities" below are configuration/process artifacts relevant to verifying the feature's requirements; they are documented here for traceability rather than as a persistence schema.

## Repository History State

Represents the purge's target of verification (FR-001–FR-004).

| Attribute | Description |
|---|---|
| `ref` | A branch or tag name in the repository (e.g., `main`). |
| `commit_sha` | A commit hash reachable from a ref. |
| `contains_target_file` | Boolean — whether `retro-rocket/.env.production` exists in that commit's tree. Must be `false` for every commit on every retained ref after the purge. |

**Validity rule**: For every `ref` that still exists after this feature is implemented, no `commit_sha` reachable from it may have `contains_target_file = true` (FR-002, FR-003). Refs that previously violated this and are not needed (the three stale merged branches) are removed entirely rather than rewritten (see research.md §2).

## CI Workflow Run

Represents one execution of the pipeline against a change (FR-006–FR-010).

| Attribute | Description |
|---|---|
| `trigger` | `pull_request` or `push` (to `main`). |
| `jobs` | Set of required jobs: `type-check`, `lint`, `test:coverage`, `e2e` (existing), plus `codeql-analyze` (new). |
| `overall_status` | Pass/fail, derived from all required jobs plus the branch-protection code-scanning requirement. |

**Validity rule**: `overall_status` MUST be failing if any existing required job fails (FR-010), or if `codeql-analyze` reports a High/Critical severity finding newly introduced by the change (FR-007, FR-011).

## Code Scanning Finding

Represents a single CodeQL alert associated with a pull request's head commit (FR-007, FR-008, FR-011).

| Attribute | Description |
|---|---|
| `severity` | One of Critical, High, Medium, Low, or a style/quality classification. |
| `introduced_by` | The commit/PR that first introduced the finding — used to distinguish new findings from pre-existing ones already on `main`. |
| `blocking` | Derived: `true` only when `severity` is High or Critical AND `introduced_by` is within the current PR's diff. |

**Validity rule**: Only findings with `blocking = true` may cause `CI Workflow Run.overall_status` to fail (FR-011); all findings, blocking or not, MUST remain visible to contributors (FR-008).
