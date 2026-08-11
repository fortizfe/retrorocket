// ---------------------------------------------------------------------------
// TypingStatusPort — write access for the short-lived typing-status signal
// (feature 019). Deterministic doc id `{retroId}_{userId}_{column}`; server
// enforces a 3000ms hard TTL (feature 026) as the sole backstop for a
// disconnected participant's indicator — the client itself writes isActive:false
// immediately on any explicit stop, or after its own 3-second inactivity timeout.
// ---------------------------------------------------------------------------

export interface TypingStatusPort {
    /** isActive:true writes the doc; isActive:false deletes it (never sets isActive:false). */
    setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void>;
}
