import type { ActionItemDTO, ActionItemPort } from '../../ports/actionItems';
import type { CardDTO, CardGroupDTO, CardGroupPort, CardPort } from '../../ports/cards';
import type { FacilitatorNoteDTO, FacilitatorNotePort } from '../../ports/facilitatorNotes';
import type { ColumnDTO, CountdownTimerDTO, ParticipantDTO, ParticipantPort, RetrospectiveBoardPort, RetrospectiveDTO } from '../../ports/retrospective';
import type { SentimentResultDTO, SentimentResultPort } from '../../ports/sentiment';
import { NotFoundError } from '../../../domain/errors';

export interface GetBoardStateDeps {
    retrospectiveBoardPort: RetrospectiveBoardPort;
    participantPort: ParticipantPort;
    cardPort: CardPort;
    cardGroupPort: CardGroupPort;
    actionItemPort: ActionItemPort;
    facilitatorNotePort: FacilitatorNotePort;
    sentimentResultPort: SentimentResultPort;
}

export interface GetBoardStateParams {
    retrospectiveId: string;
    uid: string;
}

export interface RetrospectiveStateResult extends RetrospectiveDTO {
    isFacilitator: boolean;
    columns: ColumnDTO[];
    cards: CardDTO[];
    groups: CardGroupDTO[];
    actionItems: ActionItemDTO[];
    participants: ParticipantDTO[];
    timer: CountdownTimerDTO | null;
    myFacilitatorNotes: FacilitatorNoteDTO[];
    sentimentResults: SentimentResultDTO[];
}

/**
 * GET /api/retrospectives/:id (session-cookie-authenticated). Assembles the board's
 * complete current state in one response (FR-004) instead of N separate requests —
 * columns, cards, groups, action items, participants, timer, the caller's own
 * facilitator notes (never another facilitator's, FR-013), and sentiment results.
 */
export async function getBoardState(deps: GetBoardStateDeps, params: GetBoardStateParams): Promise<RetrospectiveStateResult> {
    const board = await deps.retrospectiveBoardPort.getRetrospective(params.retrospectiveId);
    if (!board) {
        throw new NotFoundError('El tablero especificado no existe o no está disponible');
    }

    const isFacilitator = board.createdBy === params.uid;

    const [columns, cards, rawGroups, actionItems, participants, timer, sentimentResults, myFacilitatorNotes] = await Promise.all([
        deps.retrospectiveBoardPort.listColumns(params.retrospectiveId),
        deps.cardPort.listCards(params.retrospectiveId),
        deps.cardGroupPort.listGroups(params.retrospectiveId),
        deps.actionItemPort.listActionItems(params.retrospectiveId),
        deps.participantPort.listParticipants(params.retrospectiveId),
        deps.retrospectiveBoardPort.getTimer(params.retrospectiveId),
        deps.sentimentResultPort.listResults(params.retrospectiveId),
        isFacilitator ? deps.facilitatorNotePort.listNotesForFacilitator(params.retrospectiveId, params.uid) : Promise.resolve([]),
    ]);

    // Self-heal (spec 046, FR-009/SC-005): a group whose persisted `column` no longer
    // matches its head card's actual column (e.g. groups formed before this fix
    // shipped, which always persisted `column: ''`) is corrected here, on the very
    // next board load, and the correction is persisted — not just reflected in this
    // one response — so every subsequent load and every other reader converges on the
    // right value without a separate migration step.
    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const groups = await Promise.all(
        rawGroups.map(async (group) => {
            const headCard = cardsById.get(group.headCardId);
            if (!headCard || headCard.column === group.column) {
                return group;
            }
            await deps.cardGroupPort.repairGroupColumn(group.id, headCard.column);
            return { ...group, column: headCard.column };
        }),
    );

    return { ...board, isFacilitator, columns, cards, groups, actionItems, participants, timer, myFacilitatorNotes, sentimentResults };
}
