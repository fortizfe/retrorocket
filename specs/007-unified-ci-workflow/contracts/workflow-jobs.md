# Contract: Consolidated Workflow Job Graph

This is the "interface" this feature exposes to the rest of the repository's tooling: GitHub branch protection and the sticky PR-comment bot both depend on specific job (check) names and on the trigger matrix below. Any future change to job names or trigger conditions must keep this contract in sync with branch protection settings.

## Trigger matrix

| Job (check name) | `pull_request` → `main` | `push` → `main` |
|---|---|---|
| `Type-check, lint, and test with coverage` | runs | runs |
| `Playwright E2E (Firebase Emulator Suite)` | runs | runs |
| `CodeQL` (code-scanning check, produced by the `analyze` job) | runs | runs |
| `deploy-preview` | runs (after the three checks above succeed) | does not run |
| `deploy-production` | does not run | runs (after the three checks above succeed), except skipped when the pushed commit message contains `[version bump]` |
| `version` (Automated Semantic Versioning) | does not run | runs (after `deploy-production` succeeds, and only if the pushed commit message does not contain `[version bump]`) |

## Consumers of this contract

- **Branch protection on `main`**: requires `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and the `CodeQL` code-scanning check (High-severity threshold) as merge-blocking status checks. These three names MUST remain unchanged by this refactor (FR-012, research.md §3).
- **`marocchino/sticky-pull-request-comment`**: posts/updates a PR comment with the preview deployment URL; keyed by the `gated-vercel-preview-deployment` comment header, unaffected by which workflow file produces it.
- **`semantic-release`** (`retro-rocket/.releaserc.json`): commits a `chore(release): <version> [version bump]` commit and tag on `main`; the `[version bump]` substring is the guard the `version` job's own `if:` condition checks to avoid re-triggering itself.

## Failure/skip semantics exposed by this contract

- If any of the three quality-check jobs fails, both `deploy-preview` and `deploy-production` are skipped (never reach "success" or "failure" — they simply do not run), and `version` is skipped in turn.
- If `deploy-production` fails on a push to `main`, `version` is skipped.
- `version` is also skipped (independent of deploy outcome) whenever the triggering commit message contains `[version bump]`, preventing the release commit from re-triggering another release.
- `deploy-production` is also skipped (independent of quality-check outcome) whenever the triggering commit message contains `[version bump]`, mirroring the guard already in place today — avoids redeploying application code that didn't change.
