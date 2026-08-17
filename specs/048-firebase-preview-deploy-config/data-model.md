# Data Model: Working Firebase-Backed Preview Deployments

This feature has no application data model — no Firestore schema, no new collections or documents. Its "entities" are configuration objects living in Firebase, Vercel, GitHub, and the OAuth provider consoles. They are documented here (attributes, source of truth, lifecycle) in place of a traditional data model, mirroring how [008-firebase-preview-domains/data-model.md](../008-firebase-preview-domains/data-model.md) treated its own config-only state.

## Staging Firebase Project (`retrorocket-staging`)

| Attribute | Value / Source of truth |
|---|---|
| Project ID | `retrorocket-staging` (fixed, per spec.md Assumptions) |
| Firestore database | Must exist (Native mode); provisioned once, not per-PR (research.md §2) |
| Security rules | `retro-rocket/firestore.rules`, deployed via `firebase deploy --only firestore:rules --project retrorocket-staging`; source of truth is the repo file, not the console |
| Authorized domains (Identity Toolkit `authorizedDomains`) | Managed by 008's existing `sync-domain.mjs`/`cleanup-orphans.mjs`, unchanged by this feature |
| Federated Google/GitHub sign-in method toggles | Not required by this app's actual sign-in path (research.md §2) — not tracked as a hard requirement |

**Lifecycle**: Provisioned once as part of this feature's initial setup; not created/destroyed per PR. Contrast with the per-PR entities below.

## Preview Environment Configuration (Vercel "Preview" scope)

One value per variable name, applied to every Preview deployment unless overridden per the alias-slot mechanism below.

| Variable | Status before this feature | This feature's action |
|---|---|---|
| `VITE_FIREBASE_API_KEY` / `AUTH_DOMAIN` / `PROJECT_ID` / `STORAGE_BUCKET` / `MESSAGING_SENDER_ID` / `APP_ID` | Present, already pointing at `retrorocket-staging` | None — verify only |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | Present | None — verify only |
| `SESSION_SIGNING_KEY` | **Missing** (Production-only) | Add, dedicated Preview value (research.md §3) |
| `FIREBASE_SERVICE_ACCOUNT` | **Missing** (Production-only) | Add, scoped to `retrorocket-staging` (research.md §3) |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | **Missing** (Production-only) | Add (research.md §3) |
| `OAUTH_REDIRECT_BASE_URL` | **Missing**, and not settable as a single static Preview value (research.md §1) | Sourced per-deploy from the assigned PR Preview Alias Slot, injected as a build-time override |

**Lifecycle**: The five static variables above are set once and persist across all preview deployments. `OAUTH_REDIRECT_BASE_URL` is instead computed fresh on every `deploy-preview` run.

## Deployment Credential (GitHub Actions secret)

| Attribute | Value |
|---|---|
| Names | `FIREBASE_STAGING_SA_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RELEASE_TOKEN` |
| Status | All already present (confirmed via `gh secret list`) |
| This feature's action | Verify each is valid against the *current* `retrorocket-staging`/Vercel project via a live PR (research.md §4); rotate only what verification shows is broken |
| Scope | `FIREBASE_STAGING_SA_KEY`'s underlying service account MUST hold exactly `roles/identitytoolkit.editor` on `retrorocket-staging` — no broader role (per 008's README) |

**Lifecycle**: Long-lived, not per-PR. Rotation is manual and out of this feature's normal-path scope (only triggered if verification finds a stale credential).

## Sign-In Provider Credential (Google / GitHub OAuth application)

| Attribute | Value |
|---|---|
| Providers | Google OAuth 2.0 Client (Web application type), GitHub OAuth App |
| Redirect URIs registered | The 5 PR Preview Alias Slot URLs' `/api/auth/callback/{google,github}` addresses (research.md §1) — a fixed, manually-maintained list, not per-PR |
| Reuse vs. dedicated | Either reuse production's applications (adding the 5 slot URIs) or use dedicated staging applications — either satisfies spec.md Assumptions; a dedicated staging application is the safer default (research.md §3) |

**Lifecycle**: Registered once, manually, as part of this feature's setup. Not created/destroyed per PR — this is precisely what makes it achievable without a redirect-URI-management API (research.md §1).

## PR Preview Alias Slot (new, per this feature)

| Attribute | Value |
|---|---|
| Identity | One of a fixed pool (default 5) of alias hostnames, e.g. `retro-rocket-pr-slot-{1..5}.vercel.app` |
| Assignment | `pull_request.number % 5`, computed by `retro-rocket/scripts/firebase-preview-alias/assign-alias.mjs` and invoked from the `deploy-preview` job (contracts/pr-preview-alias-cli.md) |
| Target | Repointed via `vercel alias set <this-PR's-newest-deploy-url> <assigned-slot>` on every (re)deploy for the PR holding that slot |
| Collision behavior | A newly-assigned PR silently takes over a slot already held by another open PR once concurrently-open PRs exceed the pool size (documented limitation, research.md §1 / FR-010) |
| Relationship to 008's authorized-domain entry | Independent, unchanged mechanism (008 continues tracking the raw per-deploy unique URL); whether the two should be unified is left to live verification, not assumed here |

**Lifecycle**: Assigned when a PR's first preview deploys; repointed (not re-created) on every redeploy; implicitly released (no action needed) when the PR closes, since the next PR assigned that slot number simply repoints it again.
