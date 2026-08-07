# Contract: Design Audit Finding Log

This is the internal record format every reviewed `UI Surface` MUST produce
an entry in, at `specs/028-apple-design-alignment/design-audit.md`. It is
what SC-001 ("100% of in-scope surfaces have a documented, prioritized
finding") and FR-008 ("record of which skill was used") are checked against.

## Format

One Markdown section per `UI Surface`, one table row per
`Design Audit Finding`, e.g.:

```markdown
## retrospective-board (P1)

States reviewed: default, loading, empty, error

| ID | State | Category | Priority | Disposition | Skill Used | Resolution |
|----|-------|----------|----------|--------------|------------|------------|
| DAF-001 | default | interruptibility | high | remediate-now | animate | Card-add animation now reads live transform on interrupt instead of the target value; see `CardEnter.tsx`. |
| DAF-002 | loading | craft | medium | defer-backlog | find-animation-opportunities | Column skeleton has no shimmer; low traffic surface, deferred. |
| DAF-003 | default | materials-depth | low | already-compliant | apple-design | Facilitator menu translucency already reads correctly against both themes; no change. |
```

## Field rules (MUST)

- `ID` is unique across the entire log, sequential (`DAF-001`, `DAF-002`, …),
  never reused even if a finding is later reversed.
- `Category` MUST be one of the sixteen `rubricCategory` values defined in
  `data-model.md` (the eight `apple-design` design foundations + eight
  motion/craft technique categories).
- `Priority` MUST be one of `high` / `medium` / `low`; every `high` row MUST
  have `Disposition = remediate-now`.
- `Skill Used` MUST be one of the nine mandated skill names from constitution
  Principle IX — never blank, never a skill outside that list.
- A row with `Disposition = remediate-now` MUST be followed, before the
  surface's section is considered closed, by a `Resolution` that names the
  concrete change and, if it touched color/contrast, the passing test run it
  relied on (`functionalRegressionCheck` in `data-model.md`).
- A row with `Disposition = defer-backlog` MUST have a `Resolution` stating
  why it was deferred (low priority, or structural change out of this pass's
  scope per spec Assumptions).

## Conformance criteria

- Every `UI Surface.id` enumerated in `data-model.md` has a matching
  `## <surfaceId>` section in `design-audit.md` before this feature is
  considered complete (SC-001).
- Every `high`-priority row across the whole log has
  `Disposition = remediate-now` (SC-002).
- `grep`-checking the log for `Skill Used` values outside the nine mandated
  names MUST return zero matches (FR-008 traceability).
