// ---------------------------------------------------------------------------
// TypingStatusPort — write access for the short-lived typing-status signal
// (feature 019). Deterministic doc id `{retroId}_{userId}_{column}`; server
// enforces the 5000ms hard TTL independently of the client's 300ms debounce
// (data-model.md, matching OptimizedTypingStatusService's exact constants).
// ---------------------------------------------------------------------------

export interface TypingStatusDTO {
    id: string;
    userId: string;
    username: string;
    retrospectiveId: string;
    column: string;
    timestamp: Date;
}

export interface TypingStatusPort {
    /** isActive:true writes the doc; isActive:false deletes it (never sets isActive:false). */
    setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void>;
    listActive(retrospectiveId: string): Promise<TypingStatusDTO[]>;
}
