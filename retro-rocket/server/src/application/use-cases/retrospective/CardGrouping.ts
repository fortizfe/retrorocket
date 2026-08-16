import type { CardGroupDTO, CardGroupPort, CardPort } from '../../ports/cards';
import type { ColumnGroupingStates, RetrospectiveBoardPort } from '../../ports/retrospective';
import { AppError, NotFoundError } from '../../../domain/errors';

export interface CreateCardGroupParams {
    retrospectiveId: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    createdBy: string;
}

/** POST /api/retrospectives/:id/groups — FR-011. A group's `column` is always derived
 * from its head card's actual column (spec 046, FR-003) — never accepted from the
 * caller — so it can never drift from where its member cards actually live. */
export async function createCardGroup(deps: { cardGroupPort: CardGroupPort; cardPort: CardPort }, params: CreateCardGroupParams): Promise<CardGroupDTO> {
    if (params.memberCardIds.length === 0) {
        throw new AppError('invalid_request', 'At least one member card is required to create a group', 400);
    }
    const headCard = await deps.cardPort.getCard(params.headCardId);
    if (!headCard) {
        throw new NotFoundError('Card not found');
    }
    return deps.cardGroupPort.createGroup({ ...params, column: headCard.column });
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
