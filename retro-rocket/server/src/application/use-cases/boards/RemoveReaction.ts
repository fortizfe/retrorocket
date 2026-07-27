import type { Card, CardPort } from '../../ports/cards';
import { NotFoundError } from '../../../domain/errors';

export interface RemoveReactionDeps {
    cardPort: CardPort;
}

export interface RemoveReactionParams {
    cardId: string;
    userId: string;
}

/** contracts/cards-and-groups-api.md `DELETE /api/boards/:id/cards/:cardId/reaction`. */
export async function removeReaction(deps: RemoveReactionDeps, params: RemoveReactionParams): Promise<Card> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');
    return deps.cardPort.removeReaction(params.cardId, params.userId);
}
