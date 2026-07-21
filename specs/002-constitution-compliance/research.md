# Phase 0 Research: Constitution Compliance Remediation

## 1. ESLint configuration shape

**Decision**: Adopt ESLint 9 flat config (`eslint.config.js`) with `typescript-eslint` (non-type-checked `recommended` ruleset, not `recommended-type-checked`), `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` (Vite's standard pairing), and `eslint-plugin-jsx-a11y`. Set `@typescript-eslint/no-explicit-any: 'error'`, satisfied only by an inline `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- <reason>` comment, mirroring the constitution's "justified by an explicit inline comment" wording for FR-014.

**Rationale**: Flat config is the current ESLint standard (no legacy `.eslintrc` migration burden since no config exists yet at all). Non-type-checked `recommended` avoids requiring a slow, project-wide TS type-checking pass inside ESLint on a first pass — `npm run type-check` (`tsc --noEmit`) already covers full type correctness separately, so ESLint's job here is style/pattern/hook/accessibility linting, not re-doing type-check's job. `eslint-plugin-jsx-a11y` directly closes the constitution's Accessibility standard with static checks (keyboard/ARIA patterns) rather than leaving it purely manual.

**Alternatives considered**: Airbnb config — rejected, opinionated well beyond what the constitution requires and would generate a large first-pass violation count disproportionate to the compliance goal (violates Simplicity/KISS). `recommended-type-checked` — rejected for now as a heavier, slower gate; can be adopted later as a follow-up once the baseline gate is green (documented, not silently dropped).

## 2. CI runtime budget for `@xenova/transformers`

**Decision**: No special CI handling needed beyond standard `actions/setup-node` with `cache: npm`. The dependency is only imported inside `src/features/boards/sentiment/workers/sentimentWorker.ts` (a Web Worker), which is never instantiated during Vitest unit/integration runs — confirmed no test file imports the worker or `@xenova/transformers` directly. The cost is purely `npm ci` install size, which the npm cache amortizes across CI runs.

**Rationale**: Verified via repository search — sentiment-related tests (`RetrospectiveBoard.test.tsx`, `FacilitatorMenu.test.tsx`, etc.) test the surrounding UI, not the worker's ML inference itself.

**Alternatives considered**: Mocking `@xenova/transformers` globally in `src/test/setup.ts` — unnecessary since nothing currently exercises it in the test run; would add speculative complexity (violates YAGNI). Revisit only if a future test starts importing the worker directly.

## 3. Playwright + Firebase Emulator Suite authentication strategy

**Correction (post-`/speckit-analyze`, 2026-07-21)**: The original version of this decision assumed the app has an email/password sign-in path. It does not — a codebase check confirmed `retro-rocket/src/features/auth/services/accountLinking.ts` and `authProvider.ts` only ever call `signInWithPopup` with `GoogleAuthProvider`/`GithubAuthProvider`; `signInWithEmailAndPassword` appears nowhere in production source. The decision below replaces that assumption.

**Second correction (during `/speckit-implement`, 2026-07-21)**: The custom-token bypass this section originally proposed (mint a token via the Firebase Admin SDK, sign in via `signInWithCustomToken` for 4 of the 5 specs) was fully built and live-tested against a real running app + emulator, and hit a genuine, reproducible blocker: the Auth Emulator does not populate `email` on the resulting `User` object immediately after a custom-token sign-in, and the app's own profile-setup code (`UserContext.tsx`) throws `Error: Email is required` when that happens. Rather than work around an emulator-specific quirk, all 5 specs were standardized on the real `signInWithPopup` flow below (proven reliable end-to-end via live exploration), and the `firebase-admin` dependency was removed as no longer needed.

**Decision (final, as implemented)**: Every spec drives the app's real `signInWithPopup(GoogleAuthProvider)` button against the Auth Emulator's fake-IDP consent popup, via a shared `e2e/fixtures/auth-helpers.ts` `signInWithGoogle()` helper. When the Firebase SDK is configured to talk to the Auth Emulator, `signInWithPopup` opens the emulator's own local fake-IDP consent screen (not a real Google page); Playwright waits for that popup window (`context.waitForEvent('page')`) and fills its form. The real, verified popup selectors are: `getByText('Add new account')`, `#email-input`, `#display-name-input`, and `getByRole('button', { name: /Sign in with Google/i })`. This exercises the app's actual "Sign in with Google" button and the real `onAuthStateChanged` wiring end-to-end for every spec, which is what the constitution's named "authentication" critical flow is asking to be covered — and sidesteps the custom-token emulator gap entirely since every spec now uses the one mechanism proven to work.

**Rationale**: The Auth Emulator does not perform real third-party OAuth handshakes with Google/GitHub's servers, but it does emulate the popup-based IDP consent UI locally, which is exactly the mechanism this app uses in production — so this tests the real code path, not an invented one. The custom-token shortcut would have been faster, but "faster and broken" loses to "uniform and verified" once the emulator gap was found — consistent with Simplicity (KISS): one proven mechanism beats two mechanisms where one has an open, unexplained edge case. All 5 specs still exercise real Firestore security rules (which check `request.auth`) and the real authenticated-app shell, satisfying FR-008/FR-009 without depending on a third-party IdP inside CI.

**Alternatives considered**: Assuming an email/password path — rejected, doesn't exist in the app (see first Correction above). Custom-token bypass for 4 of 5 specs — built, tested, and abandoned after hitting the Auth Emulator's `email`-population gap (see second Correction above). Mocking Firebase Auth entirely in Playwright (e.g., stubbing `window.firebase`) — rejected, defeats the purpose of E2E coverage per FR-008/FR-009. Running against a real GitHub/Google OAuth test app — rejected per clarification (Emulator Suite only; no external network dependency in CI).

## 4. GitHub Actions workflow structure

**Decision**: A single `.github/workflows/ci.yml` triggered on `pull_request` to `main`, with jobs: (1) `checks` — install (cached), `type-check`, `lint`, `test:coverage` (fails if any of the four coverage metrics drop below 80%); (2) `e2e` — starts the Firebase Emulator Suite, runs `npx playwright test` against it. Both jobs run on every PR (the Emulator makes E2E cheap enough to run pre-merge, which exceeds the constitution's stated floor of "before every release").

**Rationale**: Running E2E on every PR rather than only at release time catches critical-flow regressions earlier, at no added infrastructure cost since the Emulator is free and local to the CI runner. This doesn't contradict the constitution (which sets a floor, "MUST run... before every release," not a ceiling).

**Alternatives considered**: Splitting `e2e` into a separate release-triggered workflow only — rejected as an unnecessary two-pipeline split for a project this size (Simplicity/KISS); can be revisited if E2E runtime later becomes a bottleneck on PR feedback time.

## 5. Disposition of legacy ad-hoc scripts

**Decision**: For each of the ~20 root-level `test-*.sh`, `test-*.js`, `test-*.mjs`, and `verify-*.js` files, the implementation phase will individually read the script, determine whether it verifies behavior not already covered by the Vitest suite, port any still-relevant assertion into a proper `src/test/**` test file, then delete the script. Scripts found to test already-superseded behavior (e.g., pre-refactor paths) are deleted without porting.

**Rationale**: A blanket delete risks silently losing real regression coverage the script author intended; a blanket port risks bloating the suite with duplicate or dead assertions. Per-file triage is the only approach consistent with both FR-001 (single test entry point) and FR-003 (migrate real assertions, don't just delete).

**Alternatives considered**: Deleting all scripts unread — rejected, risks losing legitimate coverage the constitution's TDD principle would otherwise protect. Keeping scripts in place but excluded from `npm run test` — rejected, contradicts FR-001/FR-003 and SC-006 directly.

## 6. `.gitignore` scope for generated artifacts

**Decision**: Add `coverage_report.txt` and `coverage_report_current.json` (plus the existing `coverage/` directory pattern, already present) to `.gitignore`, and `git rm --cached` the two currently-tracked files.

**Rationale**: Both are Vitest-generated snapshots (`track-coverage.sh` output), not source; keeping them tracked guarantees future staleness and merge noise, and duplicates what CI-enforced coverage (User Story 3) already reports authoritatively.

**Alternatives considered**: Keeping them as a historical record — rejected; git history already preserves anything worth keeping, and an actively-tracked stale file is worse than no file (it can mislead a reader into trusting outdated numbers).

## Outstanding NEEDS CLARIFICATION

None. All unknowns identified in Technical Context were resolved above; the two spec-level scope questions (test-repair-only scope; Firebase Emulator Suite for E2E) were already resolved in `/speckit-clarify` and are reflected in spec.md's Clarifications section.
