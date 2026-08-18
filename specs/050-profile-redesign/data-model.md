# Phase 1 Data Model: Mi Perfil (Profile) Redesign

This feature is presentational; its "entities" are design-process and
view-state constructs used to plan and verify the rebuild, not new
persisted domain records. No Firestore schema changes; the `User Profile`
continues to be read/written exclusively through `backendProfileClient.ts`.

## Entity: Visual Direction

One of the 2-3 genuinely distinct candidate redesigns explored before the
product owner reviews the comparison artifact and selects one to ship
(FR-015).

| Field | Description |
|-------|-------------|
| `id` | Stable slug, e.g. `direction-a`, `direction-b`, `direction-c`. |
| `concept` | One-sentence description of the direction's core visual idea. |
| `distinguishingChoices` | What makes this direction genuinely different from the others explored — not a palette swap of the same layout (section grouping/hierarchy, materials/depth use, how identity vs. access vs. destructive actions are separated, motion character). |
| `newDependencies` | Any library beyond framer-motion/Tailwind/CSS this direction would require, with its Principle III justification (maintenance, bundle-size impact, license, non-duplication) — empty if none. |
| `status` | `explored`, `selected`, or `rejected`. Exactly one `Visual Direction` per feature has `status = selected`. |
| `reviewedBy` | Who reviewed it — per the constitution's design-exploration process, the product owner. |
| `rejectionReason` | Required when `status = rejected`; free text explaining why the product owner didn't choose it. |

**Validation rules**:
- Exactly 2 or 3 `Visual Direction` records exist for this feature.
- Exactly one has `status = selected`; the rest have `status = rejected` with a non-empty `rejectionReason`.
- Each `Visual Direction` (including rejected ones) MUST be functional enough to demonstrate the full capability set — view profile, edit/save display name, sign out, view/link providers, view/revoke connected apps — against real backend data, not static mockups, per `contracts/visual-direction-review-contract.md`.
- If `newDependencies` is non-empty for the `selected` direction, the Constitution Check's Principle III gate MUST be re-verified before implementation tasks are generated.

### Catalog (2026-08-17)

Built via `apple-design`/`emil-design-eng` (the `prototype` skill named in
FR-015 is not installed in this environment; substituted per the precedent
established in features 029/031/033 — see `research.md` §5 and `plan.md`'s
Constitution Check row IX). Each is a real, working route
(`/dev/profile-directions`, dev-only, tab-switchable) wired to actual
`backendProfileClient`/`useLinkedProviders`/`connectedAppsService` data via
the app's real `useUser`/`UserContext`, verified against a real signed-in
session (emulator-only `POST /api/auth/test-login`) in both themes and at
desktop/mobile widths.

| `id` | `concept` | `distinguishingChoices` | `newDependencies` | `status` | `reviewedBy` |
|---|---|---|---|---|---|
| `direction-a` | **Quiet Identity** — deference-forward: chrome recedes entirely, the person's own data leads | Zero card/border/shadow chrome anywhere — hierarchy from whitespace and small uppercase eyebrow labels only; display name is inline click-to-edit (plain `<h1>` + always-visible "Edit name" ghost trigger, no permanently-boxed form); every action (sign out, link provider, revoke app) is a low-emphasis ghost text-button inline with its row; disabled placeholders pushed to a quiet block behind the page's one hairline divider; motion limited to a single restrained opacity+8px entrance fade | None | `rejected` | Fernando Ortiz |
| `direction-b` | **Structured Account Pane** — clarity-forward: explicit, densely-but-cleanly organized, closer to an OS Settings pane than a marketing profile card | Real bordered section separation (Identity / Access & Security / Account Actions), not whitespace; uniform Settings-row vocabulary (leading icon, primary/secondary text, trailing action) applied consistently to both linked-providers and connected-apps lists; explicit status text everywhere ("Linked"/"Not linked"/"Not available yet" as visible captions, never color-only); persistent "Edit" button expanding a real inline form; quiet ≤0.24s motion, fully disabled under reduced motion | None | `selected` | Fernando Ortiz |
| `direction-c` | **Layered Materials** — depth-forward: distinct elevated surfaces communicate hierarchy, identity card visually floats above the rest | Real elevation system (`backdrop-blur-xl` + deep shadow, identity card overlaps a recessed `shadow-inner` panel beneath it via negative margin); every linked-provider/connected-app row is its own individually-elevated tile, not a shared-card list; ~90ms entrance stagger (identity first) on a strong ease-out curve, transform/opacity only, gated by `useReducedMotion`; also fixed two pre-existing gaps found along the way — Apple now renders as a real not-yet-available row, and the member-since date uses the active `i18next` language instead of a hardcoded `es-ES` locale | None | `rejected` | Fernando Ortiz |

**`rejectionReason`**:
- `direction-a`: Not selected — product owner chose Direction B's explicit, clarity-forward structure over Quiet Identity's deference/minimal-chrome treatment.
- `direction-c`: Not selected — product owner chose Direction B over Layered Materials' depth/elevation-forward, staggered-motion treatment.

**Status**: **Resolved 2026-08-17** — product owner (Fernando Ortiz)
reviewed all three via the published comparison artifact
(https://claude.ai/code/artifact/8b9b9b99-be98-41e5-a4b2-f29a36feb134,
real signed-in screenshots against both themes and mobile/desktop
viewports) and selected **Direction B (Structured Account Pane)**.
Directions A and C are rejected. The product owner's reply to the
artifact's decision panel — which explicitly stated that responding also
serves as acknowledgment of the tooling substitution — also serves as that
acknowledgment (`plan.md`'s Constitution Check row IX, `research.md` §5):
no separate objection was raised to substituting `apple-design`/
`emil-design-eng` for the uninstalled `prototype` skill.

## Entity: Product Owner Decision Artifact

The single, self-contained comparison document produced for the product
owner's FR-015/SC-005 review — the artifact explicitly requested in this
feature's input, distinct from (but built from) the live candidate
directions.

| Field | Description |
|-------|-------------|
| `format` | A published, self-contained comparison page (Claude Artifact) — not three separate live routes the product owner must switch between unaided. |
| `contents` | Side-by-side summary of each `Visual Direction`'s `concept` and `distinguishingChoices`, representative views of each candidate's loaded/error/saving states, and a short rationale per direction. |
| `linkedDirections` | References every `Visual Direction` record it compares (2 or 3). |
| `decisionRecordedAt` | Timestamp/date the product owner's selection was made, once recorded back into `data-model.md`'s `Visual Direction` catalog. |
| `toolingAcknowledgment` | The product owner's acknowledgment of the `prototype`/`pick-ui-library` skill substitution (`research.md` §5), captured alongside the direction selection. |

**Record (2026-08-17)**:
- `format`: Published Claude Artifact — "Mi Perfil Directions" — https://claude.ai/code/artifact/8b9b9b99-be98-41e5-a4b2-f29a36feb134
- `contents`: All three `direction-a`/`direction-b`/`direction-c` concepts and distinguishing choices, with real signed-in screenshots (light/dark desktop, light mobile) captured via the emulator-only test-login endpoint; an interactive light/dark toggle per direction; a closing decision panel explaining how to respond and what the response also acknowledges.
- `linkedDirections`: `direction-a`, `direction-b`, `direction-c`
- `decisionRecordedAt`: 2026-08-17
- `toolingAcknowledgment`: Acknowledged — product owner (Fernando Ortiz) selected Direction B in response to the artifact, whose decision panel explicitly stated the reply also serves as acknowledgment of the `apple-design`/`emil-design-eng` substitution for the uninstalled `prototype` skill; no objection raised.

**Validation rules**:
- Exactly one `Product Owner Decision Artifact` exists per feature, produced only after every linked `Visual Direction` satisfies `contracts/visual-direction-review-contract.md`'s "required before review" checklist.
- The artifact MUST be presented to the product owner before implementation of the selected direction's remaining polish proceeds (functional parity is already guaranteed per-candidate; what follows selection is finishing the chosen one, not building it from scratch).

## Entity: Profile View State

The mutually exclusive states Mi Perfil's data can be in, each with its own
required presentation (FR-010).

| Field | Description |
|-------|-------------|
| `variant` | `loading` (initial profile fetch) \| `loaded` \| `error` (profile fetch failed). |
| `recoveryAction` | What the visitor can do from this state — `error` offers at minimum a clear, non-silent message (existing behavior, re-verified). |
| `accessibilityRequirement` | Each variant MUST independently satisfy WCAG 2.1 AA contrast/focus/no-color-only-meaning (FR-012) — states are not exempt from the accessibility bar just because they're transient or exceptional. |

**Validation rules**:
- Exactly one `variant` is active at a time for the profile-data region.
- `error` MUST never be silent — a toast alone is acceptable only if it is reliably visible and captured by accessibility tooling/tests, re-verified against `e2e/accessibility.spec.ts`'s Mi Perfil scan.

## Entity: Editable Field Operation State

The lifecycle of the one editable field on this page (display name),
covering both its Mi Perfil rendering and its landing-page first-time-setup
rendering (FR-003, FR-009).

| Field | Description |
|-------|-------------|
| `mode` | `view` (not editing) \| `editing` \| `saving` \| `saved` \| `save-error`. |
| `validationState` | `valid` \| `blank` (rejected client-side before any request) — matches existing `UserProfileForm` behavior. |
| `isFirstTime` | Whether this instance is Mi Perfil's own edit form or the landing page's first-time-setup rendering of the same component — governs copy/framing only, not validation or persistence behavior. |

**Validation rules**:
- A blank/whitespace-only display name MUST be rejected in `validationState = blank` before any backend request is made.
- `save-error` MUST retain the previously saved display name in the UI (no partial/optimistic overwrite left stranded).
- Behavior and validation rules MUST be identical regardless of `isFirstTime` — only presentation/copy may differ.

## Entity: Linked Provider Row

The view-facing projection of a sign-in provider association, rendered in
the linked-providers section (FR-005).

| Field | Description |
|-------|-------------|
| `provider` | `google` \| `github` \| `apple`. |
| `linkState` | `linked` \| `linkable` \| `not-yet-available` (Apple today). |
| `linkAction` | For `linkable` providers, triggers the existing full-page OAuth redirect (`startLinkProvider()`); absent/disabled for `linked` and `not-yet-available`. |

**Validation rules**:
- A provider already linked MUST NOT also offer a link action.
- `not-yet-available` MUST communicate that status through visible text (not only an icon or disabled styling), consistent with FR-007's disabled-placeholder standard applied to this row too.

## Entity: Connected Assistant Row

The view-facing projection of an authorized MCP client, rendered in the
connected-AI-assistants section (FR-006).

| Field | Description |
|-------|-------------|
| `id` | Connection identifier, used as the list `key` and for the revoke request. |
| `origin` | `desktop` \| `mobile` \| `web` \| `unknown` — drives the leading icon. |
| `connectedAt` | Connection date, displayed using the active `i18next` language. |
| `lastUsedAt` | Last-used date, if available. |
| `revokeState` | `idle` \| `revoking` \| `revoke-error`. |

**Validation rules**:
- Revoking a connection MUST remove it from the list immediately on success.
- `revoke-error` MUST leave the entry visible and in `idle` state with a clear error shown, not silently stuck in `revoking`.
- An empty `Connected Assistant Row[]` MUST render a distinct, clear empty state rather than an unexplained blank section.

## Entity: Account Action Placeholder

The two currently disabled, unimplemented controls this feature corrects
the accessibility presentation of, without implementing their underlying
functionality (FR-007).

| Field | Description |
|-------|-------------|
| `id` | `export-data` \| `delete-account`. |
| `disabled` | Always `true` — this feature does not make either functional. |
| `unavailableLabel` | Persistently visible text (not tooltip-only) communicating the not-yet-available status. |
| `describedBy` | Programmatic association (`aria-describedby`) linking the control to `unavailableLabel` so assistive technology announces both together. |

**Validation rules**:
- `disabled` MUST remain `true` for both entries; this feature MUST NOT introduce any code path that makes them actionable.
- `describedBy` MUST resolve to visible, non-empty text — verified by the accessibility scan added per `contracts/accessibility-interaction-contract.md`.

## Entity: Design Token Extension

A new semantic color/gradient/material token added to `src/lib/theme/
tokens.ts` to support the selected direction, if the existing catalog
(introduced by features 028/029/031) is insufficient.

| Field | Description |
|-------|-------------|
| `name` | Token name, following the existing `TokenName` union convention. |
| `role` | What it's used for (e.g. "settings-section surface", "destructive-action accent"). |
| `lightValue` / `darkValue` | RGB channel values per theme, same format as existing `TOKENS`. |
| `contrastPairing` | The `CONTRAST_PAIRINGS` entry (if any) this token must satisfy — omitted only if the token is purely decorative and never rendered under/behind text. |

**Validation rules**:
- Every `Design Token Extension` used behind or under text MUST have a `contrastPairing` that passes `contrast.tokens.test.ts` in both themes before the selected direction can ship (Constitution Principle VIII).
- Token additions are additive only — no existing `TokenName` value may be removed or repurposed (would regress other surfaces already built on the 028/029/031 token system).
