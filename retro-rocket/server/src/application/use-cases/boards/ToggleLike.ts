import type { Card, CardPort } from '../../ports/cards';
import { NotFoundError } from '../../../domain/errors';

export interface ToggleLikeDeps {
    cardPort: CardPort;
}

export interface ToggleLikeParams {
    cardId: string;
    userId: string;
    username: string;
}

/** contracts/cards-and-groups-api.md `POST /api/boards/:id/cards/:cardId/like` (atomic). */
export async function toggleLike(deps: ToggleLikeDeps, params: ToggleLikeParams): Promise<Card> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');
    return deps.cardPort.toggleLike(params.cardId, params.userId, params.username);
}
