import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListTeams = vi.fn();

vi.mock('@/features/teams/services/backendTeamsClient', () => ({
    listTeams: (...args: unknown[]) => mockListTeams(...args),
}));

import { useTeamsQuery } from '@/features/teams/hooks/useTeamsQuery';
import type { TeamSummary } from '@/features/teams/types/team';

const team: TeamSummary = {
    id: 't1',
    name: 'Platform Team',
    description: null,
    ownerId: 'u1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    memberCount: 2,
    myRole: 'owner',
};

describe('useTeamsQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts loading and fetches teams on mount', async () => {
        mockListTeams.mockResolvedValue([team]);
        const { result } = renderHook(() => useTeamsQuery());

        expect(result.current.loading).toBe(true);
        expect(result.current.teams).toEqual([]);

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockListTeams).toHaveBeenCalledTimes(1);
        expect(result.current.teams).toEqual([team]);
        expect(result.current.error).toBe(false);
    });

    it('sets error=true and leaves teams empty when the fetch fails', async () => {
        mockListTeams.mockRejectedValue(new Error('network down'));
        const { result } = renderHook(() => useTeamsQuery());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe(true);
        expect(result.current.teams).toEqual([]);
    });

    it('refetch re-runs the fetch and clears a prior error on success', async () => {
        mockListTeams.mockRejectedValueOnce(new Error('first failure'));
        const { result } = renderHook(() => useTeamsQuery());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe(true);

        mockListTeams.mockResolvedValueOnce([team]);
        await act(async () => {
            await result.current.refetch();
        });

        expect(mockListTeams).toHaveBeenCalledTimes(2);
        expect(result.current.error).toBe(false);
        expect(result.current.teams).toEqual([team]);
    });
});
