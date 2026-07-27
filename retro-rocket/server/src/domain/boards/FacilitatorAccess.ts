/**
 * FR-004: only a board's own facilitator (creator) may control the countdown timer, or
 * read/write facilitator notes/action items. Mirrors domain/mcp/FacilitatorAccess.ts's
 * canIncludeFacilitatorNotes rule for the same reason noted in BoardAccess.ts.
 *
 * research.md §2: this is the rule that closes the gap left open by firestore.rules'
 * global catch-all today (any authenticated user can currently read/write these
 * collections directly) — this function is where that restriction becomes real.
 */
export function isFacilitator(board: { createdBy: string }, uid: string): boolean {
    return uid !== '' && uid === board.createdBy;
}
