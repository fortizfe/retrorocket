# Quickstart: Validate Shell Script Removal & CI Trigger Change

## Prerequisites

- Local checkout of the `003-scripts-cleanup-ci-trigger` branch with the
  implementation applied.
- Node.js/npm installed (per `retro-rocket/package.json` engine
  requirements).
- Push/PR access to the repository on GitHub to observe Actions runs.

## 1. Confirm the shell scripts are gone (User Story 1 / FR-001, SC-001)

```bash
find retro-rocket -maxdepth 1 -name "*.sh"
```

**Expected outcome**: no output — none of `deploy.sh`, `commands.sh`,
`verify-firebase.sh`, `check-status.sh`, `pre-deploy-check.sh`,
`migrate-user-providers.sh`, `test.sh`, `setup-firebase-auth.sh`,
`start.sh`, `track-coverage.sh` remain.

## 2. Confirm local workflows still work without the removed scripts (FR-002, SC-002)

Run from `retro-rocket/`:

```bash
npm install
npm start          # must no longer reference start.sh; dev server launches
npm run dev         # unaffected, launches Vite dev server
npm run lint
npm run type-check
npm run test:coverage
npm run build
```

**Expected outcome**: every command completes successfully; none fails with
a "file not found" / "permission denied" error pointing at a removed `.sh`
file.

## 3. Confirm no leftover references to removed scripts (FR-003)

```bash
grep -rln "\.sh" retro-rocket --include="*.md" --include="*.json" \
  --exclude-dir=node_modules
```

**Expected outcome**: no matches (or only matches unrelated to the removed
scripts, e.g. incidental substrings).

## 4. Confirm the CI workflow trigger changed (User Story 2 / FR-004, FR-005)

```bash
cat .github/workflows/ci.yml
```

**Expected outcome**: the `on:` block specifies `push: branches: [main]`
and no longer specifies `pull_request`. Both jobs (`checks`, `e2e`) and
their steps are otherwise unchanged.

## 5. Confirm pull requests no longer trigger the pipeline (SC-004)

1. Open (or update) a pull request targeting `main`.
2. Check the repository's Actions tab.

**Expected outcome**: no new workflow run appears for the pull request
event.

## 6. Confirm pushes to `main` trigger the full pipeline (FR-006, SC-003)

1. Push a commit directly to `main`, or merge a pull request into `main`.
2. Check the repository's Actions tab.

**Expected outcome**: a new workflow run starts automatically and both the
`checks` job (type-check, lint, test with coverage) and the `e2e` job
(Playwright against the Firebase Emulator Suite) run to completion, matching
their previous behavior when triggered by a pull request.
