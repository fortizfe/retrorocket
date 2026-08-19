import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetTeam = vi.fn();

vi.mock('@/features/teams/services/backendTeamsClient', () => ({
    getTeam: (...args: unknown[]) => mockGetTeam(...args),
}));

import { useTeamQuery } from '@/features/teams/hooks/useTeamQuery';
import type { TeamDetail } from '@/features/teams/types/team';

const teamDetail: TeamDetail = {
    id: 't1',
    name: 'Platform Team',
    description: null,
    ownerId: 'u1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    members: [
        {
            userId: 'u1',
            displayName: 'Owner',
            email: 'owner@example.com',
            photoURL: null,
            role: 'owner',
            joinedAt: new Date('2026-01-01'),
        },
    ],
};

describe('useTeamQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('starts loading and fetches the team detail on mount', async () => {
        mockGetTeam.mockResolvedValue(teamDetail);
        const { result } = renderHook(() => useTeamQuery('t1'));

        expect(result.current.loading).toBe(true);
        expect(result.current.team).toBeNull();

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockGetTeam).toHaveBeenCalledWith('t1');
        expect(result.current.team).toEqual(teamDetail);
        expect(result.current.error).toBe(false);
    });

    it('sets error=true and leaves team null when the fetch fails', async () => {
        mockGetTeam.mockRejectedValue(new Error('not found'));
        const { result } = renderHook(() => useTeamQuery('t1'));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.error).toBe(true);
        expect(result.current.team).toBeNull();
    });

    it('sets error=true without calling the backend when teamId is undefined', async () => {
        const { result } = renderHook(() => useTeamQuery(undefined));

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(mockGetTeam).not.toHaveBeenCalled();
        expect(result.current.error).toBe(true);
        expect(result.current.team).toBeNull();
    });

    it('refetch re-runs the fetch and clears a prior error on success', async () => {
        mockGetTeam.mockRejectedValueOnce(new Error('first failure'));
        const { result } = renderHook(() => useTeamQuery('t1'));

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.error).toBe(true);

        mockGetTeam.mockResolvedValueOnce(teamDetail);
        await act(async () => {
            await result.current.refetch();
        });

        expect(mockGetTeam).toHaveBeenCalledTimes(2);
        expect(result.current.error).toBe(false);
        expect(result.current.team).toEqual(teamDetail);
    });
});
