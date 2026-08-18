# Feature Specification: Update README to Reflect Current Product State

**Feature Branch**: `053-update-readme`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Quiero que se revise el readme.MD del proyecto para que se ajuste a todo lo desarrollado hasta ahora. Revisa que cosas ya no aplican y que cosas no están y deberían."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Evaluator Gets an Accurate Feature Picture (Priority: P1)

As a prospective user, teammate, or reviewer who only reads the README, I want it to describe every user-facing capability the product currently has — and nothing it no longer has — so that my understanding of what RetroRocket does matches what it actually does.

**Why this priority**: The README is the product's front door. An audit against the current codebase found real, shipped, user-facing capabilities (anonymous board mode, TXT export, AI-generated group titles, the live typing indicator) with zero mention in the README today. A reader relying on it today forms a wrong picture of the product.

**Independent Test**: Can be fully tested by reading only the updated README and comparing each claim against the current application (or its specs) — every capability the app has today has a corresponding README mention, and every README claim corresponds to a capability the app actually has today.

**Acceptance Scenarios**:

1. **Given** the updated README's Key Features section, **When** a reader looks for how card authorship privacy works, **Then** they find a description of Anonymous Board Mode: the create-time toggle (default off), the facilitator's mid-retrospective toggle, and its visible effects (no author names, no "group by user" option, no typist identity revealed, a persistent mode indicator).
2. **Given** the updated README's Export section, **When** a reader looks for available export formats, **Then** they find PDF, DOCX, **and TXT** listed, with a note that anonymous-board exports omit author names in all three.
3. **Given** the updated README's Card Grouping section, **When** a reader looks for what a "group suggestion" includes, **Then** they find that suggested groups come with an editable, AI-generated title.
4. **Given** the updated README's Real-Time Collaboration section, **When** a reader looks for real-time collaboration signals, **Then** they find the live "who's typing" indicator described alongside presence and synchronization.
5. **Given** the updated README's Roadmap section, **When** a reader checks each unchecked item against the shipped product, **Then** none of them are actually already implemented.

---

### User Story 2 - New Contributor Runs the App on the First Try (Priority: P1)

As a developer setting up the project for the first time, I want the Getting Started instructions to result in a fully working local environment (including sign-in and any backend-dependent feature), so that I don't hit a broken login or a proxied API call with no explanation.

**Why this priority**: The audit found that `npm run dev` alone does not start the backend Express server that `/api/*` calls are proxied to, and that `.env.example` now contains a large block of non-`VITE_`-prefixed backend variables the README's environment-setup instructions never mention. A newcomer following the README today gets a frontend that renders but whose auth and other backend-dependent calls fail, with nothing in the README explaining why.

**Independent Test**: Can be fully tested by a developer with no prior project knowledge following only the updated README's Getting Started section end to end and reaching a fully functional local app (frontend + backend + working sign-in) on the first attempt.

**Acceptance Scenarios**:

1. **Given** the updated Getting Started section, **When** a developer follows the "run in development" step, **Then** they are told to start both the frontend dev server and the backend dev server (or the single combined script) and the corresponding npm script names are correct.
2. **Given** the updated environment-variable step, **When** a developer copies `.env.example` to `.env`, **Then** the README explains that the file contains both frontend (`VITE_`-prefixed) and backend (non-prefixed: session signing key, OAuth client credentials, Firebase service account, etc.) variables, without printing any real secret values.
3. **Given** the updated Getting Started section, **When** a developer wants to sign in locally, **Then** the instructions they followed are sufficient for sign-in to work (no undocumented missing step).

---

### User Story 3 - Contributor Trusts the Codebase Map (Priority: P2)

As a contributor navigating the repository, I want the Project Architecture file tree, Tech Stack, and Testing & CI sections to match the real repository layout and scripts, so that I can find code and run the right commands without cross-checking `package.json` or the folder structure myself first.

**Why this priority**: This affects contributor efficiency and trust in the docs, but a contributor can still recover by exploring the repo directly — unlike Story 2, this isn't a hard blocker.

**Independent Test**: Can be fully tested by a contributor cross-referencing the updated README's file tree and script list against the actual repository structure and `package.json` — no first-class top-level directory or script is missing or misnamed.

**Acceptance Scenarios**:

1. **Given** the updated Project Architecture section, **When** a contributor compares it to the repository, **Then** the tree includes the backend (`server/`), the Vercel serverless entrypoints (`api/`), the build scripts directory (`scripts/`), and the `features/landing/` module — none of which appear in the tree today.
2. **Given** the updated Testing & CI section, **When** a contributor looks for how to run backend checks, **Then** the backend-specific npm scripts (type-check, test, coverage) are listed, and the CI description reflects that frontend and backend are checked separately.
3. **Given** the updated Firestore Security Rules section, **When** a contributor reads it alongside the Anonymous Board Mode description, **Then** a short note clarifies that "anonymous board" is a display-only concept unrelated to Firebase Authentication's anonymous sign-in, which remains blocked by the rules exactly as written.

---

### Edge Cases

- A roadmap item turns out to be *partially* implemented (e.g., behind a dev-only flag, or implemented for one template but not others): it MUST remain listed as not-yet-implemented rather than checked off, since the roadmap represents capability available to all users today.
- A capability's shipped behavior differs in some detail from its original spec document: the README MUST describe the capability as it actually behaves in the current code, not as originally specified.
- Internal infrastructure or reliability work with no observable effect on a user, contributor, or integrator (e.g., the Redis-based idle-connection cleanup, Firestore read-count optimizations) is not required to get a README mention, consistent with the README's current level of technical detail — this is a judgment call, not an omission to fix.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The README's Key Features section MUST document Anonymous Board Mode: the create-time toggle (default off, applies to every board template), the facilitator-only mid-retrospective toggle, and its effects (no card author names, no "group by user" option, no typist identity, a persistent visible mode indicator for all participants).
- **FR-002**: The README's Usage Guide MUST describe how to create a board as anonymous and how a facilitator toggles anonymity during a live retrospective.
- **FR-003**: The README's Export section and Usage Guide MUST list TXT as a third export format alongside PDF and DOCX, and MUST state that exports from an anonymous board omit author names in all three formats.
- **FR-004**: The README's Card Grouping & AI-Assisted Suggestions section MUST state that suggested groups include an editable, AI-generated title.
- **FR-005**: The README's Real-Time Collaboration section MUST document the live "who's typing" indicator, including that it respects Anonymous Board Mode.
- **FR-006**: The README's Getting Started section MUST state that running the app locally requires starting both the frontend and backend dev servers (or the combined script), naming the actual npm scripts.
- **FR-007**: The README's environment-variable setup step MUST describe that `.env.example` contains both `VITE_`-prefixed frontend variables and non-prefixed backend variables (session signing key, OAuth client credentials, Firebase service account, etc.), without printing real secret values.
- **FR-008**: The README's Project Architecture file tree MUST include `server/`, `api/`, `scripts/`, and `features/landing/`.
- **FR-009**: The README's Testing & CI section MUST list backend-specific npm scripts (type-check, test, coverage) and MUST describe that CI checks frontend and backend separately.
- **FR-010**: The README's Firestore Security Rules section MUST include a short note clarifying that "anonymous board mode" is a display-only concept unrelated to Firebase Authentication's anonymous sign-in, which the rules continue to block exactly as before.
- **FR-011**: The Roadmap section MUST be re-verified item by item against the current codebase; any item already fully implemented for all users MUST be removed or checked off, and every remaining item MUST still be genuinely unimplemented.
- **FR-012**: Every version number, npm script name, file path, and directory reference in the updated README MUST match the actual current repository state.
- **FR-013**: The update MUST preserve all currently-accurate content, structure, section ordering, and tone, changing only what is stale, missing, or inaccurate.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer with no prior project knowledge can reach a fully working local environment — including sign-in — by following only the README's Getting Started section, on the first attempt.
- **SC-002**: Every user-facing capability currently shipped in the product has a corresponding, accurate mention in the README's Key Features, Export, or Usage Guide sections.
- **SC-003**: The Project Architecture file tree lists every first-class top-level directory that exists in the application code today, with zero omissions.
- **SC-004**: No statement in the README about environment variables, npm scripts, CI steps, or the Roadmap is contradicted by the current repository state.
- **SC-005**: A reader can explain what "Anonymous Board Mode" does and how to use it from the README alone, without reading any spec file.

## Assumptions

- Internal infrastructure or reliability work with no user-, contributor-, or integrator-visible effect (e.g., Redis idle-connection cleanup, Firestore read-count optimizations) does not require a README mention, matching the README's existing level of technical detail.
- The Profile redesign (spec 050) is a visual/UX refresh of already-documented capabilities (view/edit profile, manage linked providers, manage connected AI clients); it requires no new Key Features bullet, only that existing descriptions remain accurate.
- Unreferenced/dead source files noticed incidentally during the audit are a code-cleanup concern, not a documentation concern, and are out of scope for this feature.
- The "Live app" URL and the `docs/mcp-guia-usuario.md` link remain valid as of this feature's creation date and do not need re-verification beyond what was already checked.
- The audience, structure, and section order of the existing README remain the right shape for the project; this feature corrects and extends content rather than redesigning the document.
