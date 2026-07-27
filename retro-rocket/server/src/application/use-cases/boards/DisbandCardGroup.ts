import type { CardGroupPort } from '../../ports/cards';

export interface DisbandCardGroupDeps {
    cardGroupPort: CardGroupPort;
}

/** contracts/cards-and-groups-api.md `DELETE /api/boards/:id/groups/:groupId`. */
export async function disbandCardGroup(deps: DisbandCardGroupDeps, groupId: string): Promise<void> {
    await deps.cardGroupPort.disbandGroup(groupId);
}
