import type { Card, CardPort } from '../../ports/cards';
import { AppError } from '../../../domain/errors';

export interface CreateCardDeps {
    cardPort: CardPort;
}

export interface CreateCardParams {
    retrospectiveId: string;
    content: string;
    column: string;
    createdBy: string;
    color?: string;
}

/** contracts/cards-and-groups-api.md `POST /api/boards/:id/cards`. */
export async function createCard(deps: CreateCardDeps, params: CreateCardParams): Promise<Card> {
    if (params.content.trim() === '') {
        throw new AppError('invalid_request', 'content is required', 400);
    }
    return deps.cardPort.createCard(params);
}
