# Phase 0 Research: Update README to Reflect Current Product State

**Input**: [spec.md](spec.md) — all requirements are evidence-backed from a prior
codebase audit; the `/speckit-clarify` pass found zero `[NEEDS CLARIFICATION]`
markers. This document formalizes that audit's findings as Decision/Rationale/
Alternatives per content area, so Phase 1 design and `/speckit-tasks` have a single
source of truth to work from instead of re-deriving evidence.

## 1. Anonymous Board Mode documentation (FR-001, FR-002, FR-010)

- **Decision**: Add a new "Anonymous Board Mode" bullet group to Key Features
  (near "Cards & Board Templates" or as its own subsection), extend the Usage
  Guide's "Create a retrospective" and "Facilitator mode" subsections, and add a
  one-line clarifying note to the Firestore Security Rules section distinguishing
  it from Firebase Auth's anonymous sign-in (which remains blocked).
- **Rationale**: `specs/051-anonymous-board-mode/spec.md` and
  `specs/052-anonymous-typing-indicator/` are merged and shipped (confirmed via
  `AnonymityToggle.tsx`, `CreateBoardFlow.tsx`, `ColumnHeaderMenu.tsx`,
  `TypingPreview.tsx`); the root README has zero mentions of the word
  "anonymous" outside the (unrelated) Firestore rules section, which risks a
  reader wrongly concluding the two concepts are the same or in conflict.
- **Alternatives considered**: A dedicated new top-level "## Anonymous Board
  Mode" section (mirroring the existing "## MCP Connector" pattern of a Key
  Features summary + a deep-dive section). Rejected as disproportionate — MCP
  is an entire external protocol integration; anonymity is a display toggle
  and fits naturally as bullets inside existing sections per FR-013's
  preserve-structure constraint.

## 2. TXT export format (FR-003)

- **Decision**: Add "TXT" alongside "PDF" and "DOCX" in the Export Key Feature
  bullet and the Usage Guide's "Export results" subsection; note that anonymous
  boards omit author names in all three formats.
- **Rationale**: `txtExportService.ts` exists and is wired into
  `unifiedExportService.ts` (`{ value: 'txt', label: 'TXT' }`); this is a
  longstanding gap unrelated to the anonymous-mode work, not a new omission.
- **Alternatives considered**: None — this is a factual completion of an
  existing bullet, not a design decision.

## 3. AI-generated group titles & column-scoped suggestions (FR-004)

- **Decision**: Extend the existing "Card Grouping & AI-Assisted Suggestions"
  bullet list with one line noting suggested groups carry an editable,
  AI-generated title.
- **Rationale**: `specs/047-suggested-grouping-refinements/spec.md` and
  `GroupSuggestionModal.tsx` show `suggestedTitle` is generated and
  user-editable; the current README bullet ("Group suggestions: assisted
  clustering proposes related cards to group together") is vague enough to be
  technically non-false, but omits a concrete, user-visible detail.
- **Alternatives considered**: Also documenting the column-scoping fix (spec
  049) explicitly. Rejected as too implementation-level for a README aimed at
  users/evaluators — it's a bug fix to existing described behavior, not a new
  capability; FR-004 only requires the title-editing detail.

## 4. Live typing indicator (FR-005)

- **Decision**: Add one bullet to "Real-Time Collaboration" describing the
  live "who's typing" indicator, noting it respects Anonymous Board Mode.
- **Rationale**: `TypingPreview.tsx` and the `typingStatus` Firestore
  collection (already named in the Firestore Rules section) implement a
  real-time feature comparable in kind to the already-documented presence
  avatars, but it has no Key Features mention anywhere.
- **Alternatives considered**: None — straightforward addition matching the
  pattern of the adjacent "Participant presence" bullet.

## 5. Local dev environment — backend server & env vars (FR-006, FR-007)

- **Decision**: Getting Started's "Run in development" step is updated to
  instruct running `npm run dev:all` (or, if the reader wants separate
  terminals, `npm run dev` + `npm run dev:server`), and the environment-variable
  step is updated to describe `.env.example`'s two blocks: `VITE_`-prefixed
  frontend vars and non-prefixed backend vars (`SESSION_SIGNING_KEY`,
  `GOOGLE_OAUTH_CLIENT_ID/SECRET`, `GITHUB_OAUTH_CLIENT_ID/SECRET`,
  `OAUTH_REDIRECT_BASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `AUTH_TEST_MODE`,
  `BACKEND_VERSION`, `SERVER_PORT`), without printing real secret values.
- **Rationale**: `vite.config.ts` proxies `/api/*` to
  `http://localhost:${SERVER_PORT ?? 3001}` with an explicit code comment
  pointing at `npm run dev:server`; `playwright.config.ts` starts both
  `npm run dev` and `npm run dev:server` as separate `webServer` entries for
  E2E. `package.json` confirms both `dev:server` (`vite-node --watch
  server/src/dev-server.ts`) and `dev:all` (`concurrently ... "npm run dev"
  "npm run dev:server"`) exist today. Following today's README literally
  yields a frontend with broken sign-in/API calls.
- **Alternatives considered**: Recommending only `npm run dev:all` (hiding the
  two-terminal option). Rejected — some contributors prefer separate terminals
  for separate log streams; mentioning both costs one line and matches how
  `playwright.config.ts` itself runs them.

## 6. Project Architecture file tree (FR-008)

- **Decision**: Add `server/`, `api/`, `scripts/`, and `features/landing/` to
  the existing file tree in their structurally correct positions, without
  otherwise restructuring the diagram.
- **Rationale**: These are real, first-class directories
  (`retro-rocket/server/`, `retro-rocket/api/`, `retro-rocket/scripts/`,
  `retro-rocket/src/features/landing/`) that the README's own prose
  ("Backend Architecture" section) already treats as first-class, but the tree
  diagram — the thing contributors actually scan to navigate the repo — omits
  them entirely.
- **Alternatives considered**: A fully separate "Backend Project Structure"
  tree (mirroring the existing single `retro-rocket/` tree). Rejected —
  `retro-rocket/server/README.md` already exists as the deep-dive for backend
  internals; the root tree only needs enough to point a reader there.

## 7. Testing & CI section — backend scripts and CI steps (FR-009)

- **Decision**: Add `type-check:server`, `test:server`,
  `test:server:coverage` to the "Run locally" script list, and split the CI
  bullet "Type-check, lint, and test with coverage" into explicit
  frontend-and-backend wording.
- **Rationale**: `retro-rocket/package.json` confirms these exact script
  names; `.github/workflows/ci.yml` lines 51–64 show "Type-check" (frontend),
  "Type-check (backend)", "Test with coverage" (frontend), and "Test backend
  with coverage" as four distinct CI steps — the README currently implies one
  undifferentiated check.
- **Alternatives considered**: Listing every single npm script in
  `package.json` (there are ~20). Rejected as noise — only the scripts a
  contributor needs to reproduce CI locally are in scope, matching the
  existing section's selectivity (it already omits `test:ui`, `test:accuracy`,
  `bench:sentiment`, etc.).

## 8. Roadmap re-verification (FR-011)

- **Decision**: No roadmap bullets are removed or checked off; all 9 remain
  as-is.
- **Rationale**: The audit cross-checked every bullet (4Ls/DAKI templates,
  countdown alerts, session history, integrations, team analytics, private
  retrospectives, offline mode, public REST API, native mobile app) against
  `boardTemplates.ts`, `countdown/` source, and a full-repo grep — none have
  shipped. This decision record exists so `/speckit-tasks` doesn't need to
  redo the verification, only re-confirm it's still current at
  implementation time (per Edge Cases in spec.md).
- **Alternatives considered**: N/A — this is a verification, not a design
  choice.

## 9. Content NOT changing (explicit non-decisions, from spec.md Assumptions)

- Redis/idle-connection internals (specs 041, 043, 045): no README mention —
  no user/contributor/integrator-visible effect.
- Profile redesign (spec 050): visual refresh of already-documented
  capabilities — no new Key Features bullet needed.
- Dead/unreferenced files (`Home.tsx`, `Home-new.tsx`): code-cleanup concern,
  out of scope for a documentation feature.
- Firestore Security Rules code block and "Live app" / `docs/mcp-guia-usuario.md`
  links: verified accurate, only a clarifying prose note is added (see §1).

## Summary

All content areas required by spec.md's functional requirements have a
recorded decision with primary-source evidence (file paths, package.json
script names, CI workflow line numbers, spec documents). No unknowns remain
for Phase 1.
