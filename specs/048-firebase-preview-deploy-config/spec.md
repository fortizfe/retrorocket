# Feature Specification: Working Firebase-Backed Preview Deployments

**Feature Branch**: `048-firebase-preview-deploy-config`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Vale, quiero hacer que los deploy preview de retro-rocket funcionen. He hecho un proyecto de firebase para que tenga su entorno staged. el proyecto es firebase/retro-rocket staging (https://console.firebase.google.com/project/retrorocket-staging/overview). Quiero que configures tanto en el proyecto, como en github, firebase lo necesario para que pueda funcionar el despliegue preview. Configura también las variables de entorno de vercel o lo que necesites."

## Clarifications

### Session 2026-08-17

- Q: Preview sign-in is confirmed broken today, and the actual root cause is not yet diagnosed. Should this feature's scope flex to include a backend/application code change if diagnosis shows configuration alone can't fix it, or is this feature strictly configuration-only (Firebase project settings, GitHub Actions secrets, Vercel environment variables), with any code-level cause handed off as a separate follow-up? → A: Configuration-only. No backend/application code changes are in scope. If diagnosis shows a code-level cause, this feature's sign-in success bar is downgraded accordingly and the gap is documented as a follow-up feature rather than fixed here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A pull request preview loads and works against the staging environment (Priority: P1)

A developer opens a pull request. Once the automated quality gates pass, the resulting preview deployment loads successfully and lets a reviewer create, view, and interact with a retro board — backed entirely by the dedicated staging environment, never by production data.

**Why this priority**: The preview pipeline itself (build, gate, deploy) already exists and runs; today it produces a deployment that is unusable because the environment it depends on isn't fully wired up. Without this, nothing else about preview deployments matters.

**Independent Test**: Open a pull request, wait for the preview deployment to be reported as ready, open its URL, and create a retro board. Success is a fully loaded, functioning app with no configuration or connection errors, and the created board is visible only in the staging project's data, never in production's.

**Acceptance Scenarios**:

1. **Given** a pull request whose preview deployment has finished publishing, **When** a reviewer opens its URL, **Then** the app loads without any environment-configuration error (missing keys, unreachable project, etc.).
2. **Given** a working preview deployment, **When** a reviewer creates or edits a retro board on it, **Then** the change is stored in the dedicated staging environment and never appears in the production environment.
3. **Given** the production application, **When** it is used at the same time a preview deployment is being tested, **Then** production's data and behavior are completely unaffected by the preview activity.

---

### User Story 2 - A reviewer can sign in on any pull request's preview (Priority: P1)

A reviewer opens a pull request's preview deployment and signs in with Google or GitHub, exactly as they would in production, so they can test sign-in-dependent features without any manual setup.

**Why this priority**: Sign-in is a prerequisite for exercising most of the product on a preview deployment. This closes the loop on prior work that already automates authorizing each preview's URL with the staging Firebase project (see [008-firebase-preview-domains](../008-firebase-preview-domains/spec.md)) but currently cannot deliver a working sign-in. The exact cause is not yet diagnosed; per the scope clarified above, this feature pursues a fix only through configuration and stops short of an application/backend code change (see FR-005 and FR-010).

**Independent Test**: Open a pull request's preview URL and complete a Google or GitHub sign-in. Success is a signed-in session with no error, on the very first preview deployment for that pull request.

**Acceptance Scenarios**:

1. **Given** a pull request's preview deployment is ready, **When** a reviewer signs in with Google, **Then** the sign-in completes and the reviewer lands in an authenticated session.
2. **Given** a pull request's preview deployment is ready, **When** a reviewer signs in with GitHub, **Then** the sign-in completes and the reviewer lands in an authenticated session.
3. **Given** two different pull requests each have their own active preview deployment, **When** a reviewer signs in on either one, **Then** the sign-in succeeds independently on each, regardless of that deployment's unique URL.

---

### User Story 3 - Preview configuration is verified end to end before being called done (Priority: P2)

Whoever sets this up can confirm, through a real pull request, that every piece involved — the staging Firebase project's settings, the GitHub Actions secrets, and the Vercel preview environment variables — is correctly in place, rather than assuming each piece is right in isolation.

**Why this priority**: Several of these pieces already exist from earlier work (secrets, some environment variables, the automation itself) but were never confirmed to work together against this specific staging project. Configuring each piece without proving the full path leaves the same "still doesn't work" problem this feature exists to fix.

**Independent Test**: After configuration, open a brand-new pull request from scratch and walk through User Stories 1 and 2 on its preview deployment without touching any console, secret, or environment variable by hand.

**Acceptance Scenarios**:

1. **Given** all configuration described by this feature has been applied, **When** a new pull request is opened, **Then** its preview deployment succeeds and satisfies User Story 1 and User Story 2 with no manual intervention.
2. **Given** a piece of required configuration is missing or incorrect, **When** the verification pull request is run, **Then** the resulting failure clearly indicates which piece is missing rather than surfacing as a generic, unexplained app failure.

---

### Edge Cases

- What happens when a required secret or environment variable is missing or invalid for a given preview build? The failure must be attributable to that specific missing/invalid piece rather than presenting as an unexplained blank page or generic error.
- What happens when a credential that already existed before this feature (e.g. a previously-created service account key or Vercel variable) turns out to be stale, expired, or scoped to the wrong project? Configuration must be verified to actually work against the real staging project, not assumed correct because it was already present.
- What happens when two pull requests have active previews at the same time? Each one's ability to load and to sign in must work independently, consistent with the existing per-PR domain automation.
- What happens if someone points any part of this configuration at the production Firebase project or production Vercel environment by mistake? That must not be possible through this feature's normal operation — staging configuration must be applied only to the preview scope.
- What happens when the staging Firebase project is later reset, deleted, or recreated? Out of scope for this feature — this feature configures the project as it exists today; recovering from a future project loss is a separate concern.
- What happens when configuration changes alone are not enough to make sign-in work, because the actual cause lives in application/backend code rather than in Firebase project settings, GitHub Actions secrets, or Vercel environment variables? This feature MUST NOT modify application or backend code to work around it. Instead, it MUST document the specific, diagnosed gap and hand it off as a separate follow-up feature (see FR-010).
- What happens when more pull requests have active previews at once than the configured preview-sign-in capacity supports (FR-005)? Sign-in on the pull requests beyond that capacity may collide with another open pull request's sign-in configuration rather than working independently. This is a known, quantifiable boundary of the configuration-only approach, not an unknown to diagnose — it MUST be documented (FR-010/SC-006) rather than silently tolerated or silently worked around with a code change.
- What happens if the Vercel project's own Deployment Protection (a separate, project-level access-control setting — not a Preview environment variable) requires a Vercel-account login before any preview URL loads at all? Discovered during live verification: this project currently has `ssoProtection.deploymentType: prod_deployment_urls_and_all_previews`, which redirects every visitor without team access to `vercel.com` before they ever reach the app — independent of everything else this feature configures. This sits in front of, not inside, the scope this feature's Functional Requirements cover (Firebase project settings, GitHub Actions secrets, Vercel *environment variables*); changing it was raised with and deliberately deferred by the user rather than changed as part of this effort — documented here so it isn't mistaken for a Firebase/OAuth-side gap if a future reviewer hits it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dedicated staging Firebase project MUST have all services the application's actual sign-in path depends on provisioned and enabled — specifically a Firestore database. Firebase Authentication's own federated Google/GitHub sign-in-method toggles are not part of this requirement: the application authenticates via server-minted custom tokens (`signInWithCustomToken`), never Firebase's federated popup/redirect providers, so those console toggles have no bearing on whether sign-in works.
- **FR-002**: The dedicated staging Firebase project's security rules MUST be in place and MUST match the intent of the rules already enforced in production, so preview behavior is representative of production behavior.
- **FR-003**: The credential used by the automated preview-domain sync process ([008-firebase-preview-domains](../008-firebase-preview-domains/spec.md)) MUST have the access it needs on the staging Firebase project, and MUST be confirmed working against that exact project rather than assumed valid from prior setup.
- **FR-004**: Every environment variable the application's backend needs to serve authenticated, data-backed requests (session signing, Firebase admin access, and both Google and GitHub sign-in credentials) MUST be present and correct for the preview scope, matching what already exists for production.
- **FR-005**: Sign-in via Google or GitHub MUST be made to work on a pull request's preview deployment, using configuration changes only (staging Firebase project settings, GitHub Actions secrets, and Vercel environment variables) — not by relying on a single fixed or predetermined preview address shared by every pull request. No application or backend code change is in scope for this feature. This MUST hold for at least as many concurrently open pull requests as the configured preview-sign-in capacity supports; beyond that capacity, FR-010 governs rather than this requirement being silently unmet.
- **FR-006**: All GitHub Actions secrets the existing preview pipeline depends on MUST be present, valid, and scoped to the staging Firebase project and the correct Vercel project.
- **FR-007**: None of this feature's configuration MUST be capable of reading, writing, or otherwise affecting the production Firebase project or the production Vercel environment.
- **FR-008**: Data created or modified on any preview deployment MUST remain isolated to the staging environment and MUST NOT be visible to or affect the production application.
- **FR-009**: The full configuration MUST be validated by successfully completing User Story 1 and User Story 2 end to end on an actual pull request before being considered complete.
- **FR-010**: If, after applying every configuration change available (FR-001 through FR-006), sign-in still does not work on every pull request's unique preview URL, this feature MUST diagnose and clearly document the specific remaining cause and hand it off as a separate follow-up feature, rather than resolving it with an application/backend code change or reporting the work as fully complete.

### Key Entities

- **Staging Firebase Project**: The dedicated `retrorocket-staging` project that backs every preview deployment's data, authentication, and sign-in domain authorization — distinct from and isolated from the production Firebase project.
- **Preview Environment Configuration**: The complete set of Vercel environment variables scoped to the "Preview" environment that the application's frontend and backend read at build and run time.
- **Deployment Credential**: A GitHub Actions secret (service account key, API token, or similar) that lets the automated pipeline act on the staging Firebase project or the Vercel project on the pipeline's behalf.
- **Sign-In Provider Credential**: The Google and GitHub OAuth application credentials that back the backend-orchestrated sign-in flow used by both production and preview.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Opening a new pull request results in a preview deployment that loads and lets a reviewer fully use the app, backed by the staging environment, 100% of the time once the automated quality gates pass.
- **SC-002**: A reviewer can sign in with Google or GitHub on a pull request's preview within 2 minutes of that preview being reported ready, with zero manual configuration steps, on the very first deployment for that pull request, achieved entirely through configuration changes — matching the outcome already promised by prior work ([008-firebase-preview-domains](../008-firebase-preview-domains/spec.md) SC-001) but not previously achievable.
- **SC-003**: Zero incidents where preview activity is visible in, or alters, production data or production configuration.
- **SC-004**: Two or more pull requests can have active, independently-working previews (loading and sign-in) at the same time, verified by exercising at least two concurrently open pull requests.
- **SC-005**: A person unfamiliar with this configuration effort can determine, from a failed preview deployment's output alone, which specific piece of configuration is missing or wrong — without needing to guess or dig through unrelated logs.
- **SC-006**: If SC-002 cannot be fully achieved through configuration alone, a specific, diagnosed written description of the remaining gap exists (e.g. as a follow-up issue or spec) by the end of this effort — the limitation is never left silently undiscovered or undocumented.

## Assumptions

- The `retrorocket-staging` Firebase project referenced by the user is the single, dedicated staging project for all preview deployments (already assumed as a precondition by [008-firebase-preview-domains](../008-firebase-preview-domains/spec.md)); this feature is what actually fulfills that precondition rather than introducing a new one.
- Production Firebase and production Vercel configuration are out of scope and must remain untouched; this feature only ever adds or corrects Preview-scoped/staging-scoped configuration.
- The existing preview pipeline logic (quality gates, deploy workflow, preview-domain sync automation from [008-firebase-preview-domains](../008-firebase-preview-domains/spec.md) and [005-gated-vercel-deploys](../005-gated-vercel-deploys/spec.md)) is correct as designed; this feature supplies and corrects the real credentials and project-side settings that logic depends on, and does not redesign the pipeline.
- The actual cause of preview sign-in currently not working is not yet diagnosed and is not assumed in advance. This feature's scope is strictly configuration (staging Firebase project settings, GitHub Actions secrets, Vercel environment variables) — no application or backend code change is in scope, regardless of what diagnosis finds (see FR-005, FR-010, SC-006).
- The Google and GitHub OAuth application credentials used for the preview scope may either reuse production's applications (with an added redirect address for the preview scope) or be dedicated staging applications; either is acceptable as long as sign-in works reliably and production's sign-in is unaffected.
- Secrets and environment variables that already exist from earlier setup work are starting points to verify and correct, not values to trust as already-working.
