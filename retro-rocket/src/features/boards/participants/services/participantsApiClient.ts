import { backendApiClient } from '@/lib/services/backendApiClient';
import { Participant } from '@/features/boards/types/participant';

interface RawParticipant extends Omit<Participant, 'joinedAt'> {
    joinedAt: string;
}

interface JoinBoardResponse {
    board: { title: string };
    participant: RawParticipant;
    isNew: boolean;
}

function parseParticipant(raw: RawParticipant): Participant {
    return { ...raw, joinedAt: new Date(raw.joinedAt) };
}

/**
 * Replaces participantService.ts's addParticipant for the auto-join/join-panel flow
 * (feature 017 US2). Identity is inferred server-side from the session, and the backend
 * atomically increments the board's participantCount (contracts/boards-api.md
 * `POST /api/boards/:id/join`) — callers must NOT separately call
 * OptimizedRetrospectiveService.incrementParticipantCount, which would double-count.
 * Also returns the board's title (US4's useJoinRetrospective needs it for a toast, and
 * the join endpoint's response already carries it — no separate GET required).
 */
export async function joinBoard(retrospectiveId: string): Promise<{ id: string; isNew: boolean; boardTitle: string }> {
    const res = await backendApiClient.post<JoinBoardResponse>(`/api/boards/${retrospectiveId}/join`);
    return { id: res.participant.id, isNew: res.isNew, boardTitle: res.board.title };
}

/** Parses a participant payload as delivered by the `participants` SSE event (contracts/realtime-events.md). */
export function parseParticipantsSnapshot(raw: RawParticipant[]): Participant[] {
    return raw.map(parseParticipant);
}
