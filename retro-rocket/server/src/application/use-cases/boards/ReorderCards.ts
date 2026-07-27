import type { CardPort, ReorderCardUpdate } from '../../ports/cards';

export interface ReorderCardsDeps {
    cardPort: CardPort;
}

export interface ReorderCardsParams {
    updates: ReorderCardUpdate[];
}

/**
 * contracts/cards-and-groups-api.md `PATCH /api/boards/:id/cards/reorder` (atomic batch,
 * fixing today's sequential-non-atomic `batchUpdateCardOrder`). Any participant may
 * reorder any card — repositioning within a shared board is a collaborative action, not
 * restricted to a card's owner (unlike editing/deleting its content).
 */
export async function reorderCards(deps: ReorderCardsDeps, params: ReorderCardsParams): Promise<void> {
    if (params.updates.length === 0) return;
    await deps.cardPort.reorderCards(params.updates);
}
