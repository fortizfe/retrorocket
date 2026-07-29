import type { CardDTO, CardPort } from '../../ports/cards';

export interface VoteCardParams {
    cardId: string;
    increment: boolean;
}

/** POST /api/cards/:id/vote — atomic, no lost updates under concurrency (FR-008). */
export async function voteCard(deps: { cardPort: CardPort }, params: VoteCardParams): Promise<CardDTO> {
    return deps.cardPort.voteCard(params.cardId, params.increment ? 1 : -1);
}

export interface ToggleLikeParams {
    cardId: string;
    uid: string;
    username: string;
}

/** POST /api/cards/:id/like — atomic, no lost updates under concurrency (FR-009). */
export async function toggleLike(deps: { cardPort: CardPort }, params: ToggleLikeParams): Promise<CardDTO> {
    return deps.cardPort.toggleLike(params.cardId, params.uid, params.username);
}

export interface SetReactionParams {
    cardId: string;
    uid: string;
    username: string;
    emoji: string;
}

/** PUT /api/cards/:id/reaction — add-or-replace the caller's reaction (FR-009). */
export async function setReaction(deps: { cardPort: CardPort }, params: SetReactionParams): Promise<CardDTO> {
    return deps.cardPort.setReaction(params.cardId, params.uid, params.username, params.emoji);
}

export interface RemoveReactionParams {
    cardId: string;
    uid: string;
}

/** DELETE /api/cards/:id/reaction — removes the caller's reaction (FR-009). */
export async function removeReaction(deps: { cardPort: CardPort }, params: RemoveReactionParams): Promise<CardDTO> {
    return deps.cardPort.removeReaction(params.cardId, params.uid);
}
