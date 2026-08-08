# Phase 1 Data Model: Landing Page Redesign (Apple HIG-Inspired)

This feature is presentational; its "entities" are design-process and
content-tracking constructs used to plan and verify the rebuild, not new
persisted domain records. No Firestore schema changes.

## Entity: Visual Direction

One of the 2-3 genuinely distinct candidate redesigns explored via the
`prototype` skill before the product owner selects one to ship (FR-010).

| Field | Description |
|-------|-------------|
| `id` | Stable slug, e.g. `direction-a`, `direction-b`, `direction-c`. |
| `concept` | One-sentence description of the direction's core visual idea (e.g. "typographic gradient-mesh hero with staggered depth cards"). |
| `distinguishingChoices` | What makes this direction genuinely different from the others explored — not a palette swap of the same layout (typography scale, layout rhythm, motion character, use of depth/materials). |
| `newDependencies` | Any library beyond framer-motion/Tailwind/CSS this direction would require, with its Principle III justification (maintenance, bundle-size impact, license, non-duplication) — empty if none. |
| `status` | `explored`, `selected`, or `rejected`. Exactly one `Visual Direction` per feature has `status = selected`. |
| `reviewedBy` | Who reviewed it — per the resolved clarification, always the product owner (SC-006). |
| `rejectionReason` | Required when `status = rejected`; free text explaining why the product owner didn't choose it. |

**Validation rules**:
- Exactly 2 or 3 `Visual Direction` records exist for this feature (FR-010's "2-3").
- Exactly one has `status = selected`; the rest have `status = rejected` with a non-empty `rejectionReason`.
- Each `Visual Direction` (including rejected ones) MUST be functional enough to demonstrate sign-in, theme toggle, and reduced-motion behavior — per `research.md` §2, mockups alone don't satisfy this record.
- If `newDependencies` is non-empty for the `selected` direction, the Constitution Check's Principle III gate MUST be re-verified before implementation tasks are generated.

### Catalog (2026-08-08)

Built via `apple-design`/`emil-design-eng` (the `prototype` skill named in FR-010
is not installed in this environment; substituted per explicit user decision
during `/speckit-implement`). Each is a real route (`/dev/landing-directions/{a,b,c}`,
dev-only) with working sign-in, the retained `ThemeToggle`, and both themes.

| `id` | `concept` | `distinguishingChoices` | `newDependencies` | `status` | `reviewedBy` |
|---|---|---|---|---|---|
| `direction-a` | **Aurora** — deference-forward: large display type (`text-6xl`/`text-8xl`, tight negative tracking) is the star over a slow-drifting ambient gradient wash | Ambient CSS-animated aurora blobs (`animate-float`/`animate-pulse-soft`, gated by `useReducedMotion`) behind a centered, single-column hero; glassy floating CTA card | None — existing Tailwind tokens/utilities + framer-motion only | `rejected` | Product owner (Fernando Ortiz) |
| `direction-b` | **Editorial Grid** — clarity-forward: strict asymmetric grid (Apple Newsroom-style), hairline dividers, one accent color, no ambient motion | Left-aligned headline/CTA + right-side abstract typographic grid mark standing in for the card/grouping metaphor; tight non-bouncy stagger (≤0.06s/item), calm/structured over decorative | None | `selected` | Product owner (Fernando Ortiz) |
| `direction-c` | **Layered Depth** — materials-forward: stacked translucent layers with a scroll-linked parallax hero, each supporting card progressively "thicker" (stronger blur/shadow = closer) | `useScroll`/`useTransform`-driven parallax (framer-motion, so `MotionConfig reducedMotion="user"` neutralizes it automatically — no manual reduced-motion gating needed); depth conveyed via blur/shadow escalation, not color | None | `rejected` | Product owner (Fernando Ortiz) |

**`rejectionReason`**:
- `direction-a`: Not selected — product owner chose Direction B's structured, clarity-forward approach over Aurora's ambient/deference-forward treatment.
- `direction-c`: Not selected — product owner chose Direction B over Layered Depth's parallax/materials-forward treatment.

**Status**: **Resolved 2026-08-08** — product owner reviewed all three
locally (`npm run dev`, `/dev/landing-directions`) and selected
**Direction B (Editorial Grid)** (tasks.md T008 complete). Directions A and C
are rejected; their prototype files and the dev-only route scaffold are
removed in T009. All subsequent implementation (T010+) builds out Direction
B's structured-grid visual language across the full page.

## Entity: Landing Section

A distinct content block on the redesigned page, carrying forward (in some
form) the messaging FR-008 protects.

| Field | Description |
|-------|-------------|
| `id` | Stable slug for the section in the *selected* direction (e.g. `hero`, `value-props`, `how-it-works`, `trust-signals`). Not required to match the current 7 section ids (FR-001a). |
| `purpose` | What visitor question this section answers (e.g. "what is this product", "how do I start", "why should I trust it"). |
| `sourceMessaging` | Which of the current landing sections' content this section carries forward, reworded/regrouped as needed — traces to the pre-redesign inventory below so FR-008 is auditable. |
| `i18nKeys` | The `landing.*` translation keys this section reads, in both `en.json` and `es.json`. |
| `motionTreatment` | How this section reveals/animates (e.g. "hero: opacity fade gated on readiness"; "below-fold: `whileInView` fade+offset") — must resolve to one of the patterns in `research.md` §5. |

**Validation rules**:
- The union of every `Landing Section.sourceMessaging` MUST cover all 6 pre-redesign message categories listed below (FR-008) — no category may be silently dropped.
- Every `i18nKeys` entry MUST exist in both `en.json` and `es.json` (no locale-orphaned key) — enforced by `contracts/i18n-key-migration-contract.md`.
- The section containing the primary sign-in call-to-action MUST be reachable without scrolling on common desktop/mobile viewports (FR-007).

### Pre-redesign messaging inventory (source of truth for FR-008 coverage)

| Category | Current source (`Landing.tsx` / `landing.*` i18n keys) |
|---|---|
| Value proposition & tagline | `hero` (`landing.hero.description`, `landing.hero.tagline`) |
| Quick feature pitch | `features` (`landing.features.*` — connectTeams, immediateResults, easyToAdopt) |
| Detailed capability list | `mainFeatures` (`landing.mainFeatures.*` — auth, real-time collab, card system, grouping, export, modern UI) |
| Product walkthrough | `howItWorks` (`landing.howItWorks.step1/2/3`) |
| Technology/trust signals | `technology` (`landing.technology.*`, open-source badge) |
| Closing message | `finalMessage`, `footer` |

### Finalized catalog (Direction B — Editorial Grid, resolved 2026-08-08)

| `id` | `purpose` | `sourceMessaging` | `i18nKeys` | `motionTreatment` |
|---|---|---|---|---|
| `hero` | What is this, how do I start | Value proposition & tagline; the primary sign-in CTA; a 4-item quick-glance preview of `capabilities` (icon + title only, added post-launch per DR-009 live review — see `design-review.md`) | `landing.hero.*` (unchanged path — same key names); preview reuses `landing.capabilities.items.{realTimeCollab,cardSystem,smartGrouping,export}.title`, no new keys | `hero-fade` |
| `capabilities` | What can I do with it | Quick feature pitch + Detailed capability list, merged into one grid-mark section | `landing.capabilities.*` (replaces `landing.features.*` + `landing.mainFeatures.*` — see `i18n-key-migration-contract.md`) | `scroll-reveal` |
| `how-it-works` | How do I actually use it | Product walkthrough (3 steps, unchanged content) | `landing.howItWorks.*` (unchanged path) | `scroll-reveal` |
| `trust-signals` | Why should I trust it | Technology/trust signals | `landing.technology.*` (unchanged path) | `scroll-reveal` |
| `closing` | Where do I go from here | Closing message | `landing.finalMessage.*`, `landing.footer.*` (unchanged path) | `scroll-reveal` |

The `hero` section contains the primary sign-in CTA and is the no-scroll-required section per FR-007.

## Entity: Design Token Extension

A new semantic color/gradient token added to `src/lib/theme/tokens.ts` to
support the selected direction, if the existing catalog is insufficient
(`research.md` §3).

| Field | Description |
|-------|-------------|
| `name` | Token name, following the existing `TokenName` union convention. |
| `role` | What it's used for (e.g. "hero gradient accent stop"). |
| `lightValue` / `darkValue` | RGB channel values per theme, same format as existing `TOKENS`. |
| `contrastPairing` | The `CONTRAST_PAIRINGS` entry (if any) this token must satisfy — omitted only if the token is purely decorative (e.g. a background gradient stop with no text ever rendered on top of it, still checked visually for the "no color-only meaning" rule). |

**Validation rules**:
- Every `Design Token Extension` used behind or under text MUST have a `contrastPairing` that passes `contrast.tokens.test.ts` in both themes before the selected direction can ship (constitution Principle VIII).
- Token additions are additive only — no existing `TokenName` value may be removed or repurposed (would regress other surfaces built on 028's token system).

## Entity: Loading Reveal Behavior

Describes what a visitor sees while a `Landing Section` becomes ready
(FR-011).

| Field | Description |
|-------|-------------|
| `sectionId` | The `Landing Section.id` this applies to. |
| `pattern` | `hero-fade` (opacity fade-in gated on asset/font readiness, hero only) or `scroll-reveal` (`whileInView` fade+offset, below-the-fold sections) — the two patterns from `research.md` §5. |
| `reducedMotionFallback` | How this section presents when `useReducedMotion()` is true — MUST still be fully readable/usable with no animation (FR-005). |

**Validation rules**:
- No `Landing Section` may use a skeleton/placeholder pattern or a blank-until-ready gate (resolved clarification, FR-011).
- Every `Loading Reveal Behavior.reducedMotionFallback` MUST be verified against `e2e/accessibility.spec.ts`'s motion-neutralizing CSS override, per `research.md` §5/§6.
