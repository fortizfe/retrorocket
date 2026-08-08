# Contract: i18n Key Migration

**Enforces**: FR-003 (all text via i18next, en/es), FR-001a (free
restructuring), consistency between `en.json` and `es.json`. Applies once
the `selected` Visual Direction's section structure is finalized and the
`landing` namespace is restructured to match.

## Contract

1. Every `landing.*` key read by the redesigned `Landing.tsx` MUST exist in
   both `retro-rocket/src/locales/en.json` and `retro-rocket/src/locales/es.json`
   with a real (non-placeholder) translation — no key present in one locale
   and missing in the other.
2. Every `landing.*` key that existed before the redesign and is being
   removed MUST be traceable to a replacement key covering the same message,
   per `contracts/content-inventory-contract.md` — a removed key with no
   replacement is a silent content loss, not an allowed restructuring.
3. No hardcoded, non-translated user-visible string is introduced anywhere
   in `Landing.tsx` or the components it renders (`AuthButtonGroup`,
   `UserProfileForm`) as part of this feature.

## Migration mapping

**Finalized 2026-08-08** against the selected Direction B (Editorial Grid)
structure. Format: old key → new key, or old key → "merged into `<new key>`".

| Old key (namespace `landing.*`) | New key | Notes |
|---|---|---|
| `hero.description` | `hero.description` | unchanged |
| `hero.tagline` | `hero.tagline` | unchanged |
| `hero.cta.title` | `hero.cta.title` | unchanged |
| `hero.cta.subtitle` | `hero.cta.subtitle` | unchanged |
| `hero.cta.freeForever` | `hero.cta.freeForever` | unchanged |
| `hero.cta.noLimits` | `hero.cta.noLimits` | unchanged |
| `features.connectTeams.*` | merged into `capabilities.subtitle` | folded into the new combined subtitle sentence, not a standalone key — see content-inventory-contract.md category 2 |
| `features.immediateResults.*` | merged into `capabilities.subtitle` | same |
| `features.easyToAdopt.*` | merged into `capabilities.subtitle` | same |
| `mainFeatures.title` | `capabilities.title` | renamed, text unchanged: "Everything you need for successful retrospectives" |
| `mainFeatures.subtitle` | `capabilities.subtitle` | rewritten to fold in the 3 `features.*` items: "A complete platform built for agile teams — bring everyone together from anywhere, get valuable insights in record time, and feel at home from the first minute." |
| `mainFeatures.advancedAuth.*` | `capabilities.items.auth.*` | renamed, text unchanged |
| `mainFeatures.realTimeCollab.*` | `capabilities.items.realTimeCollab.*` | renamed, text unchanged |
| `mainFeatures.cardSystem.*` | `capabilities.items.cardSystem.*` | renamed, text unchanged |
| `mainFeatures.smartGrouping.*` | `capabilities.items.smartGrouping.*` | renamed, text unchanged |
| `mainFeatures.professionalExport.*` | `capabilities.items.export.*` | renamed, text unchanged |
| `mainFeatures.modernUI.*` | `capabilities.items.modernUI.*` | renamed, text unchanged |
| `howItWorks.*` | `howItWorks.*` | unchanged (title, subtitle, step1/2/3) |
| `technology.*` | `technology.*` | unchanged (title, subtitle, 4 tech items, openSource) |
| `finalMessage.*` | `finalMessage.*` | unchanged |
| `footer.*` | `footer.*` | unchanged |

## Verification procedure

1. After the migration mapping above is filled in and both locale files are
   updated, run a key-parity check: every key under `landing.*` in
   `en.json` has a corresponding key at the same path in `es.json`, and vice
   versa (extend `src/test/pages/Landing.test.tsx` or an existing i18n
   coverage test to assert this rather than relying on manual inspection).
2. Confirm no `landing.*` key referenced by `t(...)` in the rebuilt
   `Landing.tsx` (or the auth components it renders) is missing from either
   locale file — a missing key at runtime falls back to the raw key string,
   which is a visible regression and MUST NOT ship.
3. Cross-check the migration mapping against
   `contracts/content-inventory-contract.md`'s sign-off log: every "removed"
   row here must have a corresponding entry there.
