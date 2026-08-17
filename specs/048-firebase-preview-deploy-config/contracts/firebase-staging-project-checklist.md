# Contract: `retrorocket-staging` One-Time Project Checklist

Everything below is a one-time setup action against the `retrorocket-staging` Firebase project (https://console.firebase.google.com/project/retrorocket-staging/overview) — none of it repeats per pull request. This is the concrete checklist FR-001/FR-002/FR-003 resolve to (research.md §2).

## Firestore

- [X] A Firestore database exists in Native mode for `retrorocket-staging` (console "Create database", or `firebase firestore:databases:create --project retrorocket-staging`). **Confirmed**: already existed (created 2026-07-22, `gcloud firestore databases list`) — no action needed.
- [X] `retro-rocket/firestore.rules` is deployed to this project: `firebase deploy --only firestore:rules --project retrorocket-staging`. **Done** via the Firebase Rules REST API (`firebase` CLI's own refresh token was dead — worked around with `gcloud auth print-access-token`). Found and fixed real drift: the previously-deployed ruleset was missing the MCP-connector deny rules (feature 015); now byte-identical to the repo.

## Authentication / Identity Toolkit

- [X] The service account behind `FIREBASE_STAGING_SA_KEY` holds exactly `roles/identitytoolkit.editor` on `retrorocket-staging` (per `retro-rocket/scripts/firebase-preview-domains/README.md`'s "One-time GCP provisioning" — confirm this was actually completed against *this* project, not assumed from the secret's existence). **Finding**: `preview-domain-sync@retrorocket-staging.iam.gserviceaccount.com` actually holds `roles/identitytoolkit.admin`, not `identitytoolkit.editor` — a superset, so 008's automation works, but broader than the least-privilege role 008's README documents as intentional. Not narrowed as part of this feature (flagged to the user instead — IAM tightening is a security-relevant change outside this feature's ask).
- [X] A separate service-account credential (or the same one, if its scope is widened — not recommended, see research.md §3) with Firebase Admin custom-token-minting rights exists, and its JSON is what gets stored as Vercel's Preview-scoped `FIREBASE_SERVICE_ACCOUNT`. **Done**: reused the existing default `firebase-adminsdk-fbsvc@retrorocket-staging.iam.gserviceaccount.com` (already had `firebaseauth.admin`); generated a fresh key, stored in Vercel Preview (T011).
- [X] Federated Google/GitHub sign-in method toggles: **not required** by this app's actual sign-in path (it uses `signInWithCustomToken`, not federated popup/redirect sign-in) — leave as-is unless a future feature needs them. **Confirmed unchanged**, per FR-001's amended wording (`/speckit-analyze`, 2026-08-17).

## Explicitly NOT required by this feature

- No change to the production Firebase project (FR-007) — this checklist only ever targets `retrorocket-staging`.
- No new Firestore collections, documents, or schema — same schema as production.
