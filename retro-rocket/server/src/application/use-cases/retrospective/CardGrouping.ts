import type { CardGroupDTO, CardGroupPort, CardPort, ColumnOrderItem, GroupOrigin, MoveCardResult, MoveTarget } from '../../ports/cards';
import type { ColumnGroupingStates, RetrospectiveBoardPort } from '../../ports/retrospective';
import { AppError, NotFoundError } from '../../../domain/errors';

export interface CreateCardGroupParams {
    retrospectiveId: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    /** Defaults to 'suggestion' (spec 059 C1) so the suggestion-accept client needs no change. */
    origin?: GroupOrigin;
    createdBy: string;
}

/** Spec 059 P1/C3: caps shared by group creation and column renormalisation. */
const MAX_GROUP_MEMBERS = 50;
const MAX_GROUP_TITLE_LENGTH = 60;
const MAX_COLUMN_ORDER_ITEMS = 500;

function invalidRequest(message: string): AppError {
    return new AppError('invalid_request', message, 400);
}

/**
 * Trims a title and enforces the 60-character cap (spec 059 P6/C3). Returns the trimmed value, or
 * `null` when it is empty (meaning "no title"). Throws 400 for a non-string or over-long title.
 */
function normalizeTitle(title: unknown): string | null {
    if (title === null) return null;
    if (typeof title !== 'string') throw invalidRequest('title must be a string or null');
    const trimmed = title.trim();
    if (trimmed.length > MAX_GROUP_TITLE_LENGTH) throw invalidRequest(`title must be at most ${MAX_GROUP_TITLE_LENGTH} characters`);
    return trimmed === '' ? null : trimmed;
}

/** POST /api/retrospectives/:id/groups — FR-011. A group's `column` is always derived
 * from its head card's actual column (spec 046, FR-003) — never accepted from the
 * caller — so it can never drift from where its member cards actually live.
 * Spec 059 C1: 1-50 distinct members that exclude the head (P1), a valid `origin`
 * (default 'suggestion'), and a trimmed title of at most 60 characters, omitted when empty (P6). */
export async function createCardGroup(deps: { cardGroupPort: CardGroupPort; cardPort: CardPort }, params: CreateCardGroupParams): Promise<CardGroupDTO> {
    const { memberCardIds } = params;
    if (memberCardIds.length === 0) {
        throw invalidRequest('At least one member card is required to create a group');
    }
    if (memberCardIds.length > MAX_GROUP_MEMBERS) {
        throw invalidRequest(`A group can have at most ${MAX_GROUP_MEMBERS} member cards`);
    }
    if (new Set(memberCardIds).size !== memberCardIds.length) {
        throw invalidRequest('memberCardIds must not contain duplicates');
    }
    if (memberCardIds.includes(params.headCardId)) {
        throw invalidRequest('memberCardIds must not contain the head card');
    }
    const origin = params.origin ?? 'suggestion';
    if (origin !== 'manual' && origin !== 'suggestion') {
        throw invalidRequest("origin must be 'manual' or 'suggestion'");
    }
    const title = params.title === undefined ? null : normalizeTitle(params.title);

    const headCard = await deps.cardPort.getCard(params.headCardId);
    if (!headCard) {
        throw new NotFoundError('Card not found');
    }
    const { title: _rawTitle, ...rest } = params;
    void _rawTitle;
    return deps.cardGroupPort.createGroup({ ...rest, ...(title !== null ? { title } : {}), origin, column: headCard.column });
}

export interface DisbandCardGroupParams {
    groupId: string;
}

/** DELETE /api/groups/:id — FR-011. */
export async function disbandCardGroup(deps: { cardGroupPort: CardGroupPort }, params: DisbandCardGroupParams): Promise<void> {
    await deps.cardGroupPort.disbandGroup(params.groupId);
}

export interface AddCardToGroupParams {
    groupId: string;
    cardId: string;
}

/** POST /api/groups/:id/cards — FR-011. */
export async function addCardToGroup(deps: { cardGroupPort: CardGroupPort }, params: AddCardToGroupParams): Promise<CardGroupDTO> {
    return deps.cardGroupPort.addCardToGroup(params.groupId, params.cardId);
}

export interface RemoveCardFromGroupParams {
    groupId: string;
    cardId: string;
}

/** DELETE /api/groups/:id/cards/:cardId — promotes a new head or disbands if empty (FR-011). */
export async function removeCardFromGroup(deps: { cardGroupPort: CardGroupPort }, params: RemoveCardFromGroupParams): Promise<CardGroupDTO | null> {
    return deps.cardGroupPort.removeCardFromGroup(params.groupId, params.cardId);
}

export interface SetGroupCollapseParams {
    groupId: string;
    isCollapsed: boolean;
}

/** PATCH /api/groups/:id — FR-011. */
export async function setGroupCollapse(deps: { cardGroupPort: CardGroupPort }, params: SetGroupCollapseParams): Promise<CardGroupDTO> {
    return deps.cardGroupPort.setGroupCollapse(params.groupId, params.isCollapsed);
}

export interface UpdateCardGroupParams {
    groupId: string;
    isCollapsed?: boolean;
    /** A string is trimmed; empty/whitespace/null deletes the stored title. */
    title?: string | null;
}

/**
 * PATCH /api/groups/:id — spec 059 C3. A field is applied only if present (a missing `isCollapsed`
 * is no longer coerced to false); an empty update or a wrong type is a 400.
 */
export async function updateCardGroup(deps: { cardGroupPort: CardGroupPort }, params: UpdateCardGroupParams): Promise<CardGroupDTO> {
    const { groupId, isCollapsed, title } = params;
    if (isCollapsed === undefined && title === undefined) throw invalidRequest('Provide isCollapsed and/or title');
    if (isCollapsed !== undefined && typeof isCollapsed !== 'boolean') throw invalidRequest('isCollapsed must be a boolean');
    const normalizedTitle = title === undefined ? undefined : normalizeTitle(title);

    let updated: CardGroupDTO | undefined;
    if (normalizedTitle !== undefined) updated = await deps.cardGroupPort.setGroupTitle(groupId, normalizedTitle);
    if (isCollapsed !== undefined) updated = await deps.cardGroupPort.setGroupCollapse(groupId, isCollapsed);
    return updated!;
}

export interface MoveCardParams {
    retrospectiveId: string;
    cardId: string;
    target: MoveTarget;
}

/** Validates the M1 shape of a move target; `unknown` because it comes straight from a request body. */
function assertValidMoveTarget(target: unknown, cardId: string): asserts target is MoveTarget {
    const t = target as { kind?: unknown; order?: unknown; cardId?: unknown; groupId?: unknown } | null | undefined;
    if (!t || typeof t !== 'object') throw invalidRequest('target is required');
    switch (t.kind) {
        case 'position':
            if (typeof t.order !== 'number' || !Number.isFinite(t.order)) throw invalidRequest('target.order must be a finite number');
            return;
        case 'card':
            if (typeof t.cardId !== 'string' || t.cardId === '') throw invalidRequest('target.cardId is required');
            if (t.cardId === cardId) throw invalidRequest('A card cannot be grouped with itself');
            return;
        case 'group':
            if (typeof t.groupId !== 'string' || t.groupId === '') throw invalidRequest('target.groupId is required');
            return;
        default:
            throw invalidRequest("target.kind must be 'position', 'card' or 'group'");
    }
}

/**
 * POST /api/retrospectives/:id/cards/:cardId/move — spec 059 C0. Validates the target shape (M1);
 * the port performs the single atomic transition and raises M2-M7.
 */
export async function moveCard(deps: { cardGroupPort: CardGroupPort }, params: MoveCardParams): Promise<MoveCardResult> {
    assertValidMoveTarget(params.target, params.cardId);
    return deps.cardGroupPort.moveCard(params.retrospectiveId, params.cardId, params.target);
}

export interface RenormalizeColumnOrderParams {
    retrospectiveId: string;
    columnId: string;
    items: ColumnOrderItem[];
}

/** POST /api/retrospectives/:id/column-order — spec 059 C4. Validates R1; the port raises R2/R3. */
export async function renormalizeColumnOrder(deps: { cardGroupPort: CardGroupPort }, params: RenormalizeColumnOrderParams): Promise<void> {
    const { retrospectiveId, columnId, items } = params;
    if (typeof columnId !== 'string' || columnId === '') throw invalidRequest('columnId is required');
    if (!Array.isArray(items) || items.length < 1 || items.length > MAX_COLUMN_ORDER_ITEMS) {
        throw invalidRequest(`items must contain between 1 and ${MAX_COLUMN_ORDER_ITEMS} entries`);
    }
    const seen = new Set<string>();
    for (const item of items as Array<Partial<ColumnOrderItem> | null>) {
        if (!item || (item.kind !== 'card' && item.kind !== 'group') || typeof item.id !== 'string' || item.id === '') {
            throw invalidRequest('Each item needs a kind (card|group) and an id');
        }
        if (typeof item.order !== 'number' || !Number.isFinite(item.order)) throw invalidRequest('Each item order must be a finite number');
        const key = `${item.kind}:${item.id}`;
        if (seen.has(key)) throw invalidRequest('items must not contain duplicates');
        seen.add(key);
    }
    await deps.cardGroupPort.renormalizeColumnOrder(retrospectiveId, columnId, items);
}

export interface SaveColumnGroupingStateParams {
    retrospectiveId: string;
    states: ColumnGroupingStates;
}

/** PATCH /api/retrospectives/:id/column-grouping — FR-011. */
export async function saveColumnGroupingState(deps: { retrospectiveBoardPort: RetrospectiveBoardPort }, params: SaveColumnGroupingStateParams): Promise<void> {
    await deps.retrospectiveBoardPort.saveColumnGroupingState(params.retrospectiveId, params.states);
}
