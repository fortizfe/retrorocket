# Quickstart: In-App Getting Started User Guide

Manual/E2E validation scenarios proving this feature works end-to-end. Run these against a local dev build; no new environment setup beyond the project's existing prerequisites is required (no new env vars, no new backend service).

## Prerequisites

- Repo dependencies installed (`npm install` in `retro-rocket/`).
- Local dev server running: `npm run dev` (frontend only is sufficient — this feature makes no backend calls) or `npm run dev:all` if you also want to exercise sign-in.

## Scenario 1 — Discover the guide from the landing page (User Story 1, part a)

1. Start the app signed out; open `http://localhost:5173/` (or the dev server's port).
2. **Expect**: a clearly labeled "Getting Started" / "Guía de uso" element is visible on the landing page.
3. Select it.
4. **Expect**: you land on `/guide` (or the guide's overview) without being prompted to sign in; the guide's overview content and side menu are visible.
5. Use the guide's "back" affordance.
6. **Expect**: you return to the landing page.

Maps to: spec.md Acceptance Scenarios 1–2 and 4 under User Story 1; FR-001, FR-002, FR-011.

## Scenario 2 — Discover the guide from inside the authenticated app (User Story 1, part b)

1. Sign in (Google or GitHub, or the emulator-backed test flow if running `npm run emulators` + `npm run dev:all`).
2. From within the app (e.g. `/mis-tableros`), look for the guide entry point in the header or account menu.
3. **Expect**: the entry point is present and, when selected, opens the guide without requiring sign-out or navigating back to `/`.

Maps to: Acceptance Scenario 3 under User Story 1; FR-001a.

## Scenario 3 — Browse topics via the side menu (User Story 2)

1. Open the guide (`/guide`).
2. **Expect**: the side menu lists every topic from spec.md FR-006, grouped under category headings (see data-model.md's Guide Category list).
3. Select a topic (e.g. "Anonymous Board Mode").
4. **Expect**: the content area updates in place (no full page reload/flash of a blank page) to show that topic's content; the side menu marks it as the active selection (e.g. `aria-current="page"`, visually distinct styling).
5. Copy the resulting URL (e.g. `/guide/anonymous-mode`), open it in a fresh tab/incognito window.
6. **Expect**: the guide opens directly on that topic, with the side menu already showing it as active.

Maps to: Acceptance Scenarios 1–3 under User Story 2; FR-003, FR-004, FR-005.

## Scenario 4 — Plain-language content, no technical jargon (User Story 3)

1. Open each of the 12 topics listed in spec.md FR-006 in turn.
2. **Expect**: each explains what the feature does and how to use it in plain language and (where relevant) numbered/step form, with no mention of frameworks, APIs, databases, or code.
3. Open the "Connecting AI Assistants" topic specifically.
4. **Expect**: it gives a short plain-language summary and a link to the existing standalone MCP connector guide, rather than repeating that guide's full setup steps.

Maps to: Acceptance Scenarios 1–2 under User Story 3; FR-006, FR-007, FR-010.

## Scenario 5 — Mobile usability (User Story 4)

1. Open the guide (`/guide`) in a mobile-width viewport (e.g. browser devtools device toolbar, ~375px wide, or an actual phone).
2. **Expect**: the side menu is collapsed behind a toggle rather than permanently occupying screen width; content is fully readable with no overlap or clipping.
3. Open the toggle, select a topic.
4. **Expect**: the menu gets out of the way and the topic's content is fully readable.

Maps to: Acceptance Scenarios 1–2 under User Story 4; FR-008.

## Scenario 6 — Edge cases

1. Navigate directly to a nonexistent topic slug, e.g. `/guide/not-a-real-topic`.
   **Expect**: a sensible fallback (the guide's overview/home topic), not a blank page or app-level crash.
2. Toggle the app's language switcher and/or theme (light/dark) while on the guide.
   **Expect**: guide content and layout follow the app's current language and theme immediately.

Maps to: spec.md Edge Cases; FR-009.

## Automated coverage expected alongside these manual checks

- Vitest + Testing Library unit/component tests for `GuideSideNav`, `GuideTopicContent`, and the topic/category registry (invariants from data-model.md's Validation rules) — required by Constitution Principle VI's coverage floor.
- A WCAG 2.1 AA accessibility check (axe, matching the project's existing `e2e/accessibility.spec.ts` pattern) covering the guide in both themes — required by Principle VIII.
- Recommended (not constitution-mandated, since the guide isn't a named critical flow under Principle VII): a Playwright E2E spec covering Scenarios 1–3 above.
