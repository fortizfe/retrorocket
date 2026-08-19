import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddTeamMember = vi.fn();
const mockRemoveTeamMember = vi.fn();

vi.mock('@/features/teams/services/backendTeamsClient', () => ({
    addTeamMember: (...args: unknown[]) => mockAddTeamMember(...args),
    removeTeamMember: (...args: unknown[]) => mockRemoveTeamMember(...args),
    TeamApiError: class TeamApiError extends Error {
        code: string;
        constructor(code: string, message: string) {
            super(message);
            this.name = 'TeamApiError';
            this.code = code;
        }
    },
}));

import { useTeamMembershipActions } from '@/features/teams/hooks/useTeamMembershipActions';
import { TeamApiError } from '@/features/teams/services/backendTeamsClient';
import type { TeamMember } from '@/features/teams/types/team';

const newMember: TeamMember = {
    userId: 'u2',
    displayName: 'New Member',
    email: 'new@example.com',
    photoURL: null,
    role: 'member',
    joinedAt: new Date('2026-01-05'),
};

describe('useTeamMembershipActions', () => {
    const onChanged = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        onChanged.mockResolvedValue(undefined);
    });

    describe('addMember', () => {
        it('calls onChanged and resolves with the new member on success', async () => {
            mockAddTeamMember.mockResolvedValue(newMember);
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            let returned: TeamMember | undefined;
            await act(async () => {
                returned = await result.current.addMember('new@example.com');
            });

            expect(mockAddTeamMember).toHaveBeenCalledWith('t1', 'new@example.com');
            expect(onChanged).toHaveBeenCalledTimes(1);
            expect(returned).toEqual(newMember);
        });

        it('does not call onChanged and rejects with the TeamApiError on failure', async () => {
            const apiError = new TeamApiError('conflict', 'already a member');
            mockAddTeamMember.mockRejectedValue(apiError);
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            await expect(
                act(async () => {
                    await result.current.addMember('existing@example.com');
                }),
            ).rejects.toBe(apiError);

            expect(onChanged).not.toHaveBeenCalled();
        });

        it('toggles submitting true while in flight and false once settled', async () => {
            let resolveAdd: (member: TeamMember) => void;
            mockAddTeamMember.mockReturnValue(
                new Promise<TeamMember>((resolve) => {
                    resolveAdd = resolve;
                }),
            );
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            expect(result.current.submitting).toBe(false);

            let addPromise: Promise<TeamMember>;
            act(() => {
                addPromise = result.current.addMember('new@example.com');
            });

            await waitFor(() => expect(result.current.submitting).toBe(true));

            await act(async () => {
                resolveAdd(newMember);
                await addPromise;
            });

            expect(result.current.submitting).toBe(false);
        });
    });

    describe('removeMember', () => {
        it('calls onChanged and resolves with the result on success', async () => {
            mockRemoveTeamMember.mockResolvedValue({ teamEmptied: false });
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            let returned: { teamEmptied: boolean } | undefined;
            await act(async () => {
                returned = await result.current.removeMember('u2');
            });

            expect(mockRemoveTeamMember).toHaveBeenCalledWith('t1', 'u2');
            expect(onChanged).toHaveBeenCalledTimes(1);
            expect(returned).toEqual({ teamEmptied: false });
        });

        it('does not call onChanged and rejects with the TeamApiError on failure', async () => {
            const apiError = new TeamApiError('forbidden', 'not the owner');
            mockRemoveTeamMember.mockRejectedValue(apiError);
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            await expect(
                act(async () => {
                    await result.current.removeMember('u2');
                }),
            ).rejects.toBe(apiError);

            expect(onChanged).not.toHaveBeenCalled();
        });
    });

    describe('leave', () => {
        it('delegates to removeMember with the caller-supplied self userId, calling onChanged on success', async () => {
            mockRemoveTeamMember.mockResolvedValue({ teamEmptied: true });
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            let returned: { teamEmptied: boolean } | undefined;
            await act(async () => {
                returned = await result.current.leave('u1');
            });

            expect(mockRemoveTeamMember).toHaveBeenCalledWith('t1', 'u1');
            expect(onChanged).toHaveBeenCalledTimes(1);
            expect(returned).toEqual({ teamEmptied: true });
        });

        it('does not call onChanged and surfaces the error on failure', async () => {
            const apiError = new TeamApiError('unknown', 'network error');
            mockRemoveTeamMember.mockRejectedValue(apiError);
            const { result } = renderHook(() => useTeamMembershipActions('t1', onChanged));

            await expect(
                act(async () => {
                    await result.current.leave('u1');
                }),
            ).rejects.toBe(apiError);

            expect(onChanged).not.toHaveBeenCalled();
        });
    });
});
