# Contract: `retrorocket-staging` One-Time Project Checklist

Everything below is a one-time setup action against the `retrorocket-staging` Firebase project (https://console.firebase.google.com/project/retrorocket-staging/overview) — none of it repeats per pull request. This is the concrete checklist FR-001/FR-002/FR-003 resolve to (research.md §2).

## Firestore

- [ ] A Firestore database exists in Native mode for `retrorocket-staging` (console "Create database", or `firebase firestore:databases:create --project retrorocket-staging`).
- [ ] `retro-rocket/firestore.rules` is deployed to this project: `firebase deploy --only firestore:rules --project retrorocket-staging`.

## Authentication / Identity Toolkit

- [ ] The service account behind `FIREBASE_STAGING_SA_KEY` holds exactly `roles/identitytoolkit.editor` on `retrorocket-staging` (per `retro-rocket/scripts/firebase-preview-domains/README.md`'s "One-time GCP provisioning" — confirm this was actually completed against *this* project, not assumed from the secret's existence).
- [ ] A separate service-account credential (or the same one, if its scope is widened — not recommended, see research.md §3) with Firebase Admin custom-token-minting rights exists, and its JSON is what gets stored as Vercel's Preview-scoped `FIREBASE_SERVICE_ACCOUNT`.
- [ ] Federated Google/GitHub sign-in method toggles: **not required** by this app's actual sign-in path (it uses `signInWithCustomToken`, not federated popup/redirect sign-in) — leave as-is unless a future feature needs them.

## Explicitly NOT required by this feature

- No change to the production Firebase project (FR-007) — this checklist only ever targets `retrorocket-staging`.
- No new Firestore collections, documents, or schema — same schema as production.
