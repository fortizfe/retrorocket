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
import type { InMemoryTtlCache } from '../../../adapters/cache/InMemoryTtlCache';

export interface RetrospectiveDetailOutput {
    retrospective: { id: string; title: string; createdAt: Date };
    cards: CardRecord[];
    groups: CardGroupRecord[];
    participants: ParticipantRecord[];
    sentiment: SentimentResultRecord[];
    actionItems: ActionItemRecord[];
    facilitatorNotes?: FacilitatorNoteRecord[];
}

/** 041, FR-008/Story 3: the requester-independent portion of the detail fan-out — the
 * part safe to cache without keying by requester uid (data-model.md's Retrospective
 * Detail/Summary Result Cache). facilitatorNotes and the access decision deliberately
 * stay out of this shape and are always evaluated live, per requester, per call. */
export type CachedDetailFanOut = Pick<RetrospectiveDetailOutput, 'cards' | 'groups' | 'sentiment' | 'actionItems'>;

/** Upper bound of the 5-15s window agreed in Clarifications. */
export const RETROSPECTIVE_DETAIL_CACHE_TTL_MS = 15_000;

/**
 * `get_retrospective_detail` MCP tool (User Story 3). FR-009: a nonexistent id and an
 * inaccessible one produce the identical NotFoundError — existence is never leaked.
 *
 * 041: `detailFanOutCache` is optional so every existing/other caller (and every unit
 * test that doesn't care about caching) keeps today's always-live behavior unchanged;
 * only a caller that explicitly supplies a shared, TTL'd cache instance (mcp-wiring.ts/
 * mcpTestApp.ts, constructed once per app — never per-request or module-level, so
 * independent apps/tests never leak cached state into each other) gets FR-008's
 * short-lived caching of the requester-independent fan-out (FR-004: still reuses the
 * cardIds it already fetched instead of letting listSentimentResults re-derive them).
 */
export async function getRetrospectiveDetail(
    deps: { retrospectiveReadPort: RetrospectiveReadPort; detailFanOutCache?: InMemoryTtlCache<string, CachedDetailFanOut> },
    params: { retrospectiveId: string; requesterUid: string },
): Promise<RetrospectiveDetailOutput> {
    const retrospective = await deps.retrospectiveReadPort.getRetrospective(params.retrospectiveId);
    const participants = retrospective ? await deps.retrospectiveReadPort.listParticipants(params.retrospectiveId) : [];

    if (!retrospective || !hasRetrospectiveAccess(retrospective, participants, params.requesterUid)) {
        throw new NotFoundError('Retrospective not found');
    }

    let fanOut = deps.detailFanOutCache?.get(params.retrospectiveId);
    if (!fanOut) {
        const [cards, groups, actionItems] = await Promise.all([
            deps.retrospectiveReadPort.listCards(params.retrospectiveId),
            deps.retrospectiveReadPort.listGroups(params.retrospectiveId),
            deps.retrospectiveReadPort.listActionItems(params.retrospectiveId),
        ]);
        const sentiment = await deps.retrospectiveReadPort.listSentimentResults(cards.map((c) => c.id));
        fanOut = { cards, groups, sentiment, actionItems };
        deps.detailFanOutCache?.set(params.retrospectiveId, fanOut, RETROSPECTIVE_DETAIL_CACHE_TTL_MS);
    }

    const output: RetrospectiveDetailOutput = {
        retrospective: { id: retrospective.id, title: retrospective.title, createdAt: retrospective.createdAt },
        participants,
        ...fanOut,
    };

    if (canIncludeFacilitatorNotes(retrospective, params.requesterUid)) {
        const notes = await deps.retrospectiveReadPort.listFacilitatorNotes(params.retrospectiveId);
        if (notes.length > 0) output.facilitatorNotes = notes;
    }

    return output;
}
