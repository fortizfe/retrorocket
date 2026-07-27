/**
 * The single, shared facilitator-notes gating rule (research.md §7): facilitator notes
 * may be included in an MCP response only when the requester is the retrospective's own
 * facilitator (creator) — mirrors the existing `facilitatorId` check already applied in
 * `firestore.rules` and `facilitatorNotesService`. Consumed by both GetRetrospectiveDetail
 * and GetRetrospectiveSummary so the rule is expressed exactly once (User Story 4).
 */
export function canIncludeFacilitatorNotes(retrospective: { createdBy: string }, requesterUid: string): boolean {
    return requesterUid !== '' && requesterUid === retrospective.createdBy;
}
