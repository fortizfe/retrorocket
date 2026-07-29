// ---------------------------------------------------------------------------
// RetrospectiveBoardPort + ParticipantPort — read/write Firestore access for the
// retrospective board screen (feature 019). Deliberately separate from
// RetrospectiveReadPort (application/ports/mcp.ts), which stays read-only by
// explicit design for the MCP connector (015 FR-013) — this feature adds
// sibling write-capable ports rather than widening that one (research.md §6).
// ---------------------------------------------------------------------------

export type ColumnGroupingCriteria = 'none' | 'user' | 'suggestions';

export interface ColumnGroupingStates {
    [columnId: string]: { criteria: ColumnGroupingCriteria; activeGroups: string[] };
}

export interface RetrospectiveDTO {
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

export interface ColumnDTO {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    order: number;
    defaultColor: string;
}

export interface ParticipantDTO {
    id: string;
    name: string;
    userId: string;
    retrospectiveId: string;
    joinedAt: Date;
    photoURL: string | null;
    isActive: boolean;
}

export interface CountdownTimerDTO {
    retrospectiveId: string;
    startTime: Date | null;
    duration: number;
    originalDuration: number;
    isRunning: boolean;
    isPaused: boolean;
    endTime: Date | null;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

/** Board metadata, columns, column-grouping display preference, and the shared timer. */
export interface RetrospectiveBoardPort {
    getRetrospective(id: string): Promise<RetrospectiveDTO | null>;
    listColumns(retrospectiveId: string): Promise<ColumnDTO[]>;
    /** Throws NotFoundError if the board doesn't exist. */
    saveColumnGroupingState(retrospectiveId: string, states: ColumnGroupingStates): Promise<void>;

    getTimer(retrospectiveId: string): Promise<CountdownTimerDTO | null>;
    /** Create/reconfigure the timer. Throws ForbiddenError if uid isn't the facilitator. */
    configureTimer(retrospectiveId: string, uid: string, duration: number): Promise<CountdownTimerDTO>;
    /** Throws ForbiddenError if uid isn't the facilitator; NotFoundError if no timer exists. */
    startTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO>;
    pauseTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO>;
    resetTimer(retrospectiveId: string, uid: string): Promise<CountdownTimerDTO>;
    deleteTimer(retrospectiveId: string, uid: string): Promise<void>;
}

/** The `participants` collection's write side — 015's FirestoreRetrospectiveReadAdapter reads only. */
export interface ParticipantPort {
    listParticipants(retrospectiveId: string): Promise<ParticipantDTO[]>;
    /** Idempotent: no duplicate participant record if uid already joined (FR-005). */
    join(retrospectiveId: string, uid: string, userName: string, photoURL: string | null): Promise<ParticipantDTO>;
}
