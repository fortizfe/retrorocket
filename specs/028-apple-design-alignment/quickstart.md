# Quickstart: Validating the Apple-Inspired Design Alignment

This is a validation guide, not an implementation guide — it proves the
feature works end-to-end once implemented. See `data-model.md` for entity
shapes and `contracts/` for the exact conformance rules referenced below.

## Prerequisites

- Repo checked out on branch `028-apple-design-alignment`, dependencies
  installed (`npm install` in `retro-rocket/`).
- Firebase emulators available for E2E (`npm run emulators` /
  `firebase emulators:exec`), as already required by the existing E2E suite.

## 1. Confirm zero functional regression (FR-004 / FR-010 / SC-003)

```sh
cd retro-rocket
npm run type-check
npm run lint
npm run test:coverage        # unchanged behavior, coverage not below 78/64/50/50
npm run e2e                  # every pre-existing e2e/*.spec.ts still passes
```

**Expected outcome**: all four commands exit 0 with no new failures compared
to the pre-feature baseline; coverage thresholds in `vitest.config.ts` are
still met.

## 2. Confirm the audit trail covers every in-scope surface (SC-001)

```sh
grep -c '^## ' specs/028-apple-design-alignment/design-audit.md
```

**Expected outcome**: the count matches the number of `UI Surface` entries
enumerated in `data-model.md` / the spec's Assumptions surface list — every
surface has a section, per `contracts/design-audit-finding-schema.md`.

## 3. Confirm every high-priority finding was remediated (SC-002)

```sh
grep -E '\| *high *\|' specs/028-apple-design-alignment/design-audit.md \
  | grep -v 'remediate-now'
```

**Expected outcome**: no output — every `high`-priority row has
`Disposition = remediate-now`.

## 4. Confirm accessibility held after any token/typography change (SC-004, Constitution VIII)

```sh
npm run test:run -- contrast.tokens.test.ts contrast.focus.test.ts
npm run e2e -- accessibility.spec.ts
```

**Expected outcome**: both suites pass in both themes — zero new WCAG 2.1 AA
violations, per `contracts/design-tokens-v2.md`.

## 5. Confirm reduced motion is honored (FR-006 / SC-005)

Manual check (no OS-level reduced-motion E2E harness exists yet — add one if
the audit introduces reduced-motion-specific assertions):

1. In Chrome/Firefox DevTools, enable **Emulate CSS media feature
   `prefers-reduced-motion: reduce`**.
2. Run through the P1 core flow: create a board, add a card, vote, group
   cards, use facilitator controls.
3. **Expected outcome**: every interaction still completes and its result is
   visible immediately (card appears/moves/groups), with framer-motion
   animations suppressed via the root `<MotionConfig reducedMotion="user">`
   and any plain-CSS motion suppressed via its surface's
   `@media (prefers-reduced-motion: reduce)` override (see `research.md`
   R2).

## 6. Confirm every design/motion decision is skill-attributed (FR-008)

```sh
awk -F'|' '/^\| DAF-/{gsub(/^[ \t]+|[ \t]+$/, "", $7); print $7}' \
  specs/028-apple-design-alignment/design-audit.md | sort -u
```

(Extracts the `Skill Used` column by position — it is the table's 6th column,
not its last, since `Resolution` trails it per
`contracts/design-audit-finding-schema.md`.)

**Expected outcome**: every value listed is one of the nine mandated skill
names (`apple-design`, `emil-design-eng`, `animate`, `review-animations`,
`improve-animations`, `find-animation-opportunities`, `prototype`,
`animation-vocabulary`, `pick-ui-library`) — no blank or foreign values.

## 7. Spot-check the P1 core experience visually

```sh
npm run dev
```

Open the app, create a board, and walk the P1 acceptance scenarios from
`spec.md` User Story 1 in both light and dark theme. Confirm the redesigned
presentation is visible and every pre-existing capability (create,
add/edit/delete card, vote, group, drag-and-drop reorder, facilitator
controls, real-time sync) still works exactly as before.
