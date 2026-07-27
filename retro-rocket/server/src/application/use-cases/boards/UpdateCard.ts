import type { Card, CardPort, UpdateCardInput } from '../../ports/cards';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isCardOwner } from '../../../domain/boards/CardAccess';

export interface UpdateCardDeps {
    cardPort: CardPort;
}

export interface UpdateCardParams {
    cardId: string;
    requesterUid: string;
    updates: UpdateCardInput;
}

/** contracts/cards-and-groups-api.md `PATCH /api/boards/:id/cards/:cardId` — owner-only (FR-004). */
export async function updateCard(deps: UpdateCardDeps, params: UpdateCardParams): Promise<Card> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');
    if (!isCardOwner(card, params.requesterUid)) {
        throw new ForbiddenError('Only the card owner may edit it');
    }
    return deps.cardPort.updateCard(params.cardId, params.updates);
}
