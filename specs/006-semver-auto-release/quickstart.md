# Quickstart: Validating Automated Semantic Versioning on Main

## Prerequisites

- The three required quality gates (`Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`) already in place from prior features — unchanged by this feature.
- One-time `0.1.0` baseline bootstrap (research.md §2), performed once before relying on the automated phase:
  1. Open a PR that sets `retro-rocket/package.json` and `retro-rocket/package-lock.json`'s `version` fields to `0.1.0` directly.
  2. Merge it to `main` and confirm the three gates pass on that commit.
  3. Tag that exact commit and push the tag:
     ```sh
     git fetch origin main
     git tag v0.1.0 <merge-commit-sha>
     git push origin v0.1.0
     ```
- `.github/workflows/ci.yml`'s new `version` job (research.md §3) and `retro-rocket/.releaserc`/equivalent `semantic-release` config (research.md §1, §4) merged to `main`.
- `.github/workflows/deploy.yml`'s `deploy-production` job updated with the `[version bump]` skip condition (research.md §4, contracts/version-bump-commit.md).

## Part 1 — Verify a `feat:` commit produces a MINOR bump (User Story 1)

1. Push a commit to `main` whose message starts with `feat:` (e.g. `feat: add export-to-CSV button`).
2. Wait for `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, and `CodeQL` to all report success on that commit:
   ```sh
   gh api repos/:owner/:repo/commits/<sha>/check-runs --jq '.check_runs[] | {name, conclusion}'
   ```
3. Confirm the `version` job in `ci.yml` then runs and produces a new commit + tag:
   ```sh
   gh run list --workflow=ci.yml --branch main
   git log --oneline -3 origin/main
   git tag -l 'v*' | sort -V | tail -3
   ```
4. Confirm `retro-rocket/package.json` and `retro-rocket/package-lock.json` on `main` now show the version bumped by MINOR (e.g. `0.1.0` → `0.2.0`).

## Part 2 — Verify a `fix:`-only push produces a PATCH bump, and a breaking change produces a MAJOR bump

1. Repeat Part 1 with a `fix:` commit; confirm the PATCH component increments (e.g. `0.2.0` → `0.2.1`).
2. Repeat with a commit containing `BREAKING CHANGE:` in its footer (or a `feat!:` subject); confirm the MAJOR component increments **even though the version is below `1.0.0`** (e.g. `0.2.1` → `1.0.0`) — this is the clarified pre-1.0 behavior (no `0.y.z` special-casing).

## Part 3 — Verify no bump occurs before gates pass, or when gates fail

1. Push a `feat:` commit and, before the gates finish, confirm the version in `package.json` on `main` is unchanged.
2. Push a commit that fails lint or introduces a High-severity CodeQL finding; confirm the `version` job does not run to completion and `package.json`/the tag list are unchanged.

## Part 4 — Verify no-op when nothing qualifies (FR-011)

1. Push only `docs:`/`chore:`/`style:` commits to `main`.
2. Confirm all three gates pass but the `version` job produces no new commit and no new tag.

## Part 5 — Verify the versioning phase never runs on PRs or other branches (User Story 3)

1. Open a PR with `feat:`/`fix:` commits targeting `main`; confirm no version change or tag appears on the PR branch regardless of its own check results.
2. Push a commit to a non-`main` branch; confirm no `version` job run occurs for it.

## Part 6 — Verify the bump commit doesn't loop or trigger a redundant redeploy (FR-009, FR-010, SC-004, SC-006)

1. After any bump from Part 1/2, inspect the bump commit itself:
   ```sh
   git log -1 --format='%H %s' <bump-commit-sha>
   ```
   Confirm the message matches `chore(release): <version> [version bump]`.
2. Confirm the three required gates ran normally on the bump commit (`gh api .../check-runs` as in Part 1 step 2), but:
   - The `version` job shows as skipped for that commit.
   - `deploy.yml`'s `deploy-production` job shows as skipped for that commit.
   ```sh
   gh run list --workflow=ci.yml --branch main
   gh run list --workflow=deploy.yml --branch main
   ```

## Part 7 — Verify a manually edited `package.json` doesn't influence the next computed version

1. On `main`, manually edit `retro-rocket/package.json`'s `version` field to a value that conflicts with the latest `v*.*.*` tag (e.g. bump it far ahead, like `9.9.9`) — do **not** create or push a matching tag for this value.
2. Push a qualifying commit (e.g. `feat: ...`) on top of that edit.
3. Once the three gates pass, confirm the `version` job computes the next version strictly as an increment over the latest existing tag (not over the manually edited `9.9.9` value):
   ```sh
   git tag -l 'v*' | sort -V | tail -3
   git show origin/main:retro-rocket/package.json | grep '"version"'
   ```
4. Confirm the resulting version matches what SemVer precedence over the last *tag* would produce, ignoring the manual edit entirely.

## Cleanup

- Delete any throwaway test PR(s)/branches created above.
- If validating in a disposable/fork scenario, remove any test tags created (`git push origin :refs/tags/v0.x.y`) so they don't pollute the real version history.
