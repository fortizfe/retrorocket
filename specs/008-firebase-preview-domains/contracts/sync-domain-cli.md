# Contract: `sync-domain.mjs` CLI

The only "interface" this feature exposes is a small CLI script that `ci.yml`'s jobs invoke as a step. This is its contract with the workflow YAML that calls it (and, transitively, with the two Google APIs it wraps — see [research.md](../research.md) for those).

## Invocation

```
node scripts/firebase-preview-domains/sync-domain.mjs \
  --project <staging-firebase-project-id> \
  [--add <hostname>] \
  [--remove <hostname>]
```

- `--project` (required): the target Firebase/GCP project ID. The workflow MUST always pass the staging project's ID here — never the production project's (FR-004).
- `--add` (optional): exact hostname (no scheme) to ensure is present in `authorizedDomains`. Used on preview-deploy jobs.
- `--remove` (optional): exact hostname (no scheme) to ensure is absent from `authorizedDomains`. Used on redeploy (previous URL) and on PR-close jobs.
- At least one of `--add` / `--remove` MUST be supplied.

## Environment

- `GOOGLE_ACCESS_TOKEN` (required): a valid OAuth 2.0 access token with the `cloud-platform` scope for the target project, produced by the `google-github-actions/auth` step earlier in the same job. The script does not perform any credential exchange itself.

## Behavior

1. `GET` the current `authorizedDomains` for `--project`.
2. Compute the next array: remove `--remove` if present (no-op if absent), then add `--add` if not already present (no-op if already present). Order of operations matters for FR-006: when both flags are given, the resulting request body always contains the union of "current minus removed plus added" in a single `PATCH` — the new domain is never dependent on the old one having been removed first.
3. `PATCH` the updated array back with `updateMask=authorizedDomains`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | The requested add/remove was applied (or was already true — e.g. `--add`ing a hostname already present is a successful no-op). |
| `1` | Any failure: missing/invalid arguments, missing `GOOGLE_ACCESS_TOKEN`, or a non-2xx response from either the `GET` or the `PATCH` call. |

A non-zero exit MUST fail the CI step (and therefore the job) exactly as any other shell command failure would — this is what implements FR-007 ("block the preview deployment when registering the domain does not succeed"): the workflow needs no special-case error handling, ordinary step-failure propagation is sufficient.

## Non-goals

- This script never touches the PR↔domain cache (`actions/cache` restore/save) — that stays in the calling job's steps, so the script itself has no GitHub-specific knowledge (testable as a pure "talk to Firebase" tool).
- This script never decides *which* hostname to add/remove — that decision (reading the deploy output, reading the restored cache entry) is the calling job's responsibility.
