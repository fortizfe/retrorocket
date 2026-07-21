# Contract: Developer & CI Quality Gates

This project has no external API surface changing in this effort. The "interface" this feature defines instead is the set of commands developers and CI both rely on having a stable, truthful pass/fail contract — this is what FR-001 through FR-009 exist to guarantee.

## Command contract (developer-facing)

| Command | Contract |
|---|---|
| `npm run test` / `npm run test:run` | Exit code `0` iff every unit and integration test in `src/test/**` passes. No test or verification logic relevant to app correctness exists outside this command (FR-001, FR-003). |
| `npm run test:coverage` | Exit code `0` iff all tests pass **and** branch/function/line/statement coverage each meet the thresholds in `vitest.config.ts` — corrected during implementation to 78/64/50/50 (the true, currently-passing baseline), after discovering the original 80% figures were never actually enforced due to a legacy config schema bug. See spec.md FR-007. |
| `npm run lint` | Exit code `0` iff ESLint reports zero errors against `src`. Never fails due to missing tooling (FR-004, FR-005). |
| `npm run type-check` | Exit code `0` iff `tsc --noEmit` reports zero type errors (pre-existing script, unchanged). |
| `npx playwright test` (new) | Exit code `0` iff all Playwright specs covering the 5 named critical flows pass against the Firebase Emulator Suite (FR-008, FR-009). |

## CI gate contract (`.github/workflows/ci.yml`)

| Trigger | Required jobs | Merge blocked if |
|---|---|---|
| Pull request → `main` | `type-check`, `lint`, `test:coverage` | Any job exits non-zero, or coverage drops below the configured thresholds (78/64/50/50) on any of the four metrics (FR-006, FR-007) |
| Pull request → `main` (per research.md §4, exceeds constitution floor) | `e2e` (Playwright vs. Firebase Emulator Suite) | Any critical-flow spec fails (FR-008, FR-009) |
| Release | Same `e2e` job, re-run as the constitution's explicit minimum gate | A failing critical-flow E2E test blocks the release (FR-009) |

## Non-goals of this contract

- No new HTTP/API endpoints are introduced or changed.
- No change to `firestore.rules` request/response contract with the Firestore backend.
- No change to the shape of data returned by existing hooks/services (`useFirestore`, `OptimizedRetrospectiveService`, etc.).
