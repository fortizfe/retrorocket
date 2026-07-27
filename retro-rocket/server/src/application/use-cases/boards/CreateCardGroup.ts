import type { CardGroup, CardGroupPort } from '../../ports/cards';
import { AppError } from '../../../domain/errors';

export interface CreateCardGroupDeps {
    cardGroupPort: CardGroupPort;
}

export interface CreateCardGroupParams {
    retrospectiveId: string;
    headCardId: string;
    memberCardIds: string[];
    createdBy: string;
    title?: string;
}

/** contracts/cards-and-groups-api.md `POST /api/boards/:id/groups`. */
export async function createCardGroup(deps: CreateCardGroupDeps, params: CreateCardGroupParams): Promise<CardGroup> {
    if (params.memberCardIds.length === 0) {
        throw new AppError('invalid_request', 'A group needs at least one member card', 400);
    }
    return deps.cardGroupPort.createGroup(params.retrospectiveId, params.headCardId, params.memberCardIds, params.createdBy, params.title);
}
