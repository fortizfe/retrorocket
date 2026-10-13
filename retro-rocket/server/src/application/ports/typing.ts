// ---------------------------------------------------------------------------
// TypingStatusPort — write access for the short-lived typing-status signal
// (feature 019). Deterministic doc id `{retroId}_{userId}_{column}`; server
// enforces a 3000ms hard TTL (feature 026) as a backstop for a disconnected
// participant's indicator — the client itself writes isActive:false immediately
// on any explicit stop, or after its own 3-second inactivity timeout.
//
// 058, CI triage: the TTL sweep alone is timing-dependent (an event-driven
// setTimeout scheduled from the last observed write) — comfortably inside its
// budget on a normal machine, but with no safety margin against a loaded CI
// runner delaying that timer. The WebSocket upgrade handler
// (realtimeUpgrade.ts) already learns about a disconnect synchronously via
// `ws.on('close')` and already knows the connection's uid — clearAllForUser
// lets it clear that uid's typing status immediately on disconnect as a fast
// path, so clearing a disconnected participant's indicator no longer depends
// on the sweep timer firing promptly. The sweep remains the backstop for every
// other disconnect path (network drop, tab crash) that never reaches a clean
// WebSocket close.
// ---------------------------------------------------------------------------

export interface TypingStatusPort {
    /** isActive:true writes the doc; isActive:false deletes it (never sets isActive:false). */
    setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void>;

    /** Deletes every typingStatus doc for this user on this board, regardless of
     * column — template-agnostic (board templates have different column sets,
     * domain/boards/templates.ts), unlike enumerating a fixed column list. */
    clearAllForUser(retrospectiveId: string, userId: string): Promise<void>;
}
