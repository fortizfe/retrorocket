# Feature Specification: Automated Semantic Versioning on Main

**Feature Branch**: `006-semver-auto-release`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Quiero añadir un paso más al final de la pipeline ci que ya tenemos. Lo que quiero es que SOLAMENTE cuando se haga un push a main y se hayan superado las 3 quality gates required que tenemos, entonces debe ejecutarse una fase más para versionar el proyecto. Debe seguirse la convención de Semantic Version y aprovechar los commits con conventional commit para decidir qué número de versión ha de subirse. También debe actualizarse la versión en packages.json. Aunque el proyecto esté en marcha, la primera versión será la 0.1.0"

## Clarifications

### Session 2026-07-21

- Q: While the project version is still below `1.0.0` (`0.y.z`), should a breaking-change commit bump MAJOR anyway (e.g. `0.1.0` → `1.0.0`), or bump MINOR instead until an explicit `1.0.0` release? → A: Always bump MAJOR on a breaking-change commit, even pre-1.0 — no special-casing for the `0.y.z` range.
- Q: The version-bump commit is itself a push to `main`, and the existing production deployment pipeline already redeploys on every push to `main` once the 3 gates pass — should that automated bump commit be excluded from triggering another production deployment? → A: Yes — the automated version-bump commit MUST be excluded from triggering a new production deployment, to avoid a redundant redeploy that ships no functional change.
- Q: The project's lockfile (`package-lock.json`) carries its own top-level version field that currently matches `package.json`, and the existing pipeline's `npm ci` step validates the lockfile is in sync with `package.json` — should the automated commit also update the lockfile's version field? → A: Yes — update both `package.json` and `package-lock.json` in the same automated commit, keeping `npm ci` passing on that commit and afterward.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic version bump after a clean push to main (Priority: P1)

A maintainer merges a pull request into `main` (or pushes directly). Once the three required quality gates — type-check/lint/test with coverage, end-to-end tests, and the CodeQL security scan — have all completed successfully for that exact commit, the project's version number is automatically recalculated using Semantic Versioning rules, based on the Conventional Commit messages introduced since the last version, and the new version is written into `package.json`.

**Why this priority**: This is the core ask — turning commit history into a trustworthy, always-up-to-date version number without requiring a human to remember to bump it, and only once the code has proven itself safe to ship.

**Independent Test**: Push a commit containing a `feat:` Conventional Commit message to `main`, wait for all three quality gates to pass, and confirm the version in `package.json` increases by a minor version and that no version change occurs until all three gates have reported success.

**Acceptance Scenarios**:

1. **Given** a push to `main` whose commits since the last version include at least one `feat:` commit and all three quality gates pass, **When** the last gate completes successfully, **Then** the version is bumped to the next MINOR version and written to `package.json`.
2. **Given** a push to `main` whose commits since the last version include only `fix:` commits (no `feat:` or breaking changes) and all three quality gates pass, **When** the last gate completes successfully, **Then** the version is bumped to the next PATCH version and written to `package.json`.
3. **Given** a push to `main` whose commits since the last version include a breaking-change marker (e.g. `feat!:` or a `BREAKING CHANGE:` footer) and all three quality gates pass, **When** the last gate completes successfully, **Then** the version is bumped to the next MAJOR version and written to `package.json`.
4. **Given** a push to `main` where any of the three required quality gates has not yet completed, **When** a maintainer checks the project version, **Then** the version in `package.json` has not changed as a result of that push.
5. **Given** a push to `main` where any of the three required quality gates fails, **When** the failure is reported, **Then** no version bump occurs and `package.json` is left unchanged.

---

### User Story 2 - First release establishes the 0.1.0 baseline (Priority: P1)

The project has been under active development and its `package.json` currently carries an arbitrary pre-existing version value. The first time the automated versioning phase runs, it must establish `0.1.0` as the baseline version, regardless of what the accumulated commit history since the project's inception would otherwise suggest under Conventional Commits.

**Why this priority**: The user explicitly requires the first automated version to be `0.1.0`, since no prior release has followed this convention — without this rule, replaying the entire commit history could compute a much higher (and inaccurate) version on the very first run.

**Independent Test**: Run the versioning phase for the first time on a repository with no prior version tags; confirm the resulting version recorded in `package.json` and in the created tag is exactly `0.1.0`, independent of how many `feat`/`fix`/breaking-change commits exist in the project's history.

**Acceptance Scenarios**:

1. **Given** no prior version tag exists for this versioning scheme, **When** the versioning phase runs for the first time after all three quality gates pass, **Then** the version is set to exactly `0.1.0`, regardless of `package.json`'s pre-existing value or the full commit history.
2. **Given** the `0.1.0` baseline has already been established, **When** the versioning phase runs again on a subsequent qualifying push, **Then** the next version is computed by applying Semantic Versioning rules only to the commits introduced since `0.1.0`, not the entire project history.

---

### User Story 3 - Versioning phase never runs on pull requests or other branches (Priority: P2)

A contributor opens or updates a pull request targeting `main`. The versioning phase must not run for pull request events, feature branches, or pushes to any branch other than `main` — it is reserved exclusively for pushes to `main` that have already passed the three required quality gates.

**Why this priority**: Prevents premature or duplicate version bumps from in-progress work, and keeps the version number meaningful as a record of what has actually landed on `main`.

**Independent Test**: Open a pull request with `feat:` and `fix:` commits targeting `main`; confirm that regardless of the pull request's own check results, no version change or tag is produced until (and unless) those commits are pushed to `main` directly.

**Acceptance Scenarios**:

1. **Given** an open pull request targeting `main`, **When** its quality gates complete successfully, **Then** the versioning phase does not run and `package.json` is not modified on that pull request's branch.
2. **Given** a push to a branch other than `main`, **When** that branch's checks complete successfully, **Then** no versioning phase runs and no tag is created.

---

### Edge Cases

- What happens when a push to `main` contains no Conventional-Commit-recognizable messages at all (e.g. free-text commits only)? Per clarification, the versioning phase is skipped — no version change, no tag — since there is no signal to determine a bump type.
- What happens when a push to `main` contains only commit types that Conventional Commits does not map to a version bump (`docs`, `chore`, `style`, `refactor`, `test`, `ci`, etc.)? The versioning phase is skipped for that push (see Clarifications).
- What happens when the automated version-bump commit itself lands on `main`? The three quality gates still run against it as normal, but the versioning phase MUST recognize it as its own prior output and MUST NOT attempt to compute or apply a further version bump for it, preventing an infinite loop. The existing production deployment pipeline MUST likewise recognize this commit and skip deploying it, since it ships no functional change.
- What happens when two pushes to `main` race and both pass their quality gates around the same time? The versioning phase MUST process commits in the order they land on `main` and MUST NOT apply the same set of commits to more than one version bump (no duplicate or skipped versions).
- What happens if `package.json` is manually edited to a version that conflicts with the last recorded tag? The system's next automated computation takes the last matching version tag as the source of truth for "current version," not the raw `package.json` value, so a manual edit alone does not change what the next computed version will be.
- What happens when a breaking-change commit and a `feat:` commit both appear since the last version? The MAJOR bump takes precedence over the MINOR bump, per Semantic Versioning precedence rules.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST trigger the versioning phase only when the triggering event is a push directly to the `main` branch; pull request events and pushes to any other branch MUST NOT trigger it.
- **FR-002**: The system MUST NOT run the versioning phase for a given `main` commit until all three required quality gates (type-check/lint/test with coverage, end-to-end tests, and the CodeQL security scan) have completed with a passing result for that exact commit.
- **FR-003**: If any of the three required quality gates fails, is cancelled, or has not completed for a given `main` commit, the system MUST NOT perform a version bump for that commit.
- **FR-004**: The system MUST determine the version increment (MAJOR, MINOR, or PATCH) by inspecting the Conventional Commit messages introduced since the last recorded version, following standard Semantic Versioning precedence: a breaking-change indicator produces a MAJOR bump, a `feat` commit (with no breaking change) produces a MINOR bump, and a `fix` commit (with no `feat` or breaking change) produces a PATCH bump. This MAJOR-on-breaking-change rule applies unconditionally, including while the version is still below `1.0.0` — there is no special-cased `0.y.z` "initial development" behavior that substitutes a MINOR bump instead.
- **FR-005**: The system MUST treat the very first execution of the versioning phase as establishing the baseline version `0.1.0`, regardless of the pre-existing value in `package.json` or the full prior commit history.
- **FR-006**: After the first execution, the system MUST compute each subsequent version strictly as an increment over the last version the versioning phase itself recorded, not by replaying the entire commit history from project inception.
- **FR-007**: The system MUST write the computed version number into the project's `package.json` `version` field, and MUST also update the corresponding version field(s) in the project's lockfile so the two remain in sync and dependency-installation validation continues to pass.
- **FR-008**: The system MUST persist each computed version by committing the updated `package.json` (and lockfile) back to `main` and creating a matching git tag for that version (e.g. `v0.2.0`).
- **FR-009**: The system MUST recognize its own automated version-bump commits (e.g. via a distinguishing commit message marker or author identity) and MUST NOT run the versioning computation again for such a commit, while still allowing the three quality gates to execute normally against it.
- **FR-010**: The system MUST recognize its own automated version-bump commits and MUST NOT trigger a new production deployment for them, since such a commit changes only version metadata and ships no functional change; production deployment for ordinary (non-bump) commits on `main` is unaffected by this rule.
- **FR-011**: When the commits since the last version contain no Conventional-Commit type that maps to a version bump, the system MUST skip the versioning phase entirely for that push, leaving `package.json`, the version history, and the tags unchanged.
- **FR-012**: The system MUST NOT introduce a manual/human approval step into the versioning phase; the version decision MUST be derived automatically from commit message conventions.
- **FR-013**: The system MUST apply version bumps in the order commits land on `main`, ensuring no set of commits is used to justify more than one version bump and no commit's contribution to the version is silently dropped.

### Key Entities *(include if feature involves data)*

- **Project Version**: The single Semantic Versioning value (`MAJOR.MINOR.PATCH`) representing the current release state of the project; stored in `package.json` and the lockfile, and mirrored as a git tag.
- **Conventional Commit**: A commit message following the Conventional Commits format (type prefix such as `feat`, `fix`, plus optional breaking-change marker); the input signal used to decide the next version's bump type.
- **Version Tag**: A git tag (e.g. `v0.1.0`) marking the exact commit on `main` at which a given version became current.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of version numbers recorded in `package.json` after this feature is active correspond to a `main` commit for which all three required quality gates had already completed successfully at the time the version was computed.
- **SC-002**: 100% of version bumps match the increment (MAJOR/MINOR/PATCH) dictated by Semantic Versioning precedence applied to the Conventional Commit messages since the previous version, verifiable by inspecting the commit history between two consecutive version tags.
- **SC-003**: The first version recorded under this feature is exactly `0.1.0`, with zero exceptions.
- **SC-004**: Zero instances of the versioning phase re-triggering itself (an automated version-bump commit causing another automated version-bump commit) are observed.
- **SC-005**: Zero version bumps occur for pull requests or branches other than `main`.
- **SC-006**: Zero production deployments are triggered by an automated version-bump commit.

## Assumptions

- **Persistence mechanism**: The computed version is persisted by committing the updated `package.json` and lockfile back to `main` and creating a matching git tag (e.g. `v0.2.0`) — the common, low-friction ways to make a version durable and discoverable while keeping `npm ci` in sync. Generating a GitHub Release entry or a changelog file is treated as a separate concern and is out of scope (see below).
- **No-op when nothing qualifies**: If the commits since the last version contain no Conventional Commit type that maps to a bump (only `docs`, `chore`, `style`, etc.), the versioning phase is skipped entirely for that push — this matches standard Conventional-Commits-driven release tooling and avoids meaningless version churn.
- **Avoiding a self-triggered loop**: Because the versioning phase's own commit lands on `main` (a push event), it must be distinguishable from ordinary commits (e.g. a commit message marker or bot author) so the versioning computation does not run again on its own output — the quality gates still execute on it normally.
- **Deployment exclusion widens scope beyond CI only**: Per clarification, excluding the automated version-bump commit from production deployment means this feature also touches the existing deployment pipeline's trigger/skip logic, not solely the CI pipeline where the versioning phase itself runs.
- Conventional Commits is already the project's commit message convention (or will be adopted going forward); commits that don't follow it are simply treated as non-bump-triggering, per the Edge Cases and FR-011.
- The three required quality gates referenced are the ones already enforced by the existing CI setup: type-check/lint/test with coverage, Playwright end-to-end tests, and the CodeQL security scan.
- "Versioning the project" is scoped to computing and recording the Semantic Version number (in `package.json` and a git tag); generating a human-readable changelog or a GitHub Release entry is out of scope for this feature.
- The repository currently has no pre-existing version tags from this scheme; the existing `package.json` version value is superseded by the `0.1.0` baseline the first time this phase runs, per the user's explicit instruction.
- Squash-merged pull requests are assumed to preserve or summarize the original Conventional Commit type(s) in the resulting `main` commit message(s) closely enough for correct bump computation; malformed or lost commit metadata from unusual merge strategies is out of scope.
