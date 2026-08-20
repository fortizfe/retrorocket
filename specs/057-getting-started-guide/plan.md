# Implementation Plan: In-App Getting Started User Guide

**Branch**: `057-getting-started-guide` | **Date**: 2026-08-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/057-getting-started-guide/spec.md`

## Summary

Add a dedicated, publicly accessible "Getting Started" guide page reachable from both the landing page (signed-out visitors) and the authenticated app (header/account menu). The guide presents a persistent, categorized side navigation menu; selecting a topic shows that topic's plain-language, non-technical content in place. Content covers every current user-facing capability (auth, boards/templates, real-time collaboration, cards/reactions, grouping & AI suggestions, anonymous mode, facilitator tools, sentiment/team mood, export, teams/metrics dashboard, and the MCP connector — linking out to its existing dedicated guide instead of duplicating it). No backend or storage changes are required: this is a frontend-only, statically-bundled content feature within the existing React SPA.

## Technical Context

**Language/Version**: TypeScript 5.0 (strict mode), React 18.2

**Primary Dependencies**: react-router-dom 6.8 (nested routing for deep-linkable topics), react-i18next / i18next (all guide copy, ES/EN — no hardcoded strings per constitution), framer-motion 10.18 via the app's existing `MotionConfig reducedMotion="user"` (any transition, e.g. mobile menu collapse, honors `prefers-reduced-motion` automatically), lucide-react (icons), Tailwind CSS 3.3 + the semantic theme-token system (`src/lib/theme/tokens.ts`) for styling in both light/dark themes

**Storage**: N/A — guide topic content is static and bundled with the client; no Firestore/backend persistence or new API endpoint is introduced

**Testing**: Vitest + Testing Library for unit/component coverage of the new guide components and topic registry (existing `vitest.config.ts` coverage floor applies); Playwright E2E extension of the existing suite is recommended for the core "discover guide → navigate a topic" flow, though the guide is not one of the constitution's explicitly named critical flows (Principle VII)

**Target Platform**: Web (desktop + mobile browsers) — existing Vite-built SPA deployed to Vercel; no new deployment target

**Project Type**: Web application — this feature is frontend-only (`retro-rocket/src/`); no backend/`server/` or `api/` changes

**Performance Goals**: No dedicated performance budget beyond the app's existing SPA expectations; content is static so there is no network-latency concern. The UX-level target is SC-002 (a user finds the right topic via the side menu in under 30 seconds), which is a navigability/IA property, not a load-time metric

**Constraints**: MUST NOT introduce a new markdown/MDX/CMS dependency — no proven need exists per Constitution Principle III (project has no markdown-rendering library today) and content volume (~12 topics) doesn't justify one. MUST route all guide copy through i18next (Technology Stack standard: hardcoded user-visible strings are prohibited). MUST independently satisfy WCAG 2.1 AA in both themes (Principle VIII). Any new UI/layout or motion decision (the side menu, its mobile collapse behavior) MUST go through the installed Apple-design-principles skill package (Principle IX, NON-NEGOTIABLE) rather than ad hoc design choices

**Scale/Scope**: One new route subtree (guide overview + per-topic deep links) with ~12 initial topics (per spec FR-006) organized into ~6 categories; no expected data-volume growth beyond the product's own feature count over time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Applicability | Assessment |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Applies | New components (guide layout, side nav, topic registry/content resolver) MUST be built red-green-refactor; enforced at `/speckit-tasks`/implementation, not a plan-time violation. |
| II. Library-First | Applies | The guide is a new, decoupled capability under `src/features/guide/` (components, the topic/category registry, hooks) with a clear public interface, wired into `App.tsx` routing — not inlined into `Landing.tsx`/`Header.tsx` beyond their new entry-point links. |
| III. Prefer Proven Third-Party Libraries | Applies | No new dependency is introduced — reuses react-router-dom, i18next, framer-motion, lucide-react, Tailwind already in the project. A markdown/CMS library was considered and rejected (see research.md). |
| IV. SOLID | Applies | The topic/category data (content) is kept separate from the rendering components (side nav, topic view), so content can grow without changing rendering logic — Single Responsibility / Open-Closed. No Firestore access is involved. |
| V. Simplicity (KISS/YAGNI) | Applies | No CMS, no dynamic content-fetching layer, no admin UI — static, bundled content matching the current, confirmed requirement (12 topics, no stated need for non-developer content editing). |
| VI. Coverage Floor (NON-NEGOTIABLE) | Applies | New components/logic MUST have Vitest + Testing Library coverage meeting the existing thresholds; no exception requested. |
| VII. E2E Playwright (NON-NEGOTIABLE) | Partially applies | The guide is not among the constitution's explicitly named critical flows (board creation, card voting/grouping, facilitator countdown, export, authentication), so E2E coverage here is recommended, not constitution-mandated. No exception needed since no named critical flow is skipped. |
| VIII. WCAG 2.1 AA (NON-NEGOTIABLE) | Applies | The side menu and topic content are new user-facing surfaces: keyboard operability, visible focus, 4.5:1/3:1 contrast, and no color-only meaning are required in both themes. Gate enforced at implementation/review, not violated by this plan. |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | Applies | Building the new side-menu layout and its mobile-collapse behavior is general UI/visual design + (light) motion work → MUST use the `apple-design`/`emil-design-eng` skills for the layout and the `animate` skill for the collapse/expand transition, per Principle IX. Assigned to frontend-agent, which is already mandated to use this tooling. |

**Result**: No violations. No entries required in Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/057-getting-started-guide/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

No `contracts/` directory: this feature introduces no new backend endpoint or external interface — it is a frontend-only, statically-content-bundled addition to the existing SPA.

### Source Code (repository root)

```text
retro-rocket/src/
├── features/
│   └── guide/                          # NEW — this feature's capability module
│       ├── components/
│       │   ├── GuidePage.tsx           # Route-level layout: side nav + content outlet
│       │   ├── GuideSideNav.tsx        # Persistent categorized navigation menu
│       │   └── GuideTopicContent.tsx   # Renders a single topic's plain-language content
│       ├── content/
│       │   └── topics.ts               # Guide Topic / Guide Category registry (data, no JSX)
│       └── hooks/
│           └── useActiveGuideTopic.ts  # Resolves the active topic from the route param
├── pages/
│   └── Guide.tsx                       # NEW — thin route wrapper (matches Dashboard.tsx/Teams.tsx convention), lazy-loaded in App.tsx
├── lib/components/layout/
│   ├── Header.tsx                       # MODIFIED — add authenticated entry point (FR-001a)
│   └── Layout.tsx                       # Unchanged; Header/Layout composition already supports new routes
├── features/landing/components/
│   └── LandingHero.tsx                  # MODIFIED — add landing entry point (FR-001)
└── locales/
    ├── en.json                          # MODIFIED — new `guide` namespace (nav labels + topic copy)
    └── es.json                          # MODIFIED — new `guide` namespace (nav labels + topic copy)

retro-rocket/src/App.tsx                 # MODIFIED — register /guide and /guide/:topicSlug routes
```

**Structure Decision**: Follows the existing `src/features/<domain>/{components,hooks,...}` + `src/pages/<Route>.tsx` convention already used by every other page-level surface (Dashboard, Teams, Profile). No new top-level directory pattern is introduced. Content (topic copy metadata/keys) is kept in a plain TypeScript registry (`content/topics.ts`) separate from rendering components, per Principle IV (SOLID) — actual displayed strings still live in `src/locales/{en,es}.json` per the i18n standard; `topics.ts` holds the structural registry (id, category, i18n key, icon) that both the side nav and the content view read from.

## Complexity Tracking

*No violations — table intentionally omitted.*
