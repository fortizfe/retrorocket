import { useMemo } from 'react';

/**
 * Client-side, in-memory view state driving what subset/order of boards is
 * currently shown on the dashboard (spec 031 data-model.md's "Board List
 * Query" entity). Not persisted — reset on navigation away from the
 * dashboard by virtue of living in component state.
 */
export type ScopeFilter = 'all' | 'created' | 'joined';
export type SortKey = 'name' | 'createdAt';
export type SortDirection = 'asc' | 'desc';
/**
 * 055-retro-team-association (US2): 'all' is the default/no-op value (every
 * board, regardless of team), 'none' matches only boards with `teamId ===
 * null`, and any other string is matched exactly against `board.teamId`.
 */
export type TeamFilter = 'all' | 'none' | string;

/** The minimal shape this hook needs from a board — callers may pass a richer type. */
export interface BoardListQueryInput {
    id: string;
    title: string;
    description?: string;
    createdAt: Date;
    isCreator?: boolean;
    /** The team this board is associated with, or null/undefined when unlinked (055, US1). */
    teamId?: string | null;
}

export interface UseBoardListQueryParams<T extends BoardListQueryInput> {
    boards: T[];
    searchText: string;
    scopeFilter: ScopeFilter;
    sortKey: SortKey;
    sortDirection: SortDirection;
    /** Defaults to 'all' (no-op) when omitted. */
    teamFilter?: TeamFilter;
}

export interface BoardScopeCounts {
    all: number;
    created: number;
    joined: number;
}

export interface UseBoardListQueryResult<T extends BoardListQueryInput> {
    /** The filtered + sorted boards to render. */
    boards: T[];
    /** Live counts per scope, always derived from the full board list (not the filtered subset). */
    counts: BoardScopeCounts;
    /** boards.length after filtering — distinct from counts.all. */
    resultCount: number;
    /** True when the user has zero boards at all (FR-013's empty state). */
    isEmpty: boolean;
    /** True when the user has boards, but the current search/scope matches none (FR-013's no-results state) — never conflated with isEmpty. */
    isNoResults: boolean;
}

/**
 * Derives the searched/filtered/sorted board list and the empty-vs-no-results
 * distinction (spec 031 FR-009, FR-010, FR-011, FR-013), memoized so
 * recomputation only happens when an actual input changes — the perf budget
 * this backs (sub-300ms at 200+ boards, SC-001) is validated against real
 * data in quickstart.md §3, not by this unit test.
 */
export function useBoardListQuery<T extends BoardListQueryInput>({
    boards,
    searchText,
    scopeFilter,
    sortKey,
    sortDirection,
    teamFilter = 'all',
}: UseBoardListQueryParams<T>): UseBoardListQueryResult<T> {
    const counts = useMemo<BoardScopeCounts>(() => {
        let created = 0;
        let joined = 0;
        for (const board of boards) {
            if (board.isCreator === true) created += 1;
            else if (board.isCreator === false) joined += 1;
        }
        return { all: boards.length, created, joined };
    }, [boards]);

    const filteredAndSorted = useMemo(() => {
        let filtered = boards;

        if (scopeFilter !== 'all') {
            filtered = filtered.filter((board) =>
                scopeFilter === 'created' ? board.isCreator === true : board.isCreator === false
            );
        }

        if (teamFilter !== 'all') {
            filtered = filtered.filter((board) =>
                teamFilter === 'none' ? board.teamId === null : board.teamId === teamFilter
            );
        }

        const query = searchText.trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(
                (board) =>
                    board.title.toLowerCase().includes(query) ||
                    (board.description ?? '').toLowerCase().includes(query)
            );
        }

        const sorted = [...filtered].sort((a, b) => {
            const comparison =
                sortKey === 'name'
                    ? a.title.localeCompare(b.title)
                    : a.createdAt.getTime() - b.createdAt.getTime();
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [boards, searchText, scopeFilter, teamFilter, sortKey, sortDirection]);

    return {
        boards: filteredAndSorted,
        counts,
        resultCount: filteredAndSorted.length,
        isEmpty: boards.length === 0,
        isNoResults: boards.length > 0 && filteredAndSorted.length === 0,
    };
}
