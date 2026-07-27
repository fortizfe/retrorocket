import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreBoardAdapter } from '../../src/adapters/firebase/FirestoreBoardAdapter';
import { FirestoreParticipantAdapter } from '../../src/adapters/firebase/FirestoreParticipantAdapter';
import { listBoards } from '../../src/application/use-cases/boards/ListBoards';
import { getBoard } from '../../src/application/use-cases/boards/GetBoard';
import { deleteBoardCascade } from '../../src/application/use-cases/boards/DeleteBoardCascade';
import { RETROSPECTIVES, PARTICIPANTS, CARDS } from '../../src/adapters/firebase/collections';
import { FakeFirestore } from '../adapters/firebase/fakeFirestore';

/**
 * FR-008/SC-004: pre-migration Firestore documents — written by the app before this
 * refactor, or by any client that only ever wrote the fields it knew about at the
 * time — must keep working once every read goes through the backend's adapters
 * instead of the original frontend code that wrote them. This seeds fixture documents
 * shaped like "old" data (missing fields the current write paths always populate, e.g.
 * a participant doc with no `isActive`, a retrospective relying only on `createdBy`)
 * directly into a fake Firestore, bypassing every adapter's own `createBoard`/
 * `addParticipant` write path, then exercises the real read/list/cascade-delete
 * adapters and use-cases against them.
 *
 * Uses the same `FakeFirestore` double as every other backend adapter test in this
 * repo (no test in this suite depends on a live Firestore/emulator connection — see
 * boardsTestApp.ts's docstring) rather than introducing a new, unverifiable-in-CI
 * emulator dependency. PDF/DOCX export is out of scope here: it consumes already-
 * normalized API responses, not raw Firestore documents, so the "legacy shape" concern
 * does not apply at that layer.
 */
describe('legacy (pre-migration) Firestore document shapes', () => {
    it('ListBoards/GetBoard/DeleteBoardCascade all handle a retrospective doc relying only on createdBy (no description, no templateId)', async () => {
        const db = new FakeFirestore() as unknown as Firestore;
        const boardAdapter = new FirestoreBoardAdapter(db);
        const participantAdapter = new FirestoreParticipantAdapter(db);

        // A minimal, pre-refactor-shaped board: only the fields that have always
        // existed. No `description`, no `templateId`, no `isActive` — all now read
        // with a fallback default by FirestoreBoardAdapter.toBoard/toBoardWithColumns.
        const boardId = 'legacy-board-1';
        await db.collection(RETROSPECTIVES).doc(boardId).set({
            title: 'Legacy Sprint Retro',
            createdBy: 'legacy-user-1',
            createdByName: 'Legacy User',
            locale: 'en',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
        });

        // A legacy participant doc: no `isActive` field at all (added later for
        // connection-derived presence, data-model.md).
        await db.collection(PARTICIPANTS).doc('legacy-participant-1').set({
            retrospectiveId: boardId,
            userId: 'legacy-user-1',
            name: 'Legacy User',
            photoURL: null,
            joinedAt: new Date('2025-01-01'),
        });

        // A legacy card doc: no `likes`/`reactions` arrays (added later for US2).
        await db.collection(CARDS).doc('legacy-card-1').set({
            retrospectiveId: boardId,
            content: 'An old card from before likes/reactions existed',
            column: 'helped',
            createdBy: 'legacy-user-1',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            order: 0,
        });

        // GetBoard: the requester is the board's creator (no participant record
        // needed for the creator, per FR-004) and the legacy doc resolves with sane
        // defaults instead of throwing or returning `undefined` fields.
        const fetched = await getBoard(
            { boardReadPort: boardAdapter, participantPort: participantAdapter },
            { boardId, requesterUid: 'legacy-user-1' },
        );
        expect(fetched.title).toBe('Legacy Sprint Retro');
        expect(fetched.isActive).toBe(true); // defaulted
        expect(fetched.participantCount).toBe(0); // defaulted
        expect(fetched.columns).toEqual([]); // no columns subcollection ever written

        // ListBoards: the legacy board still shows up, marked as owned.
        const boards = await listBoards(
            { boardReadPort: boardAdapter, participantPort: participantAdapter },
            { userId: 'legacy-user-1' },
        );
        expect(boards).toHaveLength(1);
        expect(boards[0].id).toBe(boardId);
        expect(boards[0].isCreator).toBe(true);

        // The legacy participant record itself resolves without throwing despite
        // missing `isActive` — defaulted to false, and `isFacilitator` is derived
        // (not stored) from the board's `createdBy`.
        const participant = await participantAdapter.getParticipantByUser(boardId, 'legacy-user-1');
        expect(participant).not.toBeNull();
        expect(participant!.isActive).toBe(false);
        expect(participant!.isFacilitator).toBe(true);

        // DeleteBoardCascade: the legacy board + its legacy participant/card are all
        // removed, proving the cascade's `where('retrospectiveId', '==', boardId)`
        // queries work against documents this backend never wrote itself.
        await deleteBoardCascade(
            { boardReadPort: boardAdapter, boardWritePort: boardAdapter },
            { boardId, requesterUid: 'legacy-user-1' },
        );

        expect(await boardAdapter.getBoard(boardId)).toBeNull();
        expect((await db.collection(PARTICIPANTS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(CARDS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
    });

    it('a legacy participant document with no isActive field does not break GetBoard\'s access check', async () => {
        const db = new FakeFirestore() as unknown as Firestore;
        const boardAdapter = new FirestoreBoardAdapter(db);
        const participantAdapter = new FirestoreParticipantAdapter(db);

        const boardId = 'legacy-board-2';
        await db.collection(RETROSPECTIVES).doc(boardId).set({
            title: 'Another Legacy Retro',
            createdBy: 'facilitator-1',
            createdByName: 'Ana',
            locale: 'es',
            createdAt: new Date('2025-02-01'),
            updatedAt: new Date('2025-02-01'),
        });
        // A joined (non-creator) legacy participant, again missing `isActive`.
        await db.collection(PARTICIPANTS).doc('legacy-participant-2').set({
            retrospectiveId: boardId,
            userId: 'joined-user-1',
            name: 'Joined User',
            photoURL: null,
            joinedAt: new Date('2025-02-01'),
        });

        const fetched = await getBoard(
            { boardReadPort: boardAdapter, participantPort: participantAdapter },
            { boardId, requesterUid: 'joined-user-1' },
        );
        expect(fetched.id).toBe(boardId);
    });
});
