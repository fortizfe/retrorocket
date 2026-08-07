# Phase 0 Research: Apple-Inspired Design Alignment

All three spec clarifications (token scope, state coverage, governance) were
already resolved during `/speckit-clarify`. The items below are the
remaining technical unknowns needed to plan concrete, testable tasks.

## R1. Audit rubric — derive it directly from the `apple-design` skill

- **Decision**: The Design Audit Finding rubric (see `data-model.md`) uses
  the `apple-design` skill's 8 design foundations (Purpose, Agency,
  Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight) plus
  its motion-technique sections (Response, Direct Manipulation,
  Interruptibility, Behavior-over-animation/springs, Spatial Consistency,
  Materials & Depth, Typography, Reduced Motion) as the fixed checklist
  categories every surface is scored against. Constitution Principle IX's
  skill-to-task mapping determines which skill produces the finding/fix for
  a given category (e.g. a spring/interruptibility finding → `animate`; a
  whole-surface visual-hierarchy finding → `apple-design` +
  `emil-design-eng`; deciding whether a surface needs motion at all →
  `find-animation-opportunities`).
- **Rationale**: The constitution already mandates these skills; grounding
  the rubric in the skill's own categories (rather than inventing a parallel
  one) keeps FR-008's "which skill was used for which decision" record
  traceable and avoids a second, drifting taxonomy.
- **Alternatives considered**: A generic, project-invented heuristic
  checklist — rejected because it would duplicate what the mandated skill
  package already defines and risks diverging from Principle IX over time.

## R2. Reduced motion — no existing handling; close the gap once, centrally

- **Decision**: Introduce one new shared utility, `useReducedMotion` (in
  `src/lib/hooks/`, wrapping `prefers-reduced-motion` via
  `window.matchMedia`), and wrap the app root in framer-motion's
  `<MotionConfig reducedMotion="user">`. `framer-motion@10.18` (already a
  dependency) ships `MotionConfig`'s `reducedMotion="user"` natively — it
  makes every framer-motion-driven animation in the 91 files that already
  use the library automatically honor the OS/browser preference without
  editing each file. Any animation implemented with plain CSS
  (`transition-*`/`animate-*` Tailwind utilities, confirmed present in
  `globals.css` and component classes) is NOT covered by `MotionConfig` and
  MUST get an explicit `@media (prefers-reduced-motion: reduce)` override
  discovered and fixed per-surface during the audit.
- **Rationale**: A grep of the codebase confirms zero existing
  `prefers-reduced-motion` / `useReducedMotion` usage today — this is a real,
  previously-unmet gap, not a from-scratch invention. Using the library's
  built-in mechanism satisfies FR-006 for the large majority of animated
  surfaces with one root-level change (Simplicity/YAGNI), while the
  remaining plain-CSS animations are flagged as individual audit findings
  scoped to their surface.
- **Alternatives considered**: Hand-rolling reduced-motion branches inside
  every animated component — rejected, ~91 files of repetitive,
  error-prone edits for behavior the dependency already provides for free.

## R3. Reduced transparency for materials/depth — treat as an audit finding, not an assumption

- **Decision**: `backdrop-filter` is already used in `Card`, `Modal`,
  `Header`, `JoinRetrospectiveModal`, `CreateBoardFlow`, `FacilitatorMenu`,
  and `GroupCard`/`RetrospectiveTopbar`. None currently respond to
  `prefers-reduced-transparency`. Each of these is logged as a candidate
  Design Audit Finding (materials/depth category) during the surface review
  rather than assumed compliant or silently fixed as a blanket change.
- **Rationale**: Per FR-002, motion/material changes are decided per surface
  with justification, not applied uniformly — some of these materials may
  already satisfy the intent (e.g. sufficiently opaque fallback), so a
  blanket fix could be unnecessary churn (Simplicity).
- **Alternatives considered**: A single global `prefers-reduced-transparency`
  CSS override applied everywhere — rejected as premature; some translucent
  surfaces may need bespoke solid-fallback colors to remain legible per the
  `apple-design` skill's vibrancy guidance.

## R4. Token redesign validation stays on the existing, unmodified gate

- **Decision**: If the audit calls for new token values (per spec
  Clarification 1), they are validated with the same existing mechanism:
  `CONTRAST_PAIRINGS` in `src/lib/theme/tokens.ts` and the
  `contrast.tokens.test.ts` / `contrast.focus.test.ts` unit suites, plus the
  merge-blocking `e2e/accessibility.spec.ts` axe audit. No new validation
  tooling is introduced.
- **Rationale**: This is the exact mechanism `specs/009-wcag-theme-compliance`
  built for this purpose (see `contracts/design-tokens-v2.md`, which extends
  rather than replaces `specs/009-wcag-theme-compliance/contracts/
  design-tokens.md`); reusing it satisfies Constitution Principle III
  (prefer what's already proven) and keeps WCAG 2.1 AA enforcement
  structurally guaranteed rather than manually re-verified.
- **Alternatives considered**: A new visual-regression/contrast-checking
  tool — rejected; the existing pure-function WCAG math and its test gate
  already cover exactly this case (Simplicity/YAGNI).

## R5. Typography — no size-specific tracking/leading scale exists today

- **Decision**: Tailwind's default type scale is in use with no custom
  `fontSize`/`letterSpacing` overrides in `tailwind.config.cjs`. Whether to
  introduce Apple-style size-specific tracking (negative tracking on large
  display text, near-zero on body, tighter leading on headings per the
  `apple-design` skill's typography section) is decided per-surface during
  the audit, since it interacts with the token-scale decision from R1/
  Clarification 1.
- **Rationale**: Documented as a known, real gap so it isn't missed by the
  audit, without pre-deciding the specific values outside the mandated
  skill-driven review process.
- **Alternatives considered**: Prescribing exact tracking/leading values
  here — rejected; that is a design decision FR-008 requires to be made via
  the mandated skill package during the audit itself, not during planning.

## R6. Design Audit Finding artifact location

- **Decision**: Findings are recorded in a single running log,
  `specs/028-apple-design-alignment/design-audit.md`, structured per the
  schema in `contracts/design-audit-finding-schema.md`, created and appended
  to during implementation (Phase 2 tasks), not during planning.
- **Rationale**: Keeps the audit trail (what was reviewed, which skill
  produced the decision, priority, resolution) in one reviewable place
  co-located with the feature, satisfying FR-001/FR-008/SC-001 without
  scattering findings across PR descriptions only.
- **Alternatives considered**: Recording findings only in PR descriptions —
  rejected; PRs are per-surface and would fragment the SC-001 "100% of
  surfaces have a documented finding" evidence trail.

## R7. Existing E2E accessibility harness already anticipates motion changes

- **Decision**: `e2e/accessibility.spec.ts` already freezes CSS
  animations/transitions and waits out framer-motion entrance delays before
  scanning with axe (see its inline comments). New/changed motion introduced
  by this feature MUST remain compatible with that freeze-and-settle
  pattern; if a redesigned surface's entrance timing changes, the
  corresponding wait in this spec MUST be updated in the same change.
- **Rationale**: Prevents this feature from silently reintroducing
  flaky/false-positive contrast scans, which would either mask a real
  regression or block merges spuriously.
- **Alternatives considered**: None — this is an existing constraint to
  respect, not a new decision.
