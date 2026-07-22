# Data Model: Automated Firebase Preview Domain Lifecycle

This feature has no application-level (Firestore) data model — it manipulates two pieces of external state, neither of which lives in this repo's product database. Documented here for traceability back to the spec's Key Entities.

## Authorized Sign-In Domain

Not a record this system owns; it is one string entry inside a single shared array (`authorizedDomains`) on the **staging** Firebase project's Identity Toolkit `Config` resource (see [research.md §1](./research.md)).

| Field | Type | Notes |
|---|---|---|
| `authorizedDomains[i]` | `string` | A bare hostname (no scheme, no path) — e.g. `retro-rocket-7h2k9s3fa-org-team.vercel.app`. Firebase rejects/ignores scheme prefixes; the sync script MUST strip `https://` from the Vercel deploy URL before writing. |

**Invariants** (enforced by the sync script, not by the Firebase API itself):
- Exactly one entry per currently-open pull request that has completed at least one successful preview deployment (spec Assumption: "at most one preview URL needs to be authorized per open pull request at any given time").
- The default entries Firebase provisions on every project (`localhost`, `*.firebaseapp.com` equivalents, etc.) are never touched — the script only ever adds/removes the exact hostnames it itself is responsible for.
- Never read or written for the **production** Firebase project by this feature (FR-004).

**Lifecycle** (state transitions, corresponding to FR-001/002/003):

```
(absent) --[PR's first preview deploy succeeds]--> present (this PR's current URL)
present  --[PR redeploys to a new URL]-------------> present (old entry removed, new entry added)
present  --[PR closed or merged]-------------------> (absent)
present  --[normal removal step never ran]---------> (absent, orphaned) --[on-demand cleanup, FR-008]--> (absent)
```

## Pull Request Preview Registration

The tracked link between a pull request and its currently-authorized domain. Implemented as a GitHub Actions cache entry (see [research.md §3](./research.md)), not a database row.

| Field | Type | Notes |
|---|---|---|
| Cache key | `string` | `preview-domain-pr-<PR number>` — one key per pull request. |
| Cache content | `string` | The exact hostname (matching the current `authorizedDomains` entry for this PR), written as the sole line of a small file. |

**Invariants**:
- At most one live cache entry per open pull request (spec Assumption).
- Absence of a cache entry for a PR is a valid, expected state (a PR that never had a successful preview deployment, or one that has already been cleaned up) — read misses MUST be treated as "nothing to remove," not an error (spec Edge Case, User Story 3 Acceptance Scenario 2).

## Preview Deployment (reference only)

Not created or stored by this feature — it is the existing Vercel deployment produced by the `deploy-preview` job already in `ci.yml`. This feature only reads its resulting URL (`steps.deploy.outputs.url`) as input.
