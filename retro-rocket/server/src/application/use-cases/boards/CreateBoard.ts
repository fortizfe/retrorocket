import type { BoardWithColumns, BoardWritePort } from '../../ports/boards';
import { AppError } from '../../../domain/errors';
import { getTemplateColumns, isValidTemplateId } from '../../../domain/boards/boardTemplates';

export interface CreateBoardParams {
    templateId: string;
    title: string;
    description?: string;
    createdBy: string;
    createdByName: string;
    locale: 'es' | 'en';
}

export interface CreateBoardDeps {
    boardWritePort: BoardWritePort;
}

/**
 * contracts/boards-api.md `POST /api/boards` (User Story 4, Acceptance Scenario 1;
 * built in Foundational so every later story has a board to test against).
 */
export async function createBoard(deps: CreateBoardDeps, params: CreateBoardParams): Promise<BoardWithColumns> {
    if (!isValidTemplateId(params.templateId)) {
        throw new AppError('invalid_template', `Unknown board template: ${params.templateId}`, 400);
    }
    if (params.title.trim() === '') {
        throw new AppError('invalid_request', 'title is required', 400);
    }

    const columns = getTemplateColumns(params.templateId).map((column, index) => ({
        id: column.id,
        i18nKey: column.i18nKey,
        type: column.type,
        order: index,
        defaultColor: column.defaultColor,
    }));

    return deps.boardWritePort.createBoard({
        templateId: params.templateId,
        title: params.title,
        description: params.description,
        createdBy: params.createdBy,
        createdByName: params.createdByName,
        locale: params.locale,
        columns,
    });
}
