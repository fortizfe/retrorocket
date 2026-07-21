# Quickstart: Validating the Restructure

This feature has no new UI or API to exercise — validation means proving the
reorganized codebase is byte-for-byte behaviorally identical to before the
move. Run these checks from `retro-rocket/` after the reorganization is applied.

## Prerequisites

- Node/npm environment already used for this project (see `retro-rocket/package.json`)
- Dependencies installed: `npm install`

## 1. Documentation cleanup check (User Story 1 / SC-001)

```bash
# From the repository root
find . -iname "*.md" -not -path "*/node_modules/*" -not -path "*/.specify/*" -not -path "*/specs/*"
```

**Expected**: Only `README.md` (and `retro-rocket/README.md` if duplicated)
remain. No implementation-note/analysis Markdown files should be listed.

## 2. Structural check (User Story 2 / SC-002)

```bash
cd retro-rocket
find src/features -maxdepth 1 -type d
find src/lib -maxdepth 1 -type d
```

**Expected**: `src/features` contains `auth`, `boards`, `create-board`,
`dashboard`, `dev-tools`. `src/lib` contains `components`, `hooks`, `services`,
`contexts`, `utils`, plus `uiPreferencesStore.ts`. No domain-specific
components/hooks/services remain directly under the old top-level
`src/components`, `src/hooks`, `src/services`, `src/contexts` locations
(they should no longer exist, or should be empty/removed).

## 3. Build, type-check, lint (SC-004)

```bash
npm run type-check
npm run lint
npm run build
```

**Expected**: All three commands exit 0 with no errors introduced by the move.

## 4. Full test suite + coverage (SC-003, FR-011)

```bash
npm run test:coverage
```

**Expected**: Same pass/fail outcome as the pre-reorganization baseline (no
new failures), and the coverage summary meets the existing thresholds already
defined in `vitest.config.ts` (80% branches/functions/lines/statements).

## 5. Manual smoke walkthrough (SC-005)

```bash
npm run dev
```

Then, in a browser:

1. Create a board from a template — confirm it lands on the retrospective page.
2. Add a card, vote on it, and drag it into another card to group them.
3. Start the facilitator countdown and confirm it counts down and notifies participants.
4. Export the board (PDF and DOCX) and confirm both downloads succeed and contain the board's content.
5. Sign in / sign out and confirm the auth flow and profile page still work.

**Expected**: Every flow behaves exactly as it did before the reorganization —
no visual, functional, or console-error differences.

## Rollback

If any check fails, the reorganization is a pure `git mv` + import-path
refactor with no data migration, so `git revert`/`git reset` on the feature
branch is sufficient to return to the previous working state — no Firestore
data or configuration changes were made.
