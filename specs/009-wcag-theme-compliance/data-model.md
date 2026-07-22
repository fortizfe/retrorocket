# Phase 1 Data Model: WCAG 2.1-Compliant Light & Dark Themes

This feature is presentational; the "entities" are design-system constructs (color tokens,
theme palettes, swatches) and one existing UI preference, not persisted domain records.

## Entity: Semantic Color Token

A single named color role, decided once per theme and consumed everywhere that role appears.

| Field | Description |
|-------|-------------|
| `name` | Stable token identifier (e.g. `surface`, `surface-raised`, `text-primary`, `text-secondary`, `text-muted`, `text-inverse`, `border-default`, `border-strong`, `action`, `action-hover`, `focus`, `success-fg`, `success-bg`, `warning-fg`, `warning-bg`, `error-fg`, `error-bg`, `info-fg`, `info-bg`). |
| `lightValue` | RGB channels used in light theme (`:root`). |
| `darkValue` | RGB channels used in dark theme (`.dark`). |
| `role` | What it colors: background / surface / text / border / interactive / focus / status. |
| `pairedWith` | The token(s) it must meet contrast against (e.g. `text-primary` pairs with `surface`). |
| `minContrast` | Required ratio for the pairing: 4.5:1 (normal text), 3:1 (large text, borders, focus, non-text). |

**Validation rules** (enforced by `contrast.ts` unit tests):
- Every text token MUST meet ≥4.5:1 (or ≥3:1 if only ever used at large size) against each surface
  it is placed on, in **both** `lightValue` and `darkValue`.
- Every `border-*`, `focus`, and meaningful non-text token MUST meet ≥3:1 against adjacent colors
  in both themes.
- Token names are unique; every name defined in `tokens.ts` MUST have a corresponding CSS variable
  in both `:root` and `.dark`, and a Tailwind mapping (no orphan tokens).

**Source of truth**: `src/lib/theme/tokens.ts` (hex/RGB per theme) → generated/mirrored into
`globals.css` custom properties → surfaced via `tailwind.config.js`.

## Entity: Theme Palette

A complete, named set of Semantic Color Tokens applied to the whole app.

| Field | Description |
|-------|-------------|
| `id` | `light` or `dark`. |
| `tokens` | The full map of token name → value for that theme. |
| `activationSelector` | `:root` for light, `.dark` for dark. |

**Validation rules**:
- Exactly two palettes exist (`light`, `dark`) — no third/high-contrast variant (Assumptions).
- Each palette MUST independently pass the full WCAG 2.1 AA token validation above.
- Both palettes MUST define the identical set of token names (structural parity).

## Entity: Card Color Swatch (existing `CARD_COLORS`, hardened)

A pre-vetted, fixed selectable color for cards/columns. No free-form entry (FR-015).

| Field | Description |
|-------|-------------|
| `value` | `CardColor` enum key (e.g. `pastelGreen`, `pastelRed`, `pastelYellow`, `pastelBlue`, `pastelPurple`, `pastelWhite`, …). |
| `background` | Surface classes for the swatch, per theme (light + `dark:` variant — the dark variant is currently missing/incorrect and must be added). |
| `border` | Border classes, must meet ≥3:1 vs adjacent, per theme. |
| `text` | Foreground text classes, must meet ≥4.5:1 vs `background`, per theme. |
| `preview` | Swatch button color shown in the picker. |
| `ariaLabel` / `tooltip` | Accessible name + non-color descriptor (use-of-color redundancy). |

**Validation rules** (enforced by extended `cardColors.test.ts`):
- For every swatch, `text` vs `background` ≥ 4.5:1 in **both** light and dark themes.
- For every swatch, `border` vs `background` and vs page surface ≥ 3:1 in both themes.
- The selectable set is closed (only `getAvailableColors()` values); no arbitrary hex is accepted.
- Each swatch has a non-color textual descriptor (`ariaLabel`/`tooltip`) so choice isn't color-only.

## Entity: Theme Preference (existing, unchanged behavior)

| Field | Description |
|-------|-------------|
| `value` | `light` \| `dark` (binary). |
| `storage` | `localStorage` key `theme`. |
| `seed` | When unset, `prefers-color-scheme` decides the first visit only. |

**Validation rules**:
- No persisted "follow system" state (clarification Q4=A).
- Whichever value is active, the resulting rendered app MUST be AA-compliant (both palettes are).

## State / transition notes

- **Theme toggle**: flipping the `.dark` class on `<html>` re-themes every surface atomically
  because all colors resolve from tokens (FR-010: no element retains prior-theme colors).
- **First paint**: theme class applied before first paint so the initial render is already the
  correct, compliant theme (FR-011: no flash of wrong/non-compliant theme).
