# Contract: Media Capture Script

**Enforces**: FR-005, FR-015. Applies to `e2e/fixtures/landing-capture.ts`
and the Demo Dataset it seeds (`research.md` #7, #8; `data-model.md`'s
`Demo Dataset` entity).

## Contract

1. The capture script MUST run exclusively against the Firebase Emulator
   Suite (`VITE_USE_FIREBASE_EMULATOR=true`, the same mechanism
   `playwright.config.ts`'s `webServer` already uses) — it MUST NOT be
   runnable against a production or staging Firebase project. This is the
   structural guarantee behind FR-005 ("MUST NOT include any real user,
   customer, or production data").
2. The script MUST be idempotent and re-runnable end-to-end from a clean
   emulator state: seed → capture → write files, with no manual step
   required in between (FR-015 — "documented, repeatable process").
3. The script MUST seed its data exclusively through existing, unmodified
   patterns already used across `e2e/` — the unmodified `seedBoardGroups`
   fixture for grouping, and the same direct `POST /api/boards` /
   `POST /api/retrospectives/:id/cards` call pattern already used inline in
   numerous existing specs (e.g. `dashboard-list.spec.ts`,
   `retrospective-board.spec.ts`) for exact, realistically-worded titles and
   card content — not `seedBoards`'/`seedBoardCards`' bulk numeric-suffix
   schemes (designed for scale-testing, per their own docstrings, and always
   appending a zero-padded index even to a supplied prefix), which would
   undermine the realistic-content requirement (FR-005) for a small,
   hand-curated dataset. The script MUST NOT introduce a new seeding
   mechanism, nor modify any existing fixture's behavior for other E2E specs.
4. The board/card/display-name content the script seeds MUST be the
   hand-curated realistic Demo Dataset (`data-model.md`), never the
   fixtures' default placeholder strings (`"Seed Board 0001"`, `"Seed card
   0001"`) — those defaults exist for unrelated scale-testing specs and MUST
   NOT leak into shipped Media Assets.
5. For every `Landing Section` that has a `mediaAssetKey`, the script MUST
   capture both a `light` and `dark` variant in the same run, using the
   `forceTheme`/`applyThemeClass` pattern already established in
   `e2e/accessibility.spec.ts`, and MUST write video posters alongside any
   video capture (media-asset-manifest-contract.md rule 3).
6. The script MUST NOT be part of the merge-blocking `npm run e2e` job — it
   is a content-production tool run on demand (e.g. when the UI changes
   enough to make existing captures stale), not a correctness test. It MUST,
   however, live under `e2e/` and reuse `playwright.config.ts` so it shares
   the project's one Playwright configuration rather than introducing a
   second one.

## Verification procedure

1. Run the script against a freshly-started local Emulator Suite
   (`npm run emulators`, matching `package.json`'s existing `e2e` script
   pattern) and confirm it exits successfully, producing every file
   `media-asset-manifest-contract.md` expects.
2. Diff the newly-produced `public/landing-media/` output against the
   currently-committed one; confirm no unexpected file is missing
   (every `Media Asset` manifest entry still resolves) and no unrelated file
   changed.
3. Spot-check a sample of the produced screenshots/videos in both themes for
   rule 4 (no placeholder-looking content) as part of the same human review
   `media-asset-manifest-contract.md` describes.
4. Confirm `e2e/authentication.spec.ts` and `e2e/accessibility.spec.ts`
   still pass unmodified by the capture script's existence (rule 6) — the
   capture script must be additive, not a change to the correctness suite.
