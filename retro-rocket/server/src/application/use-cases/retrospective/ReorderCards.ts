import type { CardPort, ReorderUpdate } from '../../ports/cards';

export interface ReorderCardsParams {
    retrospectiveId: string;
    updates: ReorderUpdate[];
}

/**
 * POST /api/retrospectives/:id/cards/reorder — atomic, all-or-nothing (FR-010).
 * Fixes the current client's non-atomic sequential batchUpdateCardOrder (research.md
 * §8) by delegating the whole batch to the adapter's single Firestore WriteBatch.
 */
export async function reorderCards(deps: { cardPort: CardPort }, params: ReorderCardsParams): Promise<void> {
    await deps.cardPort.reorderCards(params.retrospectiveId, params.updates);
}
