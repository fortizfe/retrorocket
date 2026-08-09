import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBoardListQuery } from '@/features/dashboard/hooks/useBoardListQuery';
import type { BoardListQueryInput } from '@/features/dashboard/hooks/useBoardListQuery';

function makeBoard(overrides: Partial<BoardListQueryInput> & { id: string }): BoardListQueryInput {
    return {
        title: 'Untitled',
        description: '',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        isCreator: true,
        ...overrides,
    };
}

describe('useBoardListQuery', () => {
    const boards: BoardListQueryInput[] = [
        makeBoard({ id: '1', title: 'Sprint 12 Retro', description: 'Team alpha', createdAt: new Date('2026-01-03T00:00:00Z'), isCreator: true }),
        makeBoard({ id: '2', title: 'Q1 Planning', description: 'Roadmap discussion', createdAt: new Date('2026-01-01T00:00:00Z'), isCreator: true }),
        makeBoard({ id: '3', title: 'Bug Bash Retro', description: 'Team alpha bugs', createdAt: new Date('2026-01-02T00:00:00Z'), isCreator: false }),
    ];

    function setup(overrides: Partial<{ searchText: string; scopeFilter: 'all' | 'created' | 'joined'; sortKey: 'name' | 'createdAt'; sortDirection: 'asc' | 'desc' }> = {}) {
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
});
