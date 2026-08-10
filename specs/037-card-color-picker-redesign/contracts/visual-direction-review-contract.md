# Contract: Visual Direction Review

**Enforces**: FR-014 (2-3 explored directions, product-owner sign-off,
reviewable artifact with captures), SC-006 (perceived-as-clearer-and-faster-
to-scan confirmation). Applies to every `Visual Direction` record in
`data-model.md` before the product owner is asked to choose one.

## Contract

Before it can be presented to the product owner for review, each candidate
`Visual Direction` MUST satisfy every item below. A direction that fails any
item is not yet reviewable — it goes back for further work, not into the
comparison set.

### Required before review

- [ ] Built via `apple-design`/`emil-design-eng` (the `prototype` skill
      named in Constitution Principle IX / FR-014 is not installed in this
      environment — substituted per the precedent in features 029/031/033/
      036, see `plan.md`'s Constitution Check).
- [ ] Renders as a real, working control against actual board data (via
      `useBoardData`): opening the panel, browsing the curated catalog, and
      applying a color all function on a real card — not placeholder
      content.
- [ ] Commits to exactly one `curatedCatalog` (per `data-model.md`'s
      `Visual Direction` entity, `research.md` §3) that includes the
      neutral/default color, and to one `touchTriggerPresentation`
      (`research.md` §2) that does not depend on hover.
- [ ] Visually and structurally distinct from every other candidate in the
      set per `data-model.md`'s `distinguishingChoices` field — not a
      palette-only variation of another candidate, and not an identical
      touch-trigger treatment or catalog across all candidates.
- [ ] The panel and its touch trigger remain keyboard- and touch-operable,
      never hover-only.
- [ ] Edit-rights gating is preserved in every candidate (FR-004): a
      participant without edit rights cannot open or use the panel to
      change a card's color.
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at a touch/narrow viewport and a desktop viewport width
      without breakage.
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or
      OS-level `prefers-reduced-motion: reduce`), the panel and every
      capability remain present and usable with no animation.
- [ ] Any dependency beyond framer-motion/@floating-ui/react/Tailwind is
      listed in `newDependencies` with its Principle III justification.
- [ ] If the candidate's `curatedCatalog` differs from the current 30-color
      set, every removed/renamed color has a proposed
      `Color Catalog Curation Mapping` entry (`data-model.md`) so the
      product owner reviews the remapping consequence alongside the visual
      direction, not as an afterthought.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes, at both a touch/narrow and a desktop
   viewport width, against a seeded board with realistic card state
   (multiple cards already carrying a spread of pre-curation colors, so the
   remapping consequence of each candidate's curated catalog is genuinely
   visible, not shown against a near-empty or all-neutral board).
2. Product owner selects exactly one; the rest are marked `rejected` with a
   one-line `rejectionReason` in `data-model.md`.
3. Record the reviewer as the product owner and the outcome in
   `data-model.md`'s `Visual Direction` table — this is what SC-006 is
   checked against.
4. The product owner's approval of the selected direction also serves as
   their explicit acknowledgment of the `prototype` → `apple-design`/
   `emil-design-eng` tooling substitution (Constitution Principle IX,
   `plan.md`'s Constitution Check) — record this acknowledgment alongside
   the selection, not as a separate step.
5. Only after selection does full implementation (functional-parity
   verification, the finalized `Color Catalog Curation Mapping`, i18n
   wiring, test updates, closing the new touch-viewport accessibility-
   coverage gap) proceed against the chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in features 029, 031, 033, and 036, sign-off
is the product owner's judgment call, not a data-driven experiment.
