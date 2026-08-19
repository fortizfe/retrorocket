import type {
    AddTeamMemberInput,
    CreateTeamInput,
    TeamMemberRole,
    TeamMemberView,
    TeamMembershipRecord,
    TeamsPort,
    TeamSummary,
} from '../../../../src/application/ports/teams';
import { ConflictError, NotFoundError } from '../../../../src/domain/errors';

export interface FakeTeamRecord {
    id: string;
    name: string;
    description: string | null;
    ownerId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FakeMembershipRecord {
    id: string;
    teamId: string;
    userId: string;
    role: TeamMemberRole;
    joinedAt: Date;
}

export interface FakeProfileRecord {
    uid: string;
    displayName: string;
    email: string;
    photoURL: string | null;
}

/**
 * In-memory TeamsPort mirroring FirestoreTeamsAdapter's observable behavior
 * (owner-membership-on-create, FR-007 duplicate prevention, email lookup) —
 * mirrors boardsFakes.ts's inMemoryBoardsPort, shared by the teams use-case
 * tests (054-team-management).
 */
export function inMemoryTeamsPort(
    seed: FakeTeamRecord[] = [],
    memberships: FakeMembershipRecord[] = [],
    profiles: FakeProfileRecord[] = [],
): TeamsPort {
    const teams = new Map<string, FakeTeamRecord>(seed.map((t) => [t.id, { ...t }]));
    const memberList: FakeMembershipRecord[] = memberships.map((m) => ({ ...m }));
    const users = new Map<string, FakeProfileRecord>(profiles.map((p) => [p.uid, { ...p }]));
    let nextTeamId = 1;
    let nextMembershipId = 1;

    function findMembership(teamId: string, userId: string): FakeMembershipRecord | undefined {
        return memberList.find((m) => m.teamId === teamId && m.userId === userId);
    }

    function toMemberView(m: FakeMembershipRecord): TeamMemberView {
        const profile = users.get(m.userId);
        return {
            userId: m.userId,
            displayName: profile?.displayName ?? m.userId,
            email: profile?.email ?? '',
            photoURL: profile?.photoURL ?? null,
            role: m.role,
            joinedAt: m.joinedAt,
        };
    }

    return {
        async createTeam(input: CreateTeamInput) {
            const id = `team-${nextTeamId++}`;
            const now = new Date();
            teams.set(id, {
                id,
                name: input.name,
                description: input.description ?? null,
                ownerId: input.createdBy,
                createdBy: input.createdBy,
                createdAt: now,
                updatedAt: now,
            });
            memberList.push({
                id: `membership-${nextMembershipId++}`,
                teamId: id,
                userId: input.createdBy,
                role: 'owner',
                joinedAt: now,
            });
            return { teamId: id };
        },

        async listTeamsForUser(uid: string) {
            const result: TeamSummary[] = [];
            for (const team of teams.values()) {
                const membership = findMembership(team.id, uid);
                if (!membership) continue;
                const memberCount = memberList.filter((m) => m.teamId === team.id).length;
                result.push({ ...team, memberCount, myRole: membership.role });
            }
            return result;
        },

        async getTeamWithMembers(teamId: string) {
            const team = teams.get(teamId);
            if (!team) return null;
            const members = memberList.filter((m) => m.teamId === teamId).map(toMemberView);
            return { team: { ...team }, members };
        },

        async findUserByEmail(email: string) {
            for (const profile of users.values()) {
                if (profile.email.toLowerCase() === email.toLowerCase()) {
                    return { ...profile };
                }
            }
            return null;
        },

        async addMember(teamId: string, userId: string, role: TeamMemberRole) {
            if (findMembership(teamId, userId)) {
                throw new ConflictError('User is already a member of this team');
            }
            const record: FakeMembershipRecord = {
                id: `membership-${nextMembershipId++}`,
                teamId,
                userId,
                role,
                joinedAt: new Date(),
            };
            memberList.push(record);
            return toMemberView(record);
        },

        async removeMembership(teamId: string, userId: string) {
            const idx = memberList.findIndex((m) => m.teamId === teamId && m.userId === userId);
            if (idx === -1) throw new NotFoundError('Membership not found');
            memberList.splice(idx, 1);
        },

        async transferOwnership(teamId: string, fromUserId: string, toUserId: string) {
            const team = teams.get(teamId);
            if (!team) throw new NotFoundError('Team not found');
            // Mirrors FirestoreTeamsAdapter.transferOwnership exactly: the departing
            // owner's membership is DELETED (not demoted) — this method is used
            // specifically for the "owner leaves and hands off" path (leaveTeam,
            // 054-team-management T024/T030), never for a generic step-down-in-place,
            // so the departing owner's membership must not survive the transfer.
            const fromIdx = memberList.findIndex((m) => m.teamId === teamId && m.userId === fromUserId);
            if (fromIdx !== -1) memberList.splice(fromIdx, 1);
            const to = findMembership(teamId, toUserId);
            if (to) to.role = 'owner';
            team.ownerId = toUserId;
            team.updatedAt = new Date();
        },

        async getMembership(teamId: string, userId: string): Promise<TeamMembershipRecord | null> {
            const m = findMembership(teamId, userId);
            return m ? { ...m } : null;
        },
    };
}

// Convenience factories used across teams use-case tests.
export function fakeTeam(overrides: Partial<FakeTeamRecord> = {}): FakeTeamRecord {
    return {
        id: 't',
        name: 'Team',
        description: null,
        ownerId: 'owner',
        createdBy: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

export function fakeMembership(overrides: Partial<FakeMembershipRecord> = {}): FakeMembershipRecord {
    return {
        id: 'm',
        teamId: 't',
        userId: 'u',
        role: 'member',
        joinedAt: new Date(),
        ...overrides,
    };
}

export function fakeProfile(overrides: Partial<FakeProfileRecord> = {}): FakeProfileRecord {
    return {
        uid: 'u',
        displayName: 'User',
        email: 'user@example.com',
        photoURL: null,
        ...overrides,
    };
}

// Re-exported so test files can type an AddTeamMemberInput without importing the port directly.
export type { AddTeamMemberInput };
