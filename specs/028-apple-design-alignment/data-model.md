# Phase 1 Data Model: Apple-Inspired Design Alignment

This feature is presentational; its "entities" are audit/documentation
constructs and design-system constructs, not new persisted domain records.
No Firestore schema changes.

## Entity: UI Surface

A distinct, independently reviewable unit of the product in scope for audit
and potential presentation-only remediation.

| Field | Description |
|-------|-------------|
| `id` | Stable slug, e.g. `retrospective-board`, `facilitator-controls`, `dashboard-board-list`, `landing`, `auth-sign-in`, `profile`, `ui-button`, `ui-modal`. |
| `priorityGroup` | `P1` (core retrospective board), `P2` (landing/auth/dashboard), `P3` (profile/settings + shared component library) — matches the spec's user stories. |
| `states` | The set of presentation states reviewed for this surface: `default`, `loading`, `empty`, `error` (per spec Clarification 2). Not every surface has all four (e.g. a static landing section has no `loading` state) — `states` lists only the ones that actually apply. |
| `codeLocations` | Source paths this surface maps to (e.g. `src/features/boards/retrospective/**`), for traceability from a finding back to implementation. |

**Validation rules**:
- Every `UI Surface` MUST belong to exactly one `priorityGroup`.
- `states` MUST be non-empty (every surface has at least a `default` state).
- The union of all `UI Surface.id` values MUST cover every item listed in
  `spec.md`'s Assumptions surface list — this is what SC-001 measures.

### Catalog (authoritative list)

This is the complete, authoritative enumeration of `UI Surface` records for
this feature — the single source `tasks.md` T002 (audit-log skeleton) and
T054 (SC-001 conformance check) MUST reconcile against, so the surface list
never depends on any one document's headings alone.

| `id` | `priorityGroup` | `states` | `codeLocations` |
|---|---|---|---|
| `retrospective-board` | P1 | default, loading, empty, error | `src/features/boards/retrospective/**`, `src/pages/RetrospectivePage.tsx` |
| `clustering` | P1 | default, loading, empty, error | `src/features/boards/clustering/**` |
| `facilitator-controls-countdown` | P1 | default, loading, empty, error | `src/features/boards/facilitator/**`, `src/features/boards/countdown/**` |
| `participants` | P1 | default, loading, empty, error | `src/features/boards/participants/**` |
| `export` | P1 | default, loading, error | `src/features/boards/export/**` |
| `landing` | P2 | default, loading | `src/pages/Landing.tsx` |
| `auth-sign-in` | P2 | default, loading, error | `src/features/auth/components/**` |
| `dashboard-board-list` | P2 | default, loading, empty, error | `src/pages/Dashboard.tsx`, `src/features/dashboard/components/**` |
| `profile` | P3 | default, loading, error | `src/pages/Profile.tsx` |
| `ui-kit-buttons-inputs` | P3 | default | `src/lib/components/ui/{Button,Input,Textarea,TextareaWithEmoji}.tsx` |
| `ui-kit-overlays` | P3 | default | `src/lib/components/ui/{Modal,Portal,LanguageMenuList,ThemeMenuToggle}.tsx` |
| `ui-kit-pickers` | P3 | default | `src/lib/components/ui/{DatePicker,EmojiPicker,ColorPicker}.tsx` |
| `ui-kit-feedback` | P3 | default, loading | `src/lib/components/ui/{Loading,Skeleton,TypingPreview}.tsx` |
| `ui-kit-misc` | P3 | default | `src/lib/components/ui/{Card,ControlCard,SettingsRow,LinkifyText,ThemeToggle,LanguageSelector}.tsx` |

All paths are relative to `retro-rocket/`. 14 surfaces total — this is the
count SC-001's "100% of in-scope surfaces" and `tasks.md` T002/T054 measure
against.

## Entity: Design Audit Finding

A single documented observation produced while reviewing one `UI Surface`
(or one of its states) against the Apple-inspired design/motion rubric.

| Field | Description |
|-------|-------------|
| `id` | Stable identifier, e.g. `DAF-001`. |
| `surfaceId` | The `UI Surface.id` this finding is about. |
| `state` | Which state of the surface this finding concerns (`default`/`loading`/`empty`/`error`). |
| `rubricCategory` | One of the fixed categories from `research.md` R1: `purpose`, `agency`, `responsibility`, `familiarity`, `flexibility`, `simplicity`, `craft`, `delight`, `response`, `direct-manipulation`, `interruptibility`, `motion-behavior`, `spatial-consistency`, `materials-depth`, `typography`, `reduced-motion`. |
| `observation` | What was found — the specific gap or confirmation of alignment. |
| `priority` | `high`, `medium`, or `low`, assigned per the documented rubric (FR-009); `high` MUST be remediated in this initiative, `medium`/`low` MAY be deferred. |
| `disposition` | `remediate-now`, `defer-backlog`, or `already-compliant` (per Edge Case: a surface found already aligned is still recorded, unchanged). |
| `skillUsed` | Which mandated skill (per constitution Principle IX / FR-008) produced this finding or its remediation decision: `apple-design`, `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `find-animation-opportunities`, `prototype`, `animation-vocabulary`, or `pick-ui-library`. |
| `resolution` | Free-text summary of the presentation-only change made (or "no change — already compliant" / "deferred — see backlog note"). |
| `functionalRegressionCheck` | Reference to the test(s) confirming no behavior change for this surface after remediation (e.g. an existing E2E spec name), satisfying FR-004/FR-010. |

**Validation rules**:
- `priority = high` MUST have `disposition != defer-backlog`.
- `disposition = already-compliant` MUST have `resolution` stating no change
  was made (Edge Case: reviewed-and-compliant surfaces are recorded, not
  silently skipped).
- Every finding whose `resolution` changes a color, typography, or spacing
  value that could affect contrast MUST reference the passing
  `contrast.tokens.test.ts` / `e2e/accessibility.spec.ts` run in
  `functionalRegressionCheck` (Constitution Principle VIII gate).
- `skillUsed` MUST be one of the nine mandated skill names — no ad hoc
  design judgment recorded without an attributed skill (FR-008).

## Entity: Design Token (extension of the existing Semantic Color Token)

Reuses the entity defined in `specs/009-wcag-theme-compliance/data-model.md`
(`name`, `lightValue`, `darkValue`, `role`, `pairedWith`, `minContrast`). This
feature does not redefine that entity's shape — it may add new token
*names* (if the audit calls for expanding the palette or introducing new
roles, e.g. a materials/elevation token) or change existing token *values*,
per spec Clarification 1. Every addition or change MUST still satisfy the
same `CONTRAST_PAIRINGS` validation rules already defined there.

**Additional validation rule for this feature**: A `Design Audit Finding`
that proposes a token value or catalog change MUST NOT be marked
`disposition: remediate-now` until the corresponding `contrast.tokens.test.ts`
update passes — tests precede the change (Constitution Principle I).

## State Model: Reduced Motion Preference (new, formalized)

Not a persisted entity — a runtime signal, newly wired end-to-end by this
feature (see `research.md` R2).

| State | Meaning | Handling |
|-------|---------|----------|
| `no-preference` | User has not requested reduced motion. | Full motion per the redesigned surface's spec. |
| `reduce` | `prefers-reduced-motion: reduce` is set. | framer-motion-driven motion is suppressed automatically via root `<MotionConfig reducedMotion="user">`; plain-CSS motion on a given surface is suppressed via that surface's own `@media (prefers-reduced-motion: reduce)` override, added as part of remediating that surface's `reduced-motion` findings. |

**Validation rule**: Every `Design Audit Finding` with
`rubricCategory: reduced-motion` and `disposition: remediate-now` MUST result
in the affected interaction still conveying its outcome under `reduce`
(FR-006 / SC-005) — verified by a unit or E2E test asserting the end state is
reached without relying on the suppressed motion.
