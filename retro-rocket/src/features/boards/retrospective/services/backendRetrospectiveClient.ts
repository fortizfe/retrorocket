/**
 * Client for the retrospective board screen's REST API (feature 019). The browser no
 * longer talks to Firestore for any operation on this screen (FR-001, FR-002): every
 * read/write goes through these session-cookie-authenticated /api/retrospectives/*,
 * /api/cards/*, /api/groups/*, /api/action-items/*, /api/notes/* endpoints instead.
 * Mirrors backendBoardsClient.ts's fetch conventions. Functions are added per user
 * story (US1-US7); every operation funnels through the shared request()/requestJson()
 * helpers below, so every one inherits the same loading/error surfacing by
 * construction (FR-006) — a 401 (session expired mid-action) surfaces uniformly
 * regardless of which operation triggered it.
 */

const RETROSPECTIVES = '/api/retrospectives';
const CARDS = '/api/cards';
const GROUPS = '/api/groups';
const ACTION_ITEMS = '/api/action-items';
const NOTES = '/api/notes';

// ---------------------------------------------------------------------------
// Client-facing types (Date fields) — mirror data-model.md / contracts/retrospective-api.yaml
// ---------------------------------------------------------------------------

export type ColumnGroupingCriteria = 'none' | 'user' | 'suggestions';
export interface ColumnGroupingStates {
    [columnId: string]: { criteria: ColumnGroupingCriteria; activeGroups: string[] };
}

export interface Column {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    order: number;
    defaultColor: string;
}

export interface Participant {
    id: string;
    name: string;
    userId: string;
    retrospectiveId: string;
    joinedAt: Date;
    photoURL: string | null;
}

export interface Like {
    userId: string;
    username: string;
    timestamp: Date;
}

export interface Reaction {
    userId: string;
    username: string;
    emoji: string;
    timestamp: Date;
}

export interface Card {
    id: string;
    content: string;
    column: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    retrospectiveId: string;
    color?: string;
    votes: number;
    likes: Like[];
    reactions: Reaction[];
    order: number;
    groupId?: string;
    isGroupHead?: boolean;
    groupOrder?: number;
}

export interface CardGroup {
    id: string;
    retrospectiveId: string;
    column: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    isCollapsed: boolean;
    createdAt: Date;
    createdBy: string;
    order: number;
}

export interface ActionItem {
    id: string;
    content: string;
    retrospectiveId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    assignedTo: string | null;
    assignedToName: string | null;
    dueDate: Date | null;
    order: number;
}

export interface CountdownTimer {
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

export interface FacilitatorNote {
    id: string;
    content: string;
    timestamp: Date;
    retrospectiveId: string;
    facilitatorId: string;
}

export type SentimentType = 'positive' | 'negative' | 'neutral';

export interface SentimentResult {
    retrospectiveId: string;
    cardId: string;
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash: string;
    isOverride: boolean;
    overrideBy: string | null;
    analyzedAt: Date;
}

export interface RetrospectiveState {
    id: string;
    title: string;
    description?: string;
    templateId?: string;
    createdBy: string;
    isFacilitator: boolean;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    columnGroupingStates: ColumnGroupingStates;
    columns: Column[];
    cards: Card[];
    groups: CardGroup[];
    actionItems: ActionItem[];
    participants: Participant[];
    timer: CountdownTimer | null;
    myFacilitatorNotes: FacilitatorNote[];
    sentimentResults: SentimentResult[];
}

// ---------------------------------------------------------------------------
// Wire DTOs (string timestamps) + fromDTO mappers
// ---------------------------------------------------------------------------

interface ParticipantDTO extends Omit<Participant, 'joinedAt'> {
    joinedAt: string;
}
function participantFromDTO(dto: ParticipantDTO): Participant {
    return { ...dto, joinedAt: new Date(dto.joinedAt) };
}

interface CardDTO extends Omit<Card, 'createdAt' | 'updatedAt' | 'likes' | 'reactions'> {
    createdAt: string;
    updatedAt: string;
    likes: Array<Omit<Like, 'timestamp'> & { timestamp: string }>;
    reactions: Array<Omit<Reaction, 'timestamp'> & { timestamp: string }>;
}
function cardFromDTO(dto: CardDTO): Card {
    return {
        ...dto,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
        likes: dto.likes.map((l) => ({ ...l, timestamp: new Date(l.timestamp) })),
        reactions: dto.reactions.map((r) => ({ ...r, timestamp: new Date(r.timestamp) })),
    };
}

interface CardGroupDTO extends Omit<CardGroup, 'createdAt'> {
    createdAt: string;
}
function cardGroupFromDTO(dto: CardGroupDTO): CardGroup {
    return { ...dto, createdAt: new Date(dto.createdAt) };
}

interface ActionItemDTO extends Omit<ActionItem, 'createdAt' | 'updatedAt' | 'dueDate'> {
    createdAt: string;
    updatedAt: string;
    dueDate: string | null;
}
function actionItemFromDTO(dto: ActionItemDTO): ActionItem {
    return { ...dto, createdAt: new Date(dto.createdAt), updatedAt: new Date(dto.updatedAt), dueDate: dto.dueDate ? new Date(dto.dueDate) : null };
}

interface CountdownTimerDTO extends Omit<CountdownTimer, 'startTime' | 'endTime' | 'createdAt' | 'updatedAt'> {
    startTime: string | null;
    endTime: string | null;
    createdAt: string;
    updatedAt: string;
}
function timerFromDTO(dto: CountdownTimerDTO | null): CountdownTimer | null {
    if (!dto) return null;
    return {
        ...dto,
        startTime: dto.startTime ? new Date(dto.startTime) : null,
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    };
}

interface FacilitatorNoteDTO extends Omit<FacilitatorNote, 'timestamp'> {
    timestamp: string;
}
function noteFromDTO(dto: FacilitatorNoteDTO): FacilitatorNote {
    return { ...dto, timestamp: new Date(dto.timestamp) };
}

interface SentimentResultDTO extends Omit<SentimentResult, 'analyzedAt'> {
    analyzedAt: string;
}
function sentimentResultFromDTO(dto: SentimentResultDTO): SentimentResult {
    return { ...dto, analyzedAt: new Date(dto.analyzedAt) };
}

interface RetrospectiveStateDTO extends Omit<RetrospectiveState, 'createdAt' | 'updatedAt' | 'cards' | 'groups' | 'actionItems' | 'participants' | 'timer' | 'myFacilitatorNotes' | 'sentimentResults'> {
    createdAt: string;
    updatedAt: string;
    cards: CardDTO[];
    groups: CardGroupDTO[];
    actionItems: ActionItemDTO[];
    participants: ParticipantDTO[];
    timer: CountdownTimerDTO | null;
    myFacilitatorNotes: FacilitatorNoteDTO[];
    sentimentResults: SentimentResultDTO[];
}
function boardStateFromDTO(dto: RetrospectiveStateDTO): RetrospectiveState {
    return {
        ...dto,
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
        cards: dto.cards.map(cardFromDTO),
        groups: dto.groups.map(cardGroupFromDTO),
        actionItems: dto.actionItems.map(actionItemFromDTO),
        participants: dto.participants.map(participantFromDTO),
        timer: timerFromDTO(dto.timer),
        myFacilitatorNotes: dto.myFacilitatorNotes.map(noteFromDTO),
        sentimentResults: dto.sentimentResults.map(sentimentResultFromDTO),
    };
}

// ---------------------------------------------------------------------------
// Shared request core
// ---------------------------------------------------------------------------

/**
 * Extracts the backend's error message from the { error: { code, message } } envelope
 * (errorHandler.ts) when present, so callers keep seeing the same specific messages
 * the previous direct-Firestore code surfaced — a generic "request failed" would be a
 * UX regression from today's behavior.
 */
async function errorMessageOf(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string } };
        return body.error?.message ?? fallback;
    } catch {
        return fallback;
    }
}

/** Carries the HTTP status alongside the backend's own error message, so callers can
 * branch on it (e.g. useRetrospectiveRealtimeSync's "board no longer exists" state on
 * a 404) without parsing message text. */
export class BackendRequestError extends Error {
    constructor(
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = 'BackendRequestError';
    }
}

/**
 * Shared fetch wrapper: same-origin credentialed request, JSON body when provided,
 * throws the backend's own error message on a non-OK response (incl. a 401 from a
 * session expiring mid-action), parses a JSON response body when present, and
 * resolves to undefined for a body-less 204. This is the single mechanism every
 * operation in this feature funnels through for FR-006's loading/error handling.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, { ...init, credentials: 'include' });
    if (!res.ok) {
        throw new BackendRequestError(await errorMessageOf(res, `Request failed: ${res.status}`), res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

function requestJson<T>(path: string, method: string, body?: unknown): Promise<T> {
    return request<T>(path, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

// ---------------------------------------------------------------------------
// US1: board load + join
// ---------------------------------------------------------------------------

/** GET /api/retrospectives/:id — the board's complete current state (FR-004). */
export async function getBoardState(retrospectiveId: string): Promise<RetrospectiveState> {
    const dto = await request<RetrospectiveStateDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}`);
    return boardStateFromDTO(dto);
}

/** POST /api/retrospectives/:id/join — idempotent (FR-005). */
export async function joinBoard(retrospectiveId: string): Promise<Participant> {
    const dto = await requestJson<ParticipantDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/join`, 'POST');
    return participantFromDTO(dto);
}

// ---------------------------------------------------------------------------
// US2: card lifecycle + interactions
// ---------------------------------------------------------------------------

export interface CreateCardParams {
    content: string;
    column: string;
    color?: string;
}

/** POST /api/retrospectives/:id/cards (FR-007). */
export async function createCard(retrospectiveId: string, params: CreateCardParams): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/cards`, 'POST', params);
    return cardFromDTO(dto);
}

export interface EditCardParams {
    content?: string;
    color?: string;
}

/** PATCH /api/cards/:id (owner only) (FR-007, FR-020). */
export async function editCard(cardId: string, params: EditCardParams): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${CARDS}/${encodeURIComponent(cardId)}`, 'PATCH', params);
    return cardFromDTO(dto);
}

/** DELETE /api/cards/:id (owner only) (FR-007, FR-020). */
export async function deleteCard(cardId: string): Promise<void> {
    await requestJson<void>(`${CARDS}/${encodeURIComponent(cardId)}`, 'DELETE');
}

/** POST /api/cards/:id/vote — atomic, no lost updates under concurrency (FR-008). */
export async function voteCard(cardId: string, increment = true): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${CARDS}/${encodeURIComponent(cardId)}/vote`, 'POST', { increment });
    return cardFromDTO(dto);
}

/** POST /api/cards/:id/like — toggles the caller's like (FR-009). */
export async function toggleLike(cardId: string): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${CARDS}/${encodeURIComponent(cardId)}/like`, 'POST');
    return cardFromDTO(dto);
}

/** PUT /api/cards/:id/reaction — set/change the caller's emoji reaction (FR-009). */
export async function setReaction(cardId: string, emoji: string): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${CARDS}/${encodeURIComponent(cardId)}/reaction`, 'PUT', { emoji });
    return cardFromDTO(dto);
}

/** DELETE /api/cards/:id/reaction — remove the caller's emoji reaction (FR-009). */
export async function removeReaction(cardId: string): Promise<Card> {
    const dto = await requestJson<CardDTO>(`${CARDS}/${encodeURIComponent(cardId)}/reaction`, 'DELETE');
    return cardFromDTO(dto);
}

// ---------------------------------------------------------------------------
// US3: typing status
// ---------------------------------------------------------------------------

/** POST /api/retrospectives/:id/typing — records the caller's typing signal (FR-017). */
export async function setTypingStatus(retrospectiveId: string, column: string, isActive: boolean): Promise<void> {
    await requestJson<void>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/typing`, 'POST', { column, isActive });
}

// ---------------------------------------------------------------------------
// US4: reorder + grouping
// ---------------------------------------------------------------------------

export interface ReorderUpdate {
    cardId: string;
    order: number;
    column?: string;
}

/** POST /api/retrospectives/:id/cards/reorder — atomic, all-or-nothing (FR-010). */
export async function reorderCards(retrospectiveId: string, updates: ReorderUpdate[]): Promise<void> {
    await requestJson<void>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/cards/reorder`, 'POST', { updates });
}

export interface CreateCardGroupParams {
    headCardId: string;
    memberCardIds: string[];
    title?: string;
}

/** POST /api/retrospectives/:id/groups (FR-011). */
export async function createCardGroup(retrospectiveId: string, params: CreateCardGroupParams): Promise<CardGroup> {
    const dto = await requestJson<CardGroupDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/groups`, 'POST', params);
    return cardGroupFromDTO(dto);
}

/** PATCH /api/groups/:id — collapse display state (FR-011). */
export async function setGroupCollapse(groupId: string, isCollapsed: boolean): Promise<CardGroup> {
    const dto = await requestJson<CardGroupDTO>(`${GROUPS}/${encodeURIComponent(groupId)}`, 'PATCH', { isCollapsed });
    return cardGroupFromDTO(dto);
}

/** DELETE /api/groups/:id — disband (FR-011). */
export async function disbandCardGroup(groupId: string): Promise<void> {
    await requestJson<void>(`${GROUPS}/${encodeURIComponent(groupId)}`, 'DELETE');
}

/** POST /api/groups/:id/cards (FR-011). */
export async function addCardToGroup(groupId: string, cardId: string): Promise<CardGroup> {
    const dto = await requestJson<CardGroupDTO>(`${GROUPS}/${encodeURIComponent(groupId)}/cards`, 'POST', { cardId });
    return cardGroupFromDTO(dto);
}

/** DELETE /api/groups/:id/cards/:cardId — promotes a new head or disbands (returns null) (FR-011). */
export async function removeCardFromGroup(groupId: string, cardId: string): Promise<CardGroup | null> {
    const dto = await requestJson<CardGroupDTO | undefined>(`${GROUPS}/${encodeURIComponent(groupId)}/cards/${encodeURIComponent(cardId)}`, 'DELETE');
    return dto ? cardGroupFromDTO(dto) : null;
}

/** PATCH /api/retrospectives/:id/column-grouping (FR-011). */
export async function saveColumnGroupingState(retrospectiveId: string, states: ColumnGroupingStates): Promise<void> {
    await requestJson<void>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/column-grouping`, 'PATCH', states);
}

/** PUT /api/retrospectives/:id/timer — facilitator-only (FR-014). */
export async function configureTimer(retrospectiveId: string, duration: number): Promise<CountdownTimer> {
    const dto = await requestJson<CountdownTimerDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/timer`, 'PUT', { duration });
    return timerFromDTO(dto) as CountdownTimer;
}

/** POST /api/retrospectives/:id/timer/start — facilitator-only (FR-014). */
export async function startTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const dto = await requestJson<CountdownTimerDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/timer/start`, 'POST');
    return timerFromDTO(dto) as CountdownTimer;
}

/** POST /api/retrospectives/:id/timer/pause — facilitator-only (FR-014). */
export async function pauseTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const dto = await requestJson<CountdownTimerDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/timer/pause`, 'POST');
    return timerFromDTO(dto) as CountdownTimer;
}

/** POST /api/retrospectives/:id/timer/reset — facilitator-only (FR-014). */
export async function resetTimer(retrospectiveId: string): Promise<CountdownTimer> {
    const dto = await requestJson<CountdownTimerDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/timer/reset`, 'POST');
    return timerFromDTO(dto) as CountdownTimer;
}

/** DELETE /api/retrospectives/:id/timer — facilitator-only (FR-014). */
export async function deleteTimer(retrospectiveId: string): Promise<void> {
    await requestJson<void>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/timer`, 'DELETE');
}

/** POST /api/retrospectives/:id/notes — private to the caller (FR-013). */
export async function createNote(retrospectiveId: string, content: string): Promise<FacilitatorNote> {
    const dto = await requestJson<FacilitatorNoteDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/notes`, 'POST', { content });
    return noteFromDTO(dto);
}

/** PATCH /api/notes/:id — author-only (FR-013). */
export async function editNote(noteId: string, content: string): Promise<FacilitatorNote> {
    const dto = await requestJson<FacilitatorNoteDTO>(`${NOTES}/${encodeURIComponent(noteId)}`, 'PATCH', { content });
    return noteFromDTO(dto);
}

/** DELETE /api/notes/:id — author-only (FR-013). */
export async function deleteNote(noteId: string): Promise<void> {
    await requestJson<void>(`${NOTES}/${encodeURIComponent(noteId)}`, 'DELETE');
}

export interface ConvertCardToActionItemParams {
    assignedTo?: string;
    assignedToName?: string;
    dueDate?: Date | null;
}

/** POST /api/cards/:id/convert-to-action-item — facilitator-only (FR-015). The card's
 * content is read server-side; the source card is left untouched. */
export async function convertCardToActionItem(cardId: string, params: ConvertCardToActionItemParams = {}): Promise<ActionItem> {
    const dto = await requestJson<ActionItemDTO>(`${CARDS}/${encodeURIComponent(cardId)}/convert-to-action-item`, 'POST', {
        assignedTo: params.assignedTo,
        assignedToName: params.assignedToName,
        dueDate: params.dueDate ? params.dueDate.toISOString() : undefined,
    });
    return actionItemFromDTO(dto);
}

export interface CreateActionItemParams {
    content: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** POST /api/retrospectives/:id/action-items — any participant, direct create,
 * independent of card conversion (FR-015). */
export async function createActionItem(retrospectiveId: string, params: CreateActionItemParams): Promise<ActionItem> {
    const dto = await requestJson<ActionItemDTO>(`${RETROSPECTIVES}/${encodeURIComponent(retrospectiveId)}/action-items`, 'POST', {
        content: params.content,
        assignedTo: params.assignedTo,
        assignedToName: params.assignedToName,
        dueDate: params.dueDate ? params.dueDate.toISOString() : undefined,
    });
    return actionItemFromDTO(dto);
}

export interface EditActionItemParams {
    content?: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** PATCH /api/action-items/:id — any participant (FR-015). */
export async function editActionItem(actionItemId: string, params: EditActionItemParams): Promise<ActionItem> {
    const dto = await requestJson<ActionItemDTO>(`${ACTION_ITEMS}/${encodeURIComponent(actionItemId)}`, 'PATCH', {
        content: params.content,
        assignedTo: params.assignedTo,
        assignedToName: params.assignedToName,
        dueDate: params.dueDate === undefined ? undefined : params.dueDate ? params.dueDate.toISOString() : null,
    });
    return actionItemFromDTO(dto);
}

/** DELETE /api/action-items/:id — any participant (FR-015). */
export async function deleteActionItem(actionItemId: string): Promise<void> {
    await requestJson<void>(`${ACTION_ITEMS}/${encodeURIComponent(actionItemId)}`, 'DELETE');
}

export interface SaveSentimentResultParams {
    sentiment: SentimentType;
    confidence: number;
    modelId?: string;
    modelVersion?: string;
    contentHash: string;
}

/** PUT /api/cards/:id/sentiment — any participant. */
export async function saveSentimentResult(cardId: string, params: SaveSentimentResultParams): Promise<SentimentResult> {
    const dto = await requestJson<SentimentResultDTO>(`${CARDS}/${encodeURIComponent(cardId)}/sentiment`, 'PUT', params);
    return sentimentResultFromDTO(dto);
}

/** PUT /api/cards/:id/sentiment/override — facilitator-only. */
export async function saveSentimentOverride(cardId: string, sentiment: SentimentType): Promise<SentimentResult> {
    const dto = await requestJson<SentimentResultDTO>(`${CARDS}/${encodeURIComponent(cardId)}/sentiment/override`, 'PUT', { sentiment });
    return sentimentResultFromDTO(dto);
}
