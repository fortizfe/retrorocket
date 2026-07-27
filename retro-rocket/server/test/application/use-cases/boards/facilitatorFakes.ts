import type {
    ActionItem,
    ActionItemPort,
    CountdownPort,
    CountdownTimer,
    CreateActionItemInput,
    FacilitatorNote,
    FacilitatorNotesPort,
    SaveSentimentInput,
    SentimentPort,
    SentimentResult,
    SentimentType,
    UpdateActionItemInput,
} from '../../../../src/application/ports/facilitator';
import type { ClockPort } from '../../../../src/application/ports';

/** In-memory fake for CountdownPort. Elapsed-time math mirrors FirestoreCountdownAdapter. */
export function inMemoryCountdownStore(clock: ClockPort, initial: CountdownTimer[] = []): CountdownPort {
    const timers = new Map(initial.map((t) => [t.retrospectiveId, { ...t }]));

    return {
        async getTimer(retrospectiveId) {
            return timers.get(retrospectiveId) ?? null;
        },
        async createOrUpdateTimer(retrospectiveId, duration, createdBy) {
            const now = new Date(clock.nowSeconds() * 1000);
            const timer: CountdownTimer = {
                id: retrospectiveId,
                retrospectiveId,
                duration,
                originalDuration: duration,
                startTime: null,
                endTime: null,
                isRunning: false,
                isPaused: false,
                createdBy,
                createdAt: timers.get(retrospectiveId)?.createdAt ?? now,
                updatedAt: now,
            };
            timers.set(retrospectiveId, timer);
            return timer;
        },
        async startTimer(retrospectiveId) {
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new Error('not found');
            const now = clock.nowSeconds() * 1000;
            timer.startTime = new Date(now);
            timer.endTime = new Date(now + timer.duration * 1000);
            timer.isRunning = true;
            timer.isPaused = false;
            timer.updatedAt = new Date(now);
            return timer;
        },
        async pauseTimer(retrospectiveId) {
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new Error('not found');
            const now = clock.nowSeconds() * 1000;
            const elapsed = timer.startTime ? Math.floor((now - timer.startTime.getTime()) / 1000) : 0;
            timer.duration = Math.max(0, timer.duration - elapsed);
            timer.startTime = null;
            timer.endTime = null;
            timer.isRunning = false;
            timer.isPaused = true;
            timer.updatedAt = new Date(now);
            return timer;
        },
        async resetTimer(retrospectiveId) {
            const timer = timers.get(retrospectiveId);
            if (!timer) throw new Error('not found');
            timer.duration = timer.originalDuration;
            timer.startTime = null;
            timer.endTime = null;
            timer.isRunning = false;
            timer.isPaused = false;
            timer.updatedAt = new Date(clock.nowSeconds() * 1000);
            return timer;
        },
        async deleteTimer(retrospectiveId) {
            timers.delete(retrospectiveId);
        },
    };
}

/** In-memory fake for FacilitatorNotesPort. */
export function inMemoryFacilitatorNotesStore(initial: FacilitatorNote[] = []): FacilitatorNotesPort {
    const notes = new Map(initial.map((n) => [n.id, { ...n }]));
    let counter = 0;

    return {
        async listNotes(retrospectiveId, facilitatorId) {
            return [...notes.values()].filter((n) => n.retrospectiveId === retrospectiveId && n.facilitatorId === facilitatorId);
        },
        async getNote(noteId) {
            return notes.get(noteId) ?? null;
        },
        async createNote(retrospectiveId, facilitatorId, content) {
            const id = `note-${++counter}`;
            const now = new Date();
            const note: FacilitatorNote = { id, retrospectiveId, facilitatorId, content, createdAt: now, updatedAt: now };
            notes.set(id, note);
            return note;
        },
        async updateNote(noteId, content) {
            const note = notes.get(noteId);
            if (!note) throw new Error('not found');
            note.content = content;
            note.updatedAt = new Date();
            return note;
        },
        async deleteNote(noteId) {
            notes.delete(noteId);
        },
    };
}

/** In-memory fake for ActionItemPort. */
export function inMemoryActionItemStore(initial: ActionItem[] = []): ActionItemPort {
    const items = new Map(initial.map((a) => [a.id, { ...a }]));
    let counter = 0;

    return {
        async listActionItems(retrospectiveId) {
            return [...items.values()].filter((a) => a.retrospectiveId === retrospectiveId).sort((a, b) => a.order - b.order);
        },
        async getActionItem(actionItemId) {
            return items.get(actionItemId) ?? null;
        },
        async createActionItem(input: CreateActionItemInput) {
            const id = `action-${++counter}`;
            const now = new Date();
            const item: ActionItem = {
                id,
                retrospectiveId: input.retrospectiveId,
                content: input.content,
                createdBy: input.createdBy,
                assignedTo: input.assignedTo ?? null,
                assignedToName: input.assignedToName ?? null,
                dueDate: input.dueDate ?? null,
                order: Date.now(),
                createdAt: now,
                updatedAt: now,
            };
            items.set(id, item);
            return item;
        },
        async updateActionItem(actionItemId, updates: UpdateActionItemInput) {
            const item = items.get(actionItemId);
            if (!item) throw new Error('not found');
            Object.assign(item, updates, { updatedAt: new Date() });
            return item;
        },
        async deleteActionItem(actionItemId) {
            items.delete(actionItemId);
        },
    };
}

/** In-memory fake for SentimentPort. Upsert keyed by `${retrospectiveId}_${cardId}`. */
export function inMemorySentimentStore(initial: SentimentResult[] = []): SentimentPort {
    const results = new Map(initial.map((r) => [`${r.retrospectiveId}_${r.cardId}`, { ...r }]));

    return {
        async listResults(retrospectiveId) {
            return [...results.values()].filter((r) => r.retrospectiveId === retrospectiveId);
        },
        async saveResult(input: SaveSentimentInput) {
            const key = `${input.retrospectiveId}_${input.cardId}`;
            const existing = results.get(key);
            if (existing?.isOverride) return existing;
            if (existing && existing.contentHash === input.contentHash) return existing;

            const result: SentimentResult = {
                retrospectiveId: input.retrospectiveId,
                cardId: input.cardId,
                sentiment: input.sentiment,
                confidence: input.confidence,
                modelId: input.modelId ?? '',
                modelVersion: input.modelVersion ?? '',
                contentHash: input.contentHash,
                isOverride: false,
                overrideBy: null,
                timestamp: new Date(),
            };
            results.set(key, result);
            return result;
        },
        async saveOverride(retrospectiveId, cardId, sentiment: SentimentType, overrideBy) {
            const key = `${retrospectiveId}_${cardId}`;
            const result: SentimentResult = {
                retrospectiveId,
                cardId,
                sentiment,
                confidence: 1,
                modelId: results.get(key)?.modelId ?? '',
                modelVersion: results.get(key)?.modelVersion ?? '',
                contentHash: results.get(key)?.contentHash ?? '',
                isOverride: true,
                overrideBy,
                timestamp: new Date(),
            };
            results.set(key, result);
            return result;
        },
        async deleteResult(retrospectiveId, cardId) {
            results.delete(`${retrospectiveId}_${cardId}`);
        },
    };
}
