# UI Contract: Board Grid (no horizontal scroll)

Contract for how `RetrospectiveBoard` lays out its columns. Verified by User
Story 2 acceptance scenarios and SC-002.

## Layout rules

- **Column count**: 3 (regular columns) or 4 (regular + action-items column,
  when `showActionColumn` is true).
- **Desktop (≥ lg / ~1024px)**: columns are arranged in a single row where each
  column shares the available width equally via `repeat(N, minmax(0, 1fr))`
  semantics. No column carries a hard minimum width that forces the row wider
  than the viewport.
- **Below lg**: columns stack into one column (`grid-cols-1`).
- **No purged classes**: the grid definition MUST be expressed so it survives
  Tailwind's build purge — either literal, statically-analyzable class strings
  selected at runtime (`lg:grid-cols-3` / `lg:grid-cols-4`, optionally
  safelisted) or an inline `grid-template-columns` style. Dynamic string
  interpolation into class names is prohibited.
- **Shrink-to-fit**: every column wrapper includes `min-w-0` so its content can
  shrink and wrap instead of overflowing.
- **Per-column overflow**: card lists scroll vertically **inside** each column;
  the board region never scrolls horizontally.

## `useBoardGridColumns(count)` (optional helper)

```ts
type VisibleColumnCount = 3 | 4;

interface BoardGridDefinition {
  className?: string;                 // e.g. 'grid grid-cols-1 lg:grid-cols-4'
  style?: React.CSSProperties;        // OR inline gridTemplateColumns
}

function useBoardGridColumns(count: VisibleColumnCount): BoardGridDefinition;
```

**Contract guarantees**
- Returns only literal/non-purgeable definitions for the supported counts.
- Guarantees zero horizontal scrollbar on the board region at standard desktop
  widths for both 3- and 4-column configurations (SC-002).

## Acceptance hooks (for tests)

- Render with 3 columns at ≥1024px → board container `scrollWidth <= clientWidth`.
- Toggle action column (4 columns) → still `scrollWidth <= clientWidth`.
- Render below 1024px → columns stacked (single column), no horizontal scroll.
