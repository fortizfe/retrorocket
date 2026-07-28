import type { BoardsPort } from '../../ports/boards';
import { isValidTemplateId } from '../../../domain/boards/templates';
import { AppError } from '../../../domain/errors';

export interface CreateBoardParams {
    templateId: string;
    title: string;
    locale: 'es' | 'en';
    createdBy: string;
    createdByName: string;
}

/** POST /api/boards (session-cookie-authenticated). */
export async function createBoard(
    deps: { boardsPort: BoardsPort },
    params: CreateBoardParams,
): Promise<{ boardId: string }> {
    if (!isValidTemplateId(params.templateId)) {
        throw new AppError('invalid_request', `Invalid template ID: ${params.templateId}`, 400);
    }

    const title = params.title.trim();
    if (!title) {
        throw new AppError('invalid_request', 'title is required', 400);
    }

    return deps.boardsPort.createBoard({
        templateId: params.templateId,
        title,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        locale: params.locale,
    });
}
