# Contract: `cleanup-orphans.mjs` CLI

Implements FR-008 (on-demand removal of authorized domains left behind when the normal per-PR removal step never ran). Invoked only from the `workflow_dispatch`-triggered job in `ci.yml` — never automatically on a schedule (per the resolved clarification: manual/on-demand only for this version).

## Invocation

```
node scripts/firebase-preview-domains/cleanup-orphans.mjs \
  --project <staging-firebase-project-id> \
  --open-pr-numbers <comma-separated PR numbers>
```

- `--project` (required): same constraint as in [sync-domain-cli.md](./sync-domain-cli.md) — MUST be the staging project, never production.
- `--open-pr-numbers` (required): the full set of currently-open pull request numbers, as determined by the calling job via `gh pr list --state open --json number`. This script does not call the GitHub API itself — it only reasons about Firebase state and the cache.

## Environment

- `GOOGLE_ACCESS_TOKEN` (required): same as `sync-domain.mjs`.
- No `GH_TOKEN`/`gh cache` dependency: the GitHub Cache REST API and the `gh cache` CLI only expose cache *metadata* (key, ref, size, timestamps) for listing/deleting — neither exposes a way to read a cache entry's stored content outside of the `actions/cache` action running inside a workflow step. Instead, this script imports the official `@actions/cache` npm package and calls its `restoreCache()` function once per open PR number (from `--open-pr-numbers`) to resolve each entry's actual hostname, building the set of hostnames that are legitimately still in use.

## Behavior

1. `GET` the current `authorizedDomains` for `--project`.
2. Build the "still legitimate" set: for each open PR number, look up its `preview-domain-pr-<N>` cache entry (if any) and take its hostname.
3. Any entry in `authorizedDomains` that is not in the "still legitimate" set and is not one of Firebase's own default entries is an orphan; remove it.
4. `PATCH` the resulting array back with `updateMask=authorizedDomains`, in the same `firebase-staging-authorized-domains` concurrency group as `sync-domain.mjs` (see [research.md §4](../research.md)) so a concurrent PR redeploy can't race with this cleanup.
5. Print the list of removed hostnames (for the workflow run's log) — this is a manually-triggered maintenance action, so its output is the operator's confirmation of what happened.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Ran to completion (including the case where zero orphans were found). |
| `1` | Any failure reaching Firebase or restoring a cache entry via `@actions/cache`. |
