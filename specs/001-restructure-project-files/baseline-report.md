# Baseline Report

Captured 2026-07-21, before any reorganization changes (T001).

## type-check

`npm run type-check` — **PASS**, 0 errors.

## lint

`npm run lint` — **fails to run**: `sh: eslint: command not found`. ESLint is referenced in `package.json`'s `lint` script but is not actually listed as a dependency anywhere (`package.json`, `package-lock.json`) and is not installed in `node_modules`. This is a **pre-existing gap unrelated to this feature** — lint was already non-functional before this reorganization began. Not in scope to fix here; noted for a separate backlog item. "Zero lint errors introduced" is trivially true since lint cannot run at all, before or after.

## build

`npm run build` — **PASS**. Produces a working `dist/` bundle. One pre-existing warning (chunk size >1000kB for `export-pdf` and a few others) — not an error, unrelated to file structure.

## test:coverage

`npm run test:coverage` — ran twice back-to-back to check determinism:

| Run | Test files | Tests |
|---|---|---|
| 1 | 130 passed, 2 failed (132) | 2414 passed, 23 failed (2437) |
| 2 | 128 passed, 4 failed (132) | 2411 passed, 26 failed (2437) |

The suite has **pre-existing flakiness**, unrelated to this feature:
- `src/test/hooks/useJoinRetrospective.test.ts` and `src/test/pages/RetrospectivePage.test.tsx` fail deterministically both runs with `TypeError: Cannot read properties of undefined (reading 'clear')` at `localStorage.clear()` — an environment/setup issue (jsdom `localStorage` polyfill), not something either run's code touches.
- `src/test/components/forms/CreateCardForm.test.tsx` failed intermittently (timing-sensitive: a 5000ms timeout and a race-condition assertion) — flaky, not deterministic.

**Coverage percentage table**: not emitted by `vitest --coverage` in this environment/invocation (no `coverage/` directory or summary produced in either run) — a pre-existing tooling quirk, confirmed present before any reorganization changes. Pass/fail counts above are the reliable baseline signal.

## Baseline summary for comparison after implementation

- type-check: 0 errors (must stay 0)
- build: succeeds (must keep succeeding)
- tests: ~2411–2414 passing / ~23–26 failing, all failures confined to `useJoinRetrospective.test.ts`, `RetrospectivePage.test.tsx` (localStorage), and intermittently `CreateCardForm.test.tsx` (flaky timing) — post-migration, the same set of pre-existing failures (now at their new file locations) is acceptable; any *new* failing test outside this set is a regression to investigate.

## Post-migration comparison (T030)

Captured 2026-07-21, after the full reorganization (all 31 tasks complete).

| Check | Baseline | Post-migration | Verdict |
|---|---|---|---|
| type-check | 0 errors | 0 errors | ✅ match |
| build | succeeds | succeeds, identical chunk hashes for unaffected modules | ✅ match |
| lint | fails to run (pre-existing, no eslint installed) | fails to run, same reason | ✅ match (pre-existing gap, unchanged) |
| test files | 130 passed / 2 failed (132) [best baseline run] | 130 passed / 2 failed (132) | ✅ exact match |
| tests | 2414 passed / 23 failed (2437) | 2414 passed / 23 failed (2437) | ✅ exact match |
| failing tests | `useJoinRetrospective.test.ts`, `RetrospectivePage.test.tsx` (localStorage.clear() undefined) | same two files (now at `src/test/features/boards/retrospective/` and `src/test/pages/`) | ✅ same pre-existing failures, same root cause |

**Verdict**: Zero regressions. The post-migration run reproduces the baseline's best-case result exactly — same pass count, same fail count, same two pre-existing failing files for the same pre-existing reason (an unrelated jsdom `localStorage` polyfill issue, not something either this feature or the moved code touches).

### Issues found and fixed during migration (all resolved, none outstanding)

1. **`tsconfig.json` stale exclude pattern**: `"src/services/*.test.*"` (a targeted exclude for two legacy Jest-syntax files, `cardService.test.new.ts`/`cardService.test.old.ts`) didn't follow those files to their new location and caused 100+ spurious type-check errors. Fixed by updating the pattern to `"src/features/boards/retrospective/services/*.test.*"`.
2. **`DatePicker.tsx` CSS import depth**: `import '../../styles/datepicker.css'` broke when the component moved one directory deeper (`components/ui/` → `lib/components/ui/`). Fixed by adding one `../`.
3. **Two malformed `@/../` aliases**: `ActionColumnToggle.test.tsx` and `AuthGuard.test.tsx` each had one pre-existing relative-import depth bug (one extra `../` combined with a redundant explicit `src/` segment) that, as plain relative paths, silently resolved to a non-existent location without erroring (never actually used by anything). Converting them to the `@/` alias turned the same latent bug into a hard Vite resolution error. Fixed by pointing both directly at the correct current location.
4. **Three inert-but-confusing mock paths**: `App.test.tsx` (2 mocks) and `GroupableColumn.basic.test.tsx` (1 mock) had `vi.mock()` calls with pre-existing off-by-one relative depth, silently never matching any real import (and thus never applying) both before and after the move. Two were safely corrected to their real target with no test-outcome change. The third (`LanguageSelector.test.tsx`) was initially "corrected" too, but doing so made the mock start actually matching — which surfaced a separate, unrelated pre-existing bug in that test file (a hoisting-order `ReferenceError` on `mockUseLanguage`). Reverted that one specific change back to the original (harmlessly inert) alias path to preserve exact prior behavior, per FR-008/FR-009 (no behavior change) — fixing unrelated latent test bugs is out of scope for this feature.
