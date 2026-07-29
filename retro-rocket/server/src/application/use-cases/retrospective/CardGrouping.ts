import type { CardGroupDTO, CardGroupPort } from '../../ports/cards';
import type { ColumnGroupingStates, RetrospectiveBoardPort } from '../../ports/retrospective';
import { AppError } from '../../../domain/errors';

export interface CreateCardGroupParams {
    retrospectiveId: string;
    column: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    createdBy: string;
}

/** POST /api/retrospectives/:id/groups — FR-011. */
export async function createCardGroup(deps: { cardGroupPort: CardGroupPort }, params: CreateCardGroupParams): Promise<CardGroupDTO> {
    if (params.memberCardIds.length === 0) {
        throw new AppError('invalid_request', 'At least one member card is required to create a group', 400);
    }
    return deps.cardGroupPort.createGroup(params);
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

export interface SaveColumnGroupingStateParams {
    retrospectiveId: string;
    states: ColumnGroupingStates;
}

/** PATCH /api/retrospectives/:id/column-grouping — FR-011. */
export async function saveColumnGroupingState(deps: { retrospectiveBoardPort: RetrospectiveBoardPort }, params: SaveColumnGroupingStateParams): Promise<void> {
    await deps.retrospectiveBoardPort.saveColumnGroupingState(params.retrospectiveId, params.states);
}
