# Phase 0 Research: Working Firebase-Backed Preview Deployments

## §1. How can sign-in work on a pull request's preview URL using configuration only?

**Decision**: Maintain a small, fixed-size pool of pre-registered alias domains (default **5**, e.g. `retro-rocket-pr-slot-1.vercel.app` … `retro-rocket-pr-slot-5.vercel.app`), assign each open pull request one slot (`pr_number % 5`, or first-available), and repoint that slot's alias to the PR's newest deployment on every (re)deploy using `vercel alias set`. Set `OAUTH_REDIRECT_BASE_URL` for that build to the assigned slot's URL (a build-time override injected between `vercel pull` and `vercel build` in `ci.yml`, not a code change). Register all 5 slot URLs' `/api/auth/callback/google` and `/api/auth/callback/github` addresses as authorized redirect URIs **once, by hand**, in the Google Cloud OAuth Client and the GitHub OAuth App consoles.

**Rationale**:
- Confirmed by reading `server/src/http/auth-wiring.ts` and `mcp-wiring.ts`: `OAUTH_REDIRECT_BASE_URL` is read once from `process.env` as a single static value, with no per-request derivation from the incoming host anywhere in the codebase. A per-PR-unique redirect base is therefore not achievable by supplying a different value per deployment through the normal single Vercel "Preview" environment variable — some per-deployment mechanism is required, and it must not touch that code (Clarifications).
- Vercel plainly does **not** link a CLI-only deployment (`vercel pull` / `vercel build` / `vercel deploy --prebuilt`, which is what `ci.yml`'s `deploy-preview` job already uses, per `git.deploymentEnabled: false`) to git branch metadata automatically — [Vercel's own knowledge base](https://vercel.com/kb/guide/branch-variables-and-domains-not-linked-to-cli-deployments) states this explicitly: "the git meta information is missing and so the deployment on Vercel is not linked to a specific branch." Branch-scoped Preview environment variables (`vercel env add VAR preview <branch>`) and Vercel's own git-branch alias (`VERCEL_BRANCH_URL`) therefore do not apply out of the box to this pipeline without extra `--meta`/`--git-branch` wiring — and even with that wiring, the branch alias's hostname still isn't known *before* the OAuth apps' redirect-URI allowlists are configured, because provider consoles need the exact string in advance.
- Both OAuth providers now support a small list of exact-match redirect URIs rather than exactly one — Google's OAuth clients already did, and GitHub OAuth Apps gained support for **up to 10** as of [a platform change dated 2026-08-14](https://github.blog/changelog/2026-08-14-multiple-redirect-uris-and-token-refresh-for-oauth-apps/), three days before this plan. A small *fixed* pool (well under that shared ceiling) is therefore realistic to pre-register.
- Neither provider exposes a reliable public API to manage that list programmatically today: Google Cloud's OAuth 2.0 (Web application) Client redirect URIs have no generally-available management API (an open feature request, unstable/undocumented Terraform support); GitHub's REST API surface for OAuth Apps covers authorizations/tokens, not editing the App's own configured callback URLs. This rules out replicating 008's fully-automated add/remove-per-PR pattern (which works only because Identity Toolkit's `authorizedDomains` *does* have a clean, documented, already-used API) for the OAuth redirect URIs specifically. A fixed pool, registered by hand once, sidesteps needing that API at all.
- `vercel alias set <deployment-url> <alias>` is a supported, scriptable CLI operation for repointing a stable alias without relying on git integration, confirmed via Vercel's own docs ("If you're not using the Git Integration, `vercel alias` is a great solution … based on Git branches, or other heuristics").
- This whole mechanism lives in `ci.yml` workflow steps plus one small, tested Node script (`retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs` + `assign-alias.test.ts`) — the same category of change, and the same TDD treatment, 008 already used for its own CI-only automation (`domain-diff.mjs`), not `retro-rocket/src`/`server/src`/`api`, honoring the Clarifications' configuration-only constraint. (`/speckit-analyze`, 2026-08-17, finding E1: the slot arithmetic is real conditional logic, not pure orchestration, so it gets extracted and tested rather than left inline — matching 008's own precedent instead of a narrower reading of it.)

**Alternatives considered**:
- *Read Vercel's own `VERCEL_URL`/`VERCEL_BRANCH_URL` at runtime in `auth-wiring.ts` instead of the static `OAUTH_REDIRECT_BASE_URL`.* Rejected — this is exactly the application-code change the Clarifications ruled out of scope. Recorded here so a follow-up feature (FR-010) has it as the "real" fix if the slot-pool approach proves too limiting in practice.
- *Per-branch Vercel environment variable scoping keyed to the git-branch alias.* Rejected as the primary mechanism — technically real (confirmed via Vercel docs), but requires additional `--meta`/`--git-branch` CLI wiring on every step *and* still needs the resulting hostname pre-registered with both OAuth providers by hand per branch, which is no simpler than the fixed slot pool and scales worse (a new hostname per PR vs. a bounded, reusable set).
- *Fully automate the OAuth apps' redirect-URI lists per PR, mirroring 008 exactly.* Rejected — no supported public API exists for either provider to do this safely and repeatably; scripting against undocumented/console-only surfaces would be fragile and outside what CI credentials can reasonably be scoped to.
- *One single shared preview alias for all PRs' OAuth flows (pool size 1).* Rejected — fails SC-004 (two or more PRs must have independently-working sign-in at the same time); the newest deploy would silently steal the only slot from whichever PR held it before.

**Known limitation (feeds FR-010 / SC-006)**: With a pool of 5, the 6th simultaneously-open PR needing sign-in reuses another open PR's slot, and that PR's sign-in silently starts failing (best-effort collision, not a hard block on that PR's non-auth functionality). This is the honest boundary of what's achievable via configuration alone and must be captured as the FR-010 follow-up note rather than hidden. Whether the pool size needs to be larger than 5 in practice should be confirmed during the live verification in quickstart.md / User Story 3, not assumed here.

---

## §2. What must actually be provisioned in the `retrorocket-staging` Firebase project?

**Decision**: Confirm/provision, directly in the `retrorocket-staging` project (never production):
1. A Firestore database exists (Native mode) — `firebase.json`/`firestore.rules` configure rules and emulator ports but do not themselves provision a database; this is a one-time console/CLI step (`firebase firestore:databases:create` or the console's "Create database" flow).
2. `retro-rocket/firestore.rules` is deployed to `retrorocket-staging` (`firebase deploy --only firestore:rules --project retrorocket-staging`), so preview behavior enforces the same rules as production (FR-002) without hand-copying rule text.
3. The Identity Toolkit `authorizedDomains` list already used by 008's `sync-domain.mjs` is confirmed reachable and correctly scoped for this project (see §3) — this is 008's existing mechanism, unchanged by this feature, just verified end-to-end against the real project for the first time.

**Rationale**: Confirmed by reading `retro-rocket/firestore.rules` and `retro-rocket/firebase.json` — both configure rules/emulators, neither provisions a database. Confirmed by reading `retro-rocket/src/lib/services/firebase.ts` and `retro-rocket/src/lib/contexts/UserContext.tsx` that the frontend authenticates via `signInWithCustomToken`, never `signInWithPopup`/`GoogleAuthProvider`/`GithubAuthProvider` — so Firebase Authentication's own federated "Google"/"GitHub" sign-in method toggles (visible in the console's Sign-in method tab) are **not** on this app's actual sign-in path and are not required by this feature, even though they might reasonably be assumed necessary at a glance. What the app's sign-in path actually depends on inside Firebase is: a reachable Firestore database, the Admin SDK's ability to mint custom tokens (governed by the service-account credential in `FIREBASE_SERVICE_ACCOUNT`, not by console toggles), and the authorized-domains list 008 already automates.

**Alternatives considered**: Enabling the Google/GitHub federated sign-in method toggles anyway "for parity with production" — not rejected outright (harmless, low effort), but explicitly not a requirement; noted here so a future task doesn't spend real effort chasing it as if it were load-bearing.

---

## §3. Which Vercel Preview environment variables are missing, and how should they be sourced?

**Decision**: Add the following to Vercel's **Preview** scope (confirmed absent via `vercel env ls` / `vercel env pull --environment=preview` — present only under Production today):

| Variable | Source for the Preview value |
|---|---|
| `SESSION_SIGNING_KEY` | A newly generated signing key dedicated to Preview (not copied from Production — Assumptions: preview and production credentials are independently rotatable and a compromised preview build must not expose a production-valid session key). |
| `FIREBASE_SERVICE_ACCOUNT` | The stringified JSON key for a service account scoped to `retrorocket-staging` with Firebase Admin / custom-token-minting rights (distinct from `FIREBASE_STAGING_SA_KEY`, which is scoped only to `roles/identitytoolkit.editor` for 008's narrower domain-sync use — reusing it here would either under-permission it or over-broaden a credential 008 deliberately scoped narrowly). |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Either production's existing Google OAuth Client with the 5 slot redirect URIs added (§1), or a dedicated staging Client — either is acceptable per spec.md Assumptions; a dedicated Client is the safer default so a compromised preview build can't spend production's OAuth quota or be confused with production traffic in Google's console. |
| `OAUTH_REDIRECT_BASE_URL` | Not a single static Preview value — sourced per-deploy from the assigned slot (§1), via a build-time override rather than the persistent Vercel env var store. |

Already correctly present for Preview and left untouched: `VITE_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/STORAGE_BUCKET/MESSAGING_SENDER_ID/APP_ID` (already pointing at `retrorocket-staging`, confirmed via `vercel env pull`), `GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET` (already scoped to Preview+Production), and the Redis/KV variables (already scoped to all three environments).

**Rationale**: `server/src/http/auth-wiring.ts` and `mcp-wiring.ts` fail *soft*, not hard, when these are missing (confirmed by reading the code): `buildAuthDeps` returns `null` and logs `auth_disabled` rather than crashing, and each OAuth provider is registered independently (missing Google's vars only disables Google, not the whole backend). This explains why the current preview deployment doesn't outright crash — it silently serves a backend with sign-in quietly turned off, which matches "login doesn't work" without a loud error, and is exactly the kind of failure SC-005 asks to make attributable instead of mysterious.

**Alternatives considered**: Reusing `FIREBASE_STAGING_SA_KEY` for both the domain-sync automation and the app's own custom-token minting — rejected; 008's README explicitly scoped that credential to the least-privilege `roles/identitytoolkit.editor` role specifically because it *doesn't* need Admin SDK token-minting rights, and widening it would weaken that already-deliberate choice.

---

## §4. How should existing GitHub Actions secrets be verified rather than assumed valid?

**Decision**: Before relying on them, confirm each of the already-present secrets (`FIREBASE_STAGING_SA_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RELEASE_TOKEN`) actually functions against the *current* `retrorocket-staging` project and the current Vercel project, by exercising the real pipeline end to end (User Story 3) rather than inspecting secret values (impossible — GitHub never exposes secret contents) or trusting their creation date. Specifically confirm `FIREBASE_STAGING_SA_KEY`'s underlying service account still holds `roles/identitytoolkit.editor` on `retrorocket-staging` (the role 008's own README documents as required) by watching `sync-preview-domain` succeed on a live PR.

**Rationale**: `gh secret list` confirms these secrets exist and their last-updated timestamps, but GitHub deliberately never exposes secret values, so validity can only be established by observing the workflows that consume them succeed. The Edge Cases section of spec.md explicitly anticipates this ("a credential that already existed before this feature … turns out to be stale, expired, or scoped to the wrong project").

**Alternatives considered**: Proactively rotating every existing secret regardless of whether it still works — rejected as unnecessary churn (Simplicity principle); rotate only what live verification shows is actually broken.

---

## §5. How is FR-010's "diagnose and document, don't code around it" fallback exercised?

**Decision**: The live verification pass required by User Story 3 / FR-009 *is* the diagnosis step. If, after every item above is configured, sign-in still fails on a real PR's preview (e.g. the alias-slot pool proves insufficient, or a provider-side limitation not caught by this research surfaces), the specific observed failure (which check, which log line, which HTTP status) is written up as a follow-up feature request rather than patched with a code change, per FR-010/SC-006.

**Rationale**: This keeps the fallback concrete and testable instead of hypothetical — it reuses the same pull request already required for FR-009, rather than inventing a separate diagnostic procedure.
