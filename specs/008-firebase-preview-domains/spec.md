# Feature Specification: Automated Firebase Preview Domain Lifecycle

**Feature Branch**: `008-firebase-preview-domains`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Quiero automatizar el alta/baja del dominio exacto de la preview en Firebase. El objetivo es que el despliegue preview tenga su propia instancia de firestore (hecho). Como cada despliegue tiene su propia url se necesita dar de baja el anterior y de alta el nuevo despliegue para que los despliegues preview funcionen."

## Clarifications

### Session 2026-07-22

- Q: Should this feature's automation be implemented within the existing single `ci.yml` workflow file, or is a second dedicated workflow file acceptable? → A: All automation MUST be implemented as jobs/steps inside the existing single `ci.yml` workflow; no new workflow file may be introduced.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in on a fresh PR preview without manual setup (Priority: P1)

A developer opens a pull request. CI builds and publishes a preview deployment on its own unique URL, already pointed at the dedicated preview Firebase project. Without anyone touching the Firebase console, a reviewer opening that preview URL can sign in with Google or GitHub and use the app exactly as they would in production.

**Why this priority**: This is the core problem being solved — today the preview is unusable for any flow that requires sign-in because the preview's URL is not on the allowed sign-in domain list. Nothing else in this feature matters if this case doesn't work.

**Independent Test**: Open a new pull request, wait for the preview deployment to be reported as ready, open its URL, and complete a Google or GitHub sign-in. Success is a signed-in session with no "domain not authorized" error.

**Acceptance Scenarios**:

1. **Given** a pull request with no prior preview deployment, **When** its first preview deployment finishes publishing, **Then** that deployment's exact URL becomes usable for sign-in within a short, bounded time without any manual action.
2. **Given** a freshly authorized preview URL, **When** a reviewer attempts to sign in with Google or GitHub, **Then** the sign-in completes successfully.

---

### User Story 2 - Redeploying a PR doesn't accumulate stale domains (Priority: P2)

A developer pushes a new commit to an already-open pull request. The preview redeploys and — because each deployment gets its own new URL — the previous preview URL is no longer reachable. The previous URL's sign-in authorization is cleaned up and the new URL's authorization is put in place, so the list of authorized domains doesn't grow without bound as commits keep landing.

**Why this priority**: Directly addresses the "alta/baja" (register/deregister) lifecycle called out in the request. It's what keeps the feature working correctly over the life of a PR rather than only on the first deploy.

**Independent Test**: Push a second commit to an already-open pull request, wait for the new preview to be reported as ready, confirm sign-in works on the new URL, and confirm the previous URL's authorization is no longer present.

**Acceptance Scenarios**:

1. **Given** a pull request whose preview has already been redeployed at least once, **When** the newest preview deployment finishes publishing, **Then** sign-in works on the newest URL.
2. **Given** a pull request that has been redeployed, **When** the newest preview's authorization is confirmed working, **Then** the immediately preceding preview URL's authorization is removed.
3. **Given** two pull requests with active previews at the same time, **When** either one redeploys, **Then** the other pull request's preview authorization is unaffected.

---

### User Story 3 - Closing a PR leaves nothing behind (Priority: P3)

A pull request is closed, whether merged or abandoned. Its preview URL's sign-in authorization is removed so the preview Firebase project's authorized domain list only ever reflects pull requests that are actually still open.

**Why this priority**: Keeps the system tidy over time and avoids slowly filling the authorized domain list with dead entries from finished work, but a PR sitting closed-but-not-cleaned-up for a while doesn't block anyone's work the way User Stories 1–2 would.

**Independent Test**: Close (or merge) a pull request that has an active preview, then confirm its preview URL's authorization is removed.

**Acceptance Scenarios**:

1. **Given** a pull request with an active, authorized preview URL, **When** the pull request is closed or merged, **Then** that URL's authorization is removed.
2. **Given** a pull request that is closed without ever having a successful preview deployment, **When** the closure is processed, **Then** no error blocks the closure and there is nothing left to clean up.

### Edge Cases

- What happens when two or more pull requests have active previews at the same time — each pull request's domain lifecycle must stay independent; redeploying or closing one MUST NOT remove or otherwise affect another open pull request's authorized preview domain.
- What happens when removing the previous preview's domain fails right after the new one was successfully authorized — the new preview must remain usable for sign-in regardless; a leftover stale domain is an acceptable, later-correctable state, but a broken new preview is not.
- What happens when registering the new preview's domain fails outright — per FR-007, the preview deployment itself must be reported/blocked as failed rather than published in a state where sign-in doesn't work.
- What happens when a pull request is closed without any successful preview deployment having ever been recorded — cleanup must be a no-op, not an error.
- What happens when the same pull request is reopened after being closed — a new preview deployment for it must go through the same registration flow as a first-time preview.
- What happens when the process that would have registered or removed a domain never runs at all (e.g., a canceled CI run, a force-pushed branch, a deleted branch without a corresponding "closed" signal) — see FR-008.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST automatically register a preview deployment's exact URL as an authorized sign-in domain in the dedicated preview/staging Firebase project as part of that deployment becoming available, with no manual Firebase console step required.
- **FR-002**: System MUST automatically remove a pull request's previously-registered preview domain once that pull request's preview has redeployed to a new URL.
- **FR-003**: System MUST automatically remove a pull request's registered preview domain when that pull request is closed or merged.
- **FR-004**: System MUST only ever create, read, or remove authorized-domain entries in the dedicated preview/staging Firebase project. It MUST NOT read or modify the production Firebase project's configuration under any circumstance.
- **FR-005**: System MUST support any number of pull requests having active, independently-tracked preview domain registrations at the same time, without one pull request's redeploy or closure affecting another's registered domain.
- **FR-006**: System MUST authorize a pull request's new preview URL before — or at least without depending on — removing that same pull request's previous preview URL, so that a redeploy never produces a window where the current preview has no working, authorized URL.
- **FR-007**: System MUST fail/block the preview deployment when registering its exact URL as an authorized sign-in domain does not succeed, rather than reporting the preview as ready when sign-in on it would actually fail.
- **FR-008**: System MUST provide an on-demand/manual way to detect and remove authorized preview domains that were left behind because their normal removal step never ran (canceled workflow, deleted branch, etc.), so the authorized domain list does not grow indefinitely from such cases. An automatic recurring schedule is not required for this version.
- **FR-009**: System MUST NOT require any developer to manually add or remove domains in the Firebase console for the ordinary "PR opened → preview redeployed some number of times → PR closed" lifecycle.
- **FR-010**: System MUST implement the domain registration and removal automation entirely as jobs/steps within the project's existing single CI workflow file; it MUST NOT introduce an additional workflow file.

### Key Entities

- **Preview Deployment**: A single published instance of the app tied to one pull request and one specific commit/build, identified by its own unique URL.
- **Pull Request Preview Registration**: The tracked link between a pull request and whichever one of its preview URLs is currently authorized for sign-in; at most one such URL is authorized per open pull request at a time.
- **Authorized Sign-In Domain**: An entry in the preview/staging Firebase project's list of domains allowed to complete Google/GitHub sign-in, corresponding to exactly one preview deployment's URL.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can successfully sign in with Google or GitHub on a pull request's preview within 2 minutes of that preview being reported as ready, with zero manual Firebase configuration steps performed by any person.
- **SC-002**: After a pull request is redeployed, sign-in succeeds on its newest preview URL 100% of the time, with no dependency on whether cleanup of the previous URL has completed yet.
- **SC-003**: Closed pull requests leave no authorized preview domain behind: the domain is removed within the same CI run that processes the pull request's closure — spot-checking the preview Firebase project's authorized domain list against currently-open pull requests shows no entry for any pull request that is no longer open.
- **SC-004**: Zero incidents where an authorized-domain change intended for the preview environment is applied to the production Firebase project.
- **SC-005**: Any number of pull requests can have active previews at the same time with each one's sign-in working independently — verified by exercising at least two concurrently open pull requests with no cross-interference.

## Assumptions

- The dedicated preview/staging Firebase project (separate from production, with its own Firestore instance) already exists and preview deployments are already configured to use it — this was completed in prior work and is a precondition for this feature, not part of it.
- Preview deployments continue to be created per pull request through the existing CI pipeline, and each new deployment gets a unique URL that has never been previously authorized.
- "Closed" covers both merged and abandoned/closed-without-merge pull requests; both must trigger the same cleanup behavior.
- At most one preview URL needs to be authorized per open pull request at any given time — the most recently deployed one; earlier ones for the same pull request are expected to become unreachable and unneeded once superseded.
- The developers and reviewers who open and review pull requests are the users of this automation; end customers of the product are unaffected since none of this touches the production Firebase project.
