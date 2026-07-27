/**
 * FR-004: a uid may read/write a board's data only if it is the board's creator
 * (facilitator) or a named participant of it. Mirrors domain/mcp/RetrospectiveAccess.ts's
 * hasRetrospectiveAccess rule (kept as a separate copy here rather than shared, since the
 * two bounded contexts — MCP read-only export vs. full boards CRUD — evolve independently;
 * see specs/017-backend-mediated-firebase-access/plan.md Constitution Check).
 */
export function isParticipantOrCreator(
    board: { createdBy: string },
    participants: Array<{ userId: string }>,
    uid: string,
): boolean {
    if (uid === '') return false;
    if (board.createdBy === uid) return true;
    return participants.some((p) => p.userId === uid);
}
