# Quickstart: Validating Constitution Compliance

Run these from `retro-rocket/` on a clean checkout after implementation. Each step maps to a Success Criterion in spec.md.

## Prerequisites

- Node.js and npm installed (project currently developed against Node v26)
- `npm ci` run to install dependencies (now including ESLint, `@playwright/test`, `firebase-tools`)
- Firebase CLI available via `npx firebase` (installed as a devDependency, no global install required)

## 1. Single, reliable test entry point (SC-001, SC-002)

```bash
npm run test:run
```

**Expected**: exit code `0`, 0 failing tests, no reference to any script outside `src/test/**`.

```bash
ls test-*.sh test-*.js test-*.mjs verify-*.js 2>/dev/null
```

**Expected**: `No such file or directory` — none of these remain at the repository root (SC-006).

## 2. Working lint gate (part of SC-003)

```bash
npm run lint
```

**Expected**: exit code `0`, no "command not found" error, no reported violations (or only violations explicitly documented per FR-005).

## 3. CI enforcement (SC-003)

- Open a throwaway PR that lowers coverage below the configured thresholds on any metric, or introduces a lint violation.
- **Expected**: the `checks` job in `.github/workflows/ci.yml` fails and the PR shows a blocked merge status.
- **Status**: deferred during implementation — the user opted not to have the implementing agent push branches/open PRs against the real GitHub remote (a visible, shared-state action). The workflow file itself is authored and its individual steps have been run locally with the expected pass/fail behavior; this specific empirical proof (a real blocked PR) is left for a human to run.

## 4. Critical-flow E2E coverage (SC-004)

```bash
npm run e2e
```

(wraps `firebase emulators:exec --only auth,firestore "playwright test"` — starts the emulators, waits for them, runs the suite, tears down automatically)

**Expected**: exit code `0`; the report shows one passing spec per critical flow: board creation, add/vote/group cards, facilitator countdown, PDF export, DOCX export, authentication. Confirmed stable across multiple consecutive runs during implementation (~29s each).

## 5. Internationalization completeness (SC-005)

```bash
grep -rEo '>[A-Za-zÁÉÍÓÚáéíóúñÑ][a-zA-ZÁÉÍÓÚáéíóúñÑ ,.!?]{3,}<' src --include="*.tsx" | grep -v "/test/\|/dev-tools/"
```

**Expected**: no output outside `src/test` and `src/features/dev-tools` (both explicitly out of scope per this spec's Independent Test for User Story 5) — all previously-flagged files (`AuthWrapper.tsx`, `ParticipantList.tsx`, `CountdownFeatureDemo.tsx`, `FacilitatorMenu.tsx`, `GroupSuggestionModal.tsx`, `RetrospectiveBoard.tsx`, `EnhancedRetrospectiveBoard.tsx`, `PdfExporter.tsx`, plus `UnifiedExporter.tsx`/`DocxExporter.tsx`/`Dashboard.tsx` found during implementation) now source their text via `t()`. Also covered by the permanent guard test at `src/test/i18n/no-hardcoded-text.test.ts`, which runs as part of `npm run test`.

```bash
node -e "
const en = require('./src/locales/en.json');
const es = require('./src/locales/es.json');
const flatten = (o,p='') => Object.entries(o).flatMap(([k,v]) => typeof v === 'object' ? flatten(v, p+k+'.') : [p+k]);
const enKeys = new Set(flatten(en));
const esKeys = new Set(flatten(es));
const missing = [...enKeys].filter(k => !esKeys.has(k));
console.log(missing.length === 0 ? 'OK: locales in sync' : 'MISSING IN es.json: ' + missing.join(', '));
"
```

**Expected caveat found during implementation**: this check reveals the two locale files have **pre-existing structural drift** unrelated to this effort — around a dozen keys (e.g. `header.language`, `retrospective.facilitator.tabs.*` vs `.stats.*`, `retrospective.progress`) exist in one locale but not the other. All 21 keys added by this effort were individually verified present in both files; reconciling the broader pre-existing drift is a separate, larger follow-up (see FR-012 documentation) — not fixed here to keep this effort's scope bounded to the originally-identified hardcoded strings.

## 6. Repository hygiene (User Story 6)

```bash
git status --short | grep -E "coverage_report"
npm run test:coverage
git status --short | grep -E "coverage_report"
```

**Expected**: both greps return nothing — the artifacts are untracked and `.gitignore`d, so regenerating coverage doesn't reintroduce them as trackable changes.

## Out of scope reminder

Per the recorded clarification, any test failure traced to a genuine product bug (not a stale assertion) is **not** fixed as part of this validation — it should instead appear as a separate, explicitly named follow-up item (e.g., a tracked issue), not block this quickstart's pass/fail result.
