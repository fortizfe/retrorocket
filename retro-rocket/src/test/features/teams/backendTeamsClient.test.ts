import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createTeam,
    listTeams,
    getTeam,
    addTeamMember,
    removeTeamMember,
    TeamApiError,
} from '@/features/teams/services/backendTeamsClient';

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
    return { ok, status, json: async () => body } as unknown as Response;
}

const summaryDto = {
    id: 't1',
    name: 'Platform Team',
    description: null,
    ownerId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    memberCount: 2,
    myRole: 'owner' as const,
};

const memberDto = {
    userId: 'u2',
    displayName: 'New Member',
    email: 'new-member@example.com',
    photoURL: null,
    role: 'member' as const,
    joinedAt: '2026-01-03T00:00:00.000Z',
};

const detailDto = {
    id: 't1',
    name: 'Platform Team',
    description: null,
    ownerId: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    members: [memberDto],
};

describe('backendTeamsClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('createTeam', () => {
        it('POSTs to /api/teams with the given params', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, { teamId: 't1' }));
            vi.stubGlobal('fetch', fetchMock);

            const result = await createTeam({ name: 'Platform Team', description: 'Owns the platform' });

            expect(fetchMock).toHaveBeenCalledWith('/api/teams', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Platform Team', description: 'Owns the platform' }),
            });
            expect(result).toEqual({ teamId: 't1' });
        });

        it('throws the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 400, { error: { message: 'Name is required' } })));
            await expect(createTeam({ name: '' })).rejects.toThrow('Name is required');
        });
    });

    describe('listTeams', () => {
        it('fetches GET /api/teams and parses timestamps into Dates', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { teams: [summaryDto] }));
            vi.stubGlobal('fetch', fetchMock);

            const teams = await listTeams();

            expect(fetchMock).toHaveBeenCalledWith('/api/teams', { credentials: 'include' });
            expect(teams).toHaveLength(1);
            expect(teams[0].createdAt).toEqual(new Date(summaryDto.createdAt));
            expect(teams[0].updatedAt).toEqual(new Date(summaryDto.updatedAt));
            expect(teams[0].myRole).toBe('owner');
        });

        it('throws the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 401, { error: { message: 'Sign-in required' } })));
            await expect(listTeams()).rejects.toThrow('Sign-in required');
        });
    });

    describe('getTeam', () => {
        it('fetches GET /api/teams/:id and parses members with Date timestamps', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, detailDto));
            vi.stubGlobal('fetch', fetchMock);

            const team = await getTeam('t1');

            expect(fetchMock).toHaveBeenCalledWith('/api/teams/t1', { credentials: 'include' });
            expect(team.id).toBe('t1');
            expect(team.members).toHaveLength(1);
            expect(team.members[0].joinedAt).toEqual(new Date(memberDto.joinedAt));
        });

        it('throws a TeamApiError carrying the backend error code on a non-OK response', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => jsonResponse(false, 403, { error: { code: 'forbidden', message: 'Not a member of this team' } })),
            );

            await expect(getTeam('t1')).rejects.toThrow('Not a member of this team');
            try {
                await getTeam('t1');
                expect.unreachable();
            } catch (err) {
                expect(err).toBeInstanceOf(TeamApiError);
                expect((err as TeamApiError).code).toBe('forbidden');
            }
        });
    });

    describe('addTeamMember', () => {
        it('POSTs to /api/teams/:id/members with the email and returns the new member', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, memberDto));
            vi.stubGlobal('fetch', fetchMock);

            const member = await addTeamMember('t1', 'new-member@example.com');

            expect(fetchMock).toHaveBeenCalledWith('/api/teams/t1/members', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: 'new-member@example.com' }),
            });
            expect(member.userId).toBe('u2');
            expect(member.joinedAt).toEqual(new Date(memberDto.joinedAt));
        });

        it('throws a TeamApiError with code "user_not_found" for a 404', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => jsonResponse(false, 404, { error: { code: 'user_not_found', message: 'No account with that email' } })),
            );

            try {
                await addTeamMember('t1', 'missing@example.com');
                expect.unreachable();
            } catch (err) {
                expect(err).toBeInstanceOf(TeamApiError);
                expect((err as TeamApiError).code).toBe('user_not_found');
                expect((err as TeamApiError).message).toBe('No account with that email');
            }
        });

        it('throws a TeamApiError with code "conflict" for a 409 (already a member)', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => jsonResponse(false, 409, { error: { code: 'conflict', message: 'Already a member' } })),
            );

            try {
                await addTeamMember('t1', 'existing@example.com');
                expect.unreachable();
            } catch (err) {
                expect(err).toBeInstanceOf(TeamApiError);
                expect((err as TeamApiError).code).toBe('conflict');
            }
        });
    });

    describe('removeTeamMember', () => {
        it('DELETEs /api/teams/:id/members/:userId and returns teamEmptied: false on a plain 204', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            const result = await removeTeamMember('t1', 'u2');

            expect(fetchMock).toHaveBeenCalledWith('/api/teams/t1/members/u2', {
                method: 'DELETE',
                credentials: 'include',
            });
            expect(result).toEqual({ teamEmptied: false });
        });

        it('returns teamEmptied: true when the backend responds 200 with teamEmptied', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(true, 200, { teamEmptied: true })));

            const result = await removeTeamMember('t1', 'u1');

            expect(result).toEqual({ teamEmptied: true });
        });

        it('throws a TeamApiError with code "forbidden" for a 403 (non-owner removing someone else)', async () => {
            vi.stubGlobal(
                'fetch',
                vi.fn(async () => jsonResponse(false, 403, { error: { code: 'forbidden', message: 'Only the owner can remove members' } })),
            );

            try {
                await removeTeamMember('t1', 'u2');
                expect.unreachable();
            } catch (err) {
                expect(err).toBeInstanceOf(TeamApiError);
                expect((err as TeamApiError).code).toBe('forbidden');
            }
        });
    });
});
