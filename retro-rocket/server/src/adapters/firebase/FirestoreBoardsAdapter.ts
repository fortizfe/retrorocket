import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { BoardsPort, BoardSummary, CreateBoardInput } from '../../application/ports/boards';
import { NotFoundError, ForbiddenError } from '../../domain/errors';
import { getTemplateColumns } from '../../domain/boards/templates';

const RETROSPECTIVES = 'retrospectives';
const PARTICIPANTS = 'participants';
// 055-retro-team-association, T024: same `teams` collection 054's FirestoreTeamsAdapter
// writes to — read-only here, purely to resolve teamId -> name for the dashboard
// (research.md item 1).
const TEAMS = 'teams';
const COLUMNS = 'columns';
const GROUPS = 'groups';
const ACTION_ITEMS = 'actionItems';
const FACILITATOR_NOTES = 'facilitatorNotes';
const SENTIMENT_RESULTS = 'sentimentResults';
const COUNTDOWN_TIMERS = 'countdown_timers';
const TYPING_STATUS = 'typingStatus';
/** Collections cascade-deleted by retrospectiveId when a board is deleted (feature
 * 019, research.md §9 — optional cleanup, cheap now that adapters for all of them
 * exist). `participants`/`cards` are deliberately excluded: today's deleteBoard
 * already leaves them un-cascaded and touching that is outside this feature's scope. */
const CASCADE_COLLECTIONS_BY_RETROSPECTIVE_ID = [GROUPS, ACTION_ITEMS, FACILITATOR_NOTES, SENTIMENT_RESULTS, TYPING_STATUS];

/**
 * Exported (alongside toBoardSummary) so this pure mapping logic can be unit-tested
 * directly — the rest of the adapter is thin firebase-admin query composition that,
 * consistent with FirestoreRetrospectiveReadAdapter/FirestoreMcpConnectionAdapter
 * elsewhere in this codebase, is verified end-to-end by the Playwright E2E suite
 * against the emulator rather than mocked at the Vitest level.
 */
export function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toBoardSummary(id: string, data: FirebaseFirestore.DocumentData, requesterUid: string): BoardSummary {
    return {
        id,
        title: data.title,
        description: data.description ?? '',
        templateId: data.templateId,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        participantCount: data.participantCount ?? 0,
        isActive: data.isActive ?? true,
        createdBy: data.createdBy,
        isCreator: data.createdBy === requesterUid,
        // 055-retro-team-association, T005: raw passthrough of the stored field; team-name
        // resolution (teamName) is a later task (T024) and intentionally stays null here
        // per data-model.md's documented asymmetry between this helper and listBoardsForUser.
        teamId: data.teamId ?? null,
        teamName: null,
    };
}

/**
 * Read/write Admin SDK access to boards for the Dashboard ("My Boards") screen
 * (feature 017). Kept separate from the read-only FirestoreRetrospectiveReadAdapter
 * used by the MCP connector (research.md §4).
 */
export class FirestoreBoardsAdapter implements BoardsPort {
    constructor(private readonly db: Firestore) {}

    async listBoardsForUser(uid: string): Promise<BoardSummary[]> {
        const boards = new Map<string, BoardSummary>();

        const owned = await this.db.collection(RETROSPECTIVES).where('createdBy', '==', uid).get();
        for (const doc of owned.docs) {
            boards.set(doc.id, toBoardSummary(doc.id, doc.data(), uid));
        }

        const participations = await this.db.collection(PARTICIPANTS).where('userId', '==', uid).get();
        const joinedIds = [...new Set(participations.docs.map((d) => d.data().retrospectiveId as string))].filter(
            (id) => !boards.has(id),
        );

        // Firestore 'in' queries cap at 30 values — chunk rather than N individual gets.
        for (let i = 0; i < joinedIds.length; i += 30) {
            const chunk = joinedIds.slice(i, i + 30);
            const snap = await this.db.collection(RETROSPECTIVES).where('__name__', 'in', chunk).get();
            for (const doc of snap.docs) {
                boards.set(doc.id, toBoardSummary(doc.id, doc.data(), uid));
            }
        }

        // 055-retro-team-association, T024: second pass to resolve teamName for display
        // (research.md item 1) — toBoardSummary itself has no async access to do this, so
        // it stays a batched, chunked `teams` lookup here after the summaries are built.
        const teamIds = [...new Set([...boards.values()].map((b) => b.teamId).filter((id): id is string => id !== null))];
        if (teamIds.length > 0) {
            const teamNames = new Map<string, string>();
            for (let i = 0; i < teamIds.length; i += 30) {
                const chunk = teamIds.slice(i, i + 30);
                const snap = await this.db.collection(TEAMS).where('__name__', 'in', chunk).get();
                for (const doc of snap.docs) {
                    teamNames.set(doc.id, doc.data().name as string);
                }
            }
            for (const [id, board] of boards) {
                if (board.teamId !== null) {
                    boards.set(id, { ...board, teamName: teamNames.get(board.teamId) ?? null });
                }
            }
        }

        return [...boards.values()];
    }

    async createBoard(input: CreateBoardInput): Promise<{ boardId: string }> {
        const docRef = this.db.collection(RETROSPECTIVES).doc();
        const batch = this.db.batch();

        batch.set(docRef, {
            title: input.title,
            description: '',
            templateId: input.templateId,
            createdBy: input.createdBy,
            createdByName: input.createdByName,
            locale: input.locale,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            // The creator counts as the board's first participant (matches today's
            // frontend behavior of adding the creator to `participants` right after
            // creation), so the not-yet-migrated board detail screen's participant
            // list/presence keeps working unchanged for newly created boards.
            participantCount: 1,
            isActive: true,
            isAnonymous: input.isAnonymous ?? false,
            // 055-retro-team-association, T007: raw passthrough, defaulting to null when
            // the caller omitted teamId (no team association), matching CreateBoardInput's doc.
            teamId: input.teamId ?? null,
        });

        const columns = getTemplateColumns(input.templateId);
        columns.forEach((column, index) => {
            const columnRef = docRef.collection(COLUMNS).doc(column.id);
            batch.set(columnRef, {
                i18nKey: column.i18nKey,
                type: column.type,
                order: index,
                defaultColor: column.defaultColor,
                createdAt: FieldValue.serverTimestamp(),
            });
        });

        const participantRef = this.db.collection(PARTICIPANTS).doc();
        batch.set(participantRef, {
            retrospectiveId: docRef.id,
            userId: input.createdBy,
            name: input.createdByName,
            joinedAt: FieldValue.serverTimestamp(),
            isActive: true,
        });

        // Atomic: the board, its columns, and the creator's participant record land
        // together, or none do (research.md §5a — avoids the orphaned, column-less
        // board that today's non-atomic frontend write can leave on partial failure).
        await batch.commit();

        return { boardId: docRef.id };
    }

    async getBoard(id: string): Promise<BoardSummary | null> {
        const snap = await this.db.collection(RETROSPECTIVES).doc(id).get();
        if (!snap.exists) return null;
        // isCreator is not meaningful without a requesting uid; callers needing an
        // ownership decision compare `createdBy` themselves.
        return toBoardSummary(snap.id, snap.data()!, '');
    }

    async joinBoard(id: string, uid: string, userName: string): Promise<BoardSummary> {
        const docRef = this.db.collection(RETROSPECTIVES).doc(id);
        const snap = await docRef.get();
        if (!snap.exists || snap.data()?.isActive !== true) {
            throw new NotFoundError('El tablero especificado no existe o no está disponible');
        }

        if (snap.data()?.createdBy === uid) {
            return toBoardSummary(snap.id, snap.data()!, uid);
        }

        const existing = await this.db
            .collection(PARTICIPANTS)
            .where('retrospectiveId', '==', id)
            .where('userId', '==', uid)
            .limit(1)
            .get();

        if (existing.empty) {
            await this.db.collection(PARTICIPANTS).add({
                retrospectiveId: id,
                userId: uid,
                name: userName,
                joinedAt: FieldValue.serverTimestamp(),
                isActive: true,
            });
            await docRef.update({
                participantCount: FieldValue.increment(1),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }

        const updated = await docRef.get();
        return toBoardSummary(updated.id, updated.data()!, uid);
    }

    async renameBoard(id: string, uid: string, title: string): Promise<void> {
        const docRef = this.db.collection(RETROSPECTIVES).doc(id);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Board not found');
        if (snap.data()?.createdBy !== uid) throw new ForbiddenError("Not this board's owner");

        await docRef.update({ title, updatedAt: FieldValue.serverTimestamp() });
    }

    async deleteBoard(id: string, uid: string): Promise<void> {
        const docRef = this.db.collection(RETROSPECTIVES).doc(id);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Board not found');
        if (snap.data()?.createdBy !== uid) throw new ForbiddenError("Not this board's owner");

        // Cascade-deletes groups/actionItems/facilitatorNotes/sentimentResults/
        // typingStatus (queried by retrospectiveId) plus the deterministic-id
        // countdown_timers doc (feature 019, research.md §9) — participants/cards
        // deliberately excluded, matching today's existing (pre-019) behavior.
        const batch = this.db.batch();
        for (const collectionName of CASCADE_COLLECTIONS_BY_RETROSPECTIVE_ID) {
            const docs = await this.db.collection(collectionName).where('retrospectiveId', '==', id).get();
            docs.forEach((doc) => batch.delete(doc.ref));
        }
        batch.delete(this.db.collection(COUNTDOWN_TIMERS).doc(id));
        batch.delete(docRef);
        await batch.commit();
    }
}
