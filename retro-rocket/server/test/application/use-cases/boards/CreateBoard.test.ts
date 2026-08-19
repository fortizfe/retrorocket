import { describe, it, expect, vi } from 'vitest';
import { createBoard } from '../../../../src/application/use-cases/boards/CreateBoard';
import { inMemoryBoardsPort } from './boardsFakes';
import { AppError, ForbiddenError } from '../../../../src/domain/errors';
import type { TeamsPort, TeamMembershipRecord } from '../../../../src/application/ports/teams';

describe('createBoard', () => {
    it('creates a board with the trimmed title and the requesting user as owner', async () => {
        const boardsPort = inMemoryBoardsPort();
        const result = await createBoard(
            { boardsPort },
            { templateId: 'default', title: '  My Board  ', locale: 'en', createdBy: 'u1', createdByName: 'User One' },
        );

        expect(result.boardId).toBeTruthy();
        const boards = await boardsPort.listBoardsForUser('u1');
        expect(boards).toHaveLength(1);
        expect(boards[0]).toMatchObject({ title: 'My Board', createdBy: 'u1', isCreator: true });
    });

    it.each(['default', 'madSadGlad', 'startStopContinue'] as const)('accepts the %s template', async (templateId) => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId, title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).resolves.toMatchObject({ boardId: expect.any(String) });
    });

    it('rejects an unknown templateId', async () => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId: 'nope', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).rejects.toThrow(AppError);
    });

    it('rejects an empty (or whitespace-only) title', async () => {
        const boardsPort = inMemoryBoardsPort();
        await expect(
            createBoard({ boardsPort }, { templateId: 'default', title: '   ', locale: 'en', createdBy: 'u1', createdByName: 'U' }),
        ).rejects.toThrow(AppError);
    });

    // 051-anonymous-board-mode, T017: the adapter (not this use-case) is responsible
    // for defaulting an omitted isAnonymous to false (data-model.md) — this use-case's
    // only job is to pass whatever the caller provided straight through unchanged.
    it('passes isAnonymous through unchanged to boardsPort.createBoard when provided', async () => {
        const boardsPort = inMemoryBoardsPort();
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        await createBoard(
            { boardsPort },
            { templateId: 'default', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U', isAnonymous: true },
        );

        expect(createBoardSpy).toHaveBeenCalledWith(expect.objectContaining({ isAnonymous: true }));
    });

    it('leaves isAnonymous undefined on boardsPort.createBoard when the caller omits it', async () => {
        const boardsPort = inMemoryBoardsPort();
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        await createBoard(
            { boardsPort },
            { templateId: 'default', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' },
        );

        expect(createBoardSpy).toHaveBeenCalledTimes(1);
        expect(createBoardSpy.mock.calls[0][0].isAnonymous).toBeUndefined();
    });
});

// 055-retro-team-association, T003 (spec.md FR-001..FR-004, data-model.md's validation
// rules, contracts/boards-api-delta.md's 403 forbidden addition to POST /api/boards):
// CreateBoard gains a `teamsPort: Pick<TeamsPort, 'getMembership'>` dependency. No
// suitable fake existed in boardsFakes.ts for this single-method dependency, so a
// minimal inline fake is defined here instead of adding a new shared fakes file.
describe('createBoard — team association (055-retro-team-association, US1)', () => {
    function fakeTeamsPort(membership: TeamMembershipRecord | null): Pick<TeamsPort, 'getMembership'> {
        return {
            getMembership: vi.fn().mockResolvedValue(membership),
        };
    }

    const sampleMembership: TeamMembershipRecord = {
        id: 'membership-1',
        teamId: 'team-1',
        userId: 'u1',
        role: 'member',
        joinedAt: new Date('2026-01-01T00:00:00Z'),
    };

    it('behaves exactly as before (no membership check attempted) when no teamId is provided', async () => {
        const boardsPort = inMemoryBoardsPort();
        const teamsPort = fakeTeamsPort(null);
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        const result = await createBoard(
            { boardsPort, teamsPort },
            { templateId: 'default', title: 'X', locale: 'en', createdBy: 'u1', createdByName: 'U' },
        );

        expect(result.boardId).toBeTruthy();
        expect(teamsPort.getMembership).not.toHaveBeenCalled();
        expect(createBoardSpy).toHaveBeenCalledWith(expect.not.objectContaining({ teamId: expect.anything() }));
    });

    it('creates the board and passes teamId through when the requester has a membership in that team', async () => {
        const boardsPort = inMemoryBoardsPort();
        const teamsPort = fakeTeamsPort(sampleMembership);
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        const result = await createBoard(
            { boardsPort, teamsPort },
            {
                templateId: 'default',
                title: 'X',
                locale: 'en',
                createdBy: 'u1',
                createdByName: 'U',
                teamId: 'team-1',
            },
        );

        expect(result.boardId).toBeTruthy();
        expect(teamsPort.getMembership).toHaveBeenCalledWith('team-1', 'u1');
        expect(createBoardSpy).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team-1' }));
    });

    it('rejects with a 403 ForbiddenError and never creates the board when the requester has no membership in the team', async () => {
        const boardsPort = inMemoryBoardsPort();
        const teamsPort = fakeTeamsPort(null);
        const createBoardSpy = vi.spyOn(boardsPort, 'createBoard');

        await expect(
            createBoard(
                { boardsPort, teamsPort },
                {
                    templateId: 'default',
                    title: 'X',
                    locale: 'en',
                    createdBy: 'u1',
                    createdByName: 'U',
                    teamId: 'team-not-mine',
                },
            ),
        ).rejects.toThrow(ForbiddenError);

        expect(teamsPort.getMembership).toHaveBeenCalledWith('team-not-mine', 'u1');
        expect(createBoardSpy).not.toHaveBeenCalled();
    });
});
