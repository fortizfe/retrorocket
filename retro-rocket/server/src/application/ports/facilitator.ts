// Ports for facilitator-only tools (countdown timer, private notes, action items) and
// sentiment persistence — User Story 3 (contracts/facilitator-tools-api.md, data-model.md).

export interface CountdownTimer {
    id: string;
    retrospectiveId: string;
    duration: number;
    originalDuration: number;
    startTime: Date | null;
    endTime: Date | null;
    isRunning: boolean;
    isPaused: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CountdownPort {
    getTimer(retrospectiveId: string): Promise<CountdownTimer | null>;
    createOrUpdateTimer(retrospectiveId: string, duration: number, createdBy: string): Promise<CountdownTimer>;
    startTimer(retrospectiveId: string): Promise<CountdownTimer>;
    pauseTimer(retrospectiveId: string): Promise<CountdownTimer>;
    resetTimer(retrospectiveId: string): Promise<CountdownTimer>;
    deleteTimer(retrospectiveId: string): Promise<void>;
}

export interface FacilitatorNote {
    id: string;
    retrospectiveId: string;
    facilitatorId: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface FacilitatorNotesPort {
    listNotes(retrospectiveId: string, facilitatorId: string): Promise<FacilitatorNote[]>;
    getNote(noteId: string): Promise<FacilitatorNote | null>;
    createNote(retrospectiveId: string, facilitatorId: string, content: string): Promise<FacilitatorNote>;
    updateNote(noteId: string, content: string): Promise<FacilitatorNote>;
    deleteNote(noteId: string): Promise<void>;
}

export interface ActionItem {
    id: string;
    retrospectiveId: string;
    content: string;
    createdBy: string;
    assignedTo: string | null;
    assignedToName: string | null;
    dueDate: Date | null;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateActionItemInput {
    retrospectiveId: string;
    content: string;
    createdBy: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

export interface UpdateActionItemInput {
    content?: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
    order?: number;
}

export interface ActionItemPort {
    listActionItems(retrospectiveId: string): Promise<ActionItem[]>;
    getActionItem(actionItemId: string): Promise<ActionItem | null>;
    createActionItem(input: CreateActionItemInput): Promise<ActionItem>;
    updateActionItem(actionItemId: string, updates: UpdateActionItemInput): Promise<ActionItem>;
    deleteActionItem(actionItemId: string): Promise<void>;
}

export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
    retrospectiveId: string;
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId: string;
    modelVersion: string;
    contentHash: string;
    isOverride: boolean;
    overrideBy: string | null;
    timestamp: Date;
}

export interface SaveSentimentInput {
    retrospectiveId: string;
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    contentHash: string;
    modelId?: string;
    modelVersion?: string;
}

export interface SentimentPort {
    listResults(retrospectiveId: string): Promise<SentimentResult[]>;
    /** Upserts — matches today's saveResultWithHash semantics (only overwrites if contentHash differs). */
    saveResult(input: SaveSentimentInput): Promise<SentimentResult>;
    saveOverride(retrospectiveId: string, cardId: string, sentiment: SentimentType, overrideBy: string): Promise<SentimentResult>;
    deleteResult(retrospectiveId: string, cardId: string): Promise<void>;
}
