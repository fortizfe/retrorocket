# Research: Automated Firebase Preview Domain Lifecycle

## 1. API surface for reading/writing `authorizedDomains`

**Decision**: Use the Identity Platform / Identity Toolkit Admin API v2 `projects.getConfig` / `projects.updateConfig` REST endpoints directly (no SDK wrapper):

- `GET https://identitytoolkit.googleapis.com/admin/v2/projects/{projectId}/config` → returns the project `Config` resource, which includes `authorizedDomains: string[]` ("List of domains authorized for OAuth redirects").
- `PATCH https://identitytoolkit.googleapis.com/admin/v2/projects/{projectId}/config?updateMask=authorizedDomains` with body `{ "authorizedDomains": [...] }` → replaces the full array (this API does not offer an atomic append/remove-single-element operation; every write is a full-array replace).
- Required OAuth scope: `https://www.googleapis.com/auth/cloud-platform` (also accepted: `identitytoolkit` or `firebase` scopes).

**Rationale**: This is the only interface Google exposes for this data. Neither the Firebase CLI nor the Firebase Admin SDK (Node, Go, etc.) expose authorized-domain management — confirmed by an open Firebase Admin SDK feature request asking for exactly this capability, still unresolved. The REST API is the documented, stable way to do it.

**Alternatives considered**:
- *Firebase CLI* — rejected, no `firebase auth:domains` (or equivalent) command exists.
- *Firebase Admin SDK* — rejected, no method for authorized domains in any language SDK.
- *Manual console step per PR* — rejected outright, it's the exact problem this feature removes (FR-001/FR-009).

**Sources**: [Config resource reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/Config), [projects.updateConfig reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig), [firebase-admin-go feature request #441](https://github.com/firebase/firebase-admin-go/issues/441)

## 2. Credentials & least-privilege IAM role

**Decision**: A dedicated Google Cloud service account, created in the **staging Firebase project only** (`retrorocket-staging`), granted the predefined role `roles/identitytoolkit.editor` ("Identity Toolkit editor" — write access to Identity Toolkit resources, explicitly includes `firebaseauth.configs.get` and `firebaseauth.configs.update`). The key is stored as a GitHub Actions secret (e.g. `FIREBASE_STAGING_SA_KEY`) and exchanged for a short-lived OAuth access token inside the workflow using the official `google-github-actions/auth` action with `token_format: access_token` (its default `access_token_scopes` is already `cloud-platform`, which is sufficient — no override needed).

**Rationale**: `roles/identitytoolkit.editor` is the narrowest predefined role that covers both permissions this feature needs, without also granting `roles/identitytoolkit.admin`'s IAM-policy-management permissions. Because the service account is created inside the staging project and IAM bindings are project-scoped, it has no visibility into or permissions on the production Firebase project at all — this is what makes FR-004 ("MUST NOT read or modify the production project") structurally true rather than just a convention the workflow code has to remember to honor. `google-github-actions/auth` is Google's own maintained action (satisfies the "prefer proven third-party tooling" principle) and avoids hand-rolling a JWT/OAuth exchange.

**Alternatives considered**:
- `roles/identitytoolkit.admin` — rejected, broader than needed (adds IAM policy control this automation never uses).
- Workload Identity Federation instead of a long-lived service account key — noted as a stronger-security follow-up, but this repo's existing CI secrets (`VERCEL_TOKEN`, etc.) already follow the plain-secret pattern, and setting up a WIF pool is disproportionate for a single, narrowly-scoped, project-local service account. Can be revisited later without changing any of this feature's application-level logic.

**Sources**: [Identity Toolkit IAM roles](https://docs.cloud.google.com/iam/docs/roles-permissions/identitytoolkit), [google-github-actions/auth README](https://github.com/google-github-actions/auth/blob/main/README.md)

## 3. Tracking "the currently-authorized domain for this PR" across workflow runs

**Decision**: `actions/cache` (the official GitHub Actions cache action), keyed as `preview-domain-pr-<PR number>`, storing a one-line file containing the exact hostname currently authorized for that PR. Each redeploy restores this key, diffs against the newly-created deployment's hostname, and saves the key again with the new value.

**Rationale**: The problem statement (FR-002) requires knowing "what was the previous preview URL for this PR" in a workflow run that has no memory of the previous run. `actions/cache` is the standard, already-proven-in-the-ecosystem primitive for exactly this kind of small cross-run state, and needs no new infrastructure (database, external key-value store, etc.) — consistent with the Simplicity (KISS/YAGNI) principle. It is scoped per PR number, which trivially satisfies FR-005 (no cross-PR interference on this axis).

**Alternatives considered**:
- *Parse the existing sticky PR comment* (`marocchino/sticky-pull-request-comment`, already used in `ci.yml` to post the preview URL) to recover the previous URL — rejected as more fragile (couples this feature to another job's comment formatting/markdown) for no real benefit over the purpose-built cache action.
- *A new external datastore* (e.g. a Firestore doc, a GitHub Gist) — rejected as unjustified new infrastructure for a single string per open PR.

## 4. Serializing concurrent writes to the same `authorizedDomains` array

**Decision**: Because `updateConfig` always replaces the *entire* array, two workflow runs (for two different PRs) that both read-modify-write concurrently could silently drop each other's change (lost update). This is prevented with a GitHub Actions `concurrency` group shared by every job that mutates the staging project's authorized domains (e.g. `group: firebase-staging-authorized-domains`, `cancel-in-progress: false`), scoped to *only* the small "sync domain" / "cleanup on close" jobs — not the whole `deploy-preview` job — so unrelated PRs still build and deploy in parallel; only the brief read-modify-write against Firebase's config is queued and executed one at a time, repo-wide.

**Rationale**: `concurrency` is a built-in GitHub Actions primitive (no new dependency), and queuing (rather than canceling) guarantees every PR's add/remove eventually runs to completion rather than being dropped. This directly satisfies FR-005's "no cross-PR interference" for the one place where interference could actually happen.

**Alternatives considered**:
- *Optimistic retry with re-fetch* (read the list again immediately before every write attempt, retry N times) — rejected as strictly weaker: it narrows the race window but does not close it, whereas a concurrency group closes it entirely, for less code.
- *No mitigation* — rejected, directly risks silently un-authorizing another open PR's preview, which is exactly the failure mode FR-005 rules out.

## 5. Implementation language/runtime for the sync logic

**Decision**: A small Node.js script (plain ESM `.mjs`, no TypeScript build step) using Node 22's built-in `fetch`, invoked directly from `ci.yml` via `node scripts/firebase-preview-domains/<script>.mjs`. The pure list-diffing logic (given current domains + the new hostname + the previous hostname, compute the next array) is isolated in its own exported function so it can be unit-tested with the project's existing Vitest setup without mocking network calls.

**Rationale**: The runner already provisions Node 22 (matches `actions/setup-node` in `ci.yml`), so no new toolchain is needed. Keeping it plain JavaScript avoids introducing a TypeScript-for-scripts pipeline (`tsx`/`ts-node`, a new devDependency and a new run-configuration to maintain) for a ~50-line script — the Simplicity principle favors the smallest solution here, and this script sits outside the app's `tsconfig` (`retro-rocket/src`), so the "TypeScript strict mode MUST remain on" constitution rule (which governs the app's existing compiled surface) is not being weakened or bypassed by this choice.

**Alternatives considered**:
- *Inline `bash` + `curl` + `jq` directly in the YAML steps* — rejected: the list-diff logic (dedupe, remove-if-present, preserve unrelated entries) is exactly the kind of logic Principle I (TDD, NON-NEGOTIABLE) says must have a preceding test, and that is materially harder to unit-test as inline YAML than as an importable function.
- *TypeScript via `tsx`* — rejected for this size of script; revisit if the automation grows enough logic to justify it.
