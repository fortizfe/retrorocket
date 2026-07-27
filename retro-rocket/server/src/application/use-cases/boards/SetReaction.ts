import type { Card, CardPort } from '../../ports/cards';
import { NotFoundError } from '../../../domain/errors';

export interface SetReactionDeps {
    cardPort: CardPort;
}

export interface SetReactionParams {
    cardId: string;
    userId: string;
    username: string;
    emoji: string;
}

/** contracts/cards-and-groups-api.md `PUT /api/boards/:id/cards/:cardId/reaction` (atomic, one per user). */
export async function setReaction(deps: SetReactionDeps, params: SetReactionParams): Promise<Card> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');
    return deps.cardPort.setReaction(params.cardId, params.userId, params.username, params.emoji);
}
