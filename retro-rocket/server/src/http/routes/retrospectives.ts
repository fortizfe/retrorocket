import { Router, type Request, type Response } from 'express';
import { createRateLimiter } from '../middleware/rateLimiting';
import type { ClockPort, SessionServicePort } from '../../application/ports';
import type { ActionItemPort } from '../../application/ports/actionItems';
import type { CardGroupPort, CardPort } from '../../application/ports/cards';
import type { FacilitatorNotePort } from '../../application/ports/facilitatorNotes';
import type { ParticipantPort, RetrospectiveBoardPort } from '../../application/ports/retrospective';
import type { SentimentResultPort } from '../../application/ports/sentiment';
import type { TypingStatusPort } from '../../application/ports/typing';
import type { PublicUser } from '../../domain/auth/types';
import { AppError, ForbiddenError, NotFoundError } from '../../domain/errors';
import { readCookie, SESSION_COOKIE } from '../cookies';
import { getBoardState } from '../../application/use-cases/retrospective/GetBoardState';
import { joinRetrospective } from '../../application/use-cases/retrospective/JoinRetrospective';
import { createCard, editCard, deleteCard } from '../../application/use-cases/retrospective/CardLifecycle';
import { voteCard, toggleLike, setReaction, removeReaction } from '../../application/use-cases/retrospective/CardInteractions';
import { setTypingStatus } from '../../application/use-cases/retrospective/SetTypingStatus';
import { reorderCards } from '../../application/use-cases/retrospective/ReorderCards';
import { createCardGroup, disbandCardGroup, addCardToGroup, removeCardFromGroup, setGroupCollapse, saveColumnGroupingState } from '../../application/use-cases/retrospective/CardGrouping';
import { configureTimer, startTimer, pauseTimer, resetTimer, deleteTimer } from '../../application/use-cases/retrospective/Timer';
import { createNote, editNote, deleteNote } from '../../application/use-cases/retrospective/FacilitatorNotes';
import { convertCardToActionItem } from '../../application/use-cases/retrospective/ConvertCardToActionItem';
import { createActionItem, editActionItem, deleteActionItem } from '../../application/use-cases/retrospective/ActionItems';
import { saveSentimentResult, saveSentimentOverride } from '../../application/use-cases/retrospective/Sentiment';

export interface RetrospectiveRouterDeps {
    retrospectiveBoardPort: RetrospectiveBoardPort;
    participantPort: ParticipantPort;
    cardPort: CardPort;
    cardGroupPort: CardGroupPort;
    actionItemPort: ActionItemPort;
    facilitatorNotePort: FacilitatorNotePort;
    sentimentResultPort: SentimentResultPort;
    typingStatusPort: TypingStatusPort;
    sessionService: SessionServicePort;
    clock: ClockPort;
    /** Skips retrospectiveLimiter — see boards.ts's testMode doc comment; MUST be false in production. */
    testMode?: boolean;
}

export interface AuthedSession {
    sub: string;
    user?: PublicUser;
}

export async function requireSession(req: Request, deps: RetrospectiveRouterDeps): Promise<AuthedSession> {
    const session = await deps.sessionService.verify(readCookie(req, SESSION_COOKIE) ?? '', deps.clock.nowSeconds());
    if (!session) throw new AppError('unauthenticated', 'Sign-in required', 401);
    return session.data as unknown as AuthedSession;
}

export function displayNameOf(user: PublicUser | undefined): string {
    return user?.displayName ?? user?.email ?? 'Anonymous';
}

/** Throws NotFoundError/ForbiddenError; returns the board so callers can reuse it. */
export async function requireFacilitator(deps: RetrospectiveRouterDeps, retrospectiveId: string, uid: string) {
    const board = await deps.retrospectiveBoardPort.getRetrospective(retrospectiveId);
    if (!board) throw new NotFoundError('El tablero especificado no existe o no está disponible');
    if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
    return board;
}

function serializeParticipant(p: import('../../application/ports/retrospective').ParticipantDTO) {
    return { id: p.id, name: p.name, userId: p.userId, retrospectiveId: p.retrospectiveId, joinedAt: p.joinedAt.toISOString(), photoURL: p.photoURL };
}

function serializeColumn(c: import('../../application/ports/retrospective').ColumnDTO) {
    return { id: c.id, i18nKey: c.i18nKey, type: c.type, order: c.order, defaultColor: c.defaultColor };
}

function serializeCard(c: import('../../application/ports/cards').CardDTO) {
    return {
        ...c,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        likes: c.likes.map((l) => ({ ...l, timestamp: l.timestamp.toISOString() })),
        reactions: c.reactions.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() })),
    };
}

function serializeGroup(g: import('../../application/ports/cards').CardGroupDTO) {
    return { ...g, createdAt: g.createdAt.toISOString() };
}

function serializeActionItem(a: import('../../application/ports/actionItems').ActionItemDTO) {
    return {
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
    };
}

function serializeTimer(t: import('../../application/ports/retrospective').CountdownTimerDTO | null) {
    if (!t) return null;
    return {
        ...t,
        startTime: t.startTime ? t.startTime.toISOString() : null,
        endTime: t.endTime ? t.endTime.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    };
}

function serializeNote(n: import('../../application/ports/facilitatorNotes').FacilitatorNoteDTO) {
    return { ...n, timestamp: n.timestamp.toISOString() };
}

function serializeSentimentResult(s: import('../../application/ports/sentiment').SentimentResultDTO) {
    return { ...s, analyzedAt: s.analyzedAt.toISOString() };
}

function serializeBoardState(state: import('../../application/use-cases/retrospective/GetBoardState').RetrospectiveStateResult) {
    return {
        id: state.id,
        title: state.title,
        description: state.description,
        templateId: state.templateId,
        createdBy: state.createdBy,
        isFacilitator: state.isFacilitator,
        createdAt: state.createdAt.toISOString(),
        updatedAt: state.updatedAt.toISOString(),
        participantCount: state.participantCount,
        isActive: state.isActive,
        columnGroupingStates: state.columnGroupingStates,
        columns: state.columns.map(serializeColumn),
        cards: state.cards.map(serializeCard),
        groups: state.groups.map(serializeGroup),
        actionItems: state.actionItems.map(serializeActionItem),
        participants: state.participants.map(serializeParticipant),
        timer: serializeTimer(state.timer),
        myFacilitatorNotes: state.myFacilitatorNotes.map(serializeNote),
        sentimentResults: state.sentimentResults.map(serializeSentimentResult),
    };
}

/**
 * Retrospective board screen routes (feature 019): board load/join, cards, groups,
 * action items, facilitator timer/notes/convert, sentiment, typing. Session-cookie
 * authenticated, mirrors boards.ts/profile.ts's structure and error-envelope
 * conventions. Routes are added incrementally per user story (US1-US7); ownership/
 * facilitator checks live in the adapters (mirrors boards.ts's rename/delete pattern)
 * except where a route must reject *before* attempting the write (requireFacilitator).
 */
export function retrospectiveRouter(deps: RetrospectiveRouterDeps): Router {
    const router = Router();

    // Same rationale as boardsLimiter/profileLimiter — blunt brute-force/resource-
    // exhaustion protection within Vercel's free-tier request budget, now keyed by
    // session identity (falling back to the trust-proxy-aware IP) via rateLimiting.ts
    // so a reconnect storm from one participant cannot throttle another's (research.md
    // §1, US3, FR-002, FR-010). Skipped in testMode (never production) for the same
    // reason as boards.ts's boardsLimiter.
    if (!deps.testMode) {
        const retrospectiveLimiter = createRateLimiter({
            sessionService: deps.sessionService,
            clock: deps.clock,
            windowMs: 15 * 60 * 1000,
            limit: 400, // per identity per window — this screen's REST resync (on every WS
            // reconnect) plus ordinary card/group/timer activity is the highest-volume
            // router, resized above auth/boards/profile's 150 accordingly
        });
        router.use(retrospectiveLimiter);
    }

    router.get('/api/retrospectives/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const state = await getBoardState({ ...deps }, { retrospectiveId: String(req.params.id), uid: session.sub });
        res.status(200).json(serializeBoardState(state));
    });

    router.post('/api/retrospectives/:id/join', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const participant = await joinRetrospective(
            { ...deps },
            { retrospectiveId: String(req.params.id), uid: session.sub, userName: displayNameOf(session.user), photoURL: session.user?.photoURL ?? null },
        );
        res.status(200).json(serializeParticipant(participant));
    });

    router.post('/api/retrospectives/:id/cards', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { content?: unknown; column?: unknown; color?: unknown };
        const created = await createCard(
            { cardPort: deps.cardPort },
            {
                retrospectiveId: String(req.params.id),
                content: typeof body.content === 'string' ? body.content : '',
                column: typeof body.column === 'string' ? body.column : '',
                createdBy: session.sub,
                createdByName: displayNameOf(session.user),
                color: typeof body.color === 'string' ? body.color : undefined,
            },
        );
        res.status(201).json(serializeCard(created));
    });

    router.patch('/api/cards/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { content?: unknown; color?: unknown };
        const updated = await editCard(
            { cardPort: deps.cardPort },
            {
                cardId: String(req.params.id),
                uid: session.sub,
                content: typeof body.content === 'string' ? body.content : undefined,
                color: typeof body.color === 'string' ? body.color : undefined,
            },
        );
        res.status(200).json(serializeCard(updated));
    });

    router.delete('/api/cards/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await deleteCard({ cardPort: deps.cardPort }, { cardId: String(req.params.id), uid: session.sub });
        res.status(204).end();
    });

    router.post('/api/cards/:id/vote', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { increment?: unknown };
        const updated = await voteCard({ cardPort: deps.cardPort }, { cardId: String(req.params.id), increment: body.increment !== false });
        res.status(200).json(serializeCard(updated));
    });

    router.post('/api/cards/:id/like', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const updated = await toggleLike({ cardPort: deps.cardPort }, { cardId: String(req.params.id), uid: session.sub, username: displayNameOf(session.user) });
        res.status(200).json(serializeCard(updated));
    });

    router.put('/api/cards/:id/reaction', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { emoji?: unknown };
        if (typeof body.emoji !== 'string' || !body.emoji) {
            throw new AppError('invalid_request', 'emoji is required', 400);
        }
        const updated = await setReaction({ cardPort: deps.cardPort }, { cardId: String(req.params.id), uid: session.sub, username: displayNameOf(session.user), emoji: body.emoji });
        res.status(200).json(serializeCard(updated));
    });

    router.delete('/api/cards/:id/reaction', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const updated = await removeReaction({ cardPort: deps.cardPort }, { cardId: String(req.params.id), uid: session.sub });
        res.status(200).json(serializeCard(updated));
    });

    router.post('/api/retrospectives/:id/typing', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { column?: unknown; isActive?: unknown };
        await setTypingStatus(
            { typingStatusPort: deps.typingStatusPort },
            {
                retrospectiveId: String(req.params.id),
                userId: session.sub,
                username: displayNameOf(session.user),
                column: typeof body.column === 'string' ? body.column : '',
                isActive: body.isActive === true,
            },
        );
        res.status(204).end();
    });

    router.post('/api/retrospectives/:id/cards/reorder', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { updates?: unknown };
        const updates = Array.isArray(body.updates) ? (body.updates as Array<{ cardId?: unknown; order?: unknown; column?: unknown }>) : [];
        await reorderCards(
            { cardPort: deps.cardPort },
            {
                retrospectiveId: String(req.params.id),
                updates: updates.map((u) => ({
                    cardId: String(u.cardId),
                    order: typeof u.order === 'number' ? u.order : 0,
                    column: typeof u.column === 'string' ? u.column : undefined,
                })),
            },
        );
        res.status(204).end();
    });

    router.post('/api/retrospectives/:id/groups', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { headCardId?: unknown; memberCardIds?: unknown; title?: unknown; column?: unknown };
        const created = await createCardGroup(
            { cardGroupPort: deps.cardGroupPort },
            {
                retrospectiveId: String(req.params.id),
                column: typeof body.column === 'string' ? body.column : '',
                headCardId: String(body.headCardId ?? ''),
                memberCardIds: Array.isArray(body.memberCardIds) ? (body.memberCardIds as string[]) : [],
                title: typeof body.title === 'string' ? body.title : undefined,
                createdBy: session.sub,
            },
        );
        res.status(201).json(serializeGroup(created));
    });

    router.patch('/api/groups/:id', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { isCollapsed?: unknown };
        const updated = await setGroupCollapse({ cardGroupPort: deps.cardGroupPort }, { groupId: String(req.params.id), isCollapsed: body.isCollapsed === true });
        res.status(200).json(serializeGroup(updated));
    });

    router.delete('/api/groups/:id', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        await disbandCardGroup({ cardGroupPort: deps.cardGroupPort }, { groupId: String(req.params.id) });
        res.status(204).end();
    });

    router.post('/api/groups/:id/cards', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { cardId?: unknown };
        const updated = await addCardToGroup({ cardGroupPort: deps.cardGroupPort }, { groupId: String(req.params.id), cardId: String(body.cardId ?? '') });
        res.status(200).json(serializeGroup(updated));
    });

    router.delete('/api/groups/:id/cards/:cardId', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const updated = await removeCardFromGroup({ cardGroupPort: deps.cardGroupPort }, { groupId: String(req.params.id), cardId: String(req.params.cardId) });
        if (!updated) {
            res.status(204).end();
            return;
        }
        res.status(200).json(serializeGroup(updated));
    });

    router.patch('/api/retrospectives/:id/column-grouping', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const states = req.body as import('../../application/ports/retrospective').ColumnGroupingStates;
        await saveColumnGroupingState({ retrospectiveBoardPort: deps.retrospectiveBoardPort }, { retrospectiveId: String(req.params.id), states });
        res.status(204).end();
    });

    router.put('/api/retrospectives/:id/timer', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await requireFacilitator(deps, String(req.params.id), session.sub);
        const body = req.body as { duration?: unknown };
        const timer = await configureTimer(
            { retrospectiveBoardPort: deps.retrospectiveBoardPort },
            { retrospectiveId: String(req.params.id), uid: session.sub, duration: typeof body.duration === 'number' ? body.duration : 0 },
        );
        res.status(200).json(serializeTimer(timer));
    });

    router.post('/api/retrospectives/:id/timer/start', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await requireFacilitator(deps, String(req.params.id), session.sub);
        const timer = await startTimer({ retrospectiveBoardPort: deps.retrospectiveBoardPort }, { retrospectiveId: String(req.params.id), uid: session.sub });
        res.status(200).json(serializeTimer(timer));
    });

    router.post('/api/retrospectives/:id/timer/pause', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await requireFacilitator(deps, String(req.params.id), session.sub);
        const timer = await pauseTimer({ retrospectiveBoardPort: deps.retrospectiveBoardPort }, { retrospectiveId: String(req.params.id), uid: session.sub });
        res.status(200).json(serializeTimer(timer));
    });

    router.post('/api/retrospectives/:id/timer/reset', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await requireFacilitator(deps, String(req.params.id), session.sub);
        const timer = await resetTimer({ retrospectiveBoardPort: deps.retrospectiveBoardPort }, { retrospectiveId: String(req.params.id), uid: session.sub });
        res.status(200).json(serializeTimer(timer));
    });

    router.delete('/api/retrospectives/:id/timer', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await requireFacilitator(deps, String(req.params.id), session.sub);
        await deleteTimer({ retrospectiveBoardPort: deps.retrospectiveBoardPort }, { retrospectiveId: String(req.params.id), uid: session.sub });
        res.status(204).end();
    });

    router.post('/api/retrospectives/:id/notes', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { content?: unknown };
        const note = await createNote(
            { facilitatorNotePort: deps.facilitatorNotePort },
            { retrospectiveId: String(req.params.id), facilitatorId: session.sub, content: typeof body.content === 'string' ? body.content : '' },
        );
        res.status(201).json(serializeNote(note));
    });

    router.patch('/api/notes/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { content?: unknown };
        const note = await editNote(
            { facilitatorNotePort: deps.facilitatorNotePort },
            { noteId: String(req.params.id), uid: session.sub, content: typeof body.content === 'string' ? body.content : '' },
        );
        res.status(200).json(serializeNote(note));
    });

    router.delete('/api/notes/:id', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        await deleteNote({ facilitatorNotePort: deps.facilitatorNotePort }, { noteId: String(req.params.id), uid: session.sub });
        res.status(204).end();
    });

    router.post('/api/cards/:id/convert-to-action-item', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown };
        const item = await convertCardToActionItem(
            { cardPort: deps.cardPort, actionItemPort: deps.actionItemPort, retrospectiveBoardPort: deps.retrospectiveBoardPort },
            {
                cardId: String(req.params.id),
                uid: session.sub,
                assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
                assignedToName: typeof body.assignedToName === 'string' ? body.assignedToName : null,
                dueDate: typeof body.dueDate === 'string' ? new Date(body.dueDate) : null,
            },
        );
        res.status(201).json(serializeActionItem(item));
    });

    router.post('/api/retrospectives/:id/action-items', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { content?: unknown; assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown };
        const item = await createActionItem(
            { actionItemPort: deps.actionItemPort },
            {
                retrospectiveId: String(req.params.id),
                content: typeof body.content === 'string' ? body.content : '',
                createdBy: session.sub,
                assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo : null,
                assignedToName: typeof body.assignedToName === 'string' ? body.assignedToName : null,
                dueDate: typeof body.dueDate === 'string' ? new Date(body.dueDate) : null,
            },
        );
        res.status(201).json(serializeActionItem(item));
    });

    router.patch('/api/action-items/:id', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { content?: unknown; assignedTo?: unknown; assignedToName?: unknown; dueDate?: unknown };
        const updated = await editActionItem(
            { actionItemPort: deps.actionItemPort },
            {
                actionItemId: String(req.params.id),
                content: typeof body.content === 'string' ? body.content : undefined,
                assignedTo: 'assignedTo' in body ? (typeof body.assignedTo === 'string' ? body.assignedTo : null) : undefined,
                assignedToName: 'assignedToName' in body ? (typeof body.assignedToName === 'string' ? body.assignedToName : null) : undefined,
                dueDate: 'dueDate' in body ? (typeof body.dueDate === 'string' ? new Date(body.dueDate) : null) : undefined,
            },
        );
        res.status(200).json(serializeActionItem(updated));
    });

    router.delete('/api/action-items/:id', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        await deleteActionItem({ actionItemPort: deps.actionItemPort }, { actionItemId: String(req.params.id) });
        res.status(204).end();
    });

    router.put('/api/cards/:id/sentiment', async (req: Request, res: Response) => {
        await requireSession(req, deps);
        const body = req.body as { sentiment?: unknown; confidence?: unknown; modelId?: unknown; modelVersion?: unknown; contentHash?: unknown };
        const result = await saveSentimentResult(
            { cardPort: deps.cardPort, sentimentResultPort: deps.sentimentResultPort },
            {
                cardId: String(req.params.id),
                sentiment: body.sentiment as import('../../application/ports/sentiment').SentimentType,
                confidence: typeof body.confidence === 'number' ? body.confidence : 0,
                modelId: typeof body.modelId === 'string' ? body.modelId : undefined,
                modelVersion: typeof body.modelVersion === 'string' ? body.modelVersion : undefined,
                contentHash: typeof body.contentHash === 'string' ? body.contentHash : '',
            },
        );
        res.status(200).json(serializeSentimentResult(result));
    });

    router.put('/api/cards/:id/sentiment/override', async (req: Request, res: Response) => {
        const session = await requireSession(req, deps);
        const body = req.body as { sentiment?: unknown };
        const result = await saveSentimentOverride(
            { cardPort: deps.cardPort, retrospectiveBoardPort: deps.retrospectiveBoardPort, sentimentResultPort: deps.sentimentResultPort },
            { cardId: String(req.params.id), uid: session.sub, sentiment: body.sentiment as import('../../application/ports/sentiment').SentimentType },
        );
        res.status(200).json(serializeSentimentResult(result));
    });

    return router;
}
