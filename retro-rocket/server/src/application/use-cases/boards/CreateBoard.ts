import type { BoardsPort } from '../../ports/boards';
import type { TeamsPort } from '../../ports/teams';
import { isValidTemplateId } from '../../../domain/boards/templates';
import { AppError, ForbiddenError } from '../../../domain/errors';

export interface CreateBoardParams {
    templateId: string;
    title: string;
    locale: 'es' | 'en';
    createdBy: string;
    createdByName: string;
    isAnonymous?: boolean;
    /** The team the new board should be associated with. Omitted/null means no team, exactly like today. */
    teamId?: string | null;
}

/** POST /api/boards (session-cookie-authenticated). */
export async function createBoard(
    // teamsPort is optional here (rather than mirroring BoardsRouterDeps's required
    // teamsPort) purely so pre-existing callers/tests that never pass a teamId don't
    // need to thread through a dependency they never exercise — the real HTTP route
    // (http/routes/boards.ts) always wires a live one via boards-wiring.ts.
    deps: { boardsPort: BoardsPort; teamsPort?: Pick<TeamsPort, 'getMembership'> },
    params: CreateBoardParams,
): Promise<{ boardId: string }> {
    if (!isValidTemplateId(params.templateId)) {
        throw new AppError('invalid_request', `Invalid template ID: ${params.templateId}`, 400);
    }

    const title = params.title.trim();
    if (!title) {
        throw new AppError('invalid_request', 'title is required', 400);
    }

    // 055-retro-team-association, T006 (spec.md FR-001..FR-004): associating a board with
    // a team requires the requester to already be a member of that team — otherwise a user
    // could attach boards to teams they don't belong to just by knowing the team's id.
    if (params.teamId != null) {
        const membership = await deps.teamsPort?.getMembership(params.teamId, params.createdBy);
        if (!membership) {
            throw new ForbiddenError('Not a member of the specified team');
        }
    }

    return deps.boardsPort.createBoard({
        templateId: params.templateId,
        title,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        locale: params.locale,
        isAnonymous: params.isAnonymous,
        teamId: params.teamId ?? null,
    });
}
