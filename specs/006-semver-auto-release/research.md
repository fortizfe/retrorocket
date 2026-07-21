# Research: Automated Semantic Versioning on Main

## 1. Version-computation tool

**Decision**: Use `semantic-release` (core) with exactly three plugins: `@semantic-release/commit-analyzer`, `@semantic-release/npm` (with `npmPublish: false`), and `@semantic-release/git`. No `@semantic-release/github`, no `@semantic-release/changelog`, no `@semantic-release/release-notes-generator`.

**Rationale**: The constitution's Principle III (Prefer Proven Third-Party Libraries) requires preferring an established tool over a hand-rolled Conventional-Commits parser. `semantic-release` is the de facto standard for this exact problem (commit-driven SemVer bump computation), is actively maintained, and its default `commit-analyzer` preset (`angular`/`conventionalcommits`) already maps breaking-change → MAJOR, `feat` → MINOR, `fix` → PATCH **unconditionally** — including while the version is below `1.0.0` — which matches the clarified FR-004 behavior with zero custom configuration. `@semantic-release/npm`'s `prepare` step internally runs the equivalent of `npm version --no-git-tag-version <version>`, which (npm ≥ 7) updates both `package.json` and `package-lock.json`'s version fields in one step, satisfying FR-007 without extra scripting. `@semantic-release/git` commits the changed files and lets us fully control the commit message template (needed for the custom skip marker, see §4) and reuses the default `tagFormat` (`v${version}`), already consistent with FR-008's example (`v0.2.0`). When no commit since the last tag maps to a bump type, `commit-analyzer` returns no release type and semantic-release's core no-ops the entire run (no commit, no tag) — this is exactly FR-011's required behavior, built in rather than custom-coded.

**Dependency validation (Principle III checklist)**: All four new packages (`semantic-release`, `@semantic-release/commit-analyzer`, `@semantic-release/npm`, `@semantic-release/git`) are MIT-licensed (confirmed via `npm view <pkg> license`) and actively maintained (`semantic-release` itself last published 2026-07-18, days before this research was written). Bundle-size impact is N/A — all four are installed as CI-only devDependencies (`npx`/`npm ci` inside the `version` job), never included in the application's shipped Vite bundle.

**Alternatives considered**:
- **Hand-rolled script** (parse `git log` since last tag, regex-match Conventional Commit types, compute bump, run `npm version`, `git commit`/`tag`/`push`): rejected — duplicates a well-solved problem, violates Principle III, and would need to reimplement edge cases (breaking-change precedence, no-op detection) that `semantic-release` already handles correctly.
- **`standard-version`**: rejected — the project is unmaintained/archived upstream; its own README recommends migrating to `semantic-release`.
- **`release-please`**: rejected — designed around a PR-based release-staging workflow (opens a "release PR" that a human merges), which conflicts with FR-011's "no manual/human approval step" requirement and would need extra suppression of its changelog/release-PR behavior we don't want anyway.

## 2. Establishing the `0.1.0` baseline (FR-005, FR-006)

**Decision**: `0.1.0` is established by a one-time, manual bootstrap action taken when this feature is rolled out — not by conditional logic inside the recurring workflow. The bootstrap: (a) a PR sets `retro-rocket/package.json` and `retro-rocket/package-lock.json`'s `version` fields to `0.1.0` directly; (b) once that PR merges to `main` and its commit passes the three gates, a maintainer creates and pushes the git tag `v0.1.0` pointing at that exact commit. From that point on, every subsequent qualifying push is computed by `semantic-release` as a normal increment over the latest existing tag — the everyday code path never needs to ask "is this the first run?".

**Rationale**: `semantic-release` core has a hardcoded default for "no previous release exists" that forces the next version to `1.0.0` on ordinary (non-prerelease) branches — not `0.1.0`. Reproducing `0.1.0` as the literal first output would require either (a) configuring `main` as a `prerelease`-type branch, which changes the tag/version *format* for every future release (e.g. `0.2.0-beta.1` instead of `0.2.0`) and is rejected below, or (b) writing permanent custom bootstrap-detection logic into the workflow that only ever matters once and then becomes dead code (and a latent misfire risk if tags were ever lost). Pre-seeding the `v0.1.0` tag once, as an operational task, means the ordinary code path is used for 100% of automated runs, forever — simplest option satisfying KISS/YAGNI (Principle V), and it still satisfies FR-005/FR-006 exactly: the first automated computation the workflow ever performs is relative to `0.1.0`, per Acceptance Scenario 2, and the value `0.1.0` itself has zero exceptions (SC-003) because it was written directly, not computed.

**Alternatives considered**:
- **Configure `main` as a semantic-release `prerelease` branch** (which defaults the very first release to `0.1.0`): rejected — this changes semantic-release's tagging/versioning behavior for *every* release, not just the first, appending a prerelease identifier that was never requested and contradicts plain `MAJOR.MINOR.PATCH` tags required by FR-008/Key Entities.
- **Custom "if no matching tag exists, hardcode 0.1.0" step in the workflow**: rejected — permanent complexity for a one-time event; also risks silently re-triggering if tags are ever deleted or the tag-fetch step misbehaves (e.g. shallow clone).

## 3. Where the versioning phase runs

**Decision**: Add a new job (`version`) to the existing `.github/workflows/ci.yml`, scoped to `if: github.event_name == 'push' && github.ref == 'refs/heads/main'`, with `needs: [checks, e2e]` (the two existing in-workflow jobs) plus its own step that waits for the external `CodeQL` check (from `codeql.yml`) using the same `lewagon/wait-on-check-action` pattern already proven in `deploy.yml`.

**Rationale**: The user's request is framed as "one more step at the end of the CI pipeline we already have," and `ci.yml` already contains two of the three required gates as its own jobs (`checks`, `e2e`) — expressing "wait for these" via native `needs:` is simpler and more direct than duplicating them via `wait-on-check-action` in a brand-new sibling workflow file. Only `CodeQL` runs in a separate workflow (`codeql.yml`), so it's the only gate that needs the polling-based wait pattern, exactly mirroring how `deploy.yml` already handles the same asymmetry (FR-002/FR-003, Constitution "Development Workflow & Quality Gates").

**Alternatives considered**:
- **New sibling workflow (`release.yml`), waiting on all three checks via `wait-on-check-action`** (mirroring `deploy.yml`'s own structure exactly): rejected as the primary approach — technically viable and slightly more consistent with `deploy.yml`'s existing style, but duplicates wait-logic for two checks (`checks`, `e2e`) that `ci.yml` can express natively via `needs:`, and reads less literally as "the end of the CI pipeline." Noted here as a reasonable fallback if job-ordering constraints inside `ci.yml` prove awkward during implementation.

## 4. Preventing the self-triggered loop (FR-009, FR-010)

**Decision**: Use a custom, non-GitHub-reserved marker in the release commit's message — `[version bump]` — embedded via `@semantic-release/git`'s configurable `message` template (e.g. `chore(release): ${nextRelease.version} [version bump]`). Two job-level `if:` conditions check for its absence:
- The new `version` job in `ci.yml`: `if: ... && !contains(github.event.head_commit.message, '[version bump]')`.
- The `deploy-production` job in `deploy.yml`: add the same `!contains(...)` condition.

**Rationale**: GitHub Actions has *built-in* handling for commit messages containing `[skip ci]`/`[ci skip]`/`[no ci]`/`[skip actions]`/`[actions skip]` — but that suppresses creation of *all* workflow runs for that push, repo-wide, including the three required quality gates. FR-009 explicitly requires the gates to keep running on the bump commit; only the versioning *computation* and the production *redeploy* must be skipped. A custom marker plus targeted `if:` conditions achieves exactly that surgical scope, while GitHub's blanket skip keywords would over-skip and violate FR-009's own text.

**Alternatives considered**:
- **Rely on GitHub's built-in `[skip ci]` marker**: rejected — skips the quality gates entirely on that commit, contradicting FR-009.
- **Distinguish by commit author/actor identity** (e.g. `github-actions[bot]`) instead of a message marker: rejected as primary mechanism — viable in principle, but less legible in `git log`/PR history than an explicit `[version bump]` tag, and the message-marker approach is what's already documented in the spec's Assumptions ("e.g. via a distinguishing commit message marker or author identity"); message marker chosen as it needs no extra `git log` lookup beyond the `push` event payload already available as `github.event.head_commit.message`.

## 5. Required workflow permissions & checkout depth

**Decision**: The new `version` job declares `permissions: contents: write` explicitly. Its checkout step uses `actions/checkout@v4` with `fetch-depth: 0` and `fetch-tags: true` (or equivalent full-history fetch).

**Rationale**: The repository's default Actions token permission is `read` (confirmed via `gh api repos/.../actions/permissions/workflow`), so pushing a commit and a tag requires an explicit `contents: write` grant on this job, following the same per-job `permissions:` pattern already used in `codeql.yml` and `deploy.yml`. `semantic-release` needs the full commit history and all existing tags to correctly compute "commits since the last release" (FR-006, FR-012) — the default shallow checkout used elsewhere in `ci.yml` is insufficient for this job specifically.

## 6. Reused contract: the three required check names

**Decision**: Reuse, byte-for-byte, the same three check names already fixed as a contract by feature 005 (`specs/005-gated-vercel-deploys/contracts/required-checks-for-deployment.md`): `Type-check, lint, and test with coverage`, `Playwright E2E (Firebase Emulator Suite)`, `CodeQL`.

**Rationale**: These are the exact names branch-protection and `deploy.yml` already depend on; reusing them (rather than re-deriving or re-describing them) keeps a single source of truth and avoids the "silent hang until timeout" failure mode already called out in feature 005's contract change policy.
