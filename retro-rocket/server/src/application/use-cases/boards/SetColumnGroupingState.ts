import type { CardGroupPort } from '../../ports/cards';

export interface SetColumnGroupingStateDeps {
    cardGroupPort: CardGroupPort;
}

/** contracts/cards-and-groups-api.md `PATCH /api/boards/:id/column-grouping`. */
export async function setColumnGroupingState(deps: SetColumnGroupingStateDeps, retrospectiveId: string, states: Record<string, unknown>): Promise<void> {
    await deps.cardGroupPort.saveColumnGroupingState(retrospectiveId, states);
}
