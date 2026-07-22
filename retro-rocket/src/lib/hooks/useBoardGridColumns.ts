/**
 * Maps the number of visible board columns to a Tailwind grid definition.
 *
 * The class strings are written as **literals** here (not interpolated at the call
 * site) so Tailwind's JIT compiler can statically detect and keep `lg:grid-cols-3`
 * and `lg:grid-cols-4` — avoiding the build-purge bug that the old
 * `lg:grid-cols-${n}` interpolation caused (FR-005).
 *
 * Columns use `grid-cols-1` below the `lg` breakpoint (stacked) and equal
 * `minmax(0, 1fr)` tracks above it (via `lg:grid-cols-N`), so they share the width
 * and never force horizontal scroll (FR-004, FR-006).
 */
export type VisibleColumnCount = 3 | 4;

export interface BoardGridDefinition {
    className: string;
}

const GRID_BY_COUNT: Record<VisibleColumnCount, string> = {
    3: 'grid grid-cols-1 lg:grid-cols-3',
    4: 'grid grid-cols-1 lg:grid-cols-4',
};

export function useBoardGridColumns(count: VisibleColumnCount): BoardGridDefinition {
    return { className: GRID_BY_COUNT[count] };
}
