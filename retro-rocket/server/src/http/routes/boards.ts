import { Router, type Request, type Response } from 'express';
import type { Firestore } from 'firebase-admin/firestore';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { BoardReadPort, BoardWithColumns, BoardWritePort, Participant, ParticipantPort } from '../../application/ports/boards';
import type { Card, CardGroup, CardGroupPort, CardPort, TypingPort } from '../../application/ports/cards';
import type { ActionItem, ActionItemPort, CountdownPort, CountdownTimer, FacilitatorNote, FacilitatorNotesPort, SentimentPort, SentimentResult } from '../../application/ports/facilitator';
import type { PublicUser } from '../../domain/auth/types';
import { requireSession } from '../middleware/requireSession';
import { createBoard } from '../../application/use-cases/boards/CreateBoard';
import { getBoard } from '../../application/use-cases/boards/GetBoard';
import { joinBoard } from '../../application/use-cases/boards/JoinBoard';
import { listBoards, type BoardSummary } from '../../application/use-cases/boards/ListBoards';
import { renameBoard } from '../../application/use-cases/boards/RenameBoard';
import { deleteBoardCascade } from '../../application/use-cases/boards/DeleteBoardCascade';
import { assertBoardAccess } from '../../application/use-cases/boards/AssertBoardAccess';
import { createCard } from '../../application/use-cases/boards/CreateCard';
import { updateCard } from '../../application/use-cases/boards/UpdateCard';
import { deleteCard } from '../../application/use-cases/boards/DeleteCard';
import { toggleLike } from '../../application/use-cases/boards/ToggleLike';
import { setReaction } from '../../application/use-cases/boards/SetReaction';
import { removeReaction } from '../../application/use-cases/boards/RemoveReaction';
import { reorderCards } from '../../application/use-cases/boards/ReorderCards';
import { createCardGroup } from '../../application/use-cases/boards/CreateCardGroup';
import { disbandCardGroup } from '../../application/use-cases/boards/DisbandCardGroup';
import { addCardToGroup } from '../../application/use-cases/boards/AddCardToGroup';
import { removeCardFromGroup } from '../../application/use-cases/boards/RemoveCardFromGroup';
import { setGroupCollapseState } from '../../application/use-cases/boards/SetGroupCollapseState';
import { setColumnGroupingState } from '../../application/use-cases/boards/SetColumnGroupingState';
import { setTypingStatus } from '../../application/use-cases/boards/SetTypingStatus';
import { createOrUpdateCountdown } from '../../application/use-cases/boards/CreateOrUpdateCountdown';
import { startCountdown } from '../../application/use-cases/boards/StartCountdown';
import { pauseCountdown } from '../../application/use-cases/boards/PauseCountdown';
import { resetCountdown } from '../../application/use-cases/boards/ResetCountdown';
import { deleteCountdown } from '../../application/use-cases/boards/DeleteCountdown';
import { createNote } from '../../application/use-cases/boards/CreateNote';
import { updateNote } from '../../application/use-cases/boards/UpdateNote';
import { deleteNote } from '../../application/use-cases/boards/DeleteNote';
import { createActionItem } from '../../application/use-cases/boards/CreateActionItem';
import { convertCardToActionItem } from '../../application/use-cases/boards/ConvertCardToActionItem';
import { updateActionItem } from '../../application/use-cases/boards/UpdateActionItem';
import { deleteActionItem } from '../../application/use-cases/boards/DeleteActionItem';
import { saveSentimentResult } from '../../application/use-cases/boards/SaveSentimentResult';
import { overrideSentimentResult } from '../../application/use-cases/boards/OverrideSentimentResult';
import { deleteSentimentResult } from '../../application/use-cases/boards/DeleteSentimentResult';
import { isFacilitator } from '../../domain/boards/FacilitatorAccess';
import { FirestoreRealtimeRelay, collectionSource, docSource } from '../../adapters/firebase/FirestoreRealtimeRelay';
import { ACTION_ITEMS, CARDS, COUNTDOWN_TIMERS, FACILITATOR_NOTES, GROUPS, PARTICIPANTS, RETROSPECTIVES, SENTIMENT_RESULTS, TYPING_STATUS } from '../../adapters/firebase/collections';
import { toDate } from '../../adapters/firebase/firestoreUtil';

export interface BoardsRouterDeps {
    db: Firestore;
    boardReadPort: BoardReadPort;
    boardWritePort: BoardWritePort;
    participantPort: ParticipantPort;
    cardPort: CardPort;
    cardGroupPort: CardGroupPort;
    typingPort: TypingPort;
    countdownPort: CountdownPort;
    facilitatorNotesPort: FacilitatorNotesPort;
    actionItemPort: ActionItemPort;
    sentimentPort: SentimentPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
}

function uidOf(res: Response): string {
    return res.locals.uid as string;
}

function paramId(req: Request, name: string): string {
    const value = req.params[name];
    return Array.isArray(value) ? value[0] : value;
}

function userOf(res: Response): PublicUser {
    return res.locals.user as PublicUser;
}

function serializeBoard(board: BoardWithColumns): Record<string, unknown> {
    return { ...board, createdAt: board.createdAt.toISOString(), updatedAt: board.updatedAt.toISOString() };
}

function serializeBoardSummary(board: BoardSummary): Record<string, unknown> {
    return { ...board, createdAt: board.createdAt.toISOString(), updatedAt: board.updatedAt.toISOString() };
}

function serializeParticipant(participant: Participant): Record<string, unknown> {
    return { ...participant, joinedAt: participant.joinedAt.toISOString() };
}

function serializeCard(card: Card): Record<string, unknown> {
    return {
        ...card,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString(),
        likes: card.likes.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })),
        reactions: card.reactions.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })),
    };
}

function serializeGroup(group: CardGroup): Record<string, unknown> {
    return { ...group, createdAt: group.createdAt.toISOString() };
}

function serializeCountdown(timer: CountdownTimer): Record<string, unknown> {
    return {
        ...timer,
        startTime: timer.startTime ? timer.startTime.toISOString() : null,
        endTime: timer.endTime ? timer.endTime.toISOString() : null,
        createdAt: timer.createdAt.toISOString(),
        updatedAt: timer.updatedAt.toISOString(),
    };
}

function serializeNote(note: FacilitatorNote): Record<string, unknown> {
    return { ...note, createdAt: note.createdAt.toISOString(), updatedAt: note.updatedAt.toISOString() };
}

function serializeActionItem(item: ActionItem): Record<string, unknown> {
    return {
        ...item,
        dueDate: item.dueDate ? item.dueDate.toISOString() : null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
    };
}

function serializeSentimentResult(result: SentimentResult): Record<string, unknown> {
    return { ...result, timestamp: result.timestamp.toISOString() };
}

async function assertAccess(deps: BoardsRouterDeps, boardId: string, uid: string): Promise<void> {
    await assertBoardAccess({ boardReadPort: deps.boardReadPort, participantPort: deps.participantPort }, boardId, uid);
}

/**
 * Boards bounded-context routes (this refactor): boards, cards, card groups, typing
 * indicators, and the real-time SSE channel (contracts/boards-api.md,
 * cards-and-groups-api.md, realtime-events.md). Facilitator-only surfaces (countdown,
 * notes, action items, sentiment) are added by User Story 3.
 */
export function boardsRouter(deps: BoardsRouterDeps): Router {
    const router = Router();
    router.use('/api/boards', requireSession({ sessionService: deps.sessionService, clock: deps.clock }));

    router.get('/api/boards', async (_req: Request, res: Response) => {
        const boards = await listBoards(
            { boardReadPort: deps.boardReadPort, participantPort: deps.participantPort },
            { userId: uidOf(res) },
        );
        res.status(200).json({ boards: boards.map(serializeBoardSummary) });
    });

    router.post('/api/boards', async (req: Request, res: Response) => {
        const body = req.body as { templateId?: unknown; title?: unknown; description?: unknown; locale?: unknown };
        const user = userOf(res);
        const board = await createBoard(
            { boardWritePort: deps.boardWritePort },
            {
                templateId: String(body.templateId ?? ''),
                title: String(body.title ?? ''),
                description: typeof body.description === 'string' ? body.description : undefined,
                createdBy: user.uid,
                createdByName: user.displayName ?? '',
                locale: body.locale === 'es' ? 'es' : 'en',
            },
        );
        res.status(201).json(serializeBoard(board));
    });

    router.get('/api/boards/:id', async (req: Request, res: Response) => {
        const board = await getBoard(
            { boardReadPort: deps.boardReadPort, participantPort: deps.participantPort },
            { boardId: paramId(req, 'id'), requesterUid: uidOf(res) },
        );
        res.status(200).json(serializeBoard(board));
    });

    router.patch('/api/boards/:id', async (req: Request, res: Response) => {
        const body = req.body as { title?: unknown; description?: unknown };
        const updates: { title?: string; description?: string } = {};
        if (typeof body.title === 'string') updates.title = body.title;
        if (typeof body.description === 'string') updates.description = body.description;
        const board = await renameBoard(
            { boardReadPort: deps.boardReadPort, boardWritePort: deps.boardWritePort },
            { boardId: paramId(req, 'id'), requesterUid: uidOf(res), updates },
        );
        res.status(200).json(serializeBoard(board));
    });

    router.delete('/api/boards/:id', async (req: Request, res: Response) => {
        await deleteBoardCascade(
            { boardReadPort: deps.boardReadPort, boardWritePort: deps.boardWritePort },
            { boardId: paramId(req, 'id'), requesterUid: uidOf(res) },
        );
        res.status(204).end();
    });

    router.post('/api/boards/:id/join', async (req: Request, res: Response) => {
        const user = userOf(res);
        const result = await joinBoard(
            { boardReadPort: deps.boardReadPort, boardWritePort: deps.boardWritePort, participantPort: deps.participantPort },
            {
                boardId: paramId(req, 'id'),
                userId: user.uid,
                userName: user.displayName ?? '',
                userPhotoURL: user.photoURL,
            },
        );
        res.status(200).json({ board: serializeBoard(result.board), participant: serializeParticipant(result.participant), isNew: result.isNew });
    });

    // --- Cards (contracts/cards-and-groups-api.md) -----------------------------------

    router.post('/api/boards/:id/cards', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        const uid = uidOf(res);
        await assertAccess(deps, boardId, uid);
        const body = req.body as { content?: unknown; column?: unknown; color?: unknown };
        const card = await createCard(
            { cardPort: deps.cardPort },
            { retrospectiveId: boardId, content: String(body.content ?? ''), column: String(body.column ?? ''), createdBy: uid, color: typeof body.color === 'string' ? body.color : undefined },
        );
        res.status(201).json(serializeCard(card));
    });

    router.patch('/api/boards/:id/cards/reorder', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const body = req.body as { updates?: Array<{ cardId: string; order: number; column?: string }> };
        await reorderCards({ cardPort: deps.cardPort }, { updates: body.updates ?? [] });
        const cards = await deps.cardPort.listCards(paramId(req, 'id'));
        res.status(200).json({ cards: cards.map(serializeCard) });
    });

    router.patch('/api/boards/:id/cards/:cardId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const body = req.body as { content?: unknown; color?: unknown; column?: unknown; order?: unknown; votes?: unknown };
        const updates: Record<string, unknown> = {};
        if (typeof body.content === 'string') updates.content = body.content;
        if (typeof body.color === 'string') updates.color = body.color;
        if (typeof body.column === 'string') updates.column = body.column;
        if (typeof body.order === 'number') updates.order = body.order;
        if (typeof body.votes === 'number') updates.votes = body.votes;
        const card = await updateCard({ cardPort: deps.cardPort }, { cardId: paramId(req, 'cardId'), requesterUid: uidOf(res), updates });
        res.status(200).json(serializeCard(card));
    });

    router.delete('/api/boards/:id/cards/:cardId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        await deleteCard({ cardPort: deps.cardPort, cardGroupPort: deps.cardGroupPort }, { cardId: paramId(req, 'cardId'), requesterUid: uidOf(res) });
        res.status(204).end();
    });

    router.post('/api/boards/:id/cards/:cardId/like', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const user = userOf(res);
        const card = await toggleLike({ cardPort: deps.cardPort }, { cardId: paramId(req, 'cardId'), userId: user.uid, username: user.displayName ?? '' });
        res.status(200).json({ liked: card.likes.some((l) => l.userId === user.uid), likes: card.likes.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })) });
    });

    router.put('/api/boards/:id/cards/:cardId/reaction', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const user = userOf(res);
        const body = req.body as { emoji?: unknown };
        const card = await setReaction({ cardPort: deps.cardPort }, { cardId: paramId(req, 'cardId'), userId: user.uid, username: user.displayName ?? '', emoji: String(body.emoji ?? '') });
        res.status(200).json({ reactions: card.reactions.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })) });
    });

    router.delete('/api/boards/:id/cards/:cardId/reaction', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const user = userOf(res);
        const card = await removeReaction({ cardPort: deps.cardPort }, { cardId: paramId(req, 'cardId'), userId: user.uid });
        res.status(200).json({ reactions: card.reactions.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })) });
    });

    // --- Card groups -------------------------------------------------------------------

    router.post('/api/boards/:id/groups', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        const uid = uidOf(res);
        await assertAccess(deps, boardId, uid);
        const body = req.body as { headCardId?: unknown; memberCardIds?: unknown; title?: unknown };
        const group = await createCardGroup(
            { cardGroupPort: deps.cardGroupPort },
            {
                retrospectiveId: boardId,
                headCardId: String(body.headCardId ?? ''),
                memberCardIds: Array.isArray(body.memberCardIds) ? body.memberCardIds.map(String) : [],
                createdBy: uid,
                title: typeof body.title === 'string' ? body.title : undefined,
            },
        );
        res.status(201).json(serializeGroup(group));
    });

    router.delete('/api/boards/:id/groups/:groupId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        await disbandCardGroup({ cardGroupPort: deps.cardGroupPort }, paramId(req, 'groupId'));
        res.status(204).end();
    });

    router.put('/api/boards/:id/groups/:groupId/cards/:cardId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const group = await addCardToGroup({ cardGroupPort: deps.cardGroupPort }, paramId(req, 'groupId'), paramId(req, 'cardId'));
        res.status(200).json(serializeGroup(group));
    });

    router.delete('/api/boards/:id/groups/:groupId/cards/:cardId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const group = await removeCardFromGroup({ cardGroupPort: deps.cardGroupPort }, paramId(req, 'cardId'));
        if (!group) return res.status(204).end();
        res.status(200).json(serializeGroup(group));
    });

    router.patch('/api/boards/:id/groups/:groupId', async (req: Request, res: Response) => {
        await assertAccess(deps, paramId(req, 'id'), uidOf(res));
        const body = req.body as { isCollapsed?: unknown };
        const group = await setGroupCollapseState({ cardGroupPort: deps.cardGroupPort }, paramId(req, 'groupId'), Boolean(body.isCollapsed));
        res.status(200).json(serializeGroup(group));
    });

    router.get('/api/boards/:id/column-grouping', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        await assertAccess(deps, boardId, uidOf(res));
        res.status(200).json({ states: await deps.cardGroupPort.getColumnGroupingState(boardId) });
    });

    router.patch('/api/boards/:id/column-grouping', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        await assertAccess(deps, boardId, uidOf(res));
        const body = req.body as { states?: Record<string, unknown> };
        await setColumnGroupingState({ cardGroupPort: deps.cardGroupPort }, boardId, body.states ?? {});
        res.status(200).json({ states: await deps.cardGroupPort.getColumnGroupingState(boardId) });
    });

    // --- Typing indicators (contracts/realtime-events.md) -------------------------------

    router.post('/api/boards/:id/typing', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        const user = userOf(res);
        await assertAccess(deps, boardId, user.uid);
        const body = req.body as { column?: unknown; isActive?: unknown };
        await setTypingStatus(
            { typingPort: deps.typingPort },
            { retrospectiveId: boardId, userId: user.uid, username: user.displayName ?? '', column: String(body.column ?? ''), isActive: Boolean(body.isActive ?? true) },
        );
        res.status(204).end();
    });

    // --- Countdown timer (contracts/facilitator-tools-api.md) --------------------------

    router.post('/api/boards/:id/countdown', async (req: Request, res: Response) => {
        const body = req.body as { duration?: unknown };
        const timer = await createOrUpdateCountdown(
            { boardReadPort: deps.boardReadPort, countdownPort: deps.countdownPort },
            { boardId: paramId(req, 'id'), requesterUid: uidOf(res), duration: Number(body.duration ?? 0) },
        );
        res.status(201).json(serializeCountdown(timer));
    });

    router.post('/api/boards/:id/countdown/start', async (req: Request, res: Response) => {
        const timer = await startCountdown({ boardReadPort: deps.boardReadPort, countdownPort: deps.countdownPort }, { boardId: paramId(req, 'id'), requesterUid: uidOf(res) });
        res.status(200).json(serializeCountdown(timer));
    });

    router.post('/api/boards/:id/countdown/pause', async (req: Request, res: Response) => {
        const timer = await pauseCountdown({ boardReadPort: deps.boardReadPort, countdownPort: deps.countdownPort }, { boardId: paramId(req, 'id'), requesterUid: uidOf(res) });
        res.status(200).json(serializeCountdown(timer));
    });

    router.post('/api/boards/:id/countdown/reset', async (req: Request, res: Response) => {
        const timer = await resetCountdown({ boardReadPort: deps.boardReadPort, countdownPort: deps.countdownPort }, { boardId: paramId(req, 'id'), requesterUid: uidOf(res) });
        res.status(200).json(serializeCountdown(timer));
    });

    router.delete('/api/boards/:id/countdown', async (req: Request, res: Response) => {
        await deleteCountdown({ boardReadPort: deps.boardReadPort, countdownPort: deps.countdownPort }, { boardId: paramId(req, 'id'), requesterUid: uidOf(res) });
        res.status(204).end();
    });

    // --- Facilitator notes (contracts/facilitator-tools-api.md) ------------------------

    router.post('/api/boards/:id/notes', async (req: Request, res: Response) => {
        const body = req.body as { content?: unknown };
        const note = await createNote(
            { boardReadPort: deps.boardReadPort, facilitatorNotesPort: deps.facilitatorNotesPort },
            { boardId: paramId(req, 'id'), requesterUid: uidOf(res), content: String(body.content ?? '') },
        );
        res.status(201).json(serializeNote(note));
    });

    router.patch('/api/boards/:id/notes/:noteId', async (req: Request, res: Response) => {
        const body = req.body as { content?: unknown };
        const note = await updateNote(
            { facilitatorNotesPort: deps.facilitatorNotesPort },
            { boardId: paramId(req, 'id'), noteId: paramId(req, 'noteId'), requesterUid: uidOf(res), content: String(body.content ?? '') },
        );
        res.status(200).json(serializeNote(note));
    });

    router.delete('/api/boards/:id/notes/:noteId', async (req: Request, res: Response) => {
        await deleteNote({ facilitatorNotesPort: deps.facilitatorNotesPort }, { boardId: paramId(req, 'id'), noteId: paramId(req, 'noteId'), requesterUid: uidOf(res) });
        res.status(204).end();
    });

    // --- Action items (contracts/facilitator-tools-api.md) -----------------------------

    router.post('/api/boards/:id/action-items', async (req: Request, res: Response) => {
        const body = req.body as { content?: unknown; assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown };
        const item = await createActionItem(
            { boardReadPort: deps.boardReadPort, actionItemPort: deps.actionItemPort },
            {
                boardId: paramId(req, 'id'),
                requesterUid: uidOf(res),
                content: String(body.content ?? ''),
                assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
                assignedToName: typeof body.assignedToName === 'string' ? body.assignedToName : null,
                dueDate: typeof body.dueDate === 'string' ? new Date(body.dueDate) : null,
            },
        );
        res.status(201).json(serializeActionItem(item));
    });

    router.post('/api/boards/:id/action-items/from-card', async (req: Request, res: Response) => {
        const body = req.body as { cardContent?: unknown; assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown };
        const item = await convertCardToActionItem(
            { boardReadPort: deps.boardReadPort, actionItemPort: deps.actionItemPort },
            {
                boardId: paramId(req, 'id'),
                requesterUid: uidOf(res),
                cardContent: String(body.cardContent ?? ''),
                assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
                assignedToName: typeof body.assignedToName === 'string' ? body.assignedToName : null,
                dueDate: typeof body.dueDate === 'string' ? new Date(body.dueDate) : null,
            },
        );
        res.status(201).json(serializeActionItem(item));
    });

    router.patch('/api/boards/:id/action-items/:itemId', async (req: Request, res: Response) => {
        const body = req.body as { content?: unknown; assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown; order?: unknown };
        const updates: Record<string, unknown> = {};
        if (typeof body.content === 'string') updates.content = body.content;
        if ('assignedTo' in body) updates.assignedTo = typeof body.assignedTo === 'string' ? body.assignedTo : null;
        if ('assignedToName' in body) updates.assignedToName = typeof body.assignedToName === 'string' ? body.assignedToName : null;
        if ('dueDate' in body) updates.dueDate = typeof body.dueDate === 'string' ? new Date(body.dueDate) : null;
        if (typeof body.order === 'number') updates.order = body.order;
        const item = await updateActionItem(
            { boardReadPort: deps.boardReadPort, actionItemPort: deps.actionItemPort },
            { boardId: paramId(req, 'id'), itemId: paramId(req, 'itemId'), requesterUid: uidOf(res), updates },
        );
        res.status(200).json(serializeActionItem(item));
    });

    router.delete('/api/boards/:id/action-items/:itemId', async (req: Request, res: Response) => {
        await deleteActionItem(
            { boardReadPort: deps.boardReadPort, actionItemPort: deps.actionItemPort },
            { boardId: paramId(req, 'id'), itemId: paramId(req, 'itemId'), requesterUid: uidOf(res) },
        );
        res.status(204).end();
    });

    // --- Sentiment results (contracts/facilitator-tools-api.md) ------------------------

    router.put('/api/boards/:id/cards/:cardId/sentiment', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        await assertAccess(deps, boardId, uidOf(res));
        const body = req.body as { sentiment?: unknown; confidence?: unknown; contentHash?: unknown; modelId?: unknown; modelVersion?: unknown };
        const result = await saveSentimentResult(
            { sentimentPort: deps.sentimentPort },
            {
                retrospectiveId: boardId,
                cardId: paramId(req, 'cardId'),
                sentiment: body.sentiment as 'positive' | 'negative' | 'neutral',
                confidence: Number(body.confidence ?? 0),
                contentHash: String(body.contentHash ?? ''),
                modelId: typeof body.modelId === 'string' ? body.modelId : undefined,
                modelVersion: typeof body.modelVersion === 'string' ? body.modelVersion : undefined,
            },
        );
        res.status(200).json(serializeSentimentResult(result));
    });

    router.put('/api/boards/:id/cards/:cardId/sentiment/override', async (req: Request, res: Response) => {
        const body = req.body as { sentiment?: unknown };
        const result = await overrideSentimentResult(
            { boardReadPort: deps.boardReadPort, sentimentPort: deps.sentimentPort },
            { boardId: paramId(req, 'id'), cardId: paramId(req, 'cardId'), requesterUid: uidOf(res), sentiment: body.sentiment as 'positive' | 'negative' | 'neutral' },
        );
        res.status(200).json(serializeSentimentResult(result));
    });

    router.delete('/api/boards/:id/cards/:cardId/sentiment', async (req: Request, res: Response) => {
        const boardId = paramId(req, 'id');
        await assertAccess(deps, boardId, uidOf(res));
        await deleteSentimentResult({ sentimentPort: deps.sentimentPort }, { boardId, cardId: paramId(req, 'cardId') });
        res.status(204).end();
    });

    // --- Real-time channel ---------------------------------------------------------

    router.get('/api/boards/:id/events', (req: Request, res: Response) => handleBoardEvents(deps, req, res));

    return router;
}

/**
 * Extracted from the router so it can be unit-tested directly with fake req/res (an SSE
 * connection never completes, so it cannot be exercised through supertest the way the
 * other routes are — see server/test/http/routes/boardsEvents.test.ts).
 */
export async function handleBoardEvents(deps: BoardsRouterDeps, req: Request, res: Response): Promise<void> {
    const boardId = paramId(req, 'id');
    const uid = uidOf(res);
    // Enforces FR-004 the same way GET /api/boards/:id does (404 for both "missing" and
    // "not accessible" — existence is never leaked, matching the MCP precedent).
    const connectingBoard = await getBoard(
        { boardReadPort: deps.boardReadPort, participantPort: deps.participantPort },
        { boardId, requesterUid: uid },
    );
    // FR-004/research.md §1: notes are the board facilitator's own private notes — this
    // connection only ever receives `note.*` events (or the initial `notes` snapshot key)
    // if the connecting user IS that facilitator. Non-facilitator connections never get
    // these events at all, not even filtered client-side.
    const viewerIsFacilitator = isFacilitator(connectingBoard, uid);

    // Presence (data-model.md): mark this connection's participant active for as long as
    // the SSE stream is open. Written to Firestore so it fans out via the existing
    // `participants` listener below, correctly even across serverless instances. A board
    // creator who never explicitly joined has no participant record — presence is simply
    // skipped for them (their access is already governed by board.createdBy).
    const participant = await deps.participantPort.getParticipantByUser(boardId, uid);
    if (participant) await deps.participantPort.setActive(participant.id, true);

    const relay = new FirestoreRealtimeRelay();
    const cleanup = await relay.connect(res, {
        getSnapshot: async () => {
            const [board, participants, cards, groups, typing, countdown, actionItems, sentiment, notes] = await Promise.all([
                deps.boardReadPort.getBoard(boardId),
                deps.participantPort.listParticipants(boardId),
                deps.cardPort.listCards(boardId),
                deps.cardGroupPort.listGroups(boardId),
                deps.typingPort.listTypingStatuses(boardId),
                deps.countdownPort.getTimer(boardId),
                deps.actionItemPort.listActionItems(boardId),
                deps.sentimentPort.listResults(boardId),
                viewerIsFacilitator ? deps.facilitatorNotesPort.listNotes(boardId, uid) : Promise.resolve(null),
            ]);
            return {
                board: board ? serializeBoard(board) : null,
                participants,
                cards: cards.map(serializeCard),
                groups: groups.map(serializeGroup),
                typing,
                countdown: countdown ? serializeCountdown(countdown) : null,
                actionItems: actionItems.map(serializeActionItem),
                sentiment: sentiment.map(serializeSentimentResult),
                // "absent, not empty" (contracts/realtime-events.md) for non-facilitators.
                ...(notes ? { notes: notes.map(serializeNote) } : {}),
            };
        },
        sources: [
            docSource('board', deps.db.collection(RETROSPECTIVES).doc(boardId), (data, exists) =>
                exists && data ? { id: boardId, ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) } : null,
            ),
            collectionSource(
                'participants',
                deps.db.collection(PARTICIPANTS).where('retrospectiveId', '==', boardId),
                (docs) => docs.map((d) => ({ id: d.id, ...d.data(), joinedAt: toDate(d.data().joinedAt) })),
            ),
            collectionSource('cards', deps.db.collection(CARDS).where('retrospectiveId', '==', boardId), (docs) =>
                docs.map((d) => {
                    const data = d.data();
                    return {
                        id: d.id,
                        ...data,
                        createdAt: toDate(data.createdAt),
                        updatedAt: toDate(data.updatedAt),
                        likes: ((data.likes ?? []) as Array<Record<string, unknown>>).map((l) => ({ ...l, timestamp: toDate(l.timestamp) })),
                        reactions: ((data.reactions ?? []) as Array<Record<string, unknown>>).map((r) => ({ ...r, timestamp: toDate(r.timestamp) })),
                    };
                }),
            ),
            collectionSource('groups', deps.db.collection(GROUPS).where('retrospectiveId', '==', boardId), (docs) =>
                docs.map((d) => ({ id: d.id, ...d.data(), createdAt: toDate(d.data().createdAt) })),
            ),
            collectionSource('typing', deps.db.collection(TYPING_STATUS).where('retrospectiveId', '==', boardId), (docs) =>
                docs.map((d) => ({ ...d.data(), timestamp: toDate(d.data().timestamp) })),
            ),
            docSource('countdown', deps.db.collection(COUNTDOWN_TIMERS).doc(boardId), (data, exists) =>
                exists && data
                    ? { id: boardId, ...data, startTime: data.startTime ? toDate(data.startTime) : null, endTime: data.endTime ? toDate(data.endTime) : null, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) }
                    : null,
            ),
            collectionSource('actionItems', deps.db.collection(ACTION_ITEMS).where('retrospectiveId', '==', boardId), (docs) =>
                docs.map((d) => {
                    const data = d.data();
                    return { id: d.id, ...data, dueDate: data.dueDate ? toDate(data.dueDate) : null, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
                }),
            ),
            collectionSource('sentiment', deps.db.collection(SENTIMENT_RESULTS).where('retrospectiveId', '==', boardId), (docs) =>
                docs.map((d) => {
                    const data = d.data();
                    return { ...data, timestamp: toDate(data.analyzedAt) };
                }),
            ),
            // Only ever registered for the connecting facilitator (research.md §1) — a
            // non-facilitator's connection has no `notes` source at all.
            ...(viewerIsFacilitator
                ? [
                      collectionSource(
                          'notes',
                          deps.db.collection(FACILITATOR_NOTES).where('retrospectiveId', '==', boardId).where('facilitatorId', '==', uid),
                          (docs) =>
                              docs.map((d) => {
                                  const data = d.data();
                                  return { id: d.id, ...data, createdAt: toDate(data.createdAt), updatedAt: toDate(data.updatedAt) };
                              }),
                      ),
                  ]
                : []),
        ],
    });

    req.on('close', () => {
        cleanup();
        if (participant) void deps.participantPort.setActive(participant.id, false);
    });
}
