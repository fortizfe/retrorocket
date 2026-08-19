import { describe, it, expect } from 'vitest';
import { listTeamsForUser } from '../../../../src/application/use-cases/teams/ListTeamsForUser';
import { inMemoryTeamsPort, fakeTeam, fakeMembership } from './teamsFakes';
import type { TeamSummary } from '../../../../src/application/ports/teams';

// 054-team-management, T010 (spec.md User Story 3 / FR-010, FR-011, data-model.md
// "Derived read shapes: TeamSummary"):
//
//   AC2 (User Story 3): "Given a user who belongs to more than one team, When they
//   open their teams overview, Then they see every team they belong to, with no
//   team missing or duplicated."
//   AC3: "Given a user who belongs to no teams, When they open their teams
//   overview, Then they see an empty state indicating they are not part of any
//   team yet."
//
// listTeamsForUser does not exist yet — this file is expected to fail with a
// "Cannot find module" error until
// server/src/application/use-cases/teams/ListTeamsForUser.ts is implemented (T013).
describe('listTeamsForUser', () => {
    it('returns every team the uid has a membership in — owned and joined — each with the correct myRole', async () => {
        const teamsPort = inMemoryTeamsPort(
            [
                fakeTeam({ id: 't1', name: 'Owned Team', ownerId: 'u1', createdBy: 'u1' }),
                fakeTeam({ id: 't2', name: 'Joined Team', ownerId: 'u2', createdBy: 'u2' }),
                fakeTeam({ id: 't3', name: 'Unrelated Team', ownerId: 'u3', createdBy: 'u3' }),
            ],
            [
                fakeMembership({ id: 'm1', teamId: 't1', userId: 'u1', role: 'owner' }),
                fakeMembership({ id: 'm2', teamId: 't2', userId: 'u2', role: 'owner' }),
                fakeMembership({ id: 'm3', teamId: 't2', userId: 'u1', role: 'member' }),
                fakeMembership({ id: 'm4', teamId: 't3', userId: 'u3', role: 'owner' }),
            ],
        );

        const result: TeamSummary[] = await listTeamsForUser({ teamsPort }, 'u1');

        expect(result).toHaveLength(2);
        expect(result.find((t) => t.id === 't1')).toMatchObject({ name: 'Owned Team', myRole: 'owner' });
        expect(result.find((t) => t.id === 't2')).toMatchObject({ name: 'Joined Team', myRole: 'member' });
        expect(result.find((t) => t.id === 't3')).toBeUndefined();
    });

    it('returns an empty array when the user belongs to no teams (User Story 3 AC3)', async () => {
        const teamsPort = inMemoryTeamsPort(
            [fakeTeam({ id: 't1', name: 'Someone Else', ownerId: 'u2', createdBy: 'u2' })],
            [fakeMembership({ id: 'm1', teamId: 't1', userId: 'u2', role: 'owner' })],
        );

        expect(await listTeamsForUser({ teamsPort }, 'ghost')).toEqual([]);
    });
});
