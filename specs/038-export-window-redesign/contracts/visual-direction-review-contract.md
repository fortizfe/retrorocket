# Contract: Visual Direction Review

**Enforces**: FR-013 (2-3 explored directions, product-owner sign-off,
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
      named in Constitution Principle IX / FR-013 is not installed in this
      environment — substituted per the precedent in features
      029/031/033/036, see `research.md` §8) — not a static mockup.
- [ ] Renders as a real, working view against actual board data (via
      `useBoardData`): format selection (PDF/TXT/DOCX), custom title, logo
      toggle, optional content toggles, the always-included-content notice,
      and — for the owner — the facilitator-only zone all function, not
      placeholder content.
- [ ] Demonstrates both required presentations working: the desktop-
      anchored panel (anchored to the "Options" trigger button per FR-002)
      and the mobile bottom sheet (FR-003) — a candidate that only
      addresses one is incomplete.
- [ ] Demonstrates the idle → exporting → success/error state sequence,
      including FR-007a's dismiss-during-export behavior (dismissing does
      not cancel the job; its outcome surfaces via toast if the window is
      closed when it completes).
- [ ] Visually and structurally distinct from every other candidate in the
      set per `data-model.md`'s `distinguishingChoices` field — not a
      palette-only variation of another candidate.
- [ ] Every control remains keyboard- and touch-operable, never hover-only,
      in both presentations (FR-008).
- [ ] The facilitator-only zone's owner-only gating (absent, not disabled,
      for non-owners) is preserved in every candidate (FR-006).
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at common mobile and desktop viewport widths without
      breakage.
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or
      OS-level `prefers-reduced-motion: reduce`), every state and
      transition is present and usable with no animation (FR-011).
- [ ] Any dependency beyond `@floating-ui/react`/`framer-motion`/
      `BottomSheet`/`react-hot-toast`/Tailwind/CSS is listed in
      `newDependencies` with its Principle III justification.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes, at both a mobile and a desktop viewport
   width, against a seeded board with realistic export-relevant state (a
   handful of cards across columns, at least one facilitator note, sentiment
   analysis enabled with results) so the always-included-content notice and
   the facilitator-only zone are genuinely demonstrated, not shown against a
   near-empty board.
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
   verification, i18n/token finalization, test updates, closing the
   export-window accessibility-coverage gap per `research.md` §6) proceed
   against the chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in features 029, 031, 033, and 036, sign-off
is the product owner's judgment call, not a data-driven experiment.
