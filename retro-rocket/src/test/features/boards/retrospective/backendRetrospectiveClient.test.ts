import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBoardState, joinBoard, createCard, editCard, deleteCard, voteCard, toggleLike, setReaction, removeReaction, setTypingStatus, reorderCards, createCardGroup, disbandCardGroup, addCardToGroup, removeCardFromGroup, setGroupCollapse, saveColumnGroupingState, configureTimer, startTimer, pauseTimer, resetTimer, deleteTimer, createNote, editNote, deleteNote, convertCardToActionItem, createActionItem, editActionItem, deleteActionItem, saveSentimentResult, saveSentimentOverride } from '@/features/boards/retrospective/services/backendRetrospectiveClient';

function jsonResponse(ok: boolean, status: number, body: unknown): Response {
    return { ok, status, json: async () => body } as unknown as Response;
}

const boardStateDto = {
    id: 'r1',
    title: 'Sprint Retro',
    createdBy: 'facilitator-uid',
    isFacilitator: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    participantCount: 1,
    isActive: true,
    columnGroupingStates: {},
    columns: [],
    cards: [],
    groups: [],
    actionItems: [],
    participants: [],
    timer: null,
    myFacilitatorNotes: [],
    sentimentResults: [],
};

const participantDto = {
    id: 'p1',
    name: 'Alice',
    userId: 'u1',
    retrospectiveId: 'r1',
    joinedAt: '2026-01-01T00:00:00.000Z',
    photoURL: null,
};

describe('backendRetrospectiveClient', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('getBoardState', () => {
        it('fetches GET /api/retrospectives/:id and parses timestamps into Dates', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, boardStateDto));
            vi.stubGlobal('fetch', fetchMock);

            const state = await getBoardState('r1');

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1', { credentials: 'include' });
            expect(state.createdAt).toEqual(new Date(boardStateDto.createdAt));
            expect(state.id).toBe('r1');
        });

        it('throws the backend error message on a non-OK response', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 404, { error: { message: 'El tablero especificado no existe o no está disponible' } })));
            await expect(getBoardState('missing')).rejects.toThrow('no existe');
        });

        it('throws on a 401 (session expired)', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 401, { error: { message: 'Sign-in required' } })));
            await expect(getBoardState('r1')).rejects.toThrow('Sign-in required');
        });
    });

    describe('joinBoard', () => {
        it('POSTs to /api/retrospectives/:id/join and returns the participant', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, participantDto));
            vi.stubGlobal('fetch', fetchMock);

            const participant = await joinBoard('r1');

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/join', { method: 'POST', credentials: 'include' });
            expect(participant.userId).toBe('u1');
            expect(participant.joinedAt).toEqual(new Date(participantDto.joinedAt));
        });

        it('throws the backend message for a not-found board', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 404, { error: { message: 'El tablero especificado no existe o no está disponible' } })));
            await expect(joinBoard('missing')).rejects.toThrow('no existe');
        });
    });

    const cardDto = {
        id: 'c1',
        content: 'hi',
        column: 'col1',
        createdBy: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        retrospectiveId: 'r1',
        votes: 0,
        likes: [],
        reactions: [],
        order: 0,
    };

    describe('createCard', () => {
        it('POSTs to /api/retrospectives/:id/cards', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, cardDto));
            vi.stubGlobal('fetch', fetchMock);

            const created = await createCard('r1', { content: 'hi', column: 'col1' });

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/cards', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'hi', column: 'col1' }),
            });
            expect(created.id).toBe('c1');
        });

        it('carries createdByName through onto the returned Card (spec 020-user-display-name-fix)', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(true, 201, { ...cardDto, createdByName: 'Jane Smith' })));
            const created = await createCard('r1', { content: 'hi', column: 'col1' });
            expect(created.createdByName).toBe('Jane Smith');
        });

        it('leaves createdByName undefined when the DTO omits it (legacy card)', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, cardDto));
            vi.stubGlobal('fetch', fetchMock);
            const created = await createCard('r1', { content: 'hi', column: 'col1' });
            expect(created.createdByName).toBeUndefined();
        });
    });

    describe('editCard', () => {
        it('PATCHes /api/cards/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, content: 'updated' }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await editCard('c1', { content: 'updated' });

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'updated' }),
            });
            expect(updated.content).toBe('updated');
        });

        it('throws a 403 message for a non-owner', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: "Not this card's owner" } })));
            await expect(editCard('c1', { content: 'x' })).rejects.toThrow("Not this card's owner");
        });
    });

    describe('deleteCard', () => {
        it('DELETEs /api/cards/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await deleteCard('c1');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1', { method: 'DELETE', credentials: 'include' });
        });
    });

    describe('voteCard', () => {
        it('POSTs to /api/cards/:id/vote with increment true by default', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, votes: 1 }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await voteCard('c1');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/vote', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ increment: true }),
            });
            expect(updated.votes).toBe(1);
        });

        it('supports downvoting', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, votes: -1 }));
            vi.stubGlobal('fetch', fetchMock);
            await voteCard('c1', false);
            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/vote', expect.objectContaining({ body: JSON.stringify({ increment: false }) }));
        });
    });

    describe('toggleLike', () => {
        it('POSTs to /api/cards/:id/like', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, likes: [{ userId: 'u1', username: 'Me', timestamp: '2026-01-01T00:00:00.000Z' }] }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await toggleLike('c1');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/like', { method: 'POST', credentials: 'include' });
            expect(updated.likes).toHaveLength(1);
        });
    });

    describe('setReaction', () => {
        it('PUTs to /api/cards/:id/reaction', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, reactions: [{ userId: 'u1', username: 'Me', emoji: '👍', timestamp: '2026-01-01T00:00:00.000Z' }] }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await setReaction('c1', '👍');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/reaction', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emoji: '👍' }),
            });
            expect(updated.reactions).toHaveLength(1);
        });
    });

    describe('removeReaction', () => {
        it('DELETEs /api/cards/:id/reaction', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...cardDto, reactions: [] }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await removeReaction('c1');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/reaction', { method: 'DELETE', credentials: 'include' });
            expect(updated.reactions).toEqual([]);
        });
    });

    describe('setTypingStatus', () => {
        it('POSTs to /api/retrospectives/:id/typing', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await setTypingStatus('r1', 'col1', true);

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/typing', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column: 'col1', isActive: true }),
            });
        });
    });

    const groupDto = {
        id: 'g1',
        retrospectiveId: 'r1',
        column: 'col1',
        headCardId: 'c1',
        memberCardIds: ['c2'],
        isCollapsed: false,
        createdAt: '2026-01-01T00:00:00.000Z',
        createdBy: 'u1',
        order: 0,
    };

    describe('reorderCards', () => {
        it('POSTs the batch to /api/retrospectives/:id/cards/reorder', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await reorderCards('r1', [{ cardId: 'c1', order: 1 }]);

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/cards/reorder', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [{ cardId: 'c1', order: 1 }] }),
            });
        });
    });

    describe('createCardGroup', () => {
        it('POSTs to /api/retrospectives/:id/groups', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, groupDto));
            vi.stubGlobal('fetch', fetchMock);

            const group = await createCardGroup('r1', { headCardId: 'c1', memberCardIds: ['c2'] });

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/groups', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headCardId: 'c1', memberCardIds: ['c2'] }),
            });
            expect(group.id).toBe('g1');
        });
    });

    describe('setGroupCollapse', () => {
        it('PATCHes /api/groups/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...groupDto, isCollapsed: true }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await setGroupCollapse('g1', true);

            expect(fetchMock).toHaveBeenCalledWith('/api/groups/g1', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCollapsed: true }),
            });
            expect(updated.isCollapsed).toBe(true);
        });
    });

    describe('disbandCardGroup', () => {
        it('DELETEs /api/groups/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await disbandCardGroup('g1');

            expect(fetchMock).toHaveBeenCalledWith('/api/groups/g1', { method: 'DELETE', credentials: 'include' });
        });
    });

    describe('addCardToGroup', () => {
        it('POSTs to /api/groups/:id/cards', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...groupDto, memberCardIds: ['c2', 'c3'] }));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await addCardToGroup('g1', 'c3');

            expect(fetchMock).toHaveBeenCalledWith('/api/groups/g1/cards', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardId: 'c3' }),
            });
            expect(updated.memberCardIds).toContain('c3');
        });
    });

    describe('removeCardFromGroup', () => {
        it('DELETEs /api/groups/:id/cards/:cardId and returns the updated group', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, groupDto));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await removeCardFromGroup('g1', 'c2');

            expect(fetchMock).toHaveBeenCalledWith('/api/groups/g1/cards/c2', { method: 'DELETE', credentials: 'include' });
            expect(updated?.id).toBe('g1');
        });

        it('returns null when the group was disbanded (204)', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            const updated = await removeCardFromGroup('g1', 'c1');

            expect(updated).toBeNull();
        });
    });

    describe('saveColumnGroupingState', () => {
        it('PATCHes /api/retrospectives/:id/column-grouping', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await saveColumnGroupingState('r1', { col1: { criteria: 'user', activeGroups: ['g1'] } });

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/column-grouping', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ col1: { criteria: 'user', activeGroups: ['g1'] } }),
            });
        });
    });

    const timerDto = {
        retrospectiveId: 'r1',
        startTime: null,
        duration: 300,
        originalDuration: 300,
        isRunning: false,
        isPaused: false,
        endTime: null,
        createdBy: 'facilitator-uid',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
    };

    describe('configureTimer', () => {
        it('PUTs to /api/retrospectives/:id/timer', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, timerDto));
            vi.stubGlobal('fetch', fetchMock);

            const timer = await configureTimer('r1', 300);

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/timer', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ duration: 300 }),
            });
            expect(timer.duration).toBe(300);
        });

        it('throws a 403 for a non-facilitator', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: 'Solo la persona facilitadora puede realizar esta acción' } })));
            await expect(configureTimer('r1', 300)).rejects.toThrow('facilitadora');
        });
    });

    describe('startTimer/pauseTimer/resetTimer', () => {
        it('POSTs to the respective timer control endpoints with no body', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...timerDto, isRunning: true }));
            vi.stubGlobal('fetch', fetchMock);

            await startTimer('r1');
            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/timer/start', { method: 'POST', credentials: 'include' });

            await pauseTimer('r1');
            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/timer/pause', { method: 'POST', credentials: 'include' });

            await resetTimer('r1');
            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/timer/reset', { method: 'POST', credentials: 'include' });
        });
    });

    describe('deleteTimer', () => {
        it('DELETEs /api/retrospectives/:id/timer', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await deleteTimer('r1');

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/timer', { method: 'DELETE', credentials: 'include' });
        });
    });

    const noteDto = { id: 'n1', content: 'Private note', timestamp: '2026-01-01T00:00:00.000Z', retrospectiveId: 'r1', facilitatorId: 'u1' };

    describe('createNote', () => {
        it('POSTs to /api/retrospectives/:id/notes', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, noteDto));
            vi.stubGlobal('fetch', fetchMock);

            const note = await createNote('r1', 'Private note');

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/notes', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'Private note' }),
            });
            expect(note.timestamp).toEqual(new Date(noteDto.timestamp));
        });
    });

    describe('editNote', () => {
        it('PATCHes /api/notes/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...noteDto, content: 'Updated' }));
            vi.stubGlobal('fetch', fetchMock);

            const note = await editNote('n1', 'Updated');

            expect(fetchMock).toHaveBeenCalledWith('/api/notes/n1', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'Updated' }),
            });
            expect(note.content).toBe('Updated');
        });

        it('throws a 403 for a non-author', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: "Not this note's author" } })));
            await expect(editNote('n1', 'Hijack')).rejects.toThrow('author');
        });
    });

    describe('deleteNote', () => {
        it('DELETEs /api/notes/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await deleteNote('n1');

            expect(fetchMock).toHaveBeenCalledWith('/api/notes/n1', { method: 'DELETE', credentials: 'include' });
        });
    });

    describe('convertCardToActionItem', () => {
        it('POSTs to /api/cards/:id/convert-to-action-item', async () => {
            const actionItemDto = {
                id: 'a1',
                content: 'Learned something',
                retrospectiveId: 'r1',
                createdBy: 'facilitator-uid',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
                assignedTo: 'u2',
                assignedToName: 'U Two',
                dueDate: null,
                order: 0,
            };
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, actionItemDto));
            vi.stubGlobal('fetch', fetchMock);

            const item = await convertCardToActionItem('c1', { assignedTo: 'u2', assignedToName: 'U Two' });

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/convert-to-action-item', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignedTo: 'u2', assignedToName: 'U Two' }),
            });
            expect(item.content).toBe('Learned something');
        });

        it('throws a 403 for a non-facilitator', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: 'Solo la persona facilitadora puede realizar esta acción' } })));
            await expect(convertCardToActionItem('c1')).rejects.toThrow('facilitadora');
        });
    });

    const actionItemDto2 = {
        id: 'a2',
        content: 'Ship the fix',
        retrospectiveId: 'r1',
        createdBy: 'u1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        assignedTo: null,
        assignedToName: null,
        dueDate: null,
        order: 0,
    };

    describe('createActionItem', () => {
        it('POSTs to /api/retrospectives/:id/action-items', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 201, actionItemDto2));
            vi.stubGlobal('fetch', fetchMock);

            const item = await createActionItem('r1', { content: 'Ship the fix' });

            expect(fetchMock).toHaveBeenCalledWith('/api/retrospectives/r1/action-items', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'Ship the fix' }),
            });
            expect(item.content).toBe('Ship the fix');
        });
    });

    describe('editActionItem', () => {
        it('PATCHes /api/action-items/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...actionItemDto2, content: 'Updated' }));
            vi.stubGlobal('fetch', fetchMock);

            const item = await editActionItem('a2', { content: 'Updated' });

            expect(fetchMock).toHaveBeenCalledWith('/api/action-items/a2', {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: 'Updated' }),
            });
            expect(item.content).toBe('Updated');
        });
    });

    describe('deleteActionItem', () => {
        it('DELETEs /api/action-items/:id', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 204, {}));
            vi.stubGlobal('fetch', fetchMock);

            await deleteActionItem('a2');

            expect(fetchMock).toHaveBeenCalledWith('/api/action-items/a2', { method: 'DELETE', credentials: 'include' });
        });
    });

    const sentimentResultDto = {
        retrospectiveId: 'r1',
        cardId: 'c1',
        sentiment: 'positive',
        confidence: 0.9,
        modelId: 'm1',
        modelVersion: 'v1',
        contentHash: 'hash1',
        isOverride: false,
        overrideBy: null,
        analyzedAt: '2026-01-01T00:00:00.000Z',
    };

    describe('saveSentimentResult', () => {
        it('PUTs to /api/cards/:id/sentiment', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, sentimentResultDto));
            vi.stubGlobal('fetch', fetchMock);

            const result = await saveSentimentResult('c1', { sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' });

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/sentiment', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sentiment: 'positive', confidence: 0.9, contentHash: 'hash1' }),
            });
            expect(result.analyzedAt).toEqual(new Date(sentimentResultDto.analyzedAt));
        });
    });

    describe('saveSentimentOverride', () => {
        it('PUTs to /api/cards/:id/sentiment/override', async () => {
            const fetchMock = vi.fn(async () => jsonResponse(true, 200, { ...sentimentResultDto, sentiment: 'negative', isOverride: true, overrideBy: 'facilitator-uid' }));
            vi.stubGlobal('fetch', fetchMock);

            const result = await saveSentimentOverride('c1', 'negative');

            expect(fetchMock).toHaveBeenCalledWith('/api/cards/c1/sentiment/override', {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sentiment: 'negative' }),
            });
            expect(result.isOverride).toBe(true);
        });

        it('throws a 403 for a non-facilitator', async () => {
            vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(false, 403, { error: { message: 'Solo la persona facilitadora puede realizar esta acción' } })));
            await expect(saveSentimentOverride('c1', 'negative')).rejects.toThrow('facilitadora');
        });
    });
});
