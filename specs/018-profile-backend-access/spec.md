# Feature Specification: Mi Perfil Backend-Mediated Firebase Access

**Feature Branch**: `018-profile-backend-access`

**Created**: 2026-07-28

**Status**: Draft

**Input**: User description: "Siguiendo con la transacción de funcionalidades hacia backend, quiero que la vista de Mi Perfil no tenga ninguna comunicación directa entre frontend y ningun servicio que no sea backend. Mover a la api backend lo necesario para proveer los datos y funcionalidades de esa vistas. No se debe perder ninguna funcionalidad ya existente en dicha página."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View my profile (Priority: P1)

As a signed-in user, I open "Mi Perfil" and see my display name, email, avatar, primary sign-in provider, and member-since date, exactly as I do today, without my browser ever making a direct request to Firebase — the data is fetched through RetroRocket's backend instead.

**Why this priority**: The profile data is the first thing rendered on this screen and everything else on it (edit form, linked providers, connected apps) depends on it having loaded correctly.

**Independent Test**: Sign in, open Mi Perfil, and confirm the same display name, email, avatar, primary provider, and member-since date appear as before — while network inspection shows zero requests to any Firebase/Firestore/Firebase Auth endpoint from the browser, only requests to the RetroRocket backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user with an existing profile, **When** they open Mi Perfil, **Then** their display name, email, avatar, primary provider, and member-since date are shown, sourced entirely through the backend.
2. **Given** a user signing in for the very first time (no profile record yet exists), **When** their session is established, **Then** a profile is created for them with the same default values as today (display name from their OAuth identity or email prefix, avatar from the OAuth provider, primary provider, creation timestamp) with zero direct Firestore writes from the browser, and Mi Perfil displays it correctly.
3. **Given** a temporary backend/network failure while loading the profile, **When** the request fails, **Then** the user sees a clear error state (not a silent blank page or crash), consistent with the app's existing no-silent-failure behavior.

---

### User Story 2 - Update my display name (Priority: P1)

As a signed-in user, I edit my display name on Mi Perfil and save it; the new name persists and is reflected everywhere it's shown, without the browser writing to Firestore directly — the update goes through the backend.

**Why this priority**: This is the one piece of profile data the user can actively edit today; it must keep working identically and is the primary write-path being moved off direct Firestore access.

**Independent Test**: Change the display name, save, reload the page, and confirm the new name persists, while network inspection shows the save request only reaching the backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user enters a valid new display name and saves, **When** the save succeeds, **Then** the new name is reflected immediately in the UI and persisted via the backend, remaining after a page reload.
2. **Given** a signed-in user submits an empty or blank display name, **When** they attempt to save, **Then** the app rejects it the same way it does today, without contacting the backend or Firebase.
3. **Given** the backend rejects or fails the update (e.g. network/backend error), **When** the failure occurs, **Then** the user sees a clear error message and the previously saved display name remains unchanged and displayed (no partial update).

---

### User Story 3 - Sign out (Priority: P1)

As a signed-in user, I click "Cerrar sesión" on Mi Perfil to end my session, with the backend as the sole authority for terminating it.

**Why this priority**: Sign-out is a security-sensitive action already present on this page; it must remain reliable throughout the migration.

**Independent Test**: Sign in, open Mi Perfil, click sign out, and confirm the app returns to a signed-out state and that a subsequent backend request requiring authentication is rejected — while the sign-out action itself is driven by a request to the backend.

**Acceptance Scenarios**:

1. **Given** a signed-in user on Mi Perfil, **When** they click "Cerrar sesión," **Then** their backend session is terminated and the app reflects the signed-out state immediately.
2. **Given** the sign-out request fails (backend/network error), **When** the failure occurs, **Then** the user sees a clear error message and is left in a consistent, unambiguous state (not silently stuck between signed-in and signed-out).

---

### User Story 4 - Manage linked sign-in methods and connected AI assistants without regression (Priority: P2)

As a signed-in user, I continue to view my linked sign-in providers (and link an additional one) and view/revoke my connected AI assistants (MCP clients) from Mi Perfil, exactly as today.

**Why this priority**: Both capabilities are existing Mi Perfil functionality the user asked to keep in full ("no se debe perder ninguna funcionalidad"). They are scoped lower than Stories 1-3 because they already operate exclusively through the backend (from prior features) and require no new backend work here — only verification that this migration does not regress them.

**Independent Test**: On Mi Perfil, confirm the linked-providers list matches the account's actual linked providers and that linking an additional provider still completes successfully; confirm the connected-AI-assistants list matches authorized clients and that revoking one removes it immediately — all with no direct Firebase calls introduced by this feature.

**Acceptance Scenarios**:

1. **Given** a user with one linked sign-in provider, **When** they view Mi Perfil, **Then** that provider is shown as linked and the other available provider is shown as linkable.
2. **Given** the user links an additional provider through the existing flow, **When** it completes, **Then** Mi Perfil shows the new provider as linked.
3. **Given** a user with at least one connected AI assistant, **When** they view Mi Perfil, **Then** it is listed with its connection date, and revoking it removes it from the list immediately.

---

### Edge Cases

- What happens when a user's session expires while they are on Mi Perfil and they attempt to save a display-name change or sign out? The user must see a clear "please sign in again" state rather than a silent failure or a stale success indicator.
- What happens when the same user updates their display name from two devices/tabs concurrently? The Dashboard/Mi Perfil pattern of "last write wins, next load reflects the latest value" applies; no crash or corrupted profile record results.
- What happens when a user attempts to update another user's profile by calling the backend directly (bypassing the UI)? The backend must reject it, allowing only the authenticated session's own profile to be read or modified.
- What happens to profile data (display name, email, avatar, providers, primary provider, timestamps) that existed before this migration shipped? It must remain fully visible and correct afterward, with no data loss.
- What happens on Mi Perfil for a user whose display name or avatar was never customized (still using OAuth defaults)? The same OAuth-derived defaults must continue to display exactly as they do today.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mi Perfil MUST NOT establish any direct connection to Firebase, Firestore, or Firebase Auth from the browser for any of its operations. Loading profile data, updating the display name, and signing out MUST all be requested through the RetroRocket backend.
- **FR-002**: The backend MUST expose an operation that returns the requesting signed-in user's profile — display name, email, avatar URL, primary sign-in provider, linked providers, and account-creation ("member since") date — with the same information Mi Perfil displays today.
- **FR-003**: The backend MUST expose an operation to update the requesting user's display name, MUST reject empty/blank values, and MUST reject the request if the caller is not authenticated as that user.
- **FR-004**: The system MUST automatically create a profile record for a user's first sign-in, using the same default values as today (display name from the OAuth identity or email prefix, avatar from the OAuth provider, primary provider, creation timestamp), without any direct Firestore write from the browser.
- **FR-005**: The backend MUST expose an operation to terminate the requesting user's authenticated session (sign out), and the frontend MUST treat the backend response as authoritative for reflecting the signed-out state.
- **FR-006**: Mi Perfil's existing linked-sign-in-provider viewing and linking flow MUST continue to work unchanged; since it is already backend-mediated (per prior features), this migration MUST NOT introduce any new direct Firebase call into that flow.
- **FR-007**: Mi Perfil's existing connected-AI-assistant (MCP) viewing and revocation flow MUST continue to work unchanged; since it is already backend-mediated (per prior features), this migration MUST NOT introduce any new direct Firebase call into that flow.
- **FR-008**: The system MUST explicitly surface loading, error, and empty states for every Mi Perfil operation (load profile, update display name, sign out) with no silent failures, consistent with the project's existing no-silent-failure requirement.
- **FR-009**: The system MUST NOT lose, corrupt, or make inaccessible any user profile data that existed before this migration; all previously stored display names, emails, avatars, providers, and timestamps MUST remain fully visible and correct afterward.
- **FR-010**: The backend MUST authenticate every Mi Perfil request using the existing session-based authentication already in place; the frontend MUST NOT use a Firebase Auth client-side credential to authorize loading, updating, or signing out of Mi Perfil.
- **FR-011**: The backend MUST restrict profile read and update operations to the authenticated session's own profile; a request to read or modify another user's profile MUST be rejected.
- **FR-012**: The two currently disabled, unimplemented placeholder actions on Mi Perfil ("Exportar mis datos" and "Eliminar cuenta") remain disabled placeholders; this migration MUST NOT implement them and MUST NOT change their current (inert) presentation.
- **FR-013**: Screens and functionality outside Mi Perfil (individual board/retrospective real-time collaboration, the Dashboard [already migrated], facilitator tools, export, sign-in itself, and the MCP connector's own tool surface) are explicitly OUT OF SCOPE for this feature and MUST continue to function as they do today, unaffected by this migration.

### Key Entities

- **User Profile**: The signed-in user's account data shown and edited on Mi Perfil — display name, email, avatar URL, linked providers, primary provider, and creation/update timestamps.
- **User Session**: The authenticated user's backend session, used to identify who is loading, updating, or signing out of their profile.
- **Linked Sign-in Provider**: The association between the account and an OAuth provider (Google/GitHub), already backend-mediated.
- **Connected AI Assistant (MCP connection)**: An AI client authorized against the account via the MCP connector, already backend-mediated.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see their complete profile (display name, email, avatar, primary provider, member-since date) on Mi Perfil within **3 seconds (p95) on a warm backend** and within **5 seconds (p95) including a cold serverless start**, matching the latency baseline already established for this backend. Updating the display name and signing out meet the same target.
- **SC-002**: Zero direct network requests from the browser to any Firebase/Firestore/Firebase Auth endpoint are observed while loading Mi Perfil, updating the display name, or signing out.
- **SC-003**: 100% of existing Mi Perfil functionality (view profile, edit display name, view/link sign-in providers, view/revoke connected AI assistants, sign out) passes a full regression pass after the migration, with no feature removed or degraded from the user's perspective.
- **SC-004**: 100% of user profile data that existed before the migration remains visible and correct afterward, with zero reported data loss.
- **SC-005**: 100% of tested unauthorized attempts to read or modify a profile other than the caller's own are rejected by the backend.

## Assumptions

- Scope is limited to Mi Perfil and its three directly-Firebase-coupled operations: loading profile data, updating the display name, and signing out — including the first-time profile creation that happens implicitly on session bootstrap and feeds this screen's data. This continues the phased migration begun with `014-backend-auth-foundation` and `017-dashboard-backend-access`.
- Linked-sign-in-provider management and connected-AI-assistant (MCP) management on this screen are already fully backend-mediated by prior features and require no further backend work in this feature — only verification that this migration does not regress them.
- The app-wide Firebase Auth client-session bridge (a custom-token sign-in established once per app load, from `014-backend-auth-foundation`, to keep screens not yet migrated — such as real-time board collaboration — working against Firestore) remains in place and is out of scope for this feature. It is shared, app-wide bootstrap logic, not something Mi Perfil itself initiates; Mi Perfil's own load, save, and sign-out operations MUST NOT depend on it for authorization.
- The backend's existing session-based authentication (already used for sign-in, the Dashboard, and the MCP connector) is reused to identify the requesting user for all Mi Perfil operations; no new authentication mechanism is introduced.
- "Exportar mis datos" and "Eliminar cuenta" remain disabled, unimplemented placeholders, exactly as they are today; implementing them is out of scope for this feature.
- The profile avatar is read-only and sourced from the user's OAuth provider; no custom avatar-upload capability exists today, and this feature does not introduce one — no Firebase Storage usage is added or removed for Mi Perfil.
- No password change, email change, or account-deletion capability exists today; none is introduced by this feature.
