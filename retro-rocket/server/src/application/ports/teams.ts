// ---------------------------------------------------------------------------
// TeamsPort — read/write Firestore access for the Team Management feature
// (054). Two flat, backend-only collections (`teams` and `teamMemberships`,
// data-model.md) accessed exclusively through this port — the frontend never
// talks to Firestore for teams directly (research.md item 1). Deliberately
// separate from BoardsPort/ProfilePort/RetrospectiveReadPort (unrelated
// collections), per Interface Segregation.
// ---------------------------------------------------------------------------

export type TeamMemberRole = 'owner' | 'member';

export interface TeamRecord {
    id: string;
    name: string;
    description: string | null;
    /** Currently designated owner; updated in place on ownership transfer (FR-013). */
    ownerId: string;
    /** The original creator (FR-002). Immutable — distinct from ownerId, which can change. */
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TeamMembershipRecord {
    id: string;
    teamId: string;
    userId: string;
    role: TeamMemberRole;
    joinedAt: Date;
}

/** Team fields plus data derived at read time for list views (data-model.md, "Derived read shapes"). */
export interface TeamSummary extends TeamRecord {
    memberCount: number;
    /** The requesting uid's own role in this team. */
    myRole: TeamMemberRole;
}

/** A single roster entry — TeamMembership joined with the member's ProfileRecord, for display. */
export interface TeamMemberView {
    userId: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    role: TeamMemberRole;
    joinedAt: Date;
}

export interface CreateTeamInput {
    name: string;
    description?: string;
    createdBy: string; // uid
}

export interface AddTeamMemberInput {
    teamId: string;
    email: string;
    requestedBy: string; // uid — must be checked against the team's current owner by the use-case
}

export interface TeamsPort {
    /** Writes the team doc + the creator's owner TeamMembership doc together (research.md item 1). */
    createTeam(input: CreateTeamInput): Promise<{ teamId: string }>;
    /** Every team the uid currently has a TeamMembership in, each with memberCount + myRole. */
    listTeamsForUser(uid: string): Promise<TeamSummary[]>;
    /**
     * Team detail + full member roster. Returns null when the team does not exist; returns the
     * team/roster regardless of whether requesterUid is a member — the caller (use-case) decides
     * 403 vs null, per contracts/teams-api.md (404 vs 403 are distinct responses).
     */
    getTeamWithMembers(teamId: string, requesterUid: string): Promise<{ team: TeamRecord; members: TeamMemberView[] } | null>;
    /**
     * Exact-match lookup against the existing users/{uid} profile collection (research.md item 2).
     * email MUST already be normalized (trim + lowercase) by the caller. Returns null when no
     * RetroRocket profile matches — never creates or falls back to Firebase Auth's user store.
     */
    findUserByEmail(email: string): Promise<{ uid: string; displayName: string; email: string; photoURL: string | null } | null>;
    /** Throws a conflict AppError if userId already has a membership in teamId (FR-007). */
    addMember(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMemberView>;
    removeMembership(teamId: string, userId: string): Promise<void>;
    /** Updates the team doc's ownerId and reconciles both users' membership roles/docs. */
    transferOwnership(teamId: string, fromUserId: string, toUserId: string): Promise<void>;
    getMembership(teamId: string, userId: string): Promise<TeamMembershipRecord | null>;
}
