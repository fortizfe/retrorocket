# Feature Specification: Backend Service Foundation & Backend-Driven Authentication

**Feature Branch**: `014-backend-auth-foundation`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Quiero empezar a trabajar en mejorar la escalabilidad de retro-rocket. En el futuro quiero desarrollar funciones expuestas por el protocolo MCP para conectar con IA (como Claude). Debido a esto es necesario tener un backend para poder separar las responsabilidades entre el front actual y todo el trabajo backend. El backend debe construirse con arquitectura hexagonal (domain, ports and adapters), Express.js y TypeScript. Será imprescindible que cuente al menos con unit testing. La idea de infraestructura es que el servidor backend se despliegue en Vercel como funciones HTTP serverless. Para este desarrollo quiero trabajar en construir la infraestructura del servidor backend antes mencionado y refactorizar el flujo de autenticación contra Firebase para que se produzca a través del backend."

## Overview

RetroRocket is today a client-only single-page application: authentication (Google/GitHub sign-in, account linking) and data access run entirely in the browser against Firebase. To scale the product and, in the future, expose capabilities to AI assistants through the Model Context Protocol (MCP), the team needs a dedicated backend service that clearly separates frontend responsibilities from backend responsibilities.

This feature delivers two things: (1) the **foundational backend service** — a deployable, testable, well-structured server that becomes the home for all future backend work (including MCP); and (2) the **first real responsibility moved into it** — the authentication flow, which is refactored so that the OAuth sign-in handshake is orchestrated by the backend instead of the browser. Data (Firestore) access remains client-side in this iteration and is explicitly out of scope beyond what is required to keep existing features working.

## Clarifications

### Session 2026-07-26

- Q: Where is the backend deployed relative to the frontend? → A: Same-origin — served under a `/api/*` path on the same domain/Vercel project as the SPA (first-party cookies, no CORS).
- Q: How does the client hold the backend-established session? → A: An `httpOnly`, `Secure`, `SameSite=Lax` session cookie set by the backend (not readable by JavaScript).
- Q: What OAuth flow style does the backend-orchestrated sign-in use? → A: Full-page redirect (app → backend → provider → backend callback → app), not a popup.
- Q: What is the session persistence and refresh policy? → A: Persistent across browser restarts with silent refresh; the backend transparently renews the session and re-issues the client data credential up to an absolute max lifetime, re-authenticating only on expiry or explicit sign-out.
- Q: What observability baseline must the new backend provide? → A: Structured logging with correlation IDs plus operational metrics (latency, error-rate, auth-success) and request tracing; secrets/tokens/PII are never logged.
- Q: What are the concrete session lifetime values? → A: Soft (rotating) expiry of **1 hour**; absolute maximum lifetime of **30 days** (preserved across silent refreshes).
- Q: On sign-out, must an already-issued session token be revocable everywhere, given the stateless-JWT design? → A: No hard server-side revocation this iteration. Sign-out clears the `httpOnly` cookie (invalidating the session in every tab of that browser) and signs the client out of Firebase; a copied/exfiltrated token remains valid only until its short (1h) expiry. A server-side denylist for immediate global revocation is deferred.
- Q: What is the measurable performance target for time-to-authenticated? → A: A signed-in user reaches an authenticated view within **3 s (p95) warm** and **5 s (p95) including a cold serverless start**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A deployable, testable backend foundation exists (Priority: P1)

As the RetroRocket engineering team, we need a running backend service — cleanly structured, independently deployable, and covered by automated tests — so that future backend responsibilities (starting with authentication, later MCP-exposed capabilities) have a home and the frontend and backend concerns are separated.

**Why this priority**: Nothing else in the roadmap (backend-driven auth, MCP) can proceed without the service existing, being deployable, and being verifiable. It is the enabling platform and is demonstrable on its own.

**Independent Test**: Deploy the backend to its target serverless environment and call a public health/readiness endpoint; it returns a healthy status. Run the backend's automated test suite; it passes and meets the project coverage floor. This delivers value (a live, verified platform) without any auth changes.

**Acceptance Scenarios**:

1. **Given** the backend is deployed, **When** a client requests the health/readiness endpoint, **Then** it responds with a success status and a machine-readable indication that the service is operational.
2. **Given** the backend source, **When** the automated unit test suite is run, **Then** all tests pass and coverage meets or exceeds the project's committed threshold.
3. **Given** a request to an unknown route, **When** it reaches the backend, **Then** the backend returns a consistent, structured "not found" error response rather than an unhandled crash.
4. **Given** the backend responsibilities are organized, **When** a developer inspects the code, **Then** domain logic is isolated from framework and external-service concerns behind explicit boundaries (so external dependencies can be substituted in tests).

---

### User Story 2 - Users authenticate through the backend (Priority: P1)

As a RetroRocket user, I can sign in with my Google or GitHub account exactly as before, but the sign-in is now orchestrated by the backend rather than the browser, so that authentication logic is centralized, more secure, and reusable by future backend capabilities.

**Why this priority**: This is the concrete responsibility being moved server-side in this iteration and the primary user-visible outcome. It proves the foundation works end to end.

**Independent Test**: From the app, complete a Google (and GitHub) sign-in; the flow is driven by the backend, a session is established, and the user lands on their dashboard as an authenticated user. Verifiable end to end without any data-layer changes.

**Acceptance Scenarios**:

1. **Given** a signed-out visitor, **When** they choose "Continue with Google" (or GitHub), **Then** the backend orchestrates the OAuth handshake and, on success, the user is authenticated and returned to the app as a logged-in user.
2. **Given** a successful backend authentication, **When** the session is established, **Then** the user's profile is available to the app and existing client-side data features continue to work for that user.
3. **Given** an authenticated user, **When** they sign out, **Then** the backend-managed session is terminated and the app returns to the signed-out state.
4. **Given** an existing user who previously signed in with one provider, **When** they sign in with a different provider using the same email, **Then** the accounts are reconciled/linked correctly (behavior preserved from today), with the reconciliation now handled by the backend.
5. **Given** an authenticated session that has expired, **When** the user continues using the app, **Then** the session is refreshed or the user is prompted to re-authenticate, without silent data-access failures.

---

### User Story 3 - Existing client features keep working after the auth refactor (Priority: P2)

As a returning RetroRocket user, everything I could do before the change (open boards, add/vote/group cards, run the countdown, export) still works after authentication moves to the backend, so that the refactor is invisible to me except where it is intentionally improved.

**Why this priority**: The auth refactor touches the credential the client uses for its still-client-side data access. Guaranteeing zero functional regression protects the value already shipped and is the main risk of this iteration.

**Independent Test**: Run the existing critical-flow end-to-end suite against the new auth path; all critical flows (board creation, card voting/grouping, countdown, export, sign-in/out) pass unchanged.

**Acceptance Scenarios**:

1. **Given** the new backend-driven auth is live, **When** an authenticated user performs any previously supported action that reads or writes data, **Then** it succeeds under the existing data-access security rules.
2. **Given** the local development / E2E environment, **When** the test suites run, **Then** authentication can be established in a test-friendly way without driving the real external OAuth UI.

---

### Edge Cases

- **OAuth provider failure / user cancels**: The provider returns an error or the user aborts the consent screen — the app shows a clear, localized error and remains in a safe signed-out state.
- **Account exists with a different credential**: Same-email login via a second provider must be linked/reconciled correctly; this logic moves from the browser to the backend and must preserve today's behavior.
- **Backend unavailable / cold start**: If the backend is unreachable or slow to wake, the sign-in surface communicates a loading/error state rather than hanging or failing silently.
- **Session/credential expiry**: The client credential used for data access expires — the session is refreshed or the user is re-prompted before any data-access failure surfaces.
- **Callback/redirect integrity**: The OAuth callback must be validated (state/anti-forgery) so a forged or replayed callback cannot establish a session.
- **Configuration missing**: If required backend configuration (provider credentials, signing keys) is absent, the service fails fast with a clear operational error and never falls back to an insecure state.
- **Concurrent sessions / multiple tabs**: Signing out in one tab must not leave a stale authenticated state usable in another.

## Requirements *(mandatory)*

### Functional Requirements

**Backend foundation**

- **FR-001**: The system MUST provide a standalone backend service, deployable independently of the frontend, that serves as the single home for backend responsibilities.
- **FR-002**: The backend MUST expose a health/readiness endpoint that reports whether the service is operational.
- **FR-002a**: The backend MUST be served from the **same origin** as the frontend, exposed under a dedicated path prefix (e.g., `/api/*`) on the same domain/hosting project, so that no cross-origin (CORS) configuration or cross-site cookies are required.
- **FR-003**: The backend MUST organize code so that domain logic is isolated from delivery (HTTP) and external-service concerns behind explicit boundaries, enabling those external dependencies to be substituted during testing.
- **FR-004**: The backend MUST return consistent, structured error responses (including for unknown routes and internal failures) and MUST NOT expose stack traces or secrets to clients.
- **FR-005**: The backend MUST have automated unit tests covering its domain and application logic, meeting or exceeding the project's committed coverage threshold.
- **FR-006**: The backend MUST be deployable to the target serverless HTTP environment and remain operable under that environment's constraints (e.g., statelessness, cold starts).
- **FR-007**: The backend MUST be structured so that future capabilities (including MCP-exposed functions) can be added without re-architecting the service. *(No MCP capability is delivered in this iteration.)*
- **FR-007a**: The backend MUST emit **structured logs** for requests, authentication events, and errors, each carrying a **correlation identifier**, and MUST expose operational **metrics** (at minimum request latency, error rate, and authentication success/failure) and **request tracing**. Logs, metrics, and traces MUST NEVER contain secrets, session tokens, or personally identifiable information.

**Backend-driven authentication**

- **FR-008**: The backend MUST orchestrate the OAuth sign-in handshake for the supported providers (Google and GitHub) so that the handshake is initiated and completed server-side rather than in the browser, using a **full-page redirect** flow (app → backend → provider → backend callback → app returned authenticated). Popup-based sign-in MUST NOT be used.
- **FR-009**: The frontend MUST delegate sign-in to the backend and MUST NO LONGER perform the OAuth handshake itself.
- **FR-010**: On successful authentication, the backend MUST establish an authenticated session for the user by setting an **`httpOnly`, `Secure`, `SameSite=Lax` session cookie** (not readable by client-side JavaScript), and MUST make the user's identity/profile available to the app.
- **FR-010a**: The session MUST **persist across browser restarts** and MUST be **silently refreshed** by the backend (renewing the session and re-issuing the client data credential of FR-011 transparently). The session cookie MUST use a **soft (rotating) expiry of 1 hour** and an **absolute maximum lifetime of 30 days** (preserved unchanged across refreshes); after the absolute maximum — or on explicit sign-out — the user MUST re-authenticate. No silent data-access failure may occur due to session or credential expiry.
- **FR-011**: The backend MUST provide the client with the credential it needs to continue accessing the existing client-side data layer under the current data-access security rules, so that existing features keep working, and MUST provide a way for the client to obtain a fresh such credential before the current one expires (see FR-010a).
- **FR-012**: The backend MUST support terminating a session (sign-out), after which the session cookie is cleared — making the session unusable in every tab of that browser — and the client is signed out of the data-layer credential. Because the session token is a stateless signed token, any already-issued copy remains valid only until its short (1-hour) expiry; immediate server-side global revocation (a denylist) is explicitly deferred to a later iteration and is out of scope here.
- **FR-013**: The backend MUST handle the "account exists with a different credential" case by reconciling/linking accounts sharing an email, preserving the behavior users experience today.
- **FR-014**: The backend MUST validate the OAuth callback (anti-forgery/state) and reject forged, replayed, or malformed callbacks.
- **FR-015**: The system MUST handle and surface authentication failures (provider error, user cancellation, backend unavailability, expired session) as clear, localized states, with no silent failures.
- **FR-016**: Authentication MUST be establishable in local development and automated E2E runs without driving the real external OAuth UI.
- **FR-017**: The refactor MUST NOT introduce any functional regression to existing critical user flows (board creation, card add/vote/group, countdown, export, sign-in/out).
- **FR-018**: Sensitive credentials (OAuth provider secrets, session/token signing material) MUST reside only in the backend and MUST NOT be exposed to the browser.

### Key Entities *(include if feature involves data)*

- **Backend Service**: The deployable server that hosts backend responsibilities; exposes HTTP endpoints and, later, MCP capabilities. Attributes: health/readiness state, configured providers, environment configuration.
- **User Identity**: The authenticated person, keyed by a stable identifier and email, with one or more linked authentication providers. Relationships: owns boards/cards in the existing data layer.
- **Authentication Provider**: A supported external identity provider (Google, GitHub) the backend can complete an OAuth handshake with.
- **Session**: The backend-established authenticated state for a user, carried by an `httpOnly`/`Secure`/`SameSite=Lax` cookie. Attributes: creation time, absolute maximum lifetime, silent-refresh policy (persists across browser restarts), and a means of termination (sign-out) that invalidates it everywhere.
- **Client Data Credential**: The (Firebase-compatible) credential the backend issues to the client so the still-client-side data layer continues to authorize requests under existing security rules; it is renewable via the backend before expiry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The backend is deployed and its health/readiness endpoint returns a healthy status on 100% of requests during a normal steady-state check window.
- **SC-002**: Users can complete Google or GitHub sign-in through the backend and reach an authenticated state, with a sign-in success rate at or above the pre-refactor baseline.
- **SC-003**: 100% of the existing critical user flows (board creation, card add/vote/group, countdown, export, sign-in/out) pass their end-to-end checks after the refactor — zero functional regressions.
- **SC-004**: The backend's automated test suite meets or exceeds the project's committed coverage threshold and runs in CI on every change.
- **SC-005**: A signed-in user reaches an authenticated view within **3 seconds (p95) on a warm backend** and within **5 seconds (p95) including a cold serverless start**, measured from initiating sign-in return to authenticated render.
- **SC-006**: No OAuth provider secret or session-signing material is retrievable from the browser or client bundle (verified by inspection/audit).
- **SC-007**: Authentication failures (provider error, cancellation, expiry, backend unavailable) always result in a clear user-facing state and never a silent failure, verified across the enumerated edge cases.
- **SC-008**: A user who authenticated and then closed and reopened the browser (within the absolute session lifetime) remains signed in without re-authenticating, and their data access continues to work across a client-credential expiry boundary.
- **SC-009**: For every request, the backend produces a structured log entry and trace carrying a correlation identifier, and the operational metrics (request latency, error rate, authentication success/failure) are queryable; no log, metric, or trace contains a secret, session token, or PII (verified by inspection).

## Assumptions

- **Auth model (confirmed with stakeholder)**: The OAuth handshake is orchestrated fully by the backend; the frontend stops performing the OAuth handshake itself. Because Firestore access remains client-side and its security rules depend on the current Firebase-issued `request.auth` identity, the backend, after completing OAuth, still provides the client with a Firebase-compatible credential so client-side data access keeps working. In other words, the backend becomes the authentication authority and session owner, while the client retains only the credential needed for existing data reads/writes.
- **Data scope (confirmed with stakeholder)**: Only authentication moves server-side in this iteration. Firestore reads/writes and real-time board synchronization remain client-side, governed by the existing security rules. Moving data access behind the backend is explicitly out of scope for this feature.
- **MCP scope**: No MCP-exposed functionality is built in this iteration. The backend must merely be structured so MCP capabilities can be added later without re-architecture.
- **Providers**: The supported identity providers remain Google and GitHub, matching today's app; no new providers are introduced.
- **Deployment target**: The backend is deployed as serverless HTTP functions on the same hosting platform **and same origin** as the frontend (under a `/api/*` path prefix), implying statelessness and tolerance of cold starts, and enabling first-party cookies without CORS (see FR-002a).
- **Existing frontend**: The current single-page application remains the user-facing client; this feature changes how it authenticates, not the app it is.

## Technical Constraints *(stakeholder-mandated)*

These constraints were explicitly required by the stakeholder and are recorded here because they bound the solution space; the planning phase will translate them into design.

- The backend MUST be built with a **hexagonal architecture** (domain at the core; ports and adapters for delivery and external services).
- The backend MUST be implemented in **TypeScript** using **Express.js** as the HTTP framework.
- The backend MUST include **at least unit testing** (consistent with the project's TDD and coverage principles).
- The backend MUST be deployable as **serverless HTTP functions** on the project's hosting platform.

## Out of Scope

- Building any MCP-exposed functions or AI integration (future work; only the enabling structure is required now).
- Moving Firestore/data access or real-time board synchronization behind the backend.
- Introducing new authentication providers or new sign-in methods (e.g., email/password) beyond the existing Google and GitHub.
- Changing the frontend's features, UI, or user-facing behavior beyond what the authentication refactor necessarily requires.
