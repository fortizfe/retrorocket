import type { CardGroup, CardGroupPort } from '../../ports/cards';

export interface SetGroupCollapseStateDeps {
    cardGroupPort: CardGroupPort;
}

/** contracts/cards-and-groups-api.md `PATCH /api/boards/:id/groups/:groupId`. */
export async function setGroupCollapseState(deps: SetGroupCollapseStateDeps, groupId: string, isCollapsed: boolean): Promise<CardGroup> {
    return deps.cardGroupPort.setGroupCollapsed(groupId, isCollapsed);
}
