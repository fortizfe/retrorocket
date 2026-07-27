/**
 * FR-002/FR-007: a connection's uid may read a retrospective only if it is the
 * facilitator (creator) or a named, account-linked participant of it.
 */
export function hasRetrospectiveAccess(
    retrospective: { createdBy: string },
    participants: Array<{ userId: string }>,
    uid: string,
): boolean {
    if (uid === '') return false;
    if (retrospective.createdBy === uid) return true;
    return participants.some((p) => p.userId === uid);
}
