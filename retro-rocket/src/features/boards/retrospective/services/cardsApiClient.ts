import { backendApiClient } from '@/lib/services/backendApiClient';
import { Card, CreateCardInput, EmojiReaction, Like, Reaction } from '@/features/boards/types/card';

interface RawLike extends Omit<Like, 'timestamp'> {
    timestamp: string;
}
interface RawReaction extends Omit<Reaction, 'timestamp'> {
    timestamp: string;
}
interface RawCard extends Omit<Card, 'createdAt' | 'updatedAt' | 'likes' | 'reactions'> {
    createdAt: string;
    updatedAt: string;
    likes: RawLike[];
    reactions: RawReaction[];
}

function parseCard(raw: RawCard): Card {
    return {
        ...raw,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
        likes: raw.likes.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })),
        reactions: raw.reactions.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
    };
}

/** Replaces cardService.ts's direct Firestore access (feature 017 US2). */
export async function createCard(input: CreateCardInput): Promise<Card> {
    const raw = await backendApiClient.post<RawCard>(`/api/boards/${input.retrospectiveId}/cards`, {
        content: input.content,
        column: input.column,
        color: input.color,
    });
    return parseCard(raw);
}

export async function updateCard(retrospectiveId: string, id: string, updates: Partial<Card>): Promise<Card> {
    const raw = await backendApiClient.patch<RawCard>(`/api/boards/${retrospectiveId}/cards/${id}`, updates);
    return parseCard(raw);
}

export async function deleteCard(retrospectiveId: string, id: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/cards/${id}`);
}

/**
 * Legacy up/down voting (README: deprecated in favor of likes/reactions, but still
 * rendered — see `CardVoteControl` — so it must keep working, FR-005). No dedicated
 * endpoint: `votes` is carried through generically via the card update endpoint.
 */
export async function voteCard(retrospectiveId: string, cardId: string, currentVotes: number, increment: boolean): Promise<Card> {
    const newVotes = Math.max(0, currentVotes + (increment ? 1 : -1));
    return updateCard(retrospectiveId, cardId, { votes: newVotes });
}

/** Replaces cardInteractionService.ts's toggleLike (userId/username are now inferred server-side from the session). */
export async function toggleLike(retrospectiveId: string, cardId: string): Promise<{ liked: boolean; likes: Like[] }> {
    const res = await backendApiClient.post<{ liked: boolean; likes: RawLike[] }>(`/api/boards/${retrospectiveId}/cards/${cardId}/like`);
    return { liked: res.liked, likes: res.likes.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })) };
}

export async function addOrUpdateReaction(retrospectiveId: string, cardId: string, emoji: EmojiReaction): Promise<Reaction[]> {
    const res = await backendApiClient.put<{ reactions: RawReaction[] }>(`/api/boards/${retrospectiveId}/cards/${cardId}/reaction`, { emoji });
    return res.reactions.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }));
}

export async function removeReaction(retrospectiveId: string, cardId: string): Promise<Reaction[]> {
    const res = await backendApiClient.delete<{ reactions: RawReaction[] }>(`/api/boards/${retrospectiveId}/cards/${cardId}/reaction`);
    return res.reactions.map((r) => ({ ...r, timestamp: new Date(r.timestamp) }));
}

export async function batchUpdateCardOrder(
    retrospectiveId: string,
    updates: Array<{ cardId: string; order: number; column?: string }>,
): Promise<void> {
    await backendApiClient.patch(`/api/boards/${retrospectiveId}/cards/reorder`, { updates });
}

/** Parses a card payload as delivered by the `cards` SSE event (contracts/realtime-events.md). */
export function parseCardsSnapshot(raw: RawCard[]): Card[] {
    return raw.map(parseCard);
}
