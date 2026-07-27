import type { CardGroup, CardGroupPort } from '../../ports/cards';

export interface RemoveCardFromGroupDeps {
    cardGroupPort: CardGroupPort;
}

/**
 * contracts/cards-and-groups-api.md `DELETE /api/boards/:id/groups/:groupId/cards/:cardId`.
 * Returns null when the removal disbanded the group entirely (head removed with no
 * members to promote, or last member removed).
 */
export async function removeCardFromGroup(deps: RemoveCardFromGroupDeps, cardId: string): Promise<CardGroup | null> {
    return deps.cardGroupPort.removeCardFromGroup(cardId);
}
