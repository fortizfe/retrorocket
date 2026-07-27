import type { CardGroup, CardGroupPort } from '../../ports/cards';

export interface AddCardToGroupDeps {
    cardGroupPort: CardGroupPort;
}

/** contracts/cards-and-groups-api.md `PUT /api/boards/:id/groups/:groupId/cards/:cardId`. */
export async function addCardToGroup(deps: AddCardToGroupDeps, groupId: string, cardId: string): Promise<CardGroup> {
    return deps.cardGroupPort.addCardToGroup(groupId, cardId);
}
