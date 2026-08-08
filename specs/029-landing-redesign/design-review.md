# Design Review: Landing Page Redesign (Direction B — Editorial Grid)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Skills used**: `apple-design`, `emil-design-eng` (general redesign), `animate`
(motion decisions), `review-animations` (this critique pass). `prototype` was
not available in this environment — substituted per user decision, recorded
in `data-model.md`.
**Scope**: `retro-rocket/src/pages/Landing.tsx` (hero, capabilities,
how-it-works, trust-signals, closing/footer, first-time profile-setup view).
**Date**: 2026-08-08

Reviewed against Apple's 8 design principles (Purpose, Agency,
Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight) and
the motion/craft checklist from the `apple-design` skill. Findings use the
same format as feature 028's `design-audit.md`.

| ID | Category | Priority | Disposition | Resolution |
|----|----------|----------|--------------|------------|
| DR-001 | Craft (WCAG contrast) | high | remediate-now | `text-action` (certified `nonText` ≥3:1 only, per `tokens.ts` `CONTRAST_PAIRINGS`) was applied to the how-it-works step-number text ("01"/"02"/"03"), which needs ≥4.5:1 as real text — a genuine WCAG 2.1 AA violation caught by `e2e/accessibility.spec.ts` (dark theme, 3.01:1 measured). Fixed during T029: `text-action` stays on the `ArrowRight` icon only (non-text, already-certified pairing); the number now uses `text-text-secondary` (certified `text` pairing). Re-verified: `accessibility.spec.ts -g 'Landing has no'` 2/2 passing. |
| DR-002 | Flexibility | medium | remediate-now | The hero's 12-column split (`grid-cols-12`, headline+CTA in 7 cols, decorative mark in 5) activated at Tailwind's `md` (768px) — a common tablet-portrait width — which would compress the `text-6xl` headline into a ~420px column. Raised the split's breakpoint from `md:` to `lg:` (1024px) so tablet portrait/landscape stays single-column (full-width, more breathing room) and only genuinely wide viewports get the split layout. |
| DR-003 | Familiarity, Craft | — | already-compliant | `ThemeToggle` position (fixed top-right) is unchanged from the pre-redesign page, and is now also present on the first-time profile-setup branch (previously missing — an incidental fix alongside T032, not a regression). |
| DR-004 | Purpose, Simplicity | — | already-compliant | The redesigned page keeps exactly the informational content the prior version had (per `content-inventory-contract.md`'s 6/6 sign-off), consolidated into fewer, denser sections (7 → 5) rather than expanded — no speculative additions (no pricing/testimonials were added, consistent with the resolved FR-001a latitude being used conservatively). |
| DR-005 | Craft (motion) | — | already-compliant | Hero uses mount-time `initial`/`animate` (not `whileInView`) since it's always in the initial viewport — avoiding the exact "content animates before scroll" bug feature 028 fixed elsewhere (DAF-023). Below-the-fold sections use `whileInView` with `once: true, margin: '-100px'`, matching that same established pattern. Stagger delays are capped (`Math.min(i * 0.05, 0.25)` / `Math.min(i * 0.06, 0.24)`), within the 30-80ms/item range 028 established (DAF-026). |
| DR-006 | Craft (reduced motion) | — | already-compliant | All `motion.*` elements are covered automatically by the app-root `MotionConfig reducedMotion="user"` (framer-motion-driven); no raw CSS `@keyframes`/animation was introduced by this redesign, so no manual `useReducedMotion()` gating was needed (unlike Direction A's rejected ambient-gradient prototype, which did need it). |
| DR-007 | Craft (typography) | — | already-compliant | Large headings use negative tracking (`tracking-[-0.02em]` hero, `tracking-[-0.01em]` section H2s) per the optical-sizing guidance; body text stays at default tracking. Tight leading on the hero (`leading-[1.08]`), relaxed leading on body copy (`leading-relaxed`). |
| DR-008 | Materials & depth | — | already-compliant | Direction B deliberately uses flat hairline dividers instead of translucent materials/glass (a directional choice the product owner approved over Direction C's materials-forward approach) — no floating chrome/overlay exists on this static page that would call for `backdrop-filter`, so this is consistent rather than a gap. |

## Post-review follow-up: DR-009 (product-owner live review, 2026-08-08)

| ID | Category | Priority | Disposition | Resolution |
|----|----------|----------|--------------|------------|
| DR-009 | Purpose, Craft | high | remediate-now | After running the app live (`npm run dev`), the product owner flagged the hero's 4-cell "abstract grid mark" as reading like unfinished/empty placeholder blocks rather than an intentional design choice — a legitimate live-review catch this static review missed (empty decoration doesn't "earn its place," Craft principle). Replaced with a real quick-glance teaser: each cell now shows one of 4 capabilities (Real-time Collaboration, Card System, Smart Grouping, Export — reusing the existing `landing.capabilities.items.*.title` keys, no new i18n content) with its icon, still abstract/no product screenshots (FR-001). Semantics changed from a decorative `aria-hidden` `div` grid to a real `<ul>`/`<li>` list since it now carries information. |

## Summary

9 findings recorded — 3 remediated (1 high: WCAG contrast; 1 medium: tablet
flexibility; 1 high: empty-looking hero decoration caught in live review),
6 already-compliant. **Zero unresolved high-priority findings** (SC-005).

`functionalRegressionCheck`: `npm run type-check` clean; `npx eslint
src/pages/Landing.tsx` clean; `Landing.test.tsx` 15/15 passing after DR-009
(14/14 through DR-001/DR-002); `e2e/accessibility.spec.ts -g 'Landing has
no'` 2/2 passing (light + dark) after each fix; full `authentication.spec.ts`
+ `accessibility.spec.ts` 22/22 passing after DR-002; full suite 158
files/2382 tests passing after DR-009.
