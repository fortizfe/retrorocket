import type { ActionItemRecord, CardGroupRecord, CardRecord, RetrospectiveReadPort, SentimentResultRecord } from '../../ports/mcp';
import { NotFoundError } from '../../../domain/errors';
import { hasRetrospectiveAccess } from '../../../domain/mcp/RetrospectiveAccess';
import { canIncludeFacilitatorNotes } from '../../../domain/mcp/FacilitatorAccess';
import { buildRetrospectiveSummary, type RetrospectiveSummaryOutput } from '../../../domain/mcp/RetrospectiveSummary';
import type { InMemoryTtlCache } from '../../../adapters/cache/InMemoryTtlCache';

/** 041, FR-008/Story 3: the requester-independent raw inputs to buildRetrospectiveSummary
 * — cached without facilitatorNotes (data-model.md's Retrospective Detail/Summary Result
 * Cache), which stays live/per-requester and is merged in after a cache hit or miss. */
export interface CachedSummaryFanOut {
    cards: CardRecord[];
    groups: CardGroupRecord[];
    sentimentResults: SentimentResultRecord[];
    actionItems: ActionItemRecord[];
}

/** Upper bound of the 5-15s window agreed in Clarifications. */
export const RETROSPECTIVE_SUMMARY_CACHE_TTL_MS = 15_000;

/**
 * `get_retrospective_summary` MCP tool (User Story 5). Reuses the exact same access
 * check as GetRetrospectiveDetail (FR-009: identical `not_found` for both tools) and the
 * same FacilitatorAccess gating (User Story 4).
 *
 * 041: `summaryFanOutCache` is optional, mirroring GetRetrospectiveDetail.ts's own
 * optional `detailFanOutCache` — see that file's docstring for the full rationale.
 */
export async function getRetrospectiveSummary(
    deps: { retrospectiveReadPort: RetrospectiveReadPort; summaryFanOutCache?: InMemoryTtlCache<string, CachedSummaryFanOut> },
    params: { retrospectiveId: string; requesterUid: string },
): Promise<RetrospectiveSummaryOutput> {
    const retrospective = await deps.retrospectiveReadPort.getRetrospective(params.retrospectiveId);
    const participants = retrospective ? await deps.retrospectiveReadPort.listParticipants(params.retrospectiveId) : [];

    if (!retrospective || !hasRetrospectiveAccess(retrospective, participants, params.requesterUid)) {
        throw new NotFoundError('Retrospective not found');
    }

    let fanOut = deps.summaryFanOutCache?.get(params.retrospectiveId);
    if (!fanOut) {
        const [cards, groups, actionItems] = await Promise.all([
            deps.retrospectiveReadPort.listCards(params.retrospectiveId),
            deps.retrospectiveReadPort.listGroups(params.retrospectiveId),
            deps.retrospectiveReadPort.listActionItems(params.retrospectiveId),
        ]);
        const sentimentResults = await deps.retrospectiveReadPort.listSentimentResults(cards.map((c) => c.id));
        fanOut = { cards, groups, sentimentResults, actionItems };
        deps.summaryFanOutCache?.set(params.retrospectiveId, fanOut, RETROSPECTIVE_SUMMARY_CACHE_TTL_MS);
    }

    const facilitatorNotes = canIncludeFacilitatorNotes(retrospective, params.requesterUid)
        ? await deps.retrospectiveReadPort.listFacilitatorNotes(params.retrospectiveId)
        : undefined;

    return buildRetrospectiveSummary({
        retrospective: { id: retrospective.id, title: retrospective.title, createdAt: retrospective.createdAt },
        ...fanOut,
        facilitatorNotes,
    });
}
