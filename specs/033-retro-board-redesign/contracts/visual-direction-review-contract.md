# Contract: Visual Direction Review

**Enforces**: FR-018 (2-3 explored directions, product-owner sign-off),
SC-006 (perceived-as-modern confirmation). Applies to every `Visual
Direction` record in `data-model.md` before the product owner is asked to
choose one.

## Contract

Before it can be presented to the product owner for review, each candidate
`Visual Direction` MUST satisfy every item below. A direction that fails any
item is not yet reviewable — it goes back for further work, not into the
comparison set.

### Required before review

- [ ] Built via `apple-design`/`emil-design-eng` (the `prototype` skill
      named in Constitution Principle IX / FR-018 is not installed in this
      environment — substituted per the precedent in features 029/031, see
      `research.md` §5) — not a static mockup.
- [ ] Renders as a real, working view against actual board data: card add/
      edit/delete/vote/like/react, drag-and-drop, manual and AI-suggested
      grouping, the facilitator menu (all four tabs), export, and the
      options menu all function — not placeholder content.
- [ ] Visually distinct from every other candidate in the set per
      `data-model.md`'s `distinguishingChoices` field — not a palette-only
      variation of another candidate.
- [ ] `menuPresentationPattern` (per `research.md` §7) keeps every menu and
      control keyboard- and touch-operable, never hover-only, per
      `research.md` §3 (FR-012) — verified, not assumed.
- [ ] Drag-and-drop remains functional and responsive using the existing
      `@dnd-kit` foundation (FR-004, `research.md` §2) — not replaced.
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at common mobile and desktop viewport widths without
      breakage (FR-016), with columns stacking below the responsive
      breakpoint rather than forcing horizontal scroll.
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or
      OS-level `prefers-reduced-motion: reduce`), all content and every
      capability is present and usable with no animation (FR-015).
- [ ] Any dependency beyond framer-motion/@dnd-kit/@floating-ui/Tailwind/CSS
      is listed in `newDependencies` with its Principle III justification.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes, against a seeded board populated at the
   validated scale (30+ cards in at least one column, multiple groups,
   action items, facilitator notes, and simulated concurrent participants)
   so the reachability/density of the redesign is genuinely demonstrated,
   not just a near-empty board.
2. Product owner selects exactly one; the rest are marked `rejected` with a
   one-line `rejectionReason` in `data-model.md`.
3. Record the reviewer as the product owner and the outcome in
   `data-model.md`'s `Visual Direction` table — this is what SC-006's
   "product owner personally reviews... and confirms" is checked against.
4. Only after selection does full implementation (functional-parity
   verification, i18n/token finalization, test updates) proceed against the
   chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in features 029 and 031, sign-off is the
product owner's judgment call, not a data-driven experiment.
