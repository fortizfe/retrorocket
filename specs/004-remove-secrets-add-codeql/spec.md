# Feature Specification: Purge Leaked Secrets & Add CodeQL Quality Gate

**Feature Branch**: `004-remove-secrets-add-codeql`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "para esta especificación quiero dos cosas: 1- Eliminar del seguimiento y del repositorio el fichero .env.production. Eliminandolo de la historia de github si es necesario para que no se pueda recuperar. 2- Añadir a la pipeline que además del testing deba superarse una quality gate de código. Utiliando para ello github CodeQL."

## Clarifications

### Session 2026-07-21

- Q: The constitution (v2.0.0) currently runs CI only on push to `main`, with no automated pre-merge PR gate. Should the new CodeQL quality gate change this? → A: Run CodeQL (and re-introduce the check suite) on pull_request events too, enforced as a required status check — a true gate that blocks merge before it lands on `main`. This requires amending the constitution's current push-only CI model.
- Q: What severity of CodeQL finding should block a merge? → A: High and Critical severity findings block the merge; Medium/Low/style findings are reported but non-blocking.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Permanently purge leaked credentials file (Priority: P1)

As a project maintainer, I need the `.env.production` file — which previously contained committed Firebase credentials — completely removed from the repository's entire commit history, not just from current tracking, so that nobody who has (or gains) access to the repository can recover the exposed credentials.

**Why this priority**: This is a live credential-exposure issue. The file was already committed to history in the past; simply deleting it from the latest commit (already done) leaves the secrets fully recoverable by anyone who inspects prior commits. This is the highest-risk, highest-priority item.

**Independent Test**: Can be fully tested by searching the complete rewritten repository history (all commits, all branches/tags) for the filename and its former contents and confirming zero matches, independent of any pipeline changes.

**Acceptance Scenarios**:

1. **Given** the repository's history contains a past commit that added `.env.production` with credentials, **When** the history purge is performed, **Then** no commit reachable in the repository (any branch or tag) contains that file or its contents.
2. **Given** the purge has been completed and pushed, **When** a maintainer or any collaborator clones the repository fresh and searches full history, **Then** the file and its contents are not found anywhere.
3. **Given** the purge rewrites commit hashes, **When** collaborators pull the updated history, **Then** they are notified that a history rewrite occurred and are instructed to re-sync their local clones/branches.

---

### User Story 2 - Enforce an automated code quality gate in CI (Priority: P2)

As a maintainer, I want the CI pipeline to run an automated static code analysis (GitHub CodeQL) as a required quality gate in addition to the existing automated tests, so that changes with qualifying code quality or security issues cannot be merged without being addressed.

**Why this priority**: Builds on top of the existing testing safety net to catch security/quality issues that tests don't cover. It depends on having a clean, secret-free repository (User Story 1) as its foundation but is independently valuable and testable.

**Independent Test**: Can be fully tested by opening a pull request with a known qualifying issue and confirming the pipeline reports a failed/blocked status, and by opening a clean pull request and confirming the pipeline (tests + CodeQL) succeeds.

**Acceptance Scenarios**:

1. **Given** a pull request with code changes, **When** the pipeline runs, **Then** it executes both the existing checks (type-check, lint, tests) and the new CodeQL code analysis.
2. **Given** CodeQL analysis identifies a qualifying issue in the changed code, **When** the pipeline finishes, **Then** the overall pipeline run and the pull request status are marked as failed/blocked from merging.
3. **Given** CodeQL analysis finds no qualifying issues and all existing checks pass, **When** the pipeline finishes, **Then** the overall pipeline run succeeds and the change is eligible to merge.
4. **Given** the code quality gate fails a pull request, **When** a contributor opens the pull request or check details, **Then** they can see what was flagged in order to fix it.

---

### Edge Cases

- What happens to forks or local clones that already downloaded the old (pre-purge) history? They retain the exposed credentials locally until they re-sync; this cannot be forced remotely and is called out as an assumption/limitation.
- What happens if the CodeQL analysis step itself fails to run (e.g., infrastructure/timeout error) rather than finding a code issue? This must be distinguishable from an actual quality-gate failure so maintainers aren't blocked by tooling problems.
- What happens to pre-existing findings already present in the codebase at the time the gate is introduced? These need to be triaged so the gate doesn't retroactively block unrelated future changes for issues that already existed.
- What happens if a tag, release asset, or GitHub PR/issue comment separately references or contains the old file contents outside of commit history? These are out of scope for a git-history rewrite and must be checked manually.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository's current tracked files MUST NOT include `.env.production` (already the case; this MUST NOT regress).
- **FR-002**: The repository's entire commit history MUST be rewritten so that no commit, on any branch or tag, contains `.env.production` or its former contents.
- **FR-003**: After the rewrite is pushed to GitHub, the remote repository MUST reflect the cleaned history such that standard tools (`git log`, `git show`, GitHub's web UI/API, commit search) can no longer retrieve the removed file's content.
- **FR-004**: The history rewrite MUST NOT remove or corrupt any unrelated commit history, files, or authorship information.
- **FR-005**: Maintainers MUST be informed that the credentials contained in the purged file are considered permanently compromised and must be rotated in the originating system (Firebase), independent of the repository change.
- **FR-006**: The CI pipeline MUST run an automated code analysis (via GitHub CodeQL) on every pull request targeting `main` (in addition to on push to `main`), in addition to the existing type-check, lint, and test steps.
- **FR-007**: GitHub branch protection on `main` MUST require the CodeQL check to pass as a status check before a pull request can be merged, so a qualifying issue blocks the merge itself rather than only being discovered afterward.
- **FR-008**: The code analysis results MUST be visible to contributors (e.g., via the pull request checks/annotations) so flagged issues can be identified and resolved.
- **FR-009**: The code analysis MUST cover the languages/technologies used in the project's source code.
- **FR-010**: The existing automated checks (type-check, lint, unit tests, e2e tests) MUST also run on pull requests targeting `main` (not solely on push to `main` as today) and MUST likewise be required status checks, so they are not weakened by the addition of the new gate.
- **FR-011**: The code analysis MUST classify findings by severity and MUST only cause the required status check to fail for High or Critical severity findings; Medium, Low, and style/stylistic findings MUST be reported (visible to contributors) but MUST NOT block the merge.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full search of the repository's rewritten history (all commits, all branches/tags) returns zero matches for `.env.production` or its former contents.
- **SC-002**: No credential material from the removed file is retrievable through standard git history browsing (log, show, blame, GitHub commit search) after the change is live.
- **SC-003**: 100% of pull requests opened against the repository automatically receive a code quality/security analysis result alongside existing test results, without any manual step by the contributor.
- **SC-004**: 100% of pull requests containing a High or Critical severity code quality/security finding are blocked from merging until the finding is resolved or explicitly dismissed.
- **SC-005**: 0% regression in the pass rate of pre-existing automated checks (type-check, lint, tests) attributable to the introduction of the new gate.

## Assumptions

- The exposed Firebase credentials in the purged file are treated as permanently compromised; rotating them in the Firebase console is a necessary follow-up action but is a separate operational task outside the scope of this repository-history change.
- Rewriting shared history changes commit hashes; all collaborators will need to re-clone or hard-reset their local copies of the repository once, as a one-time coordination cost. This is an accepted trade-off given the security nature of the fix.
- No secrets other than the contents of `.env.production` are currently known to exist in the repository's history; if others are discovered, they would need to be addressed the same way but are not otherwise covered by this spec.
- The quality gate applies to pull requests targeting `main` (as a required check enforced via branch protection) as well as pushes to `main`. This reintroduces a pull-request-triggered CI model that the project's constitution (v2.0.0) had deliberately removed, so this change is expected to be accompanied by a constitution amendment updating the "Development Workflow & Quality Gates" section to match.
- Only High/Critical findings newly introduced by a pull request's changes (not pre-existing findings already in the codebase at rollout time) count toward blocking that pull request, so introducing the gate does not retroactively block unrelated future changes on legacy issues.
