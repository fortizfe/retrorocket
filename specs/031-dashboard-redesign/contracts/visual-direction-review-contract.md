# Contract: Visual Direction Review

**Enforces**: FR-021 (2-3 explored directions, product-owner sign-off),
SC-007 (perceived-as-modern confirmation). Applies to every `Visual
Direction` record in `data-model.md` before the product owner is asked to
choose one.

## Contract

Before it can be presented to the product owner for review, each candidate
`Visual Direction` MUST satisfy every item below. A direction that fails any
item is not yet reviewable — it goes back for further work, not into the
comparison set.

### Required before review

- [ ] Built via the `prototype` skill (Constitution Principle IX / FR-021) — not a static mockup.
- [ ] Renders as a real, working view against actual `backendBoardsClient` data: listing, search, filter, sort, create-from-template, join-by-ID, rename, and delete all function — not placeholder content.
- [ ] Visually distinct from every other candidate in the set per `data-model.md`'s `distinguishingChoices` field — not a palette-only variation of another candidate.
- [ ] `reachabilityMechanism` (per `research.md` §3) keeps every board reachable in a seeded list of 200+ boards — verified, not assumed.
- [ ] Rename/delete controls for owned boards are reachable via keyboard and touch, not hover-only, per `research.md` §4 (FR-015) — in every layout the direction offers.
- [ ] Board dates render in the active `i18next` language, not a fixed locale (FR-016).
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at common mobile and desktop viewport widths without breakage (FR-020).
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or OS-level `prefers-reduced-motion: reduce`), all content and every capability is present and usable with no animation (FR-019).
- [ ] Any dependency beyond framer-motion/Tailwind/CSS is listed in `newDependencies` with its Principle III justification.

### Review procedure

1. Present all qualifying candidates (2-3) to the product owner together,
   side by side, in both themes, with a seeded board list large enough to
   demonstrate the reachability mechanism (200+ boards).
2. Product owner selects exactly one; the rest are marked `rejected` with a
   one-line `rejectionReason` in `data-model.md`.
3. Record the reviewer as the product owner and the outcome in
   `data-model.md`'s `Visual Direction` table — this is what SC-007's
   "product owner personally reviews... and confirms" is checked against.
4. Only after selection does full implementation (functional-parity
   verification, i18n/token finalization, test updates) proceed against the
   chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in feature 029, sign-off is the product
owner's judgment call, not a data-driven experiment.
