import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardListQuery } from '@/features/dashboard/hooks/useBoardListQuery';
import type { BoardListQueryInput } from '@/features/dashboard/hooks/useBoardListQuery';

// 055-retro-team-association, T015: `teamId` isn't part of `BoardListQueryInput` yet
// (that's T017's job) — this local extension lets these fixtures carry it without a
// TS excess-property error, while still exercising the not-yet-implemented `teamFilter`
// param through the hook's public call signature below.
type BoardListQueryInputWithTeam = BoardListQueryInput & { teamId?: string | null };

function makeBoard(
    overrides: Partial<BoardListQueryInputWithTeam> & { id: string }
): BoardListQueryInputWithTeam {
    return {
        title: 'Untitled',
        description: '',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        isCreator: true,
        teamId: null,
        ...overrides,
    };
}

describe('useBoardListQuery', () => {
    const boards: BoardListQueryInputWithTeam[] = [
        makeBoard({ id: '1', title: 'Sprint 12 Retro', description: 'Team alpha', createdAt: new Date('2026-01-03T00:00:00Z'), isCreator: true, teamId: 'team-a' }),
        makeBoard({ id: '2', title: 'Q1 Planning', description: 'Roadmap discussion', createdAt: new Date('2026-01-01T00:00:00Z'), isCreator: true, teamId: null }),
        makeBoard({ id: '3', title: 'Bug Bash Retro', description: 'Team alpha bugs', createdAt: new Date('2026-01-02T00:00:00Z'), isCreator: false, teamId: 'team-a' }),
    ];

    function setup(overrides: Partial<{ searchText: string; scopeFilter: 'all' | 'created' | 'joined'; sortKey: 'name' | 'createdAt'; sortDirection: 'asc' | 'desc'; teamFilter: 'all' | 'none' | string }> = {}) {
        return renderHook(() =>
            useBoardListQuery({
                boards,
                searchText: '',
                scopeFilter: 'all',
                sortKey: 'name',
                sortDirection: 'asc',
                ...overrides,
            })
        );
    }

    it('returns all boards, sorted by name ascending, when no filter/search is applied', () => {
        const { result } = setup();
        expect(result.current.boards.map((b) => b.id)).toEqual(['3', '2', '1']); // Bug Bash, Q1, Sprint 12
        expect(result.current.resultCount).toBe(3);
    });

    it('sorts by name descending when sortDirection is desc', () => {
        const { result } = setup({ sortDirection: 'desc' });
        expect(result.current.boards.map((b) => b.id)).toEqual(['1', '2', '3']);
    });

    it('sorts by creation date, respecting direction', () => {
        const asc = setup({ sortKey: 'createdAt', sortDirection: 'asc' }).result.current;
        expect(asc.boards.map((b) => b.id)).toEqual(['2', '3', '1']);

        const desc = setup({ sortKey: 'createdAt', sortDirection: 'desc' }).result.current;
        expect(desc.boards.map((b) => b.id)).toEqual(['1', '3', '2']);
    });

    it('filters by title substring, case-insensitively', () => {
        const { result } = setup({ searchText: 'retro' });
        expect(result.current.boards.map((b) => b.id).sort()).toEqual(['1', '3']);
    });

    it('filters by description substring', () => {
        const { result } = setup({ searchText: 'roadmap' });
        expect(result.current.boards.map((b) => b.id)).toEqual(['2']);
    });

    it('scopes to created-only boards and reports the correct counts for every scope', () => {
        const { result } = setup({ scopeFilter: 'created' });
        expect(result.current.boards.map((b) => b.id).sort()).toEqual(['1', '2']);
        expect(result.current.counts).toEqual({ all: 3, created: 2, joined: 1 });
    });

    it('scopes to joined-only boards', () => {
        const { result } = setup({ scopeFilter: 'joined' });
        expect(result.current.boards.map((b) => b.id)).toEqual(['3']);
    });

    it('counts stay derived from the full board list regardless of the active search/scope', () => {
        const { result } = setup({ scopeFilter: 'joined', searchText: 'nonexistent' });
        expect(result.current.counts).toEqual({ all: 3, created: 2, joined: 1 });
    });

    it('combines scope filter and search text', () => {
        const { result } = setup({ scopeFilter: 'created', searchText: 'retro' });
        expect(result.current.boards.map((b) => b.id)).toEqual(['1']);
    });

    it('reports isEmpty (zero-boards state) only when the full board list is empty', () => {
        const { result } = renderHook(() =>
            useBoardListQuery({ boards: [], searchText: '', scopeFilter: 'all', sortKey: 'name', sortDirection: 'asc' })
        );
        expect(result.current.isEmpty).toBe(true);
        expect(result.current.isNoResults).toBe(false);
    });

    it('reports isNoResults (distinct from isEmpty) when a non-empty list matches nothing', () => {
        const { result } = setup({ searchText: 'this matches nothing at all' });
        expect(result.current.isEmpty).toBe(false);
        expect(result.current.isNoResults).toBe(true);
        expect(result.current.resultCount).toBe(0);
    });

    it('never conflates isEmpty and isNoResults when results exist', () => {
        const { result } = setup();
        expect(result.current.isEmpty).toBe(false);
        expect(result.current.isNoResults).toBe(false);
    });

    // 055-retro-team-association, T015 (US2, FR-007-FR-009): `teamFilter` narrows the
    // board list by `board.teamId`. Fixture teams: '1' and '3' → 'team-a', '2' → null.
    describe('teamFilter (055 US2)', () => {
        it('leaves the list unaffected by team when teamFilter is "all", same as omitting it entirely', () => {
            const omitted = setup();
            const explicitAll = setup({ teamFilter: 'all' });
            expect(explicitAll.result.current.boards.map((b) => b.id)).toEqual(
                omitted.result.current.boards.map((b) => b.id)
            );
            expect(explicitAll.result.current.boards.map((b) => b.id).sort()).toEqual(['1', '2', '3']);
        });

        it('filters to only boards whose teamId matches the selected team', () => {
            const { result } = setup({ teamFilter: 'team-a' });
            expect(result.current.boards.map((b) => b.id).sort()).toEqual(['1', '3']);
        });

        it('returns an empty list when filtered by a team none of the boards belong to', () => {
            const { result } = setup({ teamFilter: 'team-z' });
            expect(result.current.boards).toEqual([]);
        });

        it('filters to only boards with a null teamId when teamFilter is "none"', () => {
            const { result } = setup({ teamFilter: 'none' });
            expect(result.current.boards.map((b) => b.id)).toEqual(['2']);
        });

        it('combines teamFilter with searchText and scopeFilter, narrowing to boards matching every active filter', () => {
            // A dedicated fixture (not the shared `boards`) so that searchText + scopeFilter
            // ALONE would match more than one board — proving teamFilter does real narrowing
            // work here, not just riding along on the other two filters' result.
            const localBoards: BoardListQueryInputWithTeam[] = [
                makeBoard({ id: 'a', title: 'Sprint Retro', isCreator: true, teamId: 'team-a' }),
                makeBoard({ id: 'b', title: 'Bug Bash Retro', isCreator: false, teamId: 'team-a' }),
                makeBoard({ id: 'c', title: 'Another Retro', isCreator: true, teamId: 'team-b' }),
            ];
            const { result } = renderHook(() =>
                useBoardListQuery({
                    boards: localBoards,
                    searchText: 'retro',
                    scopeFilter: 'created',
                    teamFilter: 'team-a',
                    sortKey: 'name',
                    sortDirection: 'asc',
                })
            );
            // Without team filtering, searchText 'retro' + scopeFilter 'created' alone would
            // also match 'c' (team-b, isCreator: true) — only 'a' satisfies all three filters.
            expect(result.current.boards.map((b) => b.id)).toEqual(['a']);
        });
    });
});
