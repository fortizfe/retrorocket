# Research: Purge Leaked Secrets & Add CodeQL Quality Gate

## 1. Tool for rewriting git history to remove a file

**Decision**: Use `git filter-repo` to remove `retro-rocket/.env.production` from every commit across every ref (branches and tags), then force-push all rewritten refs.

**Rationale**: `git filter-repo` is the tool the official Git project and GitHub's own documentation recommend for history-rewrite operations of this kind, superseding the deprecated `git filter-branch` (slow, footgun-prone, explicitly discouraged by its own `--force` warning) and third-party `BFG Repo-Cleaner` (still valid, but an extra unmaintained-risk external jar dependency vs. a Python tool GitHub itself points to). `filter-repo` operates on all refs by default, correctly handles the specific-path removal used here (`--path retro-rocket/.env.production --invert-paths`), and preserves unrelated history/authorship untouched (satisfies FR-004).

**Alternatives considered**:
- `git filter-branch` — official Git docs actively warn against it (slow, easy to corrupt history); rejected.
- `BFG Repo-Cleaner` — valid alternative, simpler CLI for pure file-deletion, but requires a JVM + external jar and is less actively maintained than `filter-repo`; rejected in favor of the more current, first-recommended tool.
- GitHub's "remove sensitive data" support ticket only (no local rewrite) — GitHub does offer a cache-purge request, but it does not rewrite the actual ref history itself; needed as a *supplement* (see item 4), not a replacement.

## 2. Scope of the rewrite across branches

**Decision**: Rewrite and force-push `main` (the only branch that must remain). Delete the three stale, already-merged remote branches (`001-restructure-project-files`, `002-constitution-compliance`, `003-scripts-cleanup-ci-trigger`) from `origin` rather than rewriting them too.

**Rationale**: All three remote branches are fully merged into `main` (confirmed via `gh pr list --state all`, all three PRs show `MERGED`) and serve no further purpose — they are leftover pointers from already-completed work. Since they contain the same leaked-secret commit in their history, the simplest way to eliminate that copy is to delete the ref entirely (YAGNI — no rewrite complexity needed for branches nobody needs anymore) rather than filter-repo-rewrite three additional refs. No tags exist, so no tag-handling is needed.

**Alternatives considered**: Rewriting all remote branches in the same `filter-repo` pass — technically possible (filter-repo handles this natively) but adds no security value here since those branches are being deleted anyway; rejected as unnecessary extra verification surface.

## 3. Residual exposure after force-push (GitHub caching)

**Decision**: After the rewrite and force-push, additionally submit a GitHub Support request to purge cached views/forks of the removed commits, and treat the credentials as compromised regardless (already captured as a spec Assumption).

**Rationale**: GitHub documents that even after a history rewrite and force-push, old commits can remain reachable for a period through cached pull request views, forks made before the rewrite, and GitHub's internal caches, until GitHub purges them (which for public repositories GitHub explicitly says may require a support request for full cache invalidation). This is a known, documented limitation of any history-rewrite approach — not specific to `filter-repo`.

**Alternatives considered**: Relying solely on the force-push — rejected as insufficient to satisfy FR-003 ("standard tools... can no longer retrieve the removed content") given GitHub's own documented caching behavior.

## 4. CodeQL setup mechanism: default vs. advanced

**Decision**: Use CodeQL "advanced setup" — a dedicated `.github/workflows/codeql.yml` using `github/codeql-action/init` + `analyze`, with `languages: javascript-typescript`, triggered on `pull_request` (targeting `main`) and `push` (to `main`).

**Rationale**: The repository already manages its CI as an explicit, version-controlled workflow (`ci.yml`) rather than relying on any GitHub-managed defaults, so an advanced-setup `codeql.yml` is consistent with the existing pattern and keeps the trigger scope (PR + push to `main`) explicit and reviewable in-repo, matching FR-006. Default (GitHub-managed) setup is UI/API-configured outside the repo and offers less control over trigger scope and job naming, which matters here because the exact job/check name must be referenceable from branch protection.

**Alternatives considered**: GitHub-managed "default setup" (one-click, no workflow file) — simpler to turn on, but configuration lives outside version control and offers less control over exactly when it runs; rejected in favor of explicit, reviewable configuration consistent with the rest of the pipeline.

## 5. Enforcing the severity threshold (High/Critical blocks, Medium/Low doesn't)

**Decision**: Use GitHub's native branch-protection rule "Require code scanning results" on `main`, selecting the CodeQL tool with a minimum severity of **High**, rather than writing a custom script to parse SARIF output and set an exit code.

**Rationale**: GitHub natively supports configuring a branch-protection check that only blocks merge when code-scanning alerts of a chosen severity (or above) are open, directly satisfying FR-011 (High/Critical blocks, Medium/Low/style doesn't) without any custom scripting, extra maintenance surface, or SARIF-parsing logic. This is simpler (KISS/YAGNI, Constitution Principle V) than a bespoke gate script.

**Alternatives considered**: A custom step that downloads the SARIF results and fails the job above a severity threshold — rejected as unnecessary custom logic duplicating a feature GitHub already provides natively.

## 6. New-vs-pre-existing findings (only diff-introduced findings block)

**Decision**: Rely on CodeQL's built-in pull-request analysis behavior, which compares against the PR's base branch and flags newly introduced alerts distinctly from pre-existing ones; branch protection blocking is scoped to alerts associated with the PR's HEAD commit, which naturally excludes alerts that already existed on `main` before the PR.

**Rationale**: This is CodeQL's default behavior for `pull_request`-triggered analysis and requires no additional configuration, directly satisfying the spec's assumption that legacy findings don't retroactively block unrelated future PRs.

**Alternatives considered**: A baseline-snapshot-and-diff custom script — rejected as unnecessary; the built-in behavior already provides this.

## 7. CI trigger model change (constitution alignment)

**Decision**: Extend `ci.yml`'s `on:` block to include `pull_request` (targeting `main`) alongside the existing `push: branches: [main]`, and add the new `codeql.yml` with the same trigger scope. Treat the constitution's "Development Workflow & Quality Gates" section update as a required companion task (via `/speckit-constitution`), not an optional follow-up.

**Rationale**: FR-006/FR-010 require both the existing checks and the new CodeQL check to run on PRs as required status checks; this is a direct, minimal edit to the existing workflow's trigger list rather than a restructuring of the jobs themselves.

**Alternatives considered**: Standing up a wholly separate PR-only workflow duplicating the `checks`/`e2e` jobs — rejected as needless duplication (YAGNI) when extending the existing triggers achieves the same outcome with less maintenance surface.
