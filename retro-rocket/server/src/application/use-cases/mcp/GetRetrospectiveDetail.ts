import type {
    ActionItemRecord,
    CardGroupRecord,
    CardRecord,
    FacilitatorNoteRecord,
    ParticipantRecord,
    RetrospectiveReadPort,
    SentimentResultRecord,
} from '../../ports/mcp';
import { NotFoundError } from '../../../domain/errors';
import { hasRetrospectiveAccess } from '../../../domain/mcp/RetrospectiveAccess';
import { canIncludeFacilitatorNotes } from '../../../domain/mcp/FacilitatorAccess';

export interface RetrospectiveDetailOutput {
    retrospective: { id: string; title: string; createdAt: Date };
    cards: CardRecord[];
    groups: CardGroupRecord[];
    participants: ParticipantRecord[];
    sentiment: SentimentResultRecord[];
    actionItems: ActionItemRecord[];
    facilitatorNotes?: FacilitatorNoteRecord[];
}

/**
 * `get_retrospective_detail` MCP tool (User Story 3). FR-009: a nonexistent id and an
 * inaccessible one produce the identical NotFoundError — existence is never leaked.
 */
export async function getRetrospectiveDetail(
    deps: { retrospectiveReadPort: RetrospectiveReadPort },
    params: { retrospectiveId: string; requesterUid: string },
): Promise<RetrospectiveDetailOutput> {
    const retrospective = await deps.retrospectiveReadPort.getRetrospective(params.retrospectiveId);
    const participants = retrospective ? await deps.retrospectiveReadPort.listParticipants(params.retrospectiveId) : [];

    if (!retrospective || !hasRetrospectiveAccess(retrospective, participants, params.requesterUid)) {
        throw new NotFoundError('Retrospective not found');
    }

    const [cards, groups, sentiment, actionItems] = await Promise.all([
        deps.retrospectiveReadPort.listCards(params.retrospectiveId),
        deps.retrospectiveReadPort.listGroups(params.retrospectiveId),
        deps.retrospectiveReadPort.listSentimentResults(params.retrospectiveId),
        deps.retrospectiveReadPort.listActionItems(params.retrospectiveId),
    ]);

    const output: RetrospectiveDetailOutput = {
        retrospective: { id: retrospective.id, title: retrospective.title, createdAt: retrospective.createdAt },
        cards,
        groups,
        participants,
        sentiment,
        actionItems,
    };

    if (canIncludeFacilitatorNotes(retrospective, params.requesterUid)) {
        const notes = await deps.retrospectiveReadPort.listFacilitatorNotes(params.retrospectiveId);
        if (notes.length > 0) output.facilitatorNotes = notes;
    }

    return output;
}
