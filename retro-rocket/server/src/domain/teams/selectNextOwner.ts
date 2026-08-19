import type { TeamMembershipRecord } from '../../application/ports/teams';

// 054-team-management, T027 (research.md item 4 / data-model.md "State transitions" /
// FR-013): when the owner leaves a team that still has other members, ownership
// transfers to the remaining member with the earliest joinedAt.
//
// Pure domain helper — no I/O. `members` is the FULL current membership list
// (including the departing owner's own record); `departingOwnerId` identifies which
// record to exclude before picking the earliest `joinedAt` among what's left. Ties are
// broken by array order (the earlier entry in `members` wins).
export function selectNextOwner(
    members: TeamMembershipRecord[],
    departingOwnerId: string,
): TeamMembershipRecord {
    const candidates = members.filter((member) => member.userId !== departingOwnerId);

    if (candidates.length === 0) {
        throw new Error('selectNextOwner: no remaining member to transfer ownership to');
    }

    let next = candidates[0];
    for (let i = 1; i < candidates.length; i += 1) {
        if (candidates[i].joinedAt.getTime() < next.joinedAt.getTime()) {
            next = candidates[i];
        }
    }

    return next;
}
