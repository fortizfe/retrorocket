import type { RetrospectiveReadPort } from '../../ports/mcp';
import { NotFoundError } from '../../../domain/errors';
import { hasRetrospectiveAccess } from '../../../domain/mcp/RetrospectiveAccess';
import { canIncludeFacilitatorNotes } from '../../../domain/mcp/FacilitatorAccess';
import { buildRetrospectiveSummary, type RetrospectiveSummaryOutput } from '../../../domain/mcp/RetrospectiveSummary';

/**
 * `get_retrospective_summary` MCP tool (User Story 5). Reuses the exact same access
 * check as GetRetrospectiveDetail (FR-009: identical `not_found` for both tools) and the
 * same FacilitatorAccess gating (User Story 4).
 */
export async function getRetrospectiveSummary(
    deps: { retrospectiveReadPort: RetrospectiveReadPort },
    params: { retrospectiveId: string; requesterUid: string },
): Promise<RetrospectiveSummaryOutput> {
    const retrospective = await deps.retrospectiveReadPort.getRetrospective(params.retrospectiveId);
    const participants = retrospective ? await deps.retrospectiveReadPort.listParticipants(params.retrospectiveId) : [];

    if (!retrospective || !hasRetrospectiveAccess(retrospective, participants, params.requesterUid)) {
        throw new NotFoundError('Retrospective not found');
    }

    const [cards, groups, sentimentResults, actionItems] = await Promise.all([
        deps.retrospectiveReadPort.listCards(params.retrospectiveId),
        deps.retrospectiveReadPort.listGroups(params.retrospectiveId),
        deps.retrospectiveReadPort.listSentimentResults(params.retrospectiveId),
        deps.retrospectiveReadPort.listActionItems(params.retrospectiveId),
    ]);

    const facilitatorNotes = canIncludeFacilitatorNotes(retrospective, params.requesterUid)
        ? await deps.retrospectiveReadPort.listFacilitatorNotes(params.retrospectiveId)
        : undefined;

    return buildRetrospectiveSummary({
        retrospective: { id: retrospective.id, title: retrospective.title, createdAt: retrospective.createdAt },
        cards,
        groups,
        sentimentResults,
        actionItems,
        facilitatorNotes,
    });
}
