import { describe, it, expect, vi } from 'vitest';
import { createTeam } from '../../../../src/application/use-cases/teams/CreateTeam';
import { inMemoryTeamsPort } from './teamsFakes';
import { AppError } from '../../../../src/domain/errors';

// 054-team-management, T009 (spec.md User Story 1 / FR-001, FR-002):
//
//   AC1: "Given an authenticated user on the team creation screen, When they submit
//   a team name only, Then the team is created and the user is shown as its owner."
//   AC2: "...When they submit a team name and a description, Then the team is
//   created with both the name and description stored and visible."
//   AC3: "...When they submit the form without a name, Then the system rejects the
//   submission and explains that a name is required."
//
// createTeam does not exist yet — this file is expected to fail with a
// "Cannot find module" error until server/src/application/use-cases/teams/CreateTeam.ts
// is implemented (T012).
describe('createTeam', () => {
    it('creates a team with just a name and records the calling user as owner (FR-001, FR-002)', async () => {
        const teamsPort = inMemoryTeamsPort();

        const result = await createTeam({ teamsPort }, { name: 'Platform Team', createdBy: 'u1' });

        expect(result.teamId).toBeTruthy();
        const teams = await teamsPort.listTeamsForUser('u1');
        expect(teams).toHaveLength(1);
        expect(teams[0]).toMatchObject({
            name: 'Platform Team',
            ownerId: 'u1',
            myRole: 'owner',
        });
    });

    it('creates a team with a name and description, storing both', async () => {
        const teamsPort = inMemoryTeamsPort();

        const result = await createTeam(
            { teamsPort },
            { name: 'Growth Team', description: 'Owns activation and retention', createdBy: 'u1' },
        );

        const detail = await teamsPort.getTeamWithMembers(result.teamId, 'u1');
        expect(detail?.team).toMatchObject({
            name: 'Growth Team',
            description: 'Owns activation and retention',
        });
    });

    it('rejects an empty name and does not call teamsPort.createTeam (User Story 1 AC3)', async () => {
        const teamsPort = inMemoryTeamsPort();
        const createTeamSpy = vi.spyOn(teamsPort, 'createTeam');

        await expect(createTeam({ teamsPort }, { name: '', createdBy: 'u1' })).rejects.toThrow(AppError);
        expect(createTeamSpy).not.toHaveBeenCalled();
        expect(await teamsPort.listTeamsForUser('u1')).toEqual([]);
    });

    it('rejects a whitespace-only name and does not call teamsPort.createTeam (User Story 1 AC3)', async () => {
        const teamsPort = inMemoryTeamsPort();
        const createTeamSpy = vi.spyOn(teamsPort, 'createTeam');

        await expect(createTeam({ teamsPort }, { name: '   ', createdBy: 'u1' })).rejects.toThrow(AppError);
        expect(createTeamSpy).not.toHaveBeenCalled();
        expect(await teamsPort.listTeamsForUser('u1')).toEqual([]);
    });
});
