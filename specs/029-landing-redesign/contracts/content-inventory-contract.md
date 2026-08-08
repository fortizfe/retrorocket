# Contract: Content Inventory Preservation

**Enforces**: FR-008 (no informational content reduced), FR-001a (free
restructuring). Verified before the `selected` Visual Direction can move from
prototype to final implementation, and again before this feature is
considered done.

## Contract

For every one of the 6 message categories in `data-model.md`'s pre-redesign
messaging inventory, the shipped landing page MUST contain at least one
`Landing Section` whose `sourceMessaging` traces back to it. A category may
be reworded, regrouped with another category, or reprioritized in visual
weight — but it MUST NOT be absent from the shipped page.

| # | Category | Must still be findable as... |
|---|---|---|
| 1 | Value proposition & tagline | Text communicating what the product does and its core value, visible in/near the hero. |
| 2 | Quick feature pitch | A short-form summary of the top differentiators (need not be exactly 3 items or a grid — any legible presentation qualifies). |
| 3 | Detailed capability list | The concrete capabilities currently listed (auth, real-time collaboration, cards, grouping, export, UI) — may be consolidated, but each capability's substance must survive somewhere. |
| 4 | Product walkthrough | A "how it works" style sequence conveying the create → collaborate → export flow. |
| 5 | Technology/trust signals | Something that builds visitor trust (tech stack, open-source signal, or an equivalent trust cue) — the specific current wording is not required, the *trust-building function* is. |
| 6 | Closing message | Some form of closing call-to-action / sign-off before the footer. |

## Verification procedure

1. After the `selected` Visual Direction's content structure is finalized,
   fill in `data-model.md`'s `Landing Section` table with each section's
   `sourceMessaging` trace.
2. Confirm all 6 categories above appear in at least one row.
3. Any category not covered is a contract violation — either restore it in
   some form, or get explicit product-owner sign-off (same reviewer as
   SC-006) to intentionally drop it, recorded here with a one-line rationale.

## Sign-off log

**Resolved 2026-08-08** — against the selected Direction B (Editorial Grid)
structure: `hero`, `capabilities` (merged quick-pitch + detailed list, styled
as the numbered grid-mark pattern piloted in the prototype), `how-it-works`,
`trust-signals`, `closing` (see `data-model.md`'s `Landing Section` table for
the full per-section trace).

- Category 1 (Value proposition & tagline): covered by `hero` (headline + description)
- Category 2 (Quick feature pitch): covered by `capabilities` (grid-mark summary row)
- Category 3 (Detailed capability list): covered by `capabilities` (expanded grid cells — consolidated from the prior separate "quick features" + "main features" sections per FR-001a's restructuring latitude; no capability dropped, see `data-model.md`)
- Category 4 (Product walkthrough): covered by `how-it-works` (3-step, same content as before, restyled to the editorial numbered-step pattern)
- Category 5 (Technology/trust signals): covered by `trust-signals` (slim hairline-divided strip, open-source badge retained)
- Category 6 (Closing message): covered by `closing` + footer
