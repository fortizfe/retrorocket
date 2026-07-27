import type { Board, BoardReadPort, ParticipantPort } from '../../ports/boards';

export interface ListBoardsDeps {
    boardReadPort: BoardReadPort;
    participantPort: ParticipantPort;
}

export interface BoardSummary extends Board {
    isCreator: boolean;
}

/**
 * contracts/boards-api.md `GET /api/boards` — the single canonical owned+joined board
 * list (research.md §3), superseding `retrospectiveService.ts`, `OptimizedRetrospectiveService.ts`,
 * and `userService.getUserBoards`. "Joined" boards are derived from the `participants`
 * collection rather than a separate `joinedBoards` array — see ParticipantPort's
 * `listParticipantRecordsForUser` doc comment for why.
 */
export async function listBoards(deps: ListBoardsDeps, params: { userId: string }): Promise<BoardSummary[]> {
    const owned = await deps.boardReadPort.listBoardsCreatedBy(params.userId);
    const ownedIds = new Set(owned.map((b) => b.id));

    const participantRecords = await deps.participantPort.listParticipantRecordsForUser(params.userId);
    const joinedIds = [...new Set(participantRecords.map((p) => p.retrospectiveId))].filter((id) => !ownedIds.has(id));
    const joinedBoards = (await Promise.all(joinedIds.map((id) => deps.boardReadPort.getBoard(id)))).filter(
        (b): b is NonNullable<typeof b> => b !== null,
    );

    const summaries: BoardSummary[] = [
        ...owned.map((b) => ({ ...b, isCreator: true })),
        ...joinedBoards.map((b) => ({ ...b, isCreator: false })),
    ];

    return summaries.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
