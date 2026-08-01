import { NotFoundError, ForbiddenError } from '../../../../src/domain/errors';
import type {
    ColumnDTO,
    ColumnGroupingStates,
    CountdownTimerDTO,
    ParticipantDTO,
    ParticipantPort,
    RetrospectiveBoardPort,
} from '../../../../src/application/ports/retrospective';
import type { CardDTO, CardGroupDTO, CardGroupPort, CardPort, CreateCardGroupInput, CreateCardInput, ReorderUpdate } from '../../../../src/application/ports/cards';
import type { ActionItemDTO, ActionItemPort, CreateActionItemInput, EditActionItemInput } from '../../../../src/application/ports/actionItems';
import type { FacilitatorNoteDTO, FacilitatorNotePort } from '../../../../src/application/ports/facilitatorNotes';
import type { SaveSentimentResultInput, SentimentResultDTO, SentimentResultPort, SentimentType } from '../../../../src/application/ports/sentiment';
import type { TypingStatusDTO, TypingStatusPort } from '../../../../src/application/ports/typing';

/**
 * In-memory fakes for every feature-019 port, replicating each Firestore adapter's
 * observable behavior (idempotent join, ownership checks, atomic vote/reorder, group
 * head-promotion, facilitatorId scoping) — mirrors boardsFakes.ts, shared by use-case
 * tests and retrospectivesTestApp.ts's contract tests.
 */

export interface FakeRetrospectiveRecord {
    id: string;
    title: string;
    description?: string;
    templateId?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    columnGroupingStates: ColumnGroupingStates;
}

export interface RetrospectiveFakeStore {
    retrospectiveBoardPort: RetrospectiveBoardPort;
    participantPort: ParticipantPort;
    cardPort: CardPort;
    cardGroupPort: CardGroupPort;
    actionItemPort: ActionItemPort;
    facilitatorNotePort: FacilitatorNotePort;
    sentimentResultPort: SentimentResultPort;
    typingStatusPort: TypingStatusPort;
}

let idCounter = 1;
function nextId(prefix: string): string {
    return `${prefix}-${idCounter++}`;
}

export function createRetrospectiveFakeStore(seed: {
    retrospectives?: FakeRetrospectiveRecord[];
    columns?: ColumnDTO[];
    participants?: ParticipantDTO[];
    cards?: CardDTO[];
    groups?: CardGroupDTO[];
    actionItems?: ActionItemDTO[];
    facilitatorNotes?: FacilitatorNoteDTO[];
    sentimentResults?: SentimentResultDTO[];
    timers?: CountdownTimerDTO[];
} = {}): RetrospectiveFakeStore {
    const retrospectives = new Map<string, FakeRetrospectiveRecord>((seed.retrospectives ?? []).map((r) => [r.id, { ...r }]));
    const columns = [...(seed.columns ?? [])];
    const participants = new Map<string, ParticipantDTO>((seed.participants ?? []).map((p) => [p.id, { ...p }]));
    const cards = new Map<string, CardDTO>((seed.cards ?? []).map((c) => [c.id, { ...c }]));
    const groups = new Map<string, CardGroupDTO>((seed.groups ?? []).map((g) => [g.id, { ...g }]));
    const actionItems = new Map<string, ActionItemDTO>((seed.actionItems ?? []).map((a) => [a.id, { ...a }]));
    const facilitatorNotes = new Map<string, FacilitatorNoteDTO>((seed.facilitatorNotes ?? []).map((n) => [n.id, { ...n }]));
    const sentimentResults = new Map<string, SentimentResultDTO>((seed.sentimentResults ?? []).map((s) => [`${s.retrospectiveId}_${s.cardId}`, { ...s }]));
    const timers = new Map<string, CountdownTimerDTO>((seed.timers ?? []).map((t) => [t.retrospectiveId, { ...t }]));

    function requireBoard(id: string): FakeRetrospectiveRecord {
        const board = retrospectives.get(id);
        if (!board) throw new NotFoundError('El tablero especificado no existe o no está disponible');
        return board;
    }

    const retrospectiveBoardPort: RetrospectiveBoardPort = {
        async getRetrospective(id) {
            const r = retrospectives.get(id);
            return r ? { ...r } : null;
        },
        async listColumns(retrospectiveId) {
            void retrospectiveId;
            return columns.map((c) => ({ ...c }));
        },
        async saveColumnGroupingState(retrospectiveId, states) {
            const board = requireBoard(retrospectiveId);
            board.columnGroupingStates = states;
            board.updatedAt = new Date();
        },
        async getTimer(retrospectiveId) {
            return timers.get(retrospectiveId) ? { ...timers.get(retrospectiveId)! } : null;
        },
        async configureTimer(retrospectiveId, uid, duration) {
            const board = requireBoard(retrospectiveId);
            if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
            const timer: CountdownTimerDTO = {
                retrospectiveId,
                startTime: null,
                duration,
                originalDuration: duration,
                isRunning: false,
                isPaused: false,
                endTime: null,
                createdBy: uid,
                createdAt: timers.get(retrospectiveId)?.createdAt ?? new Date(),
                updatedAt: new Date(),
            };
            timers.set(retrospectiveId, timer);
            return { ...timer };
        },
        async startTimer(retrospectiveId, uid) {
            const board = requireBoard(retrospectiveId);
            if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new NotFoundError('No timer configured');
            const now = new Date();
            timer.isRunning = true;
            timer.isPaused = false;
            timer.startTime = now;
            timer.endTime = new Date(now.getTime() + timer.duration * 1000);
            timer.updatedAt = now;
            return { ...timer };
        },
        async pauseTimer(retrospectiveId, uid) {
            const board = requireBoard(retrospectiveId);
            if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new NotFoundError('No timer configured');
            if (timer.isRunning && timer.startTime) {
                const elapsedSeconds = Math.floor((Date.now() - timer.startTime.getTime()) / 1000);
                timer.duration = Math.max(0, timer.duration - elapsedSeconds);
            }
            timer.isRunning = false;
            timer.isPaused = true;
            timer.updatedAt = new Date();
            return { ...timer };
        },
        async resetTimer(retrospectiveId, uid) {
            const board = requireBoard(retrospectiveId);
            if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new NotFoundError('No timer configured');
            timer.duration = timer.originalDuration;
            timer.isRunning = false;
            timer.isPaused = false;
            timer.startTime = null;
            timer.endTime = null;
            timer.updatedAt = new Date();
            return { ...timer };
        },
        async deleteTimer(retrospectiveId, uid) {
            const board = requireBoard(retrospectiveId);
            if (board.createdBy !== uid) throw new ForbiddenError('Solo la persona facilitadora puede realizar esta acción');
            timers.delete(retrospectiveId);
        },
    };

    const participantPort: ParticipantPort = {
        async listParticipants(retrospectiveId) {
            return [...participants.values()].filter((p) => p.retrospectiveId === retrospectiveId).map((p) => ({ ...p }));
        },
        async join(retrospectiveId, uid, userName, photoURL) {
            requireBoard(retrospectiveId);
            const existing = [...participants.values()].find((p) => p.retrospectiveId === retrospectiveId && p.userId === uid);
            if (existing) return { ...existing };
            const participant: ParticipantDTO = {
                id: nextId('participant'),
                name: userName,
                userId: uid,
                retrospectiveId,
                joinedAt: new Date(),
                photoURL,
                isActive: true,
            };
            participants.set(participant.id, participant);
            const board = retrospectives.get(retrospectiveId)!;
            board.participantCount += 1;
            board.updatedAt = new Date();
            return { ...participant };
        },
        async renameParticipantsForUser(uid, name) {
            for (const participant of participants.values()) {
                if (participant.userId === uid) participant.name = name;
            }
        },
    };

    function requireCard(cardId: string): CardDTO {
        const card = cards.get(cardId);
        if (!card) throw new NotFoundError('Card not found');
        return card;
    }

    const cardPort: CardPort = {
        async listCards(retrospectiveId) {
            return [...cards.values()].filter((c) => c.retrospectiveId === retrospectiveId).map((c) => ({ ...c }));
        },
        async createCard(input: CreateCardInput) {
            const card: CardDTO = {
                id: nextId('card'),
                content: input.content,
                column: input.column,
                createdBy: input.createdBy,
                createdByName: input.createdByName,
                createdAt: new Date(),
                updatedAt: new Date(),
                retrospectiveId: input.retrospectiveId,
                color: input.color,
                votes: 0,
                likes: [],
                reactions: [],
                order: [...cards.values()].filter((c) => c.retrospectiveId === input.retrospectiveId && c.column === input.column).length,
            };
            cards.set(card.id, card);
            return { ...card };
        },
        async editCard(cardId, uid, updates) {
            const card = requireCard(cardId);
            if (card.createdBy !== uid) throw new ForbiddenError("Not this card's owner");
            if (updates.content !== undefined) card.content = updates.content;
            if (updates.color !== undefined) card.color = updates.color;
            card.updatedAt = new Date();
            return { ...card };
        },
        async deleteCard(cardId, uid) {
            const card = requireCard(cardId);
            if (card.createdBy !== uid) throw new ForbiddenError("Not this card's owner");
            cards.delete(cardId);
        },
        async voteCard(cardId, delta) {
            const card = requireCard(cardId);
            card.votes += delta;
            card.updatedAt = new Date();
            return { ...card };
        },
        async toggleLike(cardId, uid, username) {
            const card = requireCard(cardId);
            const existingIndex = card.likes.findIndex((l) => l.userId === uid);
            if (existingIndex >= 0) {
                card.likes.splice(existingIndex, 1);
            } else {
                card.likes.push({ userId: uid, username, timestamp: new Date() });
            }
            card.updatedAt = new Date();
            return { ...card };
        },
        async setReaction(cardId, uid, username, emoji) {
            const card = requireCard(cardId);
            card.reactions = card.reactions.filter((r) => r.userId !== uid);
            card.reactions.push({ userId: uid, username, emoji, timestamp: new Date() });
            card.updatedAt = new Date();
            return { ...card };
        },
        async removeReaction(cardId, uid) {
            const card = requireCard(cardId);
            card.reactions = card.reactions.filter((r) => r.userId !== uid);
            card.updatedAt = new Date();
            return { ...card };
        },
        async reorderCards(retrospectiveId, updates: ReorderUpdate[]) {
            for (const update of updates) {
                if (!cards.has(update.cardId)) throw new NotFoundError('Card not found');
            }
            for (const update of updates) {
                const card = cards.get(update.cardId)!;
                card.order = update.order;
                if (update.column) card.column = update.column;
                card.updatedAt = new Date();
            }
            void retrospectiveId;
        },
        async getCard(cardId) {
            const card = cards.get(cardId);
            return card ? { ...card } : null;
        },
    };

    function requireGroup(groupId: string): CardGroupDTO {
        const group = groups.get(groupId);
        if (!group) throw new NotFoundError('Group not found');
        return group;
    }

    const cardGroupPort: CardGroupPort = {
        async listGroups(retrospectiveId) {
            return [...groups.values()].filter((g) => g.retrospectiveId === retrospectiveId).map((g) => ({ ...g }));
        },
        async createGroup(input: CreateCardGroupInput) {
            const group: CardGroupDTO = {
                id: nextId('group'),
                retrospectiveId: input.retrospectiveId,
                column: input.column,
                headCardId: input.headCardId,
                memberCardIds: input.memberCardIds,
                title: input.title,
                isCollapsed: false,
                createdAt: new Date(),
                createdBy: input.createdBy,
                order: [...groups.values()].filter((g) => g.retrospectiveId === input.retrospectiveId).length,
            };
            groups.set(group.id, group);
            const head = cards.get(input.headCardId);
            if (head) {
                head.groupId = group.id;
                head.isGroupHead = true;
                head.groupOrder = 0;
            }
            input.memberCardIds.forEach((cardId, index) => {
                const member = cards.get(cardId);
                if (member) {
                    member.groupId = group.id;
                    member.isGroupHead = false;
                    member.groupOrder = index + 1;
                }
            });
            return { ...group };
        },
        async disbandGroup(groupId) {
            const group = requireGroup(groupId);
            for (const cardId of [group.headCardId, ...group.memberCardIds]) {
                const card = cards.get(cardId);
                if (card) {
                    delete card.groupId;
                    delete card.isGroupHead;
                    delete card.groupOrder;
                }
            }
            groups.delete(groupId);
        },
        async addCardToGroup(groupId, cardId) {
            const group = requireGroup(groupId);
            group.memberCardIds.push(cardId);
            const card = cards.get(cardId);
            if (card) {
                card.groupId = groupId;
                card.isGroupHead = false;
                card.groupOrder = group.memberCardIds.length;
            }
            return { ...group };
        },
        async removeCardFromGroup(groupId, cardId) {
            const group = requireGroup(groupId);
            const card = cards.get(cardId);
            if (card) {
                delete card.groupId;
                delete card.isGroupHead;
                delete card.groupOrder;
            }

            if (group.headCardId === cardId) {
                const nextHead = group.memberCardIds[0];
                if (!nextHead) {
                    groups.delete(groupId);
                    return null;
                }
                group.headCardId = nextHead;
                group.memberCardIds = group.memberCardIds.slice(1);
                const newHeadCard = cards.get(nextHead);
                if (newHeadCard) {
                    newHeadCard.isGroupHead = true;
                    newHeadCard.groupOrder = 0;
                }
            } else {
                group.memberCardIds = group.memberCardIds.filter((id) => id !== cardId);
                if (group.memberCardIds.length === 0 && !group.headCardId) {
                    groups.delete(groupId);
                    return null;
                }
            }
            return { ...group };
        },
        async setGroupCollapse(groupId, isCollapsed) {
            const group = requireGroup(groupId);
            group.isCollapsed = isCollapsed;
            return { ...group };
        },
        async getGroup(groupId) {
            const group = groups.get(groupId);
            return group ? { ...group } : null;
        },
    };

    const actionItemPort: ActionItemPort = {
        async listActionItems(retrospectiveId) {
            return [...actionItems.values()].filter((a) => a.retrospectiveId === retrospectiveId).map((a) => ({ ...a }));
        },
        async createActionItem(input: CreateActionItemInput) {
            const item: ActionItemDTO = {
                id: nextId('action-item'),
                content: input.content,
                retrospectiveId: input.retrospectiveId,
                createdBy: input.createdBy,
                createdAt: new Date(),
                updatedAt: new Date(),
                assignedTo: input.assignedTo ?? null,
                assignedToName: input.assignedToName ?? null,
                dueDate: input.dueDate ?? null,
                order: [...actionItems.values()].filter((a) => a.retrospectiveId === input.retrospectiveId).length,
            };
            actionItems.set(item.id, item);
            return { ...item };
        },
        async editActionItem(actionItemId, updates: EditActionItemInput) {
            const item = actionItems.get(actionItemId);
            if (!item) throw new NotFoundError('Action item not found');
            if (updates.content !== undefined) item.content = updates.content;
            if (updates.assignedTo !== undefined) item.assignedTo = updates.assignedTo;
            if (updates.assignedToName !== undefined) item.assignedToName = updates.assignedToName;
            if (updates.dueDate !== undefined) item.dueDate = updates.dueDate;
            item.updatedAt = new Date();
            return { ...item };
        },
        async deleteActionItem(actionItemId) {
            if (!actionItems.has(actionItemId)) throw new NotFoundError('Action item not found');
            actionItems.delete(actionItemId);
        },
        async getActionItem(actionItemId) {
            const item = actionItems.get(actionItemId);
            return item ? { ...item } : null;
        },
    };

    const facilitatorNotePort: FacilitatorNotePort = {
        async listNotesForFacilitator(retrospectiveId, facilitatorId) {
            return [...facilitatorNotes.values()]
                .filter((n) => n.retrospectiveId === retrospectiveId && n.facilitatorId === facilitatorId)
                .map((n) => ({ ...n }));
        },
        async createNote(retrospectiveId, facilitatorId, content) {
            const note: FacilitatorNoteDTO = { id: nextId('note'), content, timestamp: new Date(), retrospectiveId, facilitatorId };
            facilitatorNotes.set(note.id, note);
            return { ...note };
        },
        async editNote(noteId, uid, content) {
            const note = facilitatorNotes.get(noteId);
            if (!note) throw new NotFoundError('Note not found');
            if (note.facilitatorId !== uid) throw new ForbiddenError('Not this note\'s author');
            note.content = content;
            note.timestamp = new Date();
            return { ...note };
        },
        async deleteNote(noteId, uid) {
            const note = facilitatorNotes.get(noteId);
            if (!note) throw new NotFoundError('Note not found');
            if (note.facilitatorId !== uid) throw new ForbiddenError('Not this note\'s author');
            facilitatorNotes.delete(noteId);
        },
        async getNote(noteId) {
            const note = facilitatorNotes.get(noteId);
            return note ? { ...note } : null;
        },
    };

    const sentimentResultPort: SentimentResultPort = {
        async listResults(retrospectiveId) {
            return [...sentimentResults.values()].filter((s) => s.retrospectiveId === retrospectiveId).map((s) => ({ ...s }));
        },
        async getResult(retrospectiveId, cardId) {
            const result = sentimentResults.get(`${retrospectiveId}_${cardId}`);
            return result ? { ...result } : null;
        },
        async saveResult(input: SaveSentimentResultInput) {
            const key = `${input.retrospectiveId}_${input.cardId}`;
            const existing = sentimentResults.get(key);
            const result: SentimentResultDTO = {
                retrospectiveId: input.retrospectiveId,
                cardId: input.cardId,
                sentiment: input.sentiment,
                confidence: input.confidence,
                modelId: input.modelId,
                modelVersion: input.modelVersion,
                contentHash: input.contentHash,
                isOverride: existing?.isOverride ?? false,
                overrideBy: existing?.overrideBy ?? null,
                analyzedAt: new Date(),
            };
            sentimentResults.set(key, result);
            return { ...result };
        },
        async saveOverride(retrospectiveId, cardId, uid, sentiment: SentimentType) {
            const key = `${retrospectiveId}_${cardId}`;
            const existing = sentimentResults.get(key);
            const result: SentimentResultDTO = {
                retrospectiveId,
                cardId,
                sentiment,
                confidence: existing?.confidence ?? 1,
                modelId: existing?.modelId,
                modelVersion: existing?.modelVersion,
                contentHash: existing?.contentHash ?? '',
                isOverride: true,
                overrideBy: uid,
                analyzedAt: new Date(),
            };
            sentimentResults.set(key, result);
            return { ...result };
        },
    };

    const typingStatusMap = new Map<string, TypingStatusDTO>();

    const typingStatusPort: TypingStatusPort = {
        async setTypingStatus(retrospectiveId, userId, username, column, isActive) {
            const key = `${retrospectiveId}_${userId}_${column}`;
            if (!isActive) {
                typingStatusMap.delete(key);
                return;
            }
            typingStatusMap.set(key, { id: key, userId, username, retrospectiveId, column, timestamp: new Date() });
        },
        async listActive(retrospectiveId) {
            return [...typingStatusMap.values()].filter((t) => t.retrospectiveId === retrospectiveId).map((t) => ({ ...t }));
        },
    };

    return {
        retrospectiveBoardPort,
        participantPort,
        cardPort,
        cardGroupPort,
        actionItemPort,
        facilitatorNotePort,
        sentimentResultPort,
        typingStatusPort,
    };
}
