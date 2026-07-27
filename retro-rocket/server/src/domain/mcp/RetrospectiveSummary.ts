import type {
    ActionItemRecord,
    CardGroupRecord,
    CardRecord,
    FacilitatorNoteRecord,
    SentimentResultRecord,
} from '../../application/ports/mcp';

export interface RetrospectiveSummaryOutput {
    retrospective: { id: string; title: string; createdAt: Date };
    groupedFeedback?: Array<{ groupOrColumn: string; cardCount: number; cards: Array<{ content: string; reactionCount: number }> }>;
    standoutItems?: Array<{ cardId: string; content: string; reactionCount: number }>;
    sentimentBreakdown?: { positive: number; neutral: number; negative: number; unanalyzed: number };
    actionItems?: ActionItemRecord[];
    facilitatorNotes?: string[];
}

export interface BuildRetrospectiveSummaryInput {
    retrospective: { id: string; title: string; createdAt: Date };
    cards: CardRecord[];
    groups: CardGroupRecord[];
    sentimentResults: SentimentResultRecord[];
    actionItems: ActionItemRecord[];
    facilitatorNotes?: FacilitatorNoteRecord[];
}

const STANDOUT_LIMIT = 5;

function reactionCountOf(card: CardRecord): number {
    return card.reactions.reduce((sum, r) => sum + r.count, 0);
}

/**
 * Pure, deterministic aggregation for the `get_retrospective_summary` MCP tool
 * (data-model.md "RetrospectiveSummary", contracts/mcp-tools.md). Sections with nothing
 * to report are omitted from the output entirely (User Story 5, Acceptance Scenario 3),
 * rather than returned as an empty array/object.
 */
export function buildRetrospectiveSummary(input: BuildRetrospectiveSummaryInput): RetrospectiveSummaryOutput {
    const groupIdByCardId = new Map<string, string>();
    for (const group of input.groups) {
        for (const cardId of group.cardIds) groupIdByCardId.set(cardId, group.id);
    }

    const buckets = new Map<string, { label: string; cards: CardRecord[] }>();
    for (const card of input.cards) {
        const groupId = groupIdByCardId.get(card.id);
        const group = groupId ? input.groups.find((g) => g.id === groupId) : undefined;
        const key = group ? `group:${group.id}` : `column:${card.column}`;
        const label = group ? group.title : card.column;
        if (!buckets.has(key)) buckets.set(key, { label, cards: [] });
        buckets.get(key)!.cards.push(card);
    }

    const groupedFeedback = [...buckets.values()].map((bucket) => ({
        groupOrColumn: bucket.label,
        cardCount: bucket.cards.length,
        cards: bucket.cards.map((card) => ({ content: card.content, reactionCount: reactionCountOf(card) })),
    }));

    const standoutItems = input.cards
        .map((card) => ({ cardId: card.id, content: card.content, reactionCount: reactionCountOf(card) }))
        .filter((item) => item.reactionCount > 0)
        .sort((a, b) => b.reactionCount - a.reactionCount)
        .slice(0, STANDOUT_LIMIT);

    const analyzedCardIds = new Set(input.sentimentResults.map((s) => s.cardId));
    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0, unanalyzed: 0 };
    for (const result of input.sentimentResults) sentimentBreakdown[result.sentiment] += 1;
    sentimentBreakdown.unanalyzed = input.cards.filter((card) => !analyzedCardIds.has(card.id)).length;

    const output: RetrospectiveSummaryOutput = { retrospective: input.retrospective };
    if (groupedFeedback.length > 0) output.groupedFeedback = groupedFeedback;
    if (standoutItems.length > 0) output.standoutItems = standoutItems;
    if (input.cards.length > 0) output.sentimentBreakdown = sentimentBreakdown;
    if (input.actionItems.length > 0) output.actionItems = input.actionItems;
    if (input.facilitatorNotes && input.facilitatorNotes.length > 0) {
        output.facilitatorNotes = input.facilitatorNotes.map((note) => note.content);
    }

    return output;
}
