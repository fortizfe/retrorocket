# Contract: Semantic Color Token System (v2 — Apple-Inspired Alignment)

This extends, and does not replace, the contract established in
`specs/009-wcag-theme-compliance/contracts/design-tokens.md`. That contract's
token catalog (roles), consumption rules, and conformance criteria remain in
force unchanged. This document records what this feature is additionally
allowed and required to do to that system, per spec Clarification 1.

## What may change (Clarification 1: full token-level redesign is in scope)

- The concrete `lightValue`/`darkValue` RGB pairs in `src/lib/theme/tokens.ts`
  MAY be revised for any existing token name, and MAY be mirrored with new
  values into `globals.css`'s `:root` / `.dark` blocks.
- New token *names* MAY be added (e.g. a materials/elevation role) if a
  Design Audit Finding calls for one, following the same naming and
  structural pattern as the existing catalog (semantic role name, `-fg`/`-bg`
  pairing convention for status colors, RGB-channel string format).
- `tailwind.config.cjs`'s `theme.extend.colors` map and any custom
  `fontSize`/`letterSpacing` scale MAY be extended to reflect a revised
  typographic system (per `research.md` R5), following Tailwind's existing
  configuration shape.

## What MUST NOT change

- The **structural contract**: every token name MUST still be defined in
  both `:root` and `.dark` (no orphans), MUST still be surfaced through
  `tailwind.config.cjs`, and MUST still be consumed via semantic Tailwind
  classes — never raw palette utilities (`bg-slate-800`) or one-off `dark:`
  pairs — per the original contract's Consumption Rules.
- Every entry in `CONTRAST_PAIRINGS` (`src/lib/theme/tokens.ts`) MUST
  continue to meet its `minContrast` threshold in **both** themes after any
  value change. If a new token role is added that participates in a
  text/border/focus/status pairing, a corresponding `CONTRAST_PAIRINGS`
  entry MUST be added for it — an unpaired new token is a contract
  violation.
- No information/state/action may be signaled by color alone (unchanged from
  the original contract).

## Conformance criteria

- `tokens.test.ts`: every token name (existing or newly added) present in
  both themes and in the Tailwind map — unchanged mechanism, now exercised
  against whatever the audit's final catalog is.
- `contrast.tokens.test.ts`: every pairing in `CONTRAST_PAIRINGS` (existing
  and any newly added) meets its threshold in both themes — this is the gate
  that makes "full token-level redesign, as long as WCAG 2.1 AA is
  maintained" (Clarification 1) enforceable rather than aspirational.
- `e2e/accessibility.spec.ts`: the axe WCAG 2.1 AA audit across primary
  routes in both themes continues to report zero violations — the
  browser-rendered backstop behind the unit-level token math.
