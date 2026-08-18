# Implementation Plan: Mi Perfil (Profile) Redesign (Apple HIG-Inspired)

**Branch**: `050-profile-redesign` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/050-profile-redesign/spec.md`

## Summary

Completely rebuild the visual layout and look-and-feel of the authenticated
"Mi Perfil" page (`Profile.tsx` and its embedded `UserProfileForm`,
`LinkedProvidersCard`, and `ConnectedAppsCard`) using Apple Human Interface
Guidelines principles (clarity, deference, depth), via the project's
mandated Apple-design skill package. Following the process established and
already validated in features 029/031/033, the redesign explores 2-3
genuinely distinct visual directions before the product owner reviews a
single comparison artifact and selects one to ship (spec FR-015/SC-005).
Every existing capability must continue to work unchanged: viewing profile
data (avatar, display name, read-only email, primary provider, member-since
date), editing and saving the display name, signing out, viewing/linking
sign-in providers, and viewing/revoking connected AI assistants. One
pre-existing accessibility gap surfaced during specification — the disabled
"Exportar mis datos"/"Eliminar cuenta" placeholders have no accessible
disabled-state semantics — is corrected as part of this redesign (FR-007),
since it conflicts with the constitution's non-negotiable accessibility
standard. The shared `UserProfileForm` component is also embedded on the
landing page for first-time profile setup; this redesign must not regress
that already-shipped surface (FR-009/SC-006). Quality bars carried forward
unchanged: zero direct Firebase/Firestore browser access (backend-mediated
architecture, enforced by `profile-no-firestore.test.ts`), WCAG 2.1 AA in
both themes across all states, i18next en/es, and existing automated test
coverage.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), React 18.2, built with Vite 4

**Primary Dependencies**: Tailwind CSS 3.3 (semantic CSS-custom-property
token system — `src/lib/theme/tokens.ts` / `tailwind.config.cjs`),
framer-motion 10.18 (already the project's adopted motion library),
react-i18next 15.6 / i18next 25.3, lucide-react (icons), clsx,
`react-hot-toast` (existing success/error feedback channel), the existing
shared UI primitives (`src/lib/components/ui/*` — Button, Card, Input, …),
and the existing `useReducedMotion` hook (`src/lib/hooks/useReducedMotion.ts`,
introduced in feature 028)

**Storage**: N/A directly — profile data is read/written exclusively
through the existing backend-mediated REST client
(`src/features/auth/services/backendProfileClient.ts`, calling `GET`/`PATCH
/api/profile`); this view has no direct Firestore access, enforced by the
existing architecture test `src/test/architecture/profile-no-firestore.test.ts`
(feature 018), which this redesign MUST NOT violate

**Testing**: Vitest + Testing Library (unit/component, coverage-gated per
`vitest.config.ts` at branches 78 / functions 64 / lines 50 / statements 50),
Playwright E2E — `e2e/profile.spec.ts` (view, edit-display-name,
sign-out, linked-providers, connected-apps, Firestore-call absence), plus
the landing page's own coverage of the shared first-time-setup form
(`src/test/pages/Landing.test.tsx`, `e2e/authentication.spec.ts`)

**Target Platform**: Web browser (responsive mobile/tablet/desktop
viewports), light and dark themes, both currently supported `i18next`
locales (English, Spanish)

**Project Type**: Existing React SPA frontend (`retro-rocket/src`); this
feature does not touch `retro-rocket/server` or the MCP backend, and
introduces no new API endpoint or contract change

**Performance Goals**: No new throughput/scale target applies — Mi Perfil
renders a single user's own data (one avatar, a handful of provider/app
rows), not an unbounded list. The relevant bar is Apple HIG's "respond
instantly" principle: save/sign-out/link/revoke actions show their
loading state immediately on interaction (no perceptible delay before
feedback appears), and any new animation targets 60fps on
compositor-friendly properties (`transform`/`opacity`), consistent with the
constraint established in feature 028.

**Constraints**: Zero functional regression to viewing profile data
(avatar, display name, read-only email, primary provider, member-since
date), editing/saving the display name with validation and success/error
feedback, sign-out, linked-provider viewing/linking, and connected-app
viewing/revocation (spec FR-002 through FR-006); disabled account-action
placeholders MUST gain correct accessible disabled-state semantics without
implying functionality (FR-007, corrects a pre-existing accessibility gap);
zero direct Firebase/Firestore/Firebase Auth browser access (FR-008); the
shared `UserProfileForm` component MUST continue to render and function on
the landing page's first-time-setup flow with no regression (FR-009);
explicit loading/error/empty states for every operation (FR-010); all text
MUST stay in `i18next` for English and Spanish (FR-011); WCAG 2.1 AA MUST
hold in both themes across all states (FR-012, constitution Principle
VIII); every new animated interaction MUST honor `prefers-reduced-motion`
via the existing `useReducedMotion` hook (FR-013); fully responsive across
mobile/tablet/desktop (FR-014); at least 2-3 visual directions MUST be
explored and the product owner MUST review a single comparison artifact and
select the one that ships (FR-015); existing Vitest/Playwright coverage
MUST NOT drop (FR-016)

**Scale/Scope**: `src/pages/Profile.tsx` plus its embedded
`src/features/auth/components/{UserProfileForm,LinkedProvidersCard,
ConnectedAppsCard}.tsx` and their hooks/services
(`useLinkedProviders.ts`, `connectedAppsService.ts`,
`backendProfileClient.ts`) only; `src/pages/Landing.tsx` is touched only
insofar as it must keep rendering `UserProfileForm` correctly (no changes
to Landing's own already-shipped layout); 2 locales (en/es); 2 themes
(light/dark); a single signed-in user's own data (no large-list scale
concern).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. TDD (NON-NEGOTIABLE) | Any behavior-preserving or behavior-correcting logic touched during the rebuild (display-name validation, the disabled-placeholder accessibility fix, provider-link/app-revoke state handling) MUST have its existing/extended test written or updated first; presentation-only markup/motion has no pre-existing behavior to protect and follows the same no-new-test convention established in features 028/029/031 unless a new reusable utility is introduced. | PASS — enforced in Phase 2 task ordering |
| II. Library-First | No new domain capability is introduced. If a reusable accessible-disabled-control helper (for FR-007) is needed elsewhere too, it MUST live in `src/lib`, not be duplicated inline. | PASS |
| III. Prefer Proven Third-Party Libraries | Per `research.md` §1, no new dependency is needed — motion stays on the already-adopted framer-motion, and the page's small, bounded data (single profile, a handful of providers/apps) needs no virtualization or data-grid library. Any dependency proposed during prototyping MUST be justified per this principle — active maintenance, bundle-size impact, license, non-duplication — before adoption. | PASS |
| IV. SOLID | Profile data continues to flow exclusively through `backendProfileClient.ts` (and the existing `useLinkedProviders`/`connectedAppsService` hooks/services); no Firestore access or domain-service coupling is introduced into the view layer, preserving the boundary `profile-no-firestore.test.ts` enforces. | PASS |
| V. Simplicity (KISS + YAGNI) | Scope is bounded to Mi Perfil's already-existing capabilities plus the one documented accessibility correction (FR-007); no speculative new capability (avatar upload, password change, functional export/delete-account) is introduced, per the spec's Assumptions. | PASS |
| VI. Mandatory Unit Testing & Coverage Floor | Coverage thresholds in `vitest.config.ts` (branches 78 / functions 64 / lines 50 / statements 50) MUST NOT drop; `UserProfileForm.test.tsx`, `LinkedProvidersCard.test.tsx`, `ConnectedAppsCard.test.tsx`, `useLinkedProviders.test.ts`, `backendProfileClient.test.ts`, `connectedAppsService.test.ts`, and `Landing.test.tsx` MUST be updated alongside the rebuild, not deleted. | PASS — verified per task |
| VII. E2E Testing with Playwright | `e2e/profile.spec.ts` and the first-time-setup coverage in `e2e/authentication.spec.ts` MUST keep passing, updated only for intentional selector/structure changes, never weakened. | PASS — verified per task |
| VIII. Accessibility — WCAG 2.1 AA (NON-NEGOTIABLE) | Zero WCAG 2.1 AA violations across all states (loaded, loading, error, saving) in both themes (SC-002); disabled placeholders correctly announced as unavailable by assistive technology, not by color alone (SC-007); if new tokens are introduced, every `CONTRAST_PAIRINGS` entry MUST keep passing per `contrast.tokens.test.ts`. | PASS — hard gate, re-verified after Phase 1 |
| IX. Apple-Inspired Design & Motion Tooling (NON-NEGOTIABLE) | `apple-design`/`emil-design-eng` govern the general visual redesign; `prototype` is mandatory for the 2-3 candidate directions (FR-015); `animate` governs each new motion decision (page entrance, save success/error feedback, provider-link transition, connected-app revoke feedback); `review-animations` governs the final critique pass; `find-animation-opportunities` informs whether any new micro-interaction deserves motion at all; `pick-ui-library` would govern any new UI-library need (none anticipated per `research.md` §1). Skill used MUST be recorded per design decision in Phase 1 artifacts. **Note**: neither the `prototype` skill nor the `pick-ui-library` skill is installed in this environment; per the precedent established in features 029/031/033, `apple-design`/`emil-design-eng` are substituted for building the real, interactive candidate directions (`tasks.md`, Phase-1-equivalent tasks). This substitution MUST be explicitly acknowledged by the product owner alongside the direction selection, so the deviation from a NON-NEGOTIABLE principle's named tooling is documented before implementation, per the constitution's Governance clause. | PASS — condition (skill substitution) noted and gated on explicit product-owner acknowledgment during direction review |

No violations requiring justification. Complexity Tracking is not needed.

**Post-Phase-1 re-check**: `data-model.md`, `contracts/*`, and
`quickstart.md` introduce no new dependency, no Firestore/domain-service
change, and no reduction in test or accessibility coverage — all nine gates
above still PASS unchanged. The `Visual Direction.newDependencies` field
stays conditional/empty unless a candidate direction requires one, in which
case Principle III must be re-justified before that direction can be
`selected`.

## Project Structure

### Documentation (this feature)

```text
specs/050-profile-redesign/
├── plan.md                        # This file (/speckit-plan command output)
├── research.md                    # Phase 0 output (/speckit-plan command)
├── data-model.md                  # Phase 1 output (/speckit-plan command)
├── quickstart.md                  # Phase 1 output (/speckit-plan command)
├── contracts/                     # Phase 1 output (/speckit-plan command)
│   ├── functional-parity-contract.md
│   ├── visual-direction-review-contract.md
│   └── accessibility-interaction-contract.md
├── checklists/
│   └── requirements.md            # Spec quality checklist (/speckit-specify command output)
├── tasks.md                       # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
└── design-review.md               # Implementation output (SC-004 sign-off record, analogous to features 028/031's design-*.md)
```

### Source Code (repository root)

```text
retro-rocket/
├── src/
│   ├── pages/
│   │   ├── Profile.tsx                                # Primary rebuild target (page shell, all states)
│   │   └── Landing.tsx                                 # NOT restyled by this feature — only re-verified for zero regression where it embeds UserProfileForm (isFirstTime)
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── UserProfileForm.tsx                # Display-name edit form — rebuilt; also used by Landing.tsx (isFirstTime), MUST keep working there unchanged
│   │       │   ├── LinkedProvidersCard.tsx             # Linked/linkable provider list — restyled, behavior preserved
│   │       │   ├── ConnectedAppsCard.tsx               # Connected AI assistants list — restyled, behavior preserved
│   │       │   └── AuthWrapper.tsx                     # Unchanged — auth gate, redirect-if-unauthenticated
│   │       ├── hooks/
│   │       │   └── useLinkedProviders.ts               # Unchanged — derives linked/linkable state from userProfile.providers
│   │       └── services/
│   │           ├── backendProfileClient.ts             # Unchanged — REST contract to GET/PATCH /api/profile
│   │           ├── backendAuthClient.ts                # Unchanged — startLinkProvider() redirect flow
│   │           └── connectedAppsService.ts             # Unchanged — connected-AI-assistant list/revoke
│   ├── lib/
│   │   ├── contexts/
│   │   │   └── UserContext.tsx                         # Unchanged — updateDisplayName/signOut handlers, toast feedback
│   │   ├── theme/
│   │   │   ├── tokens.ts                               # May gain new token values for the chosen direction
│   │   │   └── contrast.ts                             # WCAG contrast math — unchanged, re-used to validate any new token values
│   │   ├── hooks/
│   │   │   └── useReducedMotion.ts                     # Reused as-is (introduced in feature 028)
│   │   └── components/ui/                              # Shared primitives reused where applicable (Button, Card, Input, …)
│   └── locales/
│       ├── en.json                                     # `profile.*`, `auth.userProfileForm.*` — keys added/renamed per the chosen layout, never removed without replacement
│       └── es.json                                     # Kept in lockstep with en.json
├── src/test/
│   ├── pages/
│   │   └── Landing.test.tsx                            # Re-verified; updated only if the isFirstTime rendering path changes
│   ├── features/auth/
│   │   ├── UserProfileForm.test.tsx                    # Updated alongside the rebuild, not deleted (FR-016)
│   │   ├── LinkedProvidersCard.test.tsx                # Updated
│   │   ├── components/ConnectedAppsCard.test.tsx       # Updated
│   │   ├── useLinkedProviders.test.ts                  # Unchanged — no behavior change
│   │   ├── backendProfileClient.test.ts                # Unchanged — no API contract change
│   │   └── services/connectedAppsService.test.ts       # Unchanged — no API contract change
│   └── architecture/
│       └── profile-no-firestore.test.ts                # Unchanged — MUST keep passing
└── e2e/
    ├── profile.spec.ts                                 # Updated only for intentional selector/structure changes
    ├── authentication.spec.ts                          # Re-verified for the first-time-setup UserProfileForm path; updated only if selectors change
    └── accessibility.spec.ts                            # Gains/keeps a Mi Perfil scan across its states in both themes; disabled-placeholder assertions added (FR-007/SC-007)
```

**Structure Decision**: No new top-level directories and no backend/API
changes. This feature works entirely inside the existing `retro-rocket/src`
frontend tree, following the existing `pages/` (route-level screens) vs.
`features/*` (domain capability) vs. `lib/*` (shared/reusable) split already
used by features 028, 029, and 031. The one new artifact class is the set
of 2-3 prototyped visual directions produced during Phase 1/implementation,
culminating in the single product-owner-facing comparison artifact
(FR-015) — these are design-review artifacts (not shipped code) and do not
introduce a new source directory.

## Complexity Tracking

> Not applicable — no Constitution Check violations were identified.
