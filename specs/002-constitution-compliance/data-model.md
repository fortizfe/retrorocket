# Phase 1 Data Model: Constitution Compliance Remediation

This feature introduces no new domain entities and makes no changes to Firestore document shapes, collections, or `firestore.rules` data-access rules — it is a testing/tooling/process remediation effort (see spec.md Assumptions: the existing Firestore service/hook abstraction layer is verified, not rebuilt).

The only "shapes" this effort adds are configuration/tooling artifacts, not domain data. They're recorded here for traceability rather than as an app data model:

| Artifact | Purpose | Lives at |
|---|---|---|
| ESLint flat config | Defines the lint rule set enforced by US2/FR-004/FR-005 | `retro-rocket/eslint.config.js` |
| Playwright config | Defines E2E project/browser targets and the Emulator base URL for US4/FR-008/FR-009 | `retro-rocket/playwright.config.ts` |
| Firebase Emulator config | Defines which emulators (Auth, Firestore) run and on which ports for US4 | `retro-rocket/firebase.json` |
| GitHub Actions workflow | Defines the CI gate sequence for US3/FR-006/FR-007 | `.github/workflows/ci.yml` |
| Locale key additions | New i18next keys backing the strings removed from JSX in US5/FR-010 | `retro-rocket/src/locales/en.json`, `retro-rocket/src/locales/es.json` |

No new Firestore collections, fields, or security-rule changes are introduced.
