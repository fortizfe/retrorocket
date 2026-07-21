# Feature Specification: Remove Shell Scripts & Trigger CI on Main Push

**Feature Branch**: `003-scripts-cleanup-ci-trigger`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Para este desarrollo quiero que todos los ficheros .sh que están bajo /retro-rocket/ (por ejemplo deploy.sh o command.sh) se eliminen del proyecto. No son necesarios para el correcto funcionamiento del mismo ya que todo se desencadena desde la ci. Tambien quiero ajustar nuestra pipeline para que se ejecute al hacer push a main y no sono en las pull request."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Remove unused shell scripts (Priority: P1)

As a maintainer, I want every standalone shell script under the project
directory (e.g. `deploy.sh`, `commands.sh`, `start.sh`) removed, so that the
codebase no longer carries manual scripts that duplicate or contradict what
the CI pipeline already does automatically.

**Why this priority**: This is the primary, explicitly requested cleanup. It
reduces maintenance burden and eliminates confusion for contributors about
whether deployment/build/testing steps should be run manually or are handled
by CI. It delivers value on its own, independent of the pipeline trigger
change.

**Independent Test**: Can be fully tested by confirming no `.sh` files remain
in the project (outside of third-party dependency folders) and that all
documented project workflows (installing dependencies, running the app
locally, linting, testing, building) still complete successfully using only
the project's package scripts.

**Acceptance Scenarios**:

1. **Given** the project directory tree, **When** a maintainer searches for
   shell script files, **Then** none of the previously existing scripts
   (`deploy.sh`, `commands.sh`, `verify-firebase.sh`, `check-status.sh`,
   `pre-deploy-check.sh`, `migrate-user-providers.sh`, `test.sh`,
   `setup-firebase-auth.sh`, `start.sh`, `track-coverage.sh`) are found.
2. **Given** a developer following the project's documented way of starting
   local development, **When** they run the startup command, **Then** it
   completes successfully without attempting to invoke a now-deleted script.
3. **Given** the project's documentation and configuration, **When** a
   contributor reads them after the cleanup, **Then** there are no remaining
   references instructing someone to run a deleted script.

---

### User Story 2 - Run the pipeline on push to main instead of on pull requests (Priority: P2)

As a maintainer, I want the automated pipeline to run when changes are pushed
to the `main` branch instead of when a pull request is opened or updated, so
that the pipeline's trigger matches the team's intended workflow going
forward.

**Why this priority**: This is the second explicit request. It changes when
automated verification happens, which affects the whole team's workflow, but
it is independently deliverable and testable separate from the script
cleanup.

**Independent Test**: Can be fully tested by opening/updating a pull request
targeting `main` and confirming the pipeline does NOT run, then pushing a
commit directly to `main` (or merging a PR into `main`) and confirming the
pipeline DOES run and executes its full set of checks.

**Acceptance Scenarios**:

1. **Given** an open pull request targeting `main`, **When** new commits are
   pushed to that pull request's branch, **Then** the pipeline does not
   start.
2. **Given** the `main` branch, **When** a commit is pushed to it (directly
   or via a merged pull request), **Then** the pipeline starts automatically
   and runs all of its existing checks (type-check, lint, test coverage, and
   end-to-end tests).

---

### Edge Cases

- What happens to scripts that reference each other (e.g. `commands.sh`
  referencing `./deploy.sh`, `pre-deploy-check.sh` referencing
  `./deploy.sh`)? Since all of these scripts are removed together, no
  dangling internal references remain.
- What happens to the project's own configuration that currently invokes one
  of these scripts (the local "start" workflow currently runs `start.sh`)?
  That workflow MUST be updated to work without the removed script so local
  development is not broken.
- Automated checks no longer run automatically while a pull request is open
  or being updated, before it is merged into `main`; verification only
  happens after code has already landed on `main`.
- Branches other than `main` are not addressed by this change; only the
  pull-request trigger and the `main`-push trigger are in scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST NOT contain any shell script (`.sh`) files
  within the project's own source tree (excluding files that belong to
  third-party dependencies).
- **FR-002**: Removing the shell scripts MUST NOT break any existing,
  documented project workflow (e.g. installing dependencies, starting local
  development, linting, testing, building); any workflow step that
  previously depended on a removed script MUST be updated to work without
  it.
- **FR-003**: The project MUST NOT retain documentation or configuration
  that instructs a contributor to run a shell script that has been removed.
- **FR-004**: The automated pipeline MUST run automatically whenever a
  commit is pushed to the `main` branch.
- **FR-005**: The automated pipeline MUST NOT run automatically when a pull
  request targeting `main` is opened, updated, or synchronized.
- **FR-006**: When triggered by a push to `main`, the pipeline MUST still
  perform the full existing set of checks (type-check, lint, test coverage,
  and end-to-end tests) that it previously performed on pull requests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A search of the project's source tree finds zero shell script
  files outside of third-party dependency folders.
- **SC-002**: 100% of the project's documented local workflows (start,
  lint, test, build) complete successfully without any manual step
  referencing a removed script.
- **SC-003**: 100% of commits pushed to `main` automatically trigger a full
  pipeline run.
- **SC-004**: 0% of pull request open/update events trigger a pipeline run.

## Assumptions

- The `deploy` workflow already runs directly through the project's own
  tooling (not through a shell script), so it is unaffected by the script
  removal.
- The local "start" workflow, which currently launches through a shell
  script, will be adjusted to run the equivalent steps directly so it
  continues to work after that script is removed.
- "Push to main" includes both direct pushes and commits that land on
  `main` as a result of merging a pull request; it is not limited to
  pushes that bypass code review.
- Moving all automated checks off the pull-request trigger means pull
  requests will merge into `main` without having been automatically
  verified beforehand; verification will instead happen after the code has
  already landed on `main`. This is a deliberate, explicitly requested
  change in when verification happens, not an oversight.
- No process or tooling outside of this repository (e.g. external scripts,
  documentation in other systems) depends on the shell scripts being
  removed.
