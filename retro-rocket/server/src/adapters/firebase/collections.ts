// Canonical Firestore collection names for the boards bounded context (server-side only).
// Replaces the two divergent frontend FIRESTORE_COLLECTIONS constants that existed before
// this refactor (research.md cross-cutting observation #1) — this is now the one source
// of truth, used exclusively by the Admin SDK adapters in this directory.

export const RETROSPECTIVES = 'retrospectives';
export const COLUMNS_SUBCOLLECTION = 'columns';
export const CARDS = 'cards';
export const GROUPS = 'groups';
export const PARTICIPANTS = 'participants';
export const COUNTDOWN_TIMERS = 'countdown_timers';
export const FACILITATOR_NOTES = 'facilitatorNotes';
export const ACTION_ITEMS = 'actionItems';
export const SENTIMENT_RESULTS = 'sentimentResults';
export const TYPING_STATUS = 'typingStatus';
export const USERS = 'users';
export const USER_BOARD_HISTORY = 'userBoardHistory';
