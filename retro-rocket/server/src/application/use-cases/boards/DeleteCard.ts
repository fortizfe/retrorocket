import type { CardGroupPort, CardPort } from '../../ports/cards';
import { ForbiddenError, NotFoundError } from '../../../domain/errors';
import { isCardOwner } from '../../../domain/boards/CardAccess';

export interface DeleteCardDeps {
    cardPort: CardPort;
    cardGroupPort: CardGroupPort;
}

export interface DeleteCardParams {
    cardId: string;
    requesterUid: string;
}

/**
 * contracts/cards-and-groups-api.md `DELETE /api/boards/:id/cards/:cardId` — owner-only
 * (FR-004). If the card is a group head or member, the group is cleaned up first
 * (promote next member to head, or disband) so no group ever references a deleted card.
 */
export async function deleteCard(deps: DeleteCardDeps, params: DeleteCardParams): Promise<void> {
    const card = await deps.cardPort.getCard(params.cardId);
    if (!card) throw new NotFoundError('Card not found');
    if (!isCardOwner(card, params.requesterUid)) {
        throw new ForbiddenError('Only the card owner may delete it');
    }

    if (card.groupId) {
        await deps.cardGroupPort.removeCardFromGroup(params.cardId);
    }
    await deps.cardPort.deleteCard(params.cardId);
}
