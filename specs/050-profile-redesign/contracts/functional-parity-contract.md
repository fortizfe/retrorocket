# Contract: Functional Parity

**Enforces**: FR-002 through FR-011, SC-001. Applies to the redesigned Mi
Perfil before any implementation task can be marked complete.

## Contract

Every capability below MUST behave identically to the pre-redesign
implementation (or, where marked **[CORRECTED]**, MUST behave per the fixed
requirement rather than the old, defective behavior). Each row names the
requirement it satisfies and the existing test(s) that must keep passing —
updated only for intentional selector/structure changes, never weakened or
deleted (FR-016).

| Capability | Requirement | Verified by |
|---|---|---|
| Display avatar (with fallback), display name, read-only email, primary provider, member-since date | FR-002 | `Profile.test.tsx` (if present) or equivalent page-level test, `e2e/profile.spec.ts` |
| Edit and save display name; required non-empty validation | FR-003 | `UserProfileForm.test.tsx`, `e2e/profile.spec.ts` |
| Saving indicator; success/error feedback; previous value retained on failure | FR-003 | `UserProfileForm.test.tsx`, `e2e/profile.spec.ts` |
| Sign out; error feedback on failure | FR-004 | `e2e/profile.spec.ts` |
| Linked-provider viewing, linking flow, not-yet-available indication (Apple) | FR-005 | `LinkedProvidersCard.test.tsx`, `useLinkedProviders.test.ts`, `e2e/profile.spec.ts` |
| Connected-AI-assistant listing with connection date, per-app revocation with loading/error feedback | FR-006 | `ConnectedAppsCard.test.tsx`, `connectedAppsService.test.ts`, `e2e/profile.spec.ts` |
| **[CORRECTED]** Disabled "Exportar mis datos"/"Eliminar cuenta" remain inert but gain accessible disabled-state semantics | FR-007 | New assertions in the page-level component test + `e2e/accessibility.spec.ts` (Mi Perfil scan) |
| Zero direct Firebase/Firestore/Firebase Auth browser calls | FR-008 | `profile-no-firestore.test.ts`, `e2e/profile.spec.ts` (network assertion) |
| Shared `UserProfileForm` continues to work on the landing page's first-time-setup flow | FR-009 | `Landing.test.tsx`, `e2e/authentication.spec.ts` (first-time-setup path) |
| Loading/error/empty states for every operation, no silent failures | FR-010 | `e2e/profile.spec.ts`, `e2e/accessibility.spec.ts` |
| All visible text sourced from i18next (en/es) | FR-011 | `profile.*`/`auth.userProfileForm.*` keys verified in exact lockstep (en.json vs es.json, zero drift); no hardcoded strings found in touched components |

## Non-goals

This contract does not cover new capabilities explicitly out of scope per
the spec's Assumptions (functional export/delete-account, avatar upload,
password change, email change, theme/language controls added to this
page) — their absence is expected, not a regression.

## Verification procedure

1. The pre-redesign baseline for every row above is established once, at
   the start of implementation, by running the full `type-check` / `lint`
   / `test:coverage` / `e2e` suite and recording it passing — since every
   test named in this contract is part of that suite, this full-suite pass
   is sufficient baseline confirmation for every row; no separate per-row
   pass is required before implementation starts.
2. After implementation, re-run the same suite against the shipped
   direction and confirm every row above still passes, with `[CORRECTED]`
   rows additionally passing their new assertions.
3. Record the before/after pass counts in `quickstart.md`'s validation run
   once this contract has been executed for real.

## Result (2026-08-18, `tasks.md` T041)

Every row PASSES against the shipped Direction B ("Structured Account
Pane") implementation, re-verified for real (not assumed from prior task
notes) against the current code and its listed tests:

| Capability | Requirement | Status |
|---|---|---|
| Display avatar (with fallback), display name, read-only email, primary provider, member-since date | FR-002 | PASS — `Profile.test.tsx` (9/9), `e2e/profile.spec.ts` |
| Edit and save display name; required non-empty validation | FR-003 | PASS — `UserProfileForm.test.tsx` (21/21), `e2e/profile.spec.ts` |
| Saving indicator; success/error feedback; previous value retained on failure | FR-003 | PASS — same tests |
| Sign out; error feedback on failure | FR-004 | PASS — `e2e/profile.spec.ts` |
| Linked-provider viewing, linking flow, not-yet-available indication (Apple) | FR-005 | PASS — `LinkedProvidersCard.test.tsx` (6/6, including the Apple row previously entirely absent from the UI), `useLinkedProviders.test.ts`, `e2e/profile.spec.ts` |
| Connected-AI-assistant listing with connection date, per-app revocation with loading/error feedback | FR-006 | PASS — `ConnectedAppsCard.test.tsx` (11/11), `connectedAppsService.test.ts`, `e2e/profile.spec.ts` |
| **[CORRECTED]** Disabled placeholders gain accessible disabled-state semantics | FR-007 | PASS — `Profile.test.tsx`'s `aria-describedby` test, `e2e/accessibility.spec.ts`'s dedicated SC-007 assertion |
| Zero direct Firebase/Firestore/Firebase Auth browser calls | FR-008 | PASS — `profile-no-firestore.test.ts`, `e2e/profile.spec.ts` network assertion |
| Shared `UserProfileForm` continues to work on the landing page's first-time-setup flow | FR-009 | PASS — `Landing.test.tsx` (16/16, including the T020-added full-submit-flow test), `e2e/authentication.spec.ts` |
| Loading/error/empty states for every operation, no silent failures | FR-010 | PASS — `e2e/profile.spec.ts`, `e2e/accessibility.spec.ts` (6 Profile-state scans) |
| All visible text sourced from i18next (en/es) | FR-011 | PASS — `profile.*`/`auth.userProfileForm.*`/`linkedProviders.*` verified in exact lockstep (T040), zero hardcoded strings found (T039) |

**Full-suite numbers**: `type-check` 0 errors; `lint` 0 errors/warnings;
`test:coverage` 186 files/2515 tests passed (2 files/3 tests skipped),
coverage 78.81% stmts / 83.24% branches / 77.04% funcs / 78.81% lines
(vs. the 50/78/64/50 floor — up from the T001 baseline's 77.45/83.42/76.9/
77.45%); `e2e` (`profile.spec.ts authentication.spec.ts
accessibility.spec.ts`) **88/88 passed**, zero failures (the one
pre-existing unrelated flake noted in T001's baseline — the color-picker
keyboard test — did not reproduce in this run).
