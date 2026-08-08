# Quickstart: Validating the Warning Fixes

Prerequisites: repo checked out on this feature's branch, `npm ci` run inside `retro-rocket/`, Firebase CLI available for the E2E step (already a project prerequisite).

## 1. Validate the code-level fixes (spec `FR-005`–`FR-013`)

Run from `retro-rocket/`:

```bash
npm run lint                 # expect: 0 warnings, 0 errors (spec SC-002, FR-012)
npm run type-check           # expect: pass, unchanged (frontend)
npm run type-check:server    # expect: pass, unchanged (backend)
npm run test:coverage        # expect: pass, coverage thresholds maintained (Constitution VI)
npm run test:server:coverage # expect: pass, unchanged
```

Targeted checks for the higher-risk fixes identified in `research.md`:

```bash
# useLinkedProviders: run/extend its new unit test (data-model.md record: useLinkedProviders.ts:45)
npx vitest run --config vitest.config.ts src/test/features/auth -t "useLinkedProviders"

# GroupCard / GroupableColumn: confirm grouped-card delete still means "remove from group",
# and ungrouped-card delete (via GroupedCardList) still performs a real delete
npx vitest run --config vitest.config.ts src/test/features/boards/clustering
```

## 2. Validate the E2E suite (spec `FR-004`, `SC-004`)

```bash
npm run e2e   # runs Playwright against the Firebase Emulator Suite; expect full pass
```

Confirms the `setup-java`/`setup-node`/`checkout` version bumps in the `e2e` job don't change emulator or browser-automation behavior.

## 3. Validate the workflow YAML itself

No `actionlint`/YAML linter is currently wired into this repo's toolchain, so validate by inspection plus a real CI run:

1. Diff `.github/workflows/ci.yml` against `data-model.md`'s "Workflow Action Reference" table — confirm every listed job/action pair was bumped to its target version and nothing else changed.
2. Push the branch / open a PR. In the resulting Actions run, confirm for each job listed in spec Acceptance Scenario 4 (`analyze`, `checks`, `e2e`, `deploy-preview` if a PR, `sync-preview-domain` if a PR, `deploy-production` if a push to `main`, `version` if a push to `main`):
   - The job's run summary shows **zero** deprecation annotations (spec `SC-001`).
   - The job's pass/fail outcome matches its outcome before this change (spec `FR-004`).

## 4. Manual accessibility spot-check (Constitution Principle VIII)

Since no automated a11y audit runs in this repo's CI yet, verify by hand per the constitution's human-review fallback:

1. Open a board, click "Add" on any groupable column.
2. Confirm the new-card textarea receives focus automatically (same as before the fix) and a visible focus indicator is present, in both light and dark themes.

## Expected end state

- `npm run lint` reports 0 warnings (down from 10).
- A fresh Actions run reports 0 deprecation annotations (down from 7).
- All existing automated tests still pass; the new `useLinkedProviders` test passes.
- Grouped-card delete still means "remove from group"; ungrouped-card delete still permanently deletes.
