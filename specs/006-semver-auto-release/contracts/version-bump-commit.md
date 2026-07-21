# Contract: The Version Bump Commit

This feature has no public API/library surface. Its externally-observable "interface" is the shape of the automated commit/tag it produces on `main`, and the marker that other pipeline jobs must recognize to avoid a self-triggered loop. This contract fixes that shape so `ci.yml` and `deploy.yml` stay in sync.

## Commit produced by the versioning phase

| Field | Fixed value | Notes |
|---|---|---|
| Message | `chore(release): <version> [version bump]` | `<version>` is `MAJOR.MINOR.PATCH`, no `v` prefix in the commit subject. |
| Files changed | `retro-rocket/package.json`, `retro-rocket/package-lock.json` | No other files. |
| Author identity | CI automation identity (e.g. `github-actions[bot]`) | Distinguishes automated commits in `git log`/PR history at a glance, in addition to the marker. |
| Tag created | `v<version>` (e.g. `v0.2.0`) | Points at this commit; matches the default `semantic-release` `tagFormat`. |

## The `[version bump]` marker — consumers

| Consumer | Behavior when marker is present in `github.event.head_commit.message` |
|---|---|
| `.github/workflows/ci.yml` → `version` job | MUST skip (no versioning computation re-run) — this is the commit's own output, not new input. |
| `.github/workflows/deploy.yml` → `deploy-production` job | MUST skip (no redundant production redeploy for a commit that changes only version metadata). |
| `.github/workflows/ci.yml` → `checks` / `e2e` jobs | MUST NOT skip — the three required quality gates still run normally on this commit (FR-009). |
| `.github/workflows/codeql.yml` → `analyze` job | MUST NOT skip — same reason. |

## Explicitly NOT used

GitHub's built-in skip-CI keywords (`[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`, `[actions skip]`) MUST NOT appear in the version bump commit message — they would suppress creation of *all* workflow runs for that push, including the three required quality gates, which FR-009 requires to keep running.

## Change policy

Renaming the `[version bump]` marker string requires updating it consistently in the `version` job's commit-message template (`ci.yml`), the `version` job's own skip condition (`ci.yml`), and the `deploy-production` skip condition (`deploy.yml`) in the same change — otherwise the loop-prevention or the redundant-redeploy-prevention silently breaks.
