# Contract: Visual Direction Review

**Enforces**: FR-015 (2-3 explored directions, product-owner sign-off,
reviewable artifact with captures), SC-006 (perceived-as-clearer-and-more-
modern confirmation). Applies to every `Visual Direction` record in
`data-model.md` before the product owner is asked to choose one.

## Contract

Before it can be presented to the product owner for review, each candidate
`Visual Direction` MUST satisfy every item below. A direction that fails any
item is not yet reviewable — it goes back for further work, not into the
comparison set.

### Required before review

- [ ] Built via `apple-design`/`emil-design-eng` (the `prototype` skill
      named in Constitution Principle IX / FR-015 is not installed in this
      environment — substituted per the precedent in features 029/031/033,
      see `research.md` §5) — not a static mockup.
- [ ] Renders as a real, working view against actual board data (via
      `useBoardData`): the options menu's export/copy-ID/share/exit and the
      facilitator menu's all four tabs (controls/timer, sentiment, team
      mood, notes) all function — not placeholder content.
- [ ] Commits to exactly one `mobileEntryPointPattern` (per
      `research.md` §2 / `data-model.md`'s `Visual Direction` entity) and
      demonstrates it working at a mobile viewport width — a candidate that
      only addresses the desktop/tablet presentation is incomplete.
- [ ] Visually and structurally distinct from every other candidate in the
      set per `data-model.md`'s `distinguishingChoices` field — not a
      palette-only variation of another candidate, and not identical
      mobile-entry-point pattern choices across all candidates.
- [ ] Every menu, tab, and control remains keyboard- and touch-operable,
      never hover-only, in both the desktop/tablet and mobile presentations
      (FR-009) — verified, not assumed.
- [ ] The facilitator menu's owner-only gating (absent, not disabled, for
      non-owners) is preserved in every candidate (FR-003).
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at common mobile and desktop viewport widths without
      breakage (FR-013).
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or
      OS-level `prefers-reduced-motion: reduce`), all content and every
      capability is present and usable with no animation (FR-012).
- [ ] Any dependency beyond framer-motion/@floating-ui/react/Tailwind/CSS is
      listed in `newDependencies` with its Principle III justification.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes, at both a mobile and a desktop viewport
   width, against a seeded board with realistic facilitator state (an
   active timer, sentiment analysis enabled with results, at least one
   facilitator note) so the redesign is genuinely demonstrated, not shown
   against a near-empty board.
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
   verification, i18n/token finalization, test updates, closing the new
   mobile-viewport accessibility-coverage gap per `research.md` §6) proceed
   against the chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in features 029, 031, and 033, sign-off is
the product owner's judgment call, not a data-driven experiment.
