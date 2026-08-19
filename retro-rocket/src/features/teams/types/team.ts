/**
 * Frontend types for the Team Management feature (spec 054). Mirror the DTOs described in
 * specs/054-team-management/contracts/teams-api.md; dates are parsed from the backend's
 * ISO-8601 strings into `Date` instances the same way `backendBoardsClient.ts`'s `fromDTO`
 * does for boards, so nothing downstream deals with raw date strings.
 */

/** A team as returned in isolation (owner + timestamps, no membership/roster data). */
export interface Team {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * One row of `GET /api/teams` — a `Team` plus the caller's own membership context
 * (member count and their role in that team), used to render the teams overview list.
 */
export interface TeamSummary extends Team {
    memberCount: number;
    myRole: 'owner' | 'member';
}

/** One entry of a team's member roster, as returned by `GET /api/teams/:id`. */
export interface TeamMember {
    userId: string;
    displayName: string;
    email: string;
    photoURL: string | null;
    role: 'owner' | 'member';
    joinedAt: Date;
}

/** Full team detail — a `Team` plus its complete member roster. */
export interface TeamDetail extends Team {
    members: TeamMember[];
}
