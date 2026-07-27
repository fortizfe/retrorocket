# Feature Specification: Remote Read-Only MCP Server for Retrospective Reporting

**Feature Branch**: `015-mcp-read-server`

**Created**: 2026-07-27

**Status**: Draft

**Input**: User description: "Quiero que RetroRocket exponga un servidor MCP remoto de solo lectura para que clientes de IA (como Claude) puedan generar informes de mis retrospectivas. Cualquier usuario de RetroRocket debe poder conectar su propio cliente de IA autenticándose con su cuenta existente de RetroRocket (Google/GitHub vía Firebase Auth), y debe poder revocar ese acceso en cualquier momento. A través del conector, el modelo de IA debe poder: listar las retrospectivas del usuario, consultar el detalle de una retrospectiva concreta (tarjetas, agrupaciones, likes/reacciones, participantes, resultados de sentimiento y action items) y obtener un resumen estructurado apto para redactar un informe. Las notas del facilitador son privadas y solo deben incluirse cuando quien pregunta es el propio facilitador de esa retrospectiva, igual que ya ocurre en la exportación a PDF/DOCX. Esta primera versión es exclusivamente de lectura: no debe crear, editar ni borrar nada en Firestore. IMPORTANTE: Todo tiene que encajar en el plan gratuito de Vercel y NO DEBE usarse ningún sistema de caché en este desarrollo."

## Overview

RetroRocket users currently review their retrospectives only inside the app or via manual PDF/DOCX export. This feature lets any RetroRocket user connect their own AI assistant (e.g. Claude) to their RetroRocket account through a remote, read-only Model Context Protocol (MCP) connector, so the assistant can pull retrospective data on the user's behalf and draft reports in conversation — without the user manually exporting and uploading files. The connector reuses the user's existing RetroRocket sign-in (Google/GitHub via Firebase Auth) for authorization, lets the user revoke a connected AI client at any time, and enforces the same privacy boundary already applied to facilitator notes in PDF/DOCX export: those notes are only ever included when the requester is the facilitator of that specific retrospective. This first version is strictly read-only — it must not create, modify, or delete any data — and must run within the free tier of the platform RetroRocket already uses for hosting, with no caching layer anywhere in the request path.

## Clarifications

### Session 2026-07-27

- Q: Should revoking an MCP connection block access immediately (a live per-request revocation check), or is a bounded delay acceptable — matching the existing web session pattern (feature 014), where a stateless, signed token remains valid until its short expiry with no live server-side revocation check? → A: Immediate. Every MCP request MUST validate the connection's status against a live revocation record before returning any data; a stateless-token-only check (with no live validity check) is not sufficient for this feature, even though that is the accepted trade-off for the plain web session.
- Q: Does authorizing an AI client grant it access to every retrospective the user has access to (an all-or-nothing blanket grant), or must the user select specific retrospectives to share with that connection? → A: All-or-nothing. Authorizing a connection grants it access to every retrospective the user has access to (as facilitator or participant), including ones created or joined after authorization; there is no per-retrospective selection or partial-sharing UI in this version.

Remaining defaults below were chosen because they mirror behavior that already exists elsewhere in RetroRocket (facilitator-only visibility, participant/owner-based data scoping) or reflect industry-standard patterns for remote MCP authorization; see the Assumptions section for details.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Connect and revoke an AI assistant (Priority: P1)

As a RetroRocket user, I want to authorize my own AI assistant to access my RetroRocket data using my existing account, and revoke that access whenever I want, so that I stay in control of who can read my retrospectives.

**Why this priority**: Nothing else in this feature can work without a secure, user-controlled way to grant and revoke access. It is also the primary trust boundary of the whole feature and must exist before any data is ever exposed.

**Independent Test**: A user starts the connection flow from their AI client, signs in with their existing RetroRocket account (Google or GitHub), and the client becomes connected. The user then opens RetroRocket, finds the connected client in a list of authorized connections, and revokes it. A follow-up request from that client is rejected. This is independently verifiable without any retrospective data being read.

**Acceptance Scenarios**:

1. **Given** a signed-in RetroRocket user configuring a new AI client connection, **When** they complete the authorization using their existing Google or GitHub-linked RetroRocket account, **Then** the AI client is granted access scoped to that user's own data only.
2. **Given** a user with no existing RetroRocket account, **When** they attempt to authorize an AI client, **Then** they are directed to sign in or create a RetroRocket account first, and no access is granted until they do.
3. **Given** a user with one or more connected AI clients, **When** they view their account's connected-apps list in RetroRocket, **Then** they see every currently authorized connection with enough detail to identify it (e.g. name and the date it was authorized).
4. **Given** a connected AI client, **When** the user revokes it from RetroRocket, **Then** any subsequent request made using that connection's credentials is rejected, without the user needing to change their RetroRocket password or sign-in method.
5. **Given** an AI client whose access was revoked, **When** the same client attempts to reconnect, **Then** the user must go through the authorization flow again and explicitly grant access.

---

### User Story 2 - List my retrospectives (Priority: P2)

As a RetroRocket user chatting with my AI assistant, I want it to list the retrospectives I have access to, so that I can pick which one to ask about.

**Why this priority**: Listing is the entry point to every other read capability; without it the assistant has no way to discover what it can report on. It only depends on User Story 1 being satisfied.

**Independent Test**: With an authorized connection already in place, ask the AI assistant to list retrospectives; verify the response contains exactly the retrospectives the signed-in user created or participated in, and nothing belonging to other users.

**Acceptance Scenarios**:

1. **Given** an authorized AI client for a user who owns or participated in one or more retrospectives, **When** the assistant requests the list, **Then** it receives every retrospective the user created (as facilitator) or joined (as participant), each identified with at least a title and creation date.
2. **Given** an authorized AI client for a user with no retrospectives, **When** the assistant requests the list, **Then** it receives an empty list rather than an error.
3. **Given** an authorized AI client, **When** the assistant requests the list, **Then** no retrospective belonging solely to another user is included.

---

### User Story 3 - View retrospective detail (Priority: P2)

As a RetroRocket user chatting with my AI assistant, I want it to pull the full detail of one of my retrospectives — cards, groupings, likes/reactions, participants, sentiment results, and action items — so that it has everything needed to discuss or summarize that retrospective.

**Why this priority**: This is the core data-access capability the feature exists to deliver, and it is what turns a bare list into something the assistant can actually reason about and report on.

**Independent Test**: With an authorized connection, ask the assistant for the detail of a specific retrospective the user has access to; verify every listed data category is present and matches what the RetroRocket UI shows for that retrospective, and that facilitator notes are included or excluded per the facilitator-only rule (covered further in User Story 4's acceptance scenarios and this story's edge cases).

**Acceptance Scenarios**:

1. **Given** an authorized AI client and a retrospective the user has access to, **When** the assistant requests its detail, **Then** it receives the retrospective's cards, their column/grouping assignments, likes and emoji reactions, the list of participants, any available sentiment analysis results, and any action items.
2. **Given** a retrospective the user does not have access to (not the facilitator and not a participant), **When** the assistant requests its detail, **Then** the request is rejected and no data about that retrospective is returned.
3. **Given** a retrospective with no cards yet, **When** the assistant requests its detail, **Then** it receives the retrospective's metadata with empty collections for cards, groupings, reactions, and action items rather than an error.
4. **Given** a retrospective where sentiment analysis was never run or is disabled, **When** the assistant requests its detail, **Then** the sentiment section is present but empty/absent rather than causing an error.

---

### User Story 4 - Facilitator notes stay private (Priority: P1)

As a facilitator, I want my private facilitator notes to reach the AI assistant only when I am the one asking, exactly like they already work in PDF/DOCX export, so that my private facilitation observations are never exposed to other participants or their AI assistants.

**Why this priority**: This is a privacy guarantee, not a convenience feature. A failure here leaks private notes to people who should never see them, so it carries the same non-negotiable weight as the connection/authorization boundary in User Story 1 and must be verified before this feature can be considered safe to ship.

**Independent Test**: As the facilitator of a retrospective, ask the connected assistant for that retrospective's detail and confirm facilitator notes are included. Then, using a second account that only participated in the same retrospective, ask its connected assistant for the same retrospective's detail and confirm facilitator notes are absent.

**Acceptance Scenarios**:

1. **Given** an authorized AI client connected as the facilitator (creator) of a retrospective, **When** it requests that retrospective's detail, **Then** the facilitator notes for that retrospective are included in the response.
2. **Given** an authorized AI client connected as a participant (not the facilitator) of a retrospective, **When** it requests that retrospective's detail, **Then** the facilitator notes are omitted entirely from the response (not returned empty or redacted — simply not present).
3. **Given** a retrospective with no facilitator notes recorded, **When** the facilitator's AI client requests its detail, **Then** the response omits the facilitator notes section rather than erroring.

---

### User Story 5 - Get a report-ready summary (Priority: P3)

As a RetroRocket user, I want my AI assistant to fetch a structured summary of a retrospective, so that it can draft a report without me manually re-describing the retrospective's content.

**Why this priority**: This builds directly on User Stories 2–4 by packaging the same underlying data into a shape suited for report drafting; it delivers the feature's ultimate value ("generate reports") but depends on the detail-retrieval capability already existing.

**Independent Test**: With an authorized connection, ask the assistant for a structured summary of a specific retrospective, and verify the summary organizes cards by grouping/column, surfaces top-voted/most-reacted items, reflects overall sentiment, and lists action items with their owners — all in one response, ready to be turned into a report.

**Acceptance Scenarios**:

1. **Given** an authorized AI client and a retrospective with cards, groupings, reactions, sentiment results, and action items, **When** the assistant requests the structured summary, **Then** it receives a single structured response organizing the retrospective's content (grouped feedback, standout/most-reacted items, overall sentiment breakdown, and action items with owners) suitable for drafting a report without further data lookups.
2. **Given** the same facilitator-only privacy rule as User Story 4, **When** a non-facilitator's assistant requests the structured summary, **Then** facilitator notes are excluded from the summary exactly as they are from the detail view.
3. **Given** a retrospective with minimal data (e.g. only a few cards, no reactions, no action items), **When** the summary is requested, **Then** the response still returns a valid, coherent summary rather than an error, simply omitting sections with no data.

---

### Edge Cases

- What happens when a user revokes an AI client's access while the assistant is in the middle of a multi-step report (e.g. listed retrospectives, then requests detail)? The next request after revocation MUST be rejected; nothing already returned to the assistant can be un-said, but no further data may be released.
- How does the system handle a request for a retrospective ID that does not exist (deleted or never existed)? It must be treated the same as "no access" (rejected/not found) rather than revealing whether the ID exists.
- How does the system handle a participant who joined a retrospective anonymously (no linked RetroRocket account) trying to use the MCP connector? Since the connector authenticates via an existing RetroRocket account, anonymous participation does not carry over — only retrospectives tied to the authenticated account (as facilitator or as an account-linked participant) are visible.
- What happens if the AI client requests data faster or more often than the free hosting tier's execution limits allow? Requests beyond the platform's limits are rejected or throttled with a clear error rather than degrading silently.
- What happens when a user has never connected any AI client and asks RetroRocket to show connected apps? They see an empty list, with a clear path to start a new connection.
- What happens when sentiment analysis results exist for some cards but not others in the same retrospective? Only cards with results include a sentiment value; the rest are omitted from the sentiment section, not defaulted to a fabricated value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let a signed-in RetroRocket user authorize a new AI client connection using their existing RetroRocket sign-in (Google or GitHub via Firebase Auth), without requiring a separate username/password.
- **FR-002**: System MUST scope every authorized connection strictly to the data of the RetroRocket account that granted it — no connection may access another user's data. This is an all-or-nothing grant: it is not scoped to a subset of the user's retrospectives chosen at authorization time.
- **FR-003**: System MUST let a user view all of their currently authorized AI client connections, each identifiable (e.g. by name and authorization date).
- **FR-004**: System MUST let a user revoke any of their authorized connections at any time from within RetroRocket.
- **FR-005**: System MUST reject any request made with a revoked or otherwise invalid connection's credentials, verified via a live check of the connection's current status performed on every request — a credential's own expiry alone (a stateless-token-only check) MUST NOT be relied on to enforce revocation.
- **FR-006**: System MUST allow an authorized connection to list every retrospective the connected user has access to, either as the facilitator (creator) or as a participant, including retrospectives the user creates or joins after the connection was authorized, without requiring re-authorization.
- **FR-007**: System MUST NOT include any retrospective in the list, or in detail responses, that the connected user did not create and did not participate in.
- **FR-008**: System MUST allow an authorized connection to retrieve, for a single retrospective the user has access to, its cards, column/group assignments, likes and emoji reactions, participants, available sentiment analysis results, and action items.
- **FR-009**: System MUST reject a detail or summary request for a retrospective the connected user does not have access to, and MUST NOT distinguish (in its response) between "does not exist" and "exists but not accessible."
- **FR-010**: System MUST include a retrospective's facilitator notes in a detail or summary response only when the connected user is the facilitator (creator) of that specific retrospective — matching the existing rule already applied to PDF/DOCX export.
- **FR-011**: System MUST omit the facilitator notes section entirely (rather than returning it empty or masked) when the connected user is not the facilitator of that retrospective.
- **FR-012**: System MUST allow an authorized connection to retrieve a structured, report-ready summary of a single retrospective that organizes its cards, groupings, standout/most-reacted items, overall sentiment, and action items in one response.
- **FR-013**: System MUST NOT create, modify, or delete any data in the underlying data store as a result of any operation exposed through this connector — every exposed operation is read-only.
- **FR-014**: System MUST NOT use any caching layer or mechanism (in-memory, edge/CDN, or data-store-level) to serve responses; every response MUST be produced from a live read of the current data at request time.
- **FR-015**: System MUST operate within the resource and execution limits of the free tier of the platform RetroRocket is already hosted on, without requiring a paid infrastructure upgrade.
- **FR-016**: System MUST produce a distinguishable, non-crashing error response when a request exceeds allowed rate/usage limits, when the requested retrospective is missing/inaccessible, or when the connection's credentials are invalid or revoked.

### Key Entities

- **MCP Connection (Authorization)**: Represents one AI client's authorized link to a RetroRocket user's account — who granted it, when, and its current status (active/revoked). Drives both access scoping (FR-002) and revocation (FR-004, FR-005).
- **Retrospective**: The retrospective board itself — title, facilitator (creator), participants, and lifecycle state — the top-level unit listed and fetched by the connector.
- **Card / Card Group**: The individual feedback items and the groupings/columns they belong to within a retrospective.
- **Reaction (Like / Emoji Reaction)**: Engagement signals attached to cards or groups.
- **Participant**: A person associated with a retrospective, linked to a RetroRocket account when not anonymous.
- **Sentiment Result**: The sentiment classification associated with a card, when available.
- **Action Item**: A follow-up task recorded against a retrospective, with an optional owner and due date.
- **Facilitator Note**: Private notes tied to a retrospective and its facilitator; visible through this connector only to that facilitator.
- **Retrospective Summary**: A derived, structured aggregation of the above entities for a single retrospective, shaped for report drafting rather than raw data inspection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can authorize a new AI client connection using their existing RetroRocket sign-in in under 2 minutes, without contacting support.
- **SC-002**: After a user revokes a connection, 100% of subsequent requests from that connection are rejected immediately — validated live against the connection's current status, not merely upon eventual token expiry — with no further data released.
- **SC-003**: An AI assistant can retrieve a complete, accurate list of a user's own retrospectives in a single request, matching what that user sees in the RetroRocket UI.
- **SC-004**: An AI assistant can retrieve a complete detail view or structured summary of any single retrospective the user has access to — cards, groupings, reactions, participants, available sentiment, and action items — in a single request each, with content matching the RetroRocket UI and existing PDF/DOCX export for that retrospective.
- **SC-005**: Across all tested scenarios, facilitator notes are never returned to a connection belonging to anyone other than the retrospective's own facilitator (zero leakage incidents).
- **SC-006**: The feature operates in production using only the free tier of RetroRocket's existing hosting platform, with no additional recurring infrastructure cost.
- **SC-007**: 90% of users who attempt to connect an AI client complete the authorization flow successfully on their first attempt.

## Assumptions

- **Authorization mechanism**: "Authenticating with an existing RetroRocket account" and "revoking access at any time" are implemented as a standard OAuth-style authorization flow in which RetroRocket acts as the authorization layer in front of its existing Firebase Auth identities, issuing the connecting AI client a scoped, revocable credential; revocation is exposed through a "connected apps"/"authorized connections" management surface in RetroRocket, analogous to how other services let users manage third-party app access. No new account system is introduced — the existing Google/GitHub-linked RetroRocket account is the source of identity. Per the Clarifications above, this credential's validity MUST be checked live against connection status on every request (unlike the existing plain web session, which accepts a bounded-delay, stateless-token-only revocation model per feature 014) — this is a deliberate, feature-specific strengthening of that precedent, not an inconsistency with it.
- **Access scope for listing/detail**: A user's accessible retrospectives are those they created (facilitator) or those they joined as a named, account-linked participant — matching how `Retrospective.createdBy` and `Participant.userId` already model ownership and participation in the existing data model. Anonymous (non-account-linked) participation does not grant MCP access, since the connector's identity comes from the authorized RetroRocket account. Per the Clarifications above, this is an all-or-nothing grant scoped to the account, not a per-retrospective selection — a connection automatically covers new retrospectives the user creates or joins after authorization.
- **Facilitator definition**: "The facilitator" of a retrospective is its creator (`Retrospective.createdBy`), consistent with how facilitator notes are already scoped by `facilitatorId` in the existing PDF/DOCX export path. No separate co-facilitator role exists today, so none is introduced by this feature.
- **Read-only enforcement**: This first version exposes no operations that create, update, or delete data; write capabilities (e.g. adding action items via the assistant) are explicitly out of scope and deferred to a future iteration.
- **No caching, anywhere**: Every list/detail/summary response is computed from a live read at request time; this is treated as a hard constraint on the design, not a performance tuning choice, per explicit instruction.
- **Free-tier hosting constraint**: The connector must run within the free (Hobby-equivalent) tier of the platform RetroRocket already uses for its existing backend, meaning function execution time, invocation volume, and payload size must stay within that tier's limits; this bounds expected usage patterns (e.g. summary size, request frequency) but does not change what data the feature must expose.
- **Client compatibility**: "AI clients like Claude" refers to any MCP-compatible AI client able to complete a browser-based authorization handshake; no specific client is required to exist for this feature to be considered complete, so long as the connector conforms to the remote MCP authorization pattern such clients expect.
