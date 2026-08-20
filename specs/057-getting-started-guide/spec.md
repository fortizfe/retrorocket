# Feature Specification: In-App Getting Started User Guide

**Feature Branch**: `057-getting-started-guide`

**Created**: 2026-08-20

**Status**: Draft

**Input**: User description: "Quiero añadir a la landing un botón o algun elemento navegable que permita acceder a una página getting starter o similar que funcione como guía de usuario. Me gustaría que en esa página se detalle todo lo que se puede hacer y como a nivel de guia de usuario, sin entrar en detalles técnicos. Solo como una guia de uso de las funcionalidades que tenemos. Me gustaría que tuviera un menú lateral navegable que organice toda la documentación que se va a crear."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover the guide from the landing page or from inside the app (Priority: P1)

A visitor lands on RetroRocket's public landing page and wants to understand what the product can do before signing in. They notice a clearly labeled element ("Getting Started" / "User Guide") and select it, arriving at a dedicated guide page instead of being asked to sign in first. A user who is already signed in and using the app can find the same guide from within the authenticated app (e.g., the header or account menu) whenever they need it again.

**Why this priority**: This is the entry point for the entire feature — without it, none of the guide content is discoverable. It also directly answers the user's core request ("añadir a la landing un botón... que permita acceder"), extended so the guide stays reachable after sign-in too, not just on first visit.

**Independent Test**: Can be fully tested by (a) opening the landing page as a signed-out visitor, locating the new navigable element, activating it, and confirming a guide page loads with visible content, and (b) signing in and confirming the guide is also reachable from within the authenticated app — both deliver value on their own even before every topic is written.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page who has not signed in, **When** they view the page, **Then** a clearly labeled, visually distinct element ("Getting Started" / "Guía de uso") is present and easy to find.
2. **Given** the visitor selects that element, **When** the guide page loads, **Then** they see an overview of the guide (not a login prompt) and are not required to sign in to view it.
3. **Given** a user who is signed in and using the app, **When** they look for the guide, **Then** they can find and open it from within the authenticated app (e.g., header or account menu), without having to sign out or navigate back to the landing page.
4. **Given** the visitor or signed-in user is on the guide page, **When** they want to return, **Then** a clear way back (to the landing page, or to the main app for a signed-in user) is available.

---

### User Story 2 - Browse feature topics via a persistent side menu (Priority: P1)

A user on the guide page wants to find out how a specific feature works (e.g., "¿cómo funciona el modo anónimo?"). They open the persistent side menu, see the full list of documented topics organized into logical groups, select the one they're interested in, and the corresponding content displays — with the menu indicating which topic is currently open.

**Why this priority**: This is the organizing mechanism the user explicitly asked for ("un menú lateral navegable que organice toda la documentación") and is what makes a large amount of guide content actually usable rather than one long unstructured page.

**Independent Test**: Can be fully tested by opening the guide with at least two topics published, using the side menu to switch between them, and confirming the displayed content and the menu's active-topic indicator both update correctly.

**Acceptance Scenarios**:

1. **Given** the guide page is open, **When** the user looks at the side menu, **Then** every documented topic is listed, grouped under clear category headings (e.g., boards & cards, collaboration, facilitator tools, exporting, teams).
2. **Given** the user selects a topic in the side menu, **When** the content area updates, **Then** it shows that topic's guide content without a full page reload, and the side menu visually marks that topic as the current selection.
3. **Given** the user has a direct link to a specific topic (e.g., shared or bookmarked), **When** they open that link, **Then** the guide opens directly on that topic with the side menu reflecting the correct active state.

---

### User Story 3 - Learn how to use a feature in plain language (Priority: P2)

A facilitator preparing their first retrospective opens a topic (e.g., "Crear y unirte a un tablero") and reads a plain-language explanation of what the feature does and the steps to use it, with no technical or implementation terminology.

**Why this priority**: The side menu and entry point are only useful if the content itself meets the user's actual goal — a non-technical, complete walkthrough of "todo lo que se puede hacer y como." This depends on Stories 1 and 2 existing first, so it is next in priority.

**Independent Test**: Can be fully tested by opening any single topic and confirming a non-technical reader can understand what the feature does and how to perform it, without needing further explanation.

**Acceptance Scenarios**:

1. **Given** a user opens any topic in the guide, **When** they read its content, **Then** it explains, in plain language and step-by-step where relevant, what the feature does and how to use it — with no framework, API, database, or code-level terminology.
2. **Given** the product already has a standalone dedicated guide for a specific capability (the MCP AI-assistant connector), **When** the guide covers that capability, **Then** it gives a short plain-language summary and links out to the existing dedicated guide rather than duplicating its full content.

---

### User Story 4 - Use the guide comfortably on a small screen (Priority: P3)

A user opens the guide on a phone. The side menu adapts to the narrow screen (e.g., becomes a collapsible panel) instead of overlapping or hiding the content, and the user can still browse every topic and read every page.

**Why this priority**: Extends the guide's usefulness to mobile visitors but is not required for the guide to deliver its core value on desktop first.

**Independent Test**: Can be fully tested by opening the guide at a narrow (mobile-sized) viewport and confirming the side menu and content remain fully usable — every topic reachable, every page readable, no overlapping or clipped elements.

**Acceptance Scenarios**:

1. **Given** the guide is opened on a narrow/mobile-sized screen, **When** the page renders, **Then** the side menu is presented in a way that doesn't obscure the content (e.g., collapses behind a toggle) while remaining fully navigable.
2. **Given** the user opens the side menu on a narrow screen and selects a topic, **When** the topic's content displays, **Then** the menu gets out of the way so the content is fully readable.

---

### Edge Cases

- What happens when a user follows an old or mistyped deep link to a guide topic that no longer exists? The guide MUST show a sensible fallback (e.g., the guide's overview/home topic) rather than a broken or blank page.
- How does the guide behave when a brand-new product feature ships and needs its own topic? The side menu's grouping MUST be able to accommodate a new topic being added without restructuring the whole menu.
- What happens if a user switches the app's language or theme (light/dark) while on the guide page? The guide's content and layout MUST follow the same language and theme the rest of the app is currently using.
- What happens when a signed-in user (already inside the app) wants to reach the guide again later, not just on first landing-page visit? The guide's entry point MUST also be reachable from inside the authenticated app (e.g., the app header or account menu), not only from the public landing page.
- What happens if a topic's content references a feature area a given user doesn't have access to (e.g., team management for a user in no team)? The guide MUST still describe the feature generally, since it documents product capability, not the individual user's current account state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The public landing page MUST present a clearly labeled, visually distinct, navigable element ("Getting Started" / "Guía de uso") that takes the visitor to the guide.
- **FR-001a**: The authenticated app (e.g., the app header or account/user menu) MUST also present a way to reach the guide, so signed-in users can find it at any time, not only signed-out visitors on the landing page.
- **FR-002**: The guide page MUST be reachable and fully viewable without requiring the visitor to sign in.
- **FR-003**: The guide page MUST include a persistent side navigation menu listing every documented topic, organized into logical category groups rather than a single flat list.
- **FR-004**: Selecting a topic in the side menu MUST display that topic's content in place, without a full page reload, and MUST visually indicate which topic is currently selected.
- **FR-005**: Each guide topic MUST be reachable via its own distinct, shareable link (deep link), and opening that link directly MUST land on the correct topic with the side menu reflecting it as active.
- **FR-006**: The guide MUST provide a topic covering each of the following current product capabilities, in plain, non-technical, step-by-step language:
  - Signing in and managing your account/profile (connected sign-in providers)
  - Creating or joining a retrospective board, and choosing a board template
  - Real-time collaboration: seeing other participants, presence, and live typing indicators
  - Adding, editing, and color-organizing cards
  - Liking and reacting to cards with emoji
  - Grouping cards, including AI-assisted grouping suggestions
  - Anonymous Board Mode
  - Facilitator tools: countdown timer, facilitator notes, and session control
  - AI sentiment analysis and team-mood insights
  - Exporting a retrospective (PDF/DOCX/TXT)
  - Managing teams and viewing the team retrospective metrics dashboard
  - Connecting an AI assistant to your account (with a link to the existing dedicated connector guide)
- **FR-007**: Guide content MUST avoid implementation/technical terminology (frameworks, APIs, databases, code) and MUST instead describe what each feature does and the steps a user takes to use it.
- **FR-008**: The guide page MUST remain fully navigable and readable on mobile-sized screens, adapting the side menu so it does not obscure the content.
- **FR-009**: The guide page MUST render using the visitor's currently selected language and light/dark theme, consistent with the rest of the product.
- **FR-010**: Where a feature already has its own standalone dedicated guide (the MCP AI-assistant connector), the corresponding guide topic MUST link out to it instead of duplicating its content in full.
- **FR-011**: The guide page MUST provide a clear way to return to the landing page (or the main app, for a signed-in visitor) from any topic.

### Key Entities

- **Guide Topic**: A single documented capability shown in the guide — has a title, a plain-language description of what it covers, a shareable link/identifier, and a category it belongs to.
- **Guide Category**: A logical grouping of related Guide Topics used to organize the side menu (e.g., "Boards & Cards," "Collaboration," "Facilitator Tools," "Exporting," "Teams," "Connecting AI Assistants").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-out visitor can go from the landing page to viewing guide content in a single selection (one click/tap), with no intermediate sign-in step; a signed-in user can likewise reach the guide from within the app in a single selection.
- **SC-002**: A user looking for a specific feature can locate and open the correct guide topic from the side menu in under 30 seconds, without using browser-level search.
- **SC-003**: 100% of the product's current user-facing capabilities listed in FR-006 have a corresponding, complete guide topic at launch.
- **SC-004**: The guide page remains fully usable — every topic reachable and every page readable with no overlapping or clipped content — on both desktop-sized and mobile-sized screens.
- **SC-005**: In an informal usability check, at least 9 out of 10 test participants can correctly find the guide section answering a given "how do I…" question without assistance.

## Assumptions

- The guide page is public (no sign-in required), matching its placement on the pre-login landing page and its purpose of helping prospective users understand the product.
- Initial guide content covers only capabilities the product currently ships (matching the feature set already described in the project's README), not roadmap/planned items.
- The guide reuses the app's existing language (Spanish/English) and light/dark theme mechanisms rather than introducing new ones.
- The guide is a dedicated page within the app (not a modal or external site), matching the user's explicit request for "una página."
- Content maintenance (keeping topics in sync as features change) is an ongoing process handled outside this feature's initial delivery, not a one-time deliverable.
