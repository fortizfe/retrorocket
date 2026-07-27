import { describe, expect, it } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';
import { FirestoreBoardAdapter } from '../../../src/adapters/firebase/FirestoreBoardAdapter';
import { FakeFirestore } from './fakeFirestore';
import {
    ACTION_ITEMS,
    CARDS,
    COLUMNS_SUBCOLLECTION,
    COUNTDOWN_TIMERS,
    FACILITATOR_NOTES,
    GROUPS,
    PARTICIPANTS,
    RETROSPECTIVES,
    SENTIMENT_RESULTS,
    TYPING_STATUS,
} from '../../../src/adapters/firebase/collections';

/**
 * Verifies research.md §3's completeness fix: every collection referencing a deleted
 * board — including the ones owned by other bounded contexts (US2/US3's card/group/
 * countdown/notes/action-item/sentiment/typing adapters) — is actually cleaned up, not
 * just the board doc itself.
 */
describe('FirestoreBoardAdapter.deleteBoardCascade', () => {
    it('removes the board doc, its columns subcollection, and every referencing document across all collections', async () => {
        const db = new FakeFirestore() as unknown as Firestore;
        const board = new FirestoreBoardAdapter(db);

        const created = await board.createBoard({
            templateId: 'default',
            title: 'X',
            createdBy: 'u1',
            createdByName: 'Ana',
            locale: 'en',
            columns: [{ id: 'helped', i18nKey: 'k', type: 'regular', order: 0, defaultColor: 'green' }],
        });
        const boardId = created.id;
        const OTHER_BOARD_ID = 'other-board';

        // Seed one doc per referencing collection for this board, plus a sibling doc for a
        // DIFFERENT board to prove the cascade doesn't over-delete.
        await db.collection(CARDS).doc('card-1').set({ retrospectiveId: boardId });
        await db.collection(CARDS).doc('card-2').set({ retrospectiveId: OTHER_BOARD_ID });
        await db.collection(GROUPS).doc('group-1').set({ retrospectiveId: boardId });
        await db.collection(PARTICIPANTS).doc('participant-1').set({ retrospectiveId: boardId });
        await db.collection(FACILITATOR_NOTES).doc('note-1').set({ retrospectiveId: boardId });
        await db.collection(ACTION_ITEMS).doc('action-1').set({ retrospectiveId: boardId });
        await db.collection(SENTIMENT_RESULTS).doc(`${boardId}_card-1`).set({ retrospectiveId: boardId });
        await db.collection(TYPING_STATUS).doc('typing-1').set({ retrospectiveId: boardId });
        await db.collection(COUNTDOWN_TIMERS).doc(boardId).set({ retrospectiveId: boardId });

        await board.deleteBoardCascade(boardId);

        expect(await board.getBoard(boardId)).toBeNull();
        expect((await db.collection(RETROSPECTIVES).doc(boardId).collection(COLUMNS_SUBCOLLECTION).get()).docs).toHaveLength(0);
        expect((await db.collection(CARDS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(GROUPS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(PARTICIPANTS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(FACILITATOR_NOTES).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(ACTION_ITEMS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(SENTIMENT_RESULTS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(TYPING_STATUS).where('retrospectiveId', '==', boardId).get()).docs).toHaveLength(0);
        expect((await db.collection(COUNTDOWN_TIMERS).doc(boardId).get()).exists).toBe(false);

        // The other board's card survives.
        expect((await db.collection(CARDS).doc('card-2').get()).exists).toBe(true);
    });
});
