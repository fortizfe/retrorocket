import { useCallback, useState } from 'react';
import { addTeamMember, removeTeamMember } from '../services/backendTeamsClient';
import type { TeamMember } from '../types/team';

/**
 * Membership actions for a single team (spec 054 tasks.md T035, User Story 2): add by
 * email, remove a member, and leave (self-removal). Each action calls its
 * `backendTeamsClient` function and, on success, awaits the caller-supplied `onChanged`
 * (typically `useTeamQuery`'s `refetch`) so the roster reflects the change immediately.
 *
 * Errors are left to propagate (not swallowed here) — `TeamApiError`'s `.code` lets
 * `AddMemberByEmailForm` show a specific inline message (`user_not_found` vs `conflict`)
 * and `TeamDetail.tsx` show a specific toast for remove/leave failures, matching how
 * `Teams.tsx` handles `createTeam` errors at the call site (T018's `handleCreate`).
 *
 * `leave` is a thin, named alias over `removeMember`: the DELETE endpoint's case 3 (the
 * caller removing themself) already covers both a plain member's voluntary leave and an
 * owner's departure — see contracts/teams-api.md. Giving it its own name keeps call
 * sites (`TeamMemberList`, `TeamDetail`) readable about *intent* even though the
 * request is identical.
 */
export interface UseTeamMembershipActionsResult {
    /** POST /api/teams/:id/members — owner-only, exact email match (FR-003/FR-004). */
    addMember: (email: string) => Promise<TeamMember>;
    /** DELETE /api/teams/:id/members/:userId for someone other than the caller (FR-005). */
    removeMember: (userId: string) => Promise<{ teamEmptied: boolean }>;
    /** DELETE /api/teams/:id/members/:userId for the caller's own `userId` (FR-012/FR-013/FR-014). */
    leave: (selfUserId: string) => Promise<{ teamEmptied: boolean }>;
    /** True while any of the above is in flight — callers disable controls to avoid double-submits. */
    submitting: boolean;
}

export function useTeamMembershipActions(
    teamId: string,
    onChanged: () => void | Promise<void>,
): UseTeamMembershipActionsResult {
    const [submitting, setSubmitting] = useState(false);

    const addMember = useCallback(
        async (email: string) => {
            setSubmitting(true);
            try {
                const member = await addTeamMember(teamId, email);
                await onChanged();
                return member;
            } finally {
                setSubmitting(false);
            }
        },
        [teamId, onChanged],
    );

    const removeMember = useCallback(
        async (userId: string) => {
            setSubmitting(true);
            try {
                const result = await removeTeamMember(teamId, userId);
                await onChanged();
                return result;
            } finally {
                setSubmitting(false);
            }
        },
        [teamId, onChanged],
    );

    const leave = useCallback((selfUserId: string) => removeMember(selfUserId), [removeMember]);

    return { addMember, removeMember, leave, submitting };
}
