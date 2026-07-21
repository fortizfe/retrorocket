# Feature Specification: Gated Vercel Deployments

**Feature Branch**: `005-gated-vercel-deploys`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Para el siguiente desarrollo quiero modificar las pipelines para que los despliegues de Vercel solamente se desencadenen si se superan las quality gates de test y CodeQL. Si es una PR el despliegue será en preview y no en production, y si es un push a main, el despliegue será en producción y no en preview."

## Clarifications

### Session 2026-07-21

- Q: How should reviewers discover a successful preview deployment for a pull request? → A: System posts/updates a status check or PR comment with a direct link to the preview deployment (matches today's implicit Vercel-bot behavior).
- Q: When a deployment is blocked by a failing test suite or CodeQL scan, should the system produce an explicit "deployment blocked" indicator? → A: No — the absence of a deployment status, combined with the already-visible failing check, is sufficient signal; no separate "blocked" indicator is created.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview deployment only after gates pass on a pull request (Priority: P1)

A developer opens a pull request against `main`. Only after the automated test suite and the CodeQL security scan have both completed successfully for that PR's latest commit does a preview deployment become available for reviewers to inspect. The deployment goes to a preview environment only — it never reaches production.

**Why this priority**: This is the core of the request: reviewers and stakeholders must never be shown a preview built from code that fails tests or introduces a security issue, and a PR must never be able to reach production directly.

**Independent Test**: Open a PR with passing tests and a clean CodeQL scan; confirm a preview deployment appears and is reachable only via a preview URL, with no production environment affected. Can be fully tested and delivers value without the production-side story existing yet.

**Acceptance Scenarios**:

1. **Given** a pull request whose test suite and CodeQL scan have both completed successfully, **When** the checks finish, **Then** a preview deployment is created for that commit.
2. **Given** a pull request whose test suite has not yet completed, **When** a reviewer checks for a deployment, **Then** no preview deployment exists yet for the latest commit.
3. **Given** a pull request whose CodeQL scan reports a High or Critical severity finding, **When** the scan completes, **Then** no preview deployment is created for that commit.
4. **Given** a pull request that successfully produces a preview deployment, **When** the deployment is inspected, **Then** it is only accessible as a preview and is not promoted to the production environment.
5. **Given** a preview deployment is created for a pull request, **When** the deployment succeeds, **Then** a status check or comment on the pull request is posted or updated with a direct link to that preview deployment.

---

### User Story 2 - Production deployment only after gates pass on push to main (Priority: P1)

A change is pushed (typically via a merged PR) to the `main` branch. Only after the automated test suite and the CodeQL security scan have both completed successfully for that commit on `main` does a production deployment occur. The deployment goes to production only — a preview environment is not created for this trigger.

**Why this priority**: This protects the live, user-facing application from ever receiving a build that has not been verified by the project's required quality gates, directly matching the "push to main → production only" requirement.

**Independent Test**: Push a commit to `main` with passing tests and a clean CodeQL scan; confirm production is updated and no separate preview deployment is generated for that push. Independently testable and valuable even without the PR-preview story.

**Acceptance Scenarios**:

1. **Given** a commit pushed to `main` whose test suite and CodeQL scan have both completed successfully, **When** the checks finish, **Then** a production deployment is triggered for that commit.
2. **Given** a commit pushed to `main` whose test suite fails, **When** the failure is reported, **Then** no production deployment is triggered for that commit.
3. **Given** a commit pushed to `main` whose CodeQL scan reports a High or Critical severity finding, **When** the scan completes, **Then** no production deployment is triggered for that commit.
4. **Given** a push to `main` that successfully triggers a deployment, **When** the deployment is inspected, **Then** it targets production only, with no preview environment created for that push.

---

### User Story 3 - Clear visibility when a deployment is blocked (Priority: P2)

A developer whose PR or push fails one of the quality gates wants to understand, without digging through deployment logs, that no deployment happened and which gate blocked it.

**Why this priority**: Reduces confusion and wasted investigation time; important for adoption of the new gating behavior but not required for the gating itself to function correctly.

**Independent Test**: Trigger a failing test run or a High-severity CodeQL finding on a PR or push to main; confirm the commit/PR status clearly shows the failing gate and that no deployment status contradicts it (e.g., no stray "deployed" indicator).

**Acceptance Scenarios**:

1. **Given** a pull request where the test suite fails, **When** a developer views the PR's checks, **Then** the failing test check is visible and no preview deployment check reports success.
2. **Given** a push to `main` where the CodeQL scan fails, **When** a developer views the commit's checks, **Then** the failing CodeQL check is visible and no production deployment check reports success.

---

### Edge Cases

- What happens when only one of the two gates (test suite or CodeQL) passes and the other fails? No deployment (preview or production) is triggered — both gates must pass.
- What happens when a gate is still running (not yet completed) when someone checks for a deployment? No deployment exists yet; deployment only occurs after both gates reach a completed, passing state.
- What happens when new commits are pushed to a pull request while a previous commit's gates or deployment were still in progress? The evaluation and any resulting deployment apply to the latest commit; outcomes tied to a superseded commit MUST NOT be treated as satisfying the gate for the new commit.
- What happens when a CodeQL scan reports only Medium or Low severity findings? These do not block deployment, consistent with the project's existing merge-blocking threshold (see Assumptions).
- What happens on a push to a branch other than `main` that is not part of a pull request? This is outside the two triggers covered by this feature; no deployment behavior is defined or changed for that case.
- What happens if a pull request is closed or its branch is deleted before a deployment occurs? No deployment is created for that PR going forward.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST NOT start a Vercel preview deployment for a pull request commit until both the automated test suite and the CodeQL security scan have completed with a passing result for that exact commit.
- **FR-002**: System MUST NOT start a Vercel production deployment for a commit pushed to `main` until both the automated test suite and the CodeQL security scan have completed with a passing result for that exact commit.
- **FR-003**: When the triggering event is a pull request, the system MUST deploy exclusively to a preview environment and MUST NOT deploy to production.
- **FR-004**: When the triggering event is a push to `main`, the system MUST deploy exclusively to production and MUST NOT deploy to a preview environment.
- **FR-005**: If either the test suite or the CodeQL scan fails, is cancelled, or does not complete for a given commit, the system MUST NOT trigger any deployment (preview or production) for that commit.
- **FR-006**: The system MUST evaluate the quality gates per commit; a deployment decision for a new commit MUST NOT be based on a pass/fail result recorded for a different (e.g., prior) commit.
- **FR-007**: The severity threshold used to determine whether the CodeQL scan "passes" for deployment-gating purposes MUST match the project's existing merge-blocking threshold: High or Critical severity findings block; Medium, Low, and style-level findings do not.
- **FR-008**: The system MUST NOT introduce a new manual/human approval step as part of this gating; the gate MUST be satisfied automatically based on the outcome of the existing automated test suite and CodeQL scan.
- **FR-009**: The status of the test suite and CodeQL scan for a commit MUST be visible to developers/reviewers through the same interface where pull request or commit checks are already shown, so that a blocked deployment can be understood without extra investigation.
- **FR-010**: Upon successfully creating a preview deployment for a pull request, the system MUST post or update a status check or comment on that pull request containing a direct link to the preview deployment.
- **FR-011**: When a deployment is blocked by a failing or incomplete quality gate, the system MUST NOT be required to produce a separate "deployment blocked" indicator; the absence of a deployment status together with the already-visible failing test suite or CodeQL check constitutes sufficient signal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of preview deployments correspond to a pull request commit for which both the test suite and the CodeQL scan had already completed successfully at the time the deployment started.
- **SC-002**: 100% of production deployments correspond to a `main` commit for which both the test suite and the CodeQL scan had already completed successfully at the time the deployment started.
- **SC-003**: Zero preview deployments are ever created as a result of a push to `main`, and zero production deployments are ever created as a result of a pull request.
- **SC-004**: Zero deployments (preview or production) occur for a commit where the test suite or the CodeQL scan reported a blocking failure.
- **SC-005**: A developer can determine whether a deployment was blocked, and by which gate, using only the existing pull request/commit status view — without needing to consult deployment-specific logs.
- **SC-006**: 100% of successful preview deployments have a direct link discoverable on the pull request itself (via a status check or comment), with no need to separately check the deployment platform's dashboard.

## Assumptions

- "Test suite" quality gate refers to the full set of automated checks already established by the project as merge-blocking (type-check, lint, unit tests with coverage, and end-to-end tests). In practice these are reported as two separately-named checks (a combined type-check/lint/coverage check, and a separate end-to-end check); deployment gating waits on both independently, alongside the separately-named CodeQL check — three named checks in total, all of which must pass.
- The CodeQL pass/fail threshold for deployment gating mirrors the project's existing branch-protection threshold: only High or Critical severity findings count as a blocking failure; Medium/Low/style-level findings are informational and do not block deployment.
- This feature covers only the two trigger events already part of the project's quality-gate process: pull requests targeting `main`, and pushes to `main`. Other branches or events are out of scope.
- Preview deployments are still expected to occur for qualifying pull requests, and production deployments are still expected to occur for qualifying pushes to `main` — the only behavioral change introduced is the added quality-gate precondition and the strict separation between preview and production targets per trigger.
- Existing handling for pull requests originating from forks or external contributors (who may lack deployment credentials) is unaffected by this feature and remains out of scope.
- No new manual approval or human sign-off step is introduced; gating relies entirely on the automated outcomes of the existing test suite and CodeQL scan.
