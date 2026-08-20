# Phase 0 Research: In-App Getting Started User Guide

No `NEEDS CLARIFICATION` markers remain in the Technical Context — this feature reuses the existing, already-adopted stack end-to-end, so research here focuses on the concrete design decisions needed before Phase 1, not on evaluating unknown technologies.

## Decision 1: Content authoring approach

**Decision**: Author guide topic content as i18next translation keys (title + an array of plain-language paragraph/step strings per topic), stored under a new `guide` namespace in `src/locales/{en,es}.json`. A separate, non-rendering TypeScript registry (`src/features/guide/content/topics.ts`) holds each topic's structural metadata (id, category, i18n key prefix, icon) — components read structure from the registry and copy from i18next.

**Rationale**: The constitution's Technology Stack standard prohibits hardcoded user-visible strings ("All user-visible text MUST go through i18next"); the project has no markdown/MDX rendering dependency today, and Principle III requires justifying any new dependency against active-maintenance/bundle-size/license/non-duplication — introducing one solely for ~12 static topics is not justified when i18next JSON already does the job used everywhere else in the app. Separating structure (registry) from copy (locale files) keeps `topics.ts` free of duplicated strings and keeps translators working in the same `en.json`/`es.json` files they already use for the rest of the product (`docs/mcp-guia-usuario.md` and `docs/mcp-informes-retro-userstories.md` remain separate standalone Markdown guides, not part of this in-app content).

**Alternatives considered**:
- *New markdown/MDX rendering library* (e.g., `react-markdown`, `@mdx-js/react`): rejected — no existing need in the codebase, new dependency to vet and bundle for a small, static content set (Principle III, V).
- *Hardcoded JSX prose per topic component*: rejected — violates the i18next-only standard and would need per-language component branching.
- *Remote/CMS-driven content*: rejected — Assumption in spec.md already scopes content maintenance as static/developer-authored; no requirement for non-developer live editing exists.

## Decision 2: Routing / URL scheme for deep-linkable topics

**Decision**: A parent route `/guide` renders the guide overview (side nav + a default/overview topic), and each topic is reachable at `/guide/:topicSlug` (e.g. `/guide/anonymous-mode`), using react-router-dom's existing nested-route pattern already used elsewhere in `App.tsx` (e.g. `/teams/:id`). The side nav highlights the active item using the current route (`useParams`/`useLocation`), matching `Header.tsx`'s existing `isActivePath` convention.

**Rationale**: FR-005 requires each topic to be reachable via its own shareable/deep link with the side menu reflecting the correct active state — this requires the topic to be addressed by the URL, not by client-only state (e.g., `useState`). Route-based navigation also means browser back/forward and bookmarking work for free, and is consistent with how every other multi-view surface in this app (Teams/TeamDetail) is structured.

**Alternatives considered**:
- *Single `/guide` route with in-memory tab state (no per-topic URL)*: rejected — fails FR-005's deep-link requirement outright.
- *Query-string based topic selection (`/guide?topic=...`)*: rejected — path segments are the existing convention in this app (`/teams/:id`, `/retrospective/:id`) and read more clearly as a distinct "page" per topic, matching how the user described "una página" per topic area.

## Decision 3: Side navigation pattern (accessibility)

**Decision**: The side menu is a `<nav>` landmark containing grouped lists of `<Link>` elements (react-router), each marked `aria-current="page"` when active — the same pattern `Header.tsx` already uses for its top-level nav links — rather than a WAI-ARIA `tablist`/`tabpanel` pattern.

**Rationale**: The codebase already has a real ARIA `tablist` implementation (`FacilitatorTabList.tsx`), but that pattern is for content that is *not* independently URL-addressable (facilitator panel tabs don't have their own routes). Since guide topics MUST be deep-linkable (FR-005), the correct accessible pattern is standard link-based navigation with `aria-current`, not `role="tab"` — the WAI-ARIA Authoring Practices reserve the tabs pattern for same-page, non-navigable panel switching. This also directly satisfies Principle VIII's keyboard-operability and no-color-only-meaning requirements using a well-understood native pattern (link focus/activation) instead of custom keyboard-handling code.

**Alternatives considered**:
- *Reuse `FacilitatorTabList.tsx`'s tablist pattern as-is*: rejected — semantically wrong for URL-addressable content per WAI-ARIA APG, and would need the deep-link requirement bolted on awkwardly (tabs aren't meant to change the URL).
- *A generic unstyled `<ul>` of `<button>`s with manual state*: rejected — loses free browser navigation semantics (back/forward, bookmarking, right-click-open-in-new-tab) that plain `<Link>`s provide.

## Decision 4: Mobile collapse behavior

**Decision**: Below the existing responsive breakpoint conventions used elsewhere in the app (Tailwind `md:`), the side menu collapses behind a toggle control (matching the general shape of the existing mobile `BottomSheet` pattern used by the facilitator menu), rather than rendering as a fixed, always-visible sidebar.

**Rationale**: FR-008/User Story 4 require the guide to remain fully navigable on mobile without the menu obscuring content. The project already has a precedent for a collapsible mobile panel (`FacilitatorMenu.tsx`'s `BottomSheet`), so following that shape is consistent rather than inventing a new mobile interaction pattern. The exact spring/duration/interruption-behavior choices for the toggle transition are a Principle IX (`animate` skill) decision to be made during implementation, not prescribed here.

**Alternatives considered**:
- *Always-visible sidebar at all viewport widths*: rejected — spec explicitly calls out this failure mode (menu obscuring content on narrow screens) as unacceptable (User Story 4, SC-004).
- *Full-screen navigation takeover on mobile (separate route)*: rejected as unnecessary complexity (Principle V) — a toggleable in-page panel is simpler and matches existing precedent.
