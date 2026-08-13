# Contract: Content Inventory Preservation

**Enforces**: FR-012 (no informational content reduced, sections may be
freely added/removed/reordered). Verified once this feature's final section
structure is chosen, and again before the feature is considered done.

## Contract

For every one of the 5 message categories below — the current shipped
landing page's content baseline (feature 029) — the redesigned page MUST
contain at least one `Landing Section` (per `data-model.md`) whose
`messagingPurpose` traces back to it. A category may be reworded, regrouped,
re-sequenced, or reprioritized in visual weight to fit the new full-screen
scroll format — but it MUST NOT be absent from the shipped page.

| # | Category | Must still be findable as... |
|---|---|---|
| 1 | Value proposition & tagline | Text communicating what the product does and its core value — now concentrated in the minimalist hero (FR-001), not spread across the first viewport as before. |
| 2 | Product capabilities | The concrete capabilities currently listed (auth, real-time collaboration, cards, grouping, export, modern UI) — each capability's substance must survive somewhere, now paired with a real screenshot/video per FR-004 rather than an icon grid. |
| 3 | Product walkthrough ("how it works") | A sequence conveying the create → collaborate → export flow, ideally now demonstrated through real video/screenshot captures of that flow rather than description alone. |
| 4 | Technology/trust signals | Something that builds visitor trust (tech stack, open-source signal, or an equivalent trust cue) — the specific current wording is not required, the *trust-building function* is. |
| 5 | Closing message | Some form of closing call-to-action / sign-off before the footer. |

## Verification procedure

1. Once this feature's section structure is finalized (`data-model.md`'s
   `Landing Section` table populated with real `key`/`order`/
   `messagingPurpose` values), confirm all 5 categories above appear in at
   least one row's `messagingPurpose`.
2. Any category not covered is a contract violation — either restore it in
   some form, or get explicit product-owner sign-off (same reviewer as
   SC-008) to intentionally drop it, recorded here with a one-line rationale.
3. Cross-check against `contracts/media-asset-manifest-contract.md`: every
   section tagged `capabilityHighlight` or `howItWorksStep` is expected to
   carry a `Media Asset` per FR-004, since these are the categories the
   redesign's core value (real product proof) applies to most directly.

## Sign-off log

**Resolved 2026-08-12** — the existing `landing.*` i18n content (hero,
capabilities, howItWorks, technology, finalMessage, footer) already covers
all 5 categories with no wording changes required; the redesign restructures
*presentation* (full-viewport sections, real media, parallax) rather than
copy. Final `Landing Section` list (`src/features/landing/data/sections.ts`):

| # | Category | Landing Section key | order | messagingPurpose | mediaAssetKey |
|---|---|---|---|---|---|
| 1 | Value proposition & tagline | *(hero — not a Landing Section, FR-001)* | — | — | — |
| 2 | Product capabilities | `capabilities` | 0 | `capabilityHighlight` | `capabilities` (Dashboard screenshot) |
| 3 | Product walkthrough | `howItWorks` | 1 | `howItWorksStep` | `howItWorks` (live card-voting screenshot) |
| — | *(new, added post-ship per user feedback — not one of the original 5, an addition FR-012 explicitly permits)* | `sentiment` | 2 | `capabilityHighlight` | `sentiment` (Team Mood AI-analysis dashboard screenshot) |
| 4 | Technology/trust signals | `technology` | 3 | `trustSignal` | `technology` (mobile-viewport board screenshot — tangible proof of the "Mobile First" claim) |
| 5 | Closing message | `finalMessage` | 4 | `closing` | `null` — purely typographic, per `data-model.md`'s exception |

The `footer` key is not a `Landing Section` instance — per FR-002's footer
exception, it renders as a non-full-viewport strip after `finalMessage`.
No category is dropped; no product-owner sign-off for a dropped category is
required. The `sentiment` section is a net addition (AI-powered sentiment
analysis is a genuine, previously-unshowcased product capability — see
`design-review.md`'s fourth post-ship revision), not a substitute for any of
the original 5.
