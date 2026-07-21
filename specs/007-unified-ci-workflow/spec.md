# Feature Specification: Unified CI Pipeline Workflow

**Feature Branch**: `007-unified-ci-workflow`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Vale, vamos a refactorizar la pipeline ci. El resultado actual con 3 yml y 3 workflows. Lo que se quería conseguir es un solo fichero ci.yml que ejecute todas las stages en un solo workflow. Debe ejcutar [codeQL, npm test, e2e] -> deploy (preview en pr y production en main) -> versionado. Cada stage solo debe ejecutarse si la anterior ha terminado como success. Elimina las otras dos workflows .yml que tenemos y quedemoos solo con ci.yml con el funcionamiento descrito anteriormente"

## Clarifications

### Session 2026-07-21

- Q: Should the pipeline's CodeQL stage gate on the analyze job merely completing, or must it also confirm no new High/Critical severity findings exist before allowing deploy? → A: Job-success gate only — the CodeQL stage succeeds when the analyze job completes without error. Severity-based blocking (High/Critical findings) continues to be enforced solely by the existing, separate branch-protection code-scanning check, decoupled from this pipeline's job graph.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single pipeline definition (Priority: P1)

As a maintainer of the project, I want the entire continuous integration and delivery process defined in one place, so that I can understand, review, and modify the whole release process without cross-referencing multiple separate workflow definitions.

**Why this priority**: This is the core ask — collapsing three workflow files/workflows into one is the defining outcome of this feature. Without it, none of the other value (clear gating, single status view) is achieved.

**Independent Test**: Can be fully tested by inspecting the repository's automation configuration and confirming a single workflow definition exists that covers quality checks, deployment, and versioning, with the two previous separate definitions removed.

**Acceptance Scenarios**:

1. **Given** the repository's automation configuration, **When** a maintainer looks for the CI/CD process, **Then** they find exactly one workflow definition that covers static analysis, testing, end-to-end testing, deployment, and versioning.
2. **Given** the previous three-workflow setup, **When** this feature is complete, **Then** the two other workflow definitions no longer exist in the repository.

---

### User Story 2 - Deployment gated on passing quality checks (Priority: P1)

As a maintainer, I want deployment (to preview or production) to happen only when static analysis, automated tests, and end-to-end tests have all passed, so that broken or insecure code never reaches a deployed environment.

**Why this priority**: Preventing bad code from deploying is the safety-critical behavior the pipeline exists to guarantee; it's as important as consolidating the files.

**Independent Test**: Can be fully tested by introducing a failing test (or failing static analysis / e2e run) on a pull request or on a push to main and confirming no preview or production deployment is attempted.

**Acceptance Scenarios**:

1. **Given** a pull request where static analysis, tests, and end-to-end tests all succeed, **When** the pipeline runs, **Then** a preview deployment is produced.
2. **Given** a push to the main branch where static analysis, tests, and end-to-end tests all succeed, **When** the pipeline runs, **Then** a production deployment is produced.
3. **Given** a pull request or push to main where any of static analysis, tests, or end-to-end tests fails, **When** the pipeline runs, **Then** no deployment (preview or production) is attempted.

---

### User Story 3 - Versioning gated on successful deployment (Priority: P2)

As a maintainer, I want the automated versioning/release step to run only after a successful deployment, so that a new version is never published for code that failed to deploy.

**Why this priority**: This closes the loop on the pipeline's ordering guarantee; it's slightly lower priority than the deploy gate because a missed or delayed version bump is recoverable, whereas a bad deployment is not.

**Independent Test**: Can be fully tested by simulating a deployment failure on a push to main and confirming the versioning step does not run, then confirming it does run immediately following a successful production deployment.

**Acceptance Scenarios**:

1. **Given** a push to main where all quality checks and the production deployment succeed, **When** the pipeline reaches the final stage, **Then** the automated versioning step runs.
2. **Given** a push to main where the production deployment fails, **When** the pipeline continues, **Then** the automated versioning step does not run.

---

### Edge Cases

- What happens when one of the quality-check jobs (static analysis, tests, end-to-end tests) fails? The pipeline MUST stop before the deploy stage; deployment and versioning MUST NOT run.
- What happens when the deploy stage fails? The versioning stage MUST NOT run.
- What happens on a pull request (no push to main)? Only the quality-check stage and preview deployment apply; the versioning stage MUST NOT run for pull requests.
- What happens when the versioning stage itself produces a commit (a version-bump commit) pushed to main? That commit MUST NOT re-trigger a full pipeline run that attempts another release, preventing an infinite release loop.
- What happens when the static-analysis job completes successfully but introduces a new High or Critical severity finding? The pipeline's own stage gate treats the job as passed and proceeds toward deploy; blocking on such findings remains solely the responsibility of the separate branch-protection code-scanning check, not this pipeline.
- What happens when a push to `main` is the versioning stage's own version-bump commit? The deploy stage's production deployment job MUST be skipped for that push (not just the versioning stage), since the commit contains no application code changes to deploy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST define its entire CI/CD process (quality checks, deployment, versioning) in a single workflow definition, replacing the current three separate workflow definitions.
- **FR-002**: The pipeline's first stage MUST run static code analysis, automated tests, and end-to-end tests.
- **FR-003**: The deploy stage MUST run only when every job in the first stage (static analysis, tests, end-to-end tests) has completed successfully. For the static-analysis job, "completed successfully" means the analysis run itself finished without error; it does not require waiting on or querying code-scanning alert severity results (see FR-012).
- **FR-004**: For pull requests, the deploy stage MUST produce a preview deployment.
- **FR-005**: For pushes to the main branch, the deploy stage MUST produce a production deployment, except when the pushed commit is itself a version-bump release commit (see FR-013), in which case production deployment MUST be skipped.
- **FR-006**: The versioning stage MUST run only when the deploy stage has completed successfully.
- **FR-007**: The versioning stage MUST run only in the context of a push to main, not for pull requests.
- **FR-008**: If any stage fails or does not complete successfully, every subsequent stage MUST be skipped rather than run.
- **FR-009**: The two workflow definitions that previously handled static analysis and deployment separately MUST be removed once their responsibilities are folded into the single pipeline definition.
- **FR-010**: The pipeline MUST preserve the existing safeguard that prevents a version-bump commit from re-triggering another release cycle.
- **FR-011**: Preview deployments MUST continue to surface their deployment link to the pull request they belong to.
- **FR-012**: Severity-based blocking of merges due to CodeQL findings (High/Critical) MUST continue to be enforced exclusively through the existing branch-protection code-scanning check; this pipeline's stage-gating logic MUST NOT be responsible for evaluating finding severity.
- **FR-013**: The deploy stage MUST skip the production deployment job when the triggering push's commit message contains the version-bump marker (`[version bump]`), since that commit only updates release metadata and contains no application code to deploy.

### Key Entities

- **Pipeline Run**: A single execution of the unified workflow, triggered by a pull request or a push to main; owns the ordered progression through quality checks, deploy, and versioning stages.
- **Stage**: A named phase of the pipeline (quality checks, deploy, versioning) whose success/failure outcome determines whether the next stage is allowed to start.
- **Job**: An individual runnable unit within a Stage (e.g., `analyze`, `checks`, `e2e`, `deploy-preview`, `deploy-production`, `version`); its name is the identity branch protection and other tooling key on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The repository's automation configuration contains exactly one workflow definition covering the full process, down from three.
- **SC-002**: 100% of pipeline runs with a failing quality-check job result in zero deployment attempts.
- **SC-003**: 100% of pipeline runs with a failed or skipped deploy stage result in zero versioning attempts.
- **SC-004**: A maintainer can determine the pass/fail status of the entire release process (checks, deploy, versioning) by viewing a single pipeline run, instead of correlating three separate workflow runs.

## Assumptions

- Static analysis, automated tests, and end-to-end tests run as parallel jobs within the first stage, and all three must succeed before the deploy stage is allowed to start.
- "Preview" deployment applies to pull requests targeting main; "production" deployment applies to direct pushes to main — matching current behavior.
- The versioning stage's underlying release mechanism (including the version-bump-commit loop guard) is preserved as-is; only its position and trigger within the consolidated pipeline changes.
- End-to-end tests continue to run against the same test environment currently used; no change to what the tests themselves cover.
- Required-status-check names referenced by branch protection rules (if any) will be updated separately to match the new consolidated job names; this is an operational follow-up, not a functional requirement of the pipeline's behavior.
