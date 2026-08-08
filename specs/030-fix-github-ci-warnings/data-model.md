# Data Model: Eliminate GitHub CI/CD and Lint Warnings

This feature has no persistent/business data model — it modifies CI configuration and source code. The "entities" below are the configuration/quality artifacts the requirements operate on (per spec Key Entities), captured here as concrete, traceable records so `/speckit-tasks` can enumerate exact edits without re-deriving them.

## Job display name → job id

`spec.md` refers to jobs by their GitHub-displayed `name:` (what shows in the Actions UI and in the pasted warnings); this file and `tasks.md` refer to them by their YAML job id (the `uses:`-adjacent key in `ci.yml`, needed to locate edits). Mapping:

| Display name (spec.md) | Job id (`ci.yml`, this file, tasks.md) |
|---|---|
| CodeQL Analysis | `analyze` |
| Type-check, lint, and test with coverage | `checks` |
| Playwright E2E (Firebase Emulator Suite) | `e2e` |
| Deploy Preview | `deploy-preview` |
| Sync Firebase preview domain | `sync-preview-domain` |
| Remove Firebase preview domain | `cleanup-preview-domain` |
| Clean up orphaned Firebase preview domains | `cleanup-orphan-preview-domains` |
| Deploy Production | `deploy-production` |
| Automated Semantic Versioning | `version` |

## Entity: Workflow Action Reference

Represents one `uses:` reference to a flagged action inside `.github/workflows/ci.yml`.

| Field | Description |
|---|---|
| `job` | The workflow job the reference appears in (e.g. `analyze`, `checks`) |
| `action` | Action name (e.g. `actions/checkout`) |
| `current_version` | Version currently pinned |
| `target_version` | Version to pin per `research.md` §1 |

### Records (FR-001, FR-002, FR-003)

| Job | Action | Current | Target |
|---|---|---|---|
| `analyze` | `actions/checkout` | `v4` | `v5` |
| `analyze` | `github/codeql-action/init` | `v3` | `v4` |
| `analyze` | `github/codeql-action/analyze` | `v3` | `v4` |
| `checks` | `actions/checkout` | `v4` | `v5` |
| `checks` | `actions/setup-node` | `v4` | `v5` |
| `e2e` | `actions/checkout` | `v4` | `v5` |
| `e2e` | `actions/setup-node` | `v4` | `v5` |
| `e2e` | `actions/setup-java` | `v4` | `v5` |
| `deploy-preview` | `actions/checkout` | `v4` | `v5` |
| `deploy-preview` | `actions/setup-node` | `v4` | `v5` |
| `sync-preview-domain` | `actions/checkout` | `v4` | `v5` |
| `sync-preview-domain` | `actions/setup-node` | `v4` | `v5` |
| `cleanup-preview-domain` | `actions/checkout` | `v4` | `v5` |
| `cleanup-preview-domain` | `actions/setup-node` | `v4` | `v5` (conditional step, `if: steps.restore.outputs.cache-hit == 'true'`) |
| `cleanup-orphan-preview-domains` | `actions/checkout` | `v4` | `v5` |
| `cleanup-orphan-preview-domains` | `actions/setup-node` | `v4` | `v5` |
| `deploy-production` | `actions/checkout` | `v4` | `v5` |
| `deploy-production` | `actions/setup-node` | `v4` | `v5` |
| `version` | `actions/checkout` | `v4` | `v5` |
| `version` | `actions/setup-node` | `v4` | `v5` |

Out of scope (not named in reported warnings, per `research.md` §1 rationale): `actions/cache/restore@v4`, `actions/cache/save@v4`, `google-github-actions/auth@v2`, `marocchino/sticky-pull-request-comment@v3.0.5`.

## Entity: Lint Warning

Represents one ESLint finding to eliminate.

| Field | Description |
|---|---|
| `file` | Source file, repo-relative to `retro-rocket/` |
| `line` | Line number at time of spec creation (2026-08-08) |
| `rule` | Violated ESLint rule (inferred from message) |
| `symbol` | The unused/misconfigured identifier |
| `fix` | Fix approach, per `research.md` |
| `risk` | Behavior-equivalence risk level from `research.md` summary |

### Records (FR-005–FR-011)

| File | Line | Rule | Symbol | Fix | Risk |
|---|---|---|---|---|---|
| `src/features/boards/export/services/docxExportService.ts` | 12 | `@typescript-eslint/no-unused-vars` | `Table` | Delete import | None |
| `src/features/boards/export/services/docxExportService.ts` | 13 | `@typescript-eslint/no-unused-vars` | `TableRow` | Delete import | None |
| `src/features/boards/export/services/docxExportService.ts` | 14 | `@typescript-eslint/no-unused-vars` | `TableCell` | Delete import | None |
| `src/features/boards/export/services/docxExportService.ts` | 15 | `@typescript-eslint/no-unused-vars` | `BorderStyle` | Delete import | None |
| `src/features/boards/clustering/hooks/useColumnGrouping.ts` | 139 | `@typescript-eslint/no-unused-vars` | `removed` | Rename to `_removed` | None |
| `src/features/boards/clustering/components/GroupableColumn.tsx` | 300 | `jsx-a11y/no-autofocus` | `autoFocus` | Replace with ref-based focus in `useEffect` gated on `isCreating` | Low |
| `src/features/boards/clustering/components/GroupableColumn.tsx` | 107 | `react-hooks/exhaustive-deps` | `columnState.criteria` | Remove from `useMemo` deps (proven redundant, see research §5) | None |
| `src/features/boards/clustering/components/GroupCard.tsx` | 32 | `@typescript-eslint/no-unused-vars` | `onCardDelete` | Remove from props interface, destructuring, and the one dead call site in `GroupableColumn.tsx` (the `<GroupCard>` pass-through only — NOT the `<GroupedCardList>` one) | Medium (must not touch the live `GroupedCardList` pass-through) |
| `src/features/auth/hooks/useLinkedProviders.ts` | 45 | `react-hooks/exhaustive-deps` | `refreshLinkedProviders` | Wrap `refreshLinkedProviders` in `useCallback([user?.email, userProfile?.providers])`, then add to effect deps | High (naive fix causes a fetch loop; requires a preceding unit test per Constitution Principle I) |
| `src/features/auth/components/AuthButtonGroup.tsx` | 35 | `@typescript-eslint/no-unused-vars` | `providerId` | Remove parameter from `getProviderStyles`; update call site | None |

## State / lifecycle

Not applicable — these are one-time corrective edits, not entities with ongoing state transitions. The "before/after" state for each record above is captured entirely by its `current_version`/`target_version` or `fix` column.
