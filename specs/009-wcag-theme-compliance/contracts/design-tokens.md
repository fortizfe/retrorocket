# Contract: Semantic Color Token System

This is the internal UI contract every component MUST consume instead of ad-hoc color utilities.
It defines the token roles, their consumption surface, and the AA rules each must satisfy.

## Token catalog (roles)

Backgrounds & surfaces:
- `surface` — app/page background.
- `surface-raised` — cards, panels, modals, menus sitting above `surface`.
- `surface-overlay` — popovers, tooltips, dropdowns, toasts, date picker.

Text:
- `text-primary` — default body text (≥4.5:1 vs any surface it sits on).
- `text-secondary` — supporting text (≥4.5:1; if only large, ≥3:1).
- `text-muted` — de-emphasized text (still ≥4.5:1 vs its surface — "muted" is not an AA exemption).
- `text-inverse` — text on filled/`action` backgrounds (≥4.5:1 vs that fill).

Borders & focus:
- `border-default` — separators, input/control boundaries (≥3:1 vs adjacent surfaces).
- `border-strong` — emphasized boundaries (≥3:1).
- `focus` — focus-visible ring (≥3:1 vs both the focused element and the adjacent background).

Interactive:
- `action` / `action-hover` / `action-active` — primary buttons/links (fill ≥3:1 vs surface;
  `text-inverse` on it ≥4.5:1).

Status (each has `-fg` text and `-bg` surface; both meet their respective thresholds, and each
usage is accompanied by a non-color cue — icon/label):
- `success-fg` / `success-bg`
- `warning-fg` / `warning-bg`
- `error-fg` / `error-bg`
- `info-fg` / `info-bg`

## Definition (source of truth)

> Naming note: the Tailwind *color key* equals the token name, so a text color named `text-primary`
> is applied with the utility `text-text-primary` (text utility + color key). Border/background names
> avoid the doubling (`border-border-default`, `bg-surface`). Implementers should expect this pattern.

`src/lib/theme/tokens.ts` exports, per token name, `{ light: string; dark: string }` RGB channels.
`globals.css` mirrors them:

```css
:root      { --color-surface: 248 250 252; --color-text-primary: 15 23 42; /* … */ }
.dark      { --color-surface: 2 6 23;      --color-text-primary: 241 245 249; /* … */ }
```

`tailwind.config.js` surfaces them so opacity modifiers keep working:

```js
colors: {
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
  focus: 'rgb(var(--color-focus) / <alpha-value>)',
  // …one entry per token name
}
```

## Consumption rules (MUST)

- Components MUST use semantic classes (`bg-surface`, `text-text-primary`, `border-border-default`,
  `focus-visible:ring-2 focus-visible:ring-focus`) — NOT raw palette utilities like `bg-slate-800`
  or one-off `dark:` color pairs, for any color that conveys surface/text/border/state.
- Every interactive element MUST render a visible `focus` ring on `focus-visible`.
- No information/state/action may be signaled by color alone; pair status colors with an icon or text.
- Both `:root` and `.dark` MUST define every token name (structural parity — enforced by test).

## Conformance criteria

- `tokens.test.ts`: every token name present in both themes and in the Tailwind map (no orphans).
- `contrast.test.ts`: every text/border/focus/status pairing meets its `minContrast` in **both**
  themes (4.5:1 text, 3:1 large/non-text). A failing pairing fails the unit suite (blocks merge).
- Residual raw-color audit: the axe E2E audit (see `accessibility-audit.md`) is the backstop that
  catches any surface still bypassing tokens.
