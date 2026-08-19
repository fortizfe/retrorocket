import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type {
    CreateTeamInput,
    TeamMemberRole,
    TeamMemberView,
    TeamMembershipRecord,
    TeamRecord,
    TeamSummary,
    TeamsPort,
} from '../../application/ports/teams';
import { ConflictError } from '../../domain/errors';

const TEAMS = 'teams';
const TEAM_MEMBERSHIPS = 'teamMemberships';
const USERS = 'users';

/** Deterministic id so the FR-007 duplicate-membership check is a single get()/transaction
 * read instead of a query (data-model.md, research.md item 3). */
export function membershipId(teamId: string, userId: string): string {
    return `${teamId}_${userId}`;
}

/**
 * Exported (alongside the other to* mappers) so this pure mapping logic can be
 * unit-tested directly — the rest of the adapter is thin firebase-admin query
 * composition that, consistent with FirestoreBoardsAdapter/FirestoreProfileAdapter
 * elsewhere in this codebase, is verified end-to-end by the Playwright E2E suite
 * against the emulator rather than mocked at the Vitest level.
 */
export function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toTeamRecord(id: string, data: FirebaseFirestore.DocumentData): TeamRecord {
    return {
        id,
        name: data.name,
        description: data.description ?? null,
        ownerId: data.ownerId,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
    };
}

export function toTeamMembershipRecord(id: string, data: FirebaseFirestore.DocumentData): TeamMembershipRecord {
    return {
        id,
        teamId: data.teamId,
        userId: data.userId,
        role: data.role,
        joinedAt: toDate(data.joinedAt),
    };
}

/**
 * Read/write Admin SDK access to teams/teamMemberships for the Team Management feature
 * (054). Kept separate from BoardsPort/ProfilePort — unrelated Firestore collections
 * (research.md item 1).
 */
export class FirestoreTeamsAdapter implements TeamsPort {
    constructor(private readonly db: Firestore) {}

    async createTeam(input: CreateTeamInput): Promise<{ teamId: string }> {
        const teamRef = this.db.collection(TEAMS).doc();
        const membershipRef = this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamRef.id, input.createdBy));
        const batch = this.db.batch();

        batch.set(teamRef, {
            name: input.name,
            description: input.description ?? null,
            ownerId: input.createdBy,
            createdBy: input.createdBy,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        batch.set(membershipRef, {
            teamId: teamRef.id,
            userId: input.createdBy,
            role: 'owner' satisfies TeamMemberRole,
            joinedAt: FieldValue.serverTimestamp(),
        });

        // Atomic: the team and its owner membership land together, or neither does —
        // mirrors FirestoreBoardsAdapter.createBoard's board+columns+participant write.
        await batch.commit();

        return { teamId: teamRef.id };
    }

    async listTeamsForUser(uid: string): Promise<TeamSummary[]> {
        const memberships = await this.db.collection(TEAM_MEMBERSHIPS).where('userId', '==', uid).get();
        const byTeamId = new Map(memberships.docs.map((doc) => [doc.data().teamId as string, toTeamMembershipRecord(doc.id, doc.data())]));

        const teamIds = [...byTeamId.keys()];
        if (teamIds.length === 0) return [];

        const summaries: TeamSummary[] = [];
        // Firestore 'in' queries cap at 30 values — chunk rather than N individual gets.
        for (let i = 0; i < teamIds.length; i += 30) {
            const chunk = teamIds.slice(i, i + 30);
            const snap = await this.db.collection(TEAMS).where('__name__', 'in', chunk).get();
            for (const doc of snap.docs) {
                const memberCount = await this.countMembers(doc.id);
                summaries.push({
                    ...toTeamRecord(doc.id, doc.data()),
                    memberCount,
                    myRole: byTeamId.get(doc.id)!.role,
                });
            }
        }

        return summaries;
    }

    async getTeamWithMembers(teamId: string, _requesterUid: string): Promise<{ team: TeamRecord; members: TeamMemberView[] } | null> {
        const teamSnap = await this.db.collection(TEAMS).doc(teamId).get();
        if (!teamSnap.exists) return null;

        const team = toTeamRecord(teamSnap.id, teamSnap.data()!);
        const membershipDocs = await this.db.collection(TEAM_MEMBERSHIPS).where('teamId', '==', teamId).get();

        const members: TeamMemberView[] = [];
        for (const doc of membershipDocs.docs) {
            const membership = toTeamMembershipRecord(doc.id, doc.data());
            const profileSnap = await this.db.collection(USERS).doc(membership.userId).get();
            const profile = profileSnap.data();
            members.push({
                userId: membership.userId,
                displayName: profile?.displayName ?? '',
                email: profile?.email ?? '',
                photoURL: profile?.photoURL ?? null,
                role: membership.role,
                joinedAt: membership.joinedAt,
            });
        }

        return { team, members };
    }

    async findUserByEmail(email: string): Promise<{ uid: string; displayName: string; email: string; photoURL: string | null } | null> {
        const snap = await this.db.collection(USERS).where('email', '==', email).limit(1).get();
        if (snap.empty) return null;

        const doc = snap.docs[0];
        const data = doc.data();
        return {
            uid: doc.id,
            displayName: data.displayName ?? '',
            email: data.email,
            photoURL: data.photoURL ?? null,
        };
    }

    async addMember(teamId: string, userId: string, role: TeamMemberRole): Promise<TeamMemberView> {
        const membershipRef = this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamId, userId));

        await this.db.runTransaction(async (tx) => {
            const existing = await tx.get(membershipRef);
            if (existing.exists) {
                throw new ConflictError('User is already a member of this team');
            }
            tx.set(membershipRef, {
                teamId,
                userId,
                role,
                joinedAt: FieldValue.serverTimestamp(),
            });
        });

        const profileSnap = await this.db.collection(USERS).doc(userId).get();
        const profile = profileSnap.data();
        const created = await membershipRef.get();

        return {
            userId,
            displayName: profile?.displayName ?? '',
            email: profile?.email ?? '',
            photoURL: profile?.photoURL ?? null,
            role,
            joinedAt: toDate(created.data()?.joinedAt),
        };
    }

    async removeMembership(teamId: string, userId: string): Promise<void> {
        await this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamId, userId)).delete();
    }

    async transferOwnership(teamId: string, fromUserId: string, toUserId: string): Promise<void> {
        const teamRef = this.db.collection(TEAMS).doc(teamId);
        const fromRef = this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamId, fromUserId));
        const toRef = this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamId, toUserId));

        await this.db.runTransaction(async (tx) => {
            tx.update(teamRef, { ownerId: toUserId, updatedAt: FieldValue.serverTimestamp() });
            tx.delete(fromRef);
            tx.update(toRef, { role: 'owner' satisfies TeamMemberRole });
        });
    }

    async getMembership(teamId: string, userId: string): Promise<TeamMembershipRecord | null> {
        const snap = await this.db.collection(TEAM_MEMBERSHIPS).doc(membershipId(teamId, userId)).get();
        if (!snap.exists) return null;
        return toTeamMembershipRecord(snap.id, snap.data()!);
    }

    private async countMembers(teamId: string): Promise<number> {
        const snap = await this.db.collection(TEAM_MEMBERSHIPS).where('teamId', '==', teamId).count().get();
        return snap.data().count;
    }
}
