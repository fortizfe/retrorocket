# Contract: Visual Direction Review

**Enforces**: FR-015 (2-3 explored directions, product-owner sign-off via a
single comparison artifact), SC-004 (design-review closure), SC-005
(product-owner selection recorded). Applies to every `Visual Direction`
record in `data-model.md` before the product owner is asked to choose one,
and to the `Product Owner Decision Artifact` presented for that choice.

## Contract

### Required before review (per candidate `Visual Direction`)

- [ ] Built via `apple-design`/`emil-design-eng` (substituting for the uninstalled `prototype` skill, per `research.md` §5 and the constitution's Governance clause) — not a static mockup.
- [ ] Renders as a real, working view against actual `backendProfileClient`/`useLinkedProviders`/`connectedAppsService` data: viewing profile data, editing/saving the display name, signing out (safe to stub the final redirect in a dev-only harness, but the request/feedback cycle must be real), viewing/linking providers, and viewing/revoking connected apps all function — not placeholder content.
- [ ] Visually distinct from every other candidate in the set per `data-model.md`'s `distinguishingChoices` field — not a palette-only variation of another candidate.
- [ ] The disabled "Exportar mis datos"/"Eliminar cuenta" placeholders are present with correct accessible disabled-state semantics (FR-007) in every candidate.
- [ ] Viewable in both light and dark themes without breakage.
- [ ] Viewable at common mobile and desktop viewport widths without breakage (FR-014).
- [ ] Reduced-motion behavior verified: with `useReducedMotion()` true (or OS-level `prefers-reduced-motion: reduce`), all content and every capability is present and usable with no animation (FR-013).
- [ ] The shared `UserProfileForm` used in this candidate still renders correctly when exercised in `isFirstTime` mode (even if only spot-checked outside the main comparison route), confirming the direction doesn't implicitly assume Mi Perfil-only context.
- [ ] Any dependency beyond framer-motion/Tailwind/CSS is listed in `newDependencies` with its Principle III justification.

### Required for the Product Owner Decision Artifact

- [ ] Compares all qualifying candidates (2-3) side by side in a single, self-contained, published page.
- [ ] Includes each candidate's `concept`, `distinguishingChoices`, and representative views of its loaded/error/saving states.
- [ ] Is presented in a form the product owner can review independently of any locally running dev server (this is what distinguishes it from the live candidate routes alone).

### Review procedure

1. Confirm every qualifying candidate satisfies its "required before
   review" checklist above.
2. Produce the `Product Owner Decision Artifact` comparing them.
3. Present the artifact to the product owner (Fernando Ortiz) for review.
4. Product owner selects exactly one; the rest are marked `rejected` with a
   one-line `rejectionReason` in `data-model.md`.
5. Record the reviewer as the product owner, the outcome, and the
   `toolingAcknowledgment` (skill-substitution acknowledgment) in
   `data-model.md`'s `Visual Direction` and `Product Owner Decision
   Artifact` entries — this is what SC-005 is checked against.
6. Only after selection does full implementation (functional-parity
   verification, i18n/token finalization, test updates) proceed against the
   chosen direction.

## Non-goals

This contract does not require formal end-user testing or A/B analytics —
per the precedent established in features 029/031/033, sign-off is the
product owner's judgment call, not a data-driven experiment.
