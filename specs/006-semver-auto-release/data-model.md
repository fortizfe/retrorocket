# Data Model: Automated Semantic Versioning on Main

This feature introduces no application data model — no Firestore collections, documents, or UI-facing entities are added or changed. The "entities" below are configuration/process artifacts relevant to verifying the feature's requirements, documented here for traceability rather than as a persistence schema.

## Project Version

Represents the single Semantic Versioning value for the project at a point in time (FR-004 through FR-008, Key Entities).

| Attribute | Description |
|---|---|
| `major` / `minor` / `patch` | The three SemVer components; together rendered as `MAJOR.MINOR.PATCH`. |
| `source_commit` | The `main` commit whose quality-gate success triggered this version's computation. |
| `stored_in` | `retro-rocket/package.json`'s `version` field and `retro-rocket/package-lock.json`'s corresponding version field(s) — both updated together (FR-007). |

**Validity rule**: The very first `Project Version` under this scheme is exactly `0.1.0`, established once via a manual bootstrap rather than computed from history (FR-005, research.md §2). Every subsequent `Project Version` is `semver.inc(previous, bump_type)` where `previous` is the last `Version Tag` (not the raw `package.json` value, per the Edge Case on manual `package.json` edits) and `bump_type` is derived per the Bump Decision below (FR-006).

## Conventional Commit

The input signal read from `main`'s commit history since the last `Version Tag` (Key Entities, FR-004).

| Attribute | Description |
|---|---|
| `type` | Conventional Commit type prefix (`feat`, `fix`, `chore`, `docs`, etc.). |
| `breaking` | Whether the commit carries a breaking-change marker (`!` after the type/scope, or a `BREAKING CHANGE:` footer). |

**Validity rule**: Only `feat`, `fix`, and breaking-change commits map to a version bump; all other types are inert for versioning purposes (FR-011). A commit whose message contains the `[version bump]` marker (see Version Bump Commit below) MUST be excluded from this analysis — it is the *output* of a prior versioning run, not an input to the next one.

## Bump Decision

The computed outcome of analyzing all `Conventional Commit`s since the last `Version Tag` (FR-004, FR-012).

| Attribute | Description |
|---|---|
| `type` | `major`, `minor`, `patch`, or `none`. |
| `precedence_rule` | If any commit is `breaking`, `type = major` (unconditionally, even below `1.0.0` — clarified). Else if any commit is `feat`, `type = minor`. Else if any commit is `fix`, `type = patch`. Else `type = none`. |

**Validity rule**: When `type = none`, the versioning phase MUST skip entirely — no `Project Version` change, no `Version Bump Commit`, no `Version Tag` (FR-011).

## Version Bump Commit

The single automated commit that persists a new `Project Version` (FR-008, FR-009, FR-010).

| Attribute | Description |
|---|---|
| `message` | `chore(release): <version> [version bump]` — the `[version bump]` marker is load-bearing (research.md §4). |
| `files_changed` | `retro-rocket/package.json`, `retro-rocket/package-lock.json` only. |
| `author` | The CI automation identity (e.g. `github-actions[bot]`). |

**Validity rule**: This commit's own subsequent push to `main` MUST NOT cause the versioning phase to run again (FR-009) and MUST NOT trigger a new production deployment (FR-010) — both enforced by job-level checks for the `[version bump]` marker. The three required quality gates MUST still execute normally against this commit (FR-009).

## Version Tag

A git tag marking the exact commit at which a given `Project Version` became current (Key Entities, FR-008).

| Attribute | Description |
|---|---|
| `name` | `v<version>` (e.g. `v0.1.0`, `v0.2.0`). |
| `commit_sha` | The `Version Bump Commit`'s SHA (or, for the `0.1.0` baseline, the bootstrap commit's SHA — research.md §2). |

**Validity rule**: The latest `Version Tag` reachable from `main` is the sole source of truth for "current version" when computing the next `Bump Decision` — a manually edited `package.json` version that conflicts with the latest tag does not change what the next computed version will be (Edge Cases).
