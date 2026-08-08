# Contract: Visual Direction Review

**Enforces**: FR-010 (2-3 explored directions, product-owner sign-off),
SC-006 (perceived-as-modern confirmation). Applies to every `Visual
Direction` record in `data-model.md` before the product owner is asked to
choose one.

## Contract

Before it can be presented to the product owner for review, each candidate
`Visual Direction` MUST satisfy every item below. A direction that fails any
item is not yet reviewable — it goes back for further work, not into the
comparison set.

### Required before review

- [X] Built via the `prototype` skill (constitution Principle IX / FR-010) — not a static mockup. **Note**: the `prototype` skill is not installed in this environment; `apple-design`/`emil-design-eng` were substituted per explicit user decision recorded 2026-08-08 during `/speckit-implement`.
- [X] Renders as a real, working page: the actual `AuthButtonGroup` and sign-in flow function (Google/GitHub), not placeholder buttons.
- [X] Visually distinct from every other candidate in the set per `data-model.md`'s `distinguishingChoices` field — not a palette-only variation of another candidate.
- [X] Uses only abstract/typographic/motion treatment — no literal product screenshots or device mockups (FR-001).
- [X] Viewable in both light and dark themes without breakage.
- [X] Viewable at common mobile and desktop viewport widths without breakage (FR-006).
- [X] Reduced-motion behavior verified: with `useReducedMotion()` true (or OS-level `prefers-reduced-motion: reduce`), all content is present and usable with no animation (FR-005).
- [X] Any dependency beyond framer-motion/Tailwind/CSS is listed in `newDependencies` with its Principle III justification. All three candidates use zero new dependencies.
- [X] The primary sign-in CTA is reachable without scrolling at common viewport sizes (FR-007) — a directional draft that requires scrolling to reach sign-in does not qualify for review.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes.
2. Product owner selects exactly one; the rest are marked `rejected` with a
   one-line `rejectionReason` in `data-model.md`.
3. Record the reviewer as the product owner and the outcome in
   `data-model.md`'s `Visual Direction` table — this is what SC-006's
   "product owner personally reviews... and confirms" is checked against.
4. Only after selection does full implementation (content-inventory
   finalization, i18n key migration, test updates) proceed against the
   chosen direction.

**Outcome (2026-08-08)**: Product owner (Fernando Ortiz) reviewed all three
directions locally (`npm run dev`, `/dev/landing-directions`) and selected
**Direction B — Editorial Grid**. See `data-model.md`'s `Visual Direction`
catalog for the full record.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the resolved clarification, sign-off is the product owner's judgment
call, not a data-driven experiment.
