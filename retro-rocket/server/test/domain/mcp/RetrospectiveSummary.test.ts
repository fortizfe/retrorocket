import { describe, it, expect } from 'vitest';
import { buildRetrospectiveSummary } from '../../../src/domain/mcp/RetrospectiveSummary';
import type { ActionItemRecord, CardGroupRecord, CardRecord, SentimentResultRecord } from '../../../src/application/ports/mcp';

const retrospective = { id: 'r1', title: 'Sprint 42', createdAt: new Date('2026-07-01') };

function card(overrides: Partial<CardRecord>): CardRecord {
    return {
        id: 'c1',
        content: 'content',
        column: 'helped',
        createdBy: 'u1',
        createdAt: new Date(),
        reactions: [],
        ...overrides,
    };
}

describe('buildRetrospectiveSummary', () => {
    it('groups cards by their group when grouped, and by column otherwise', () => {
        const groups: CardGroupRecord[] = [{ id: 'g1', title: 'Communication', cardIds: ['c1', 'c2'] }];
        const cards: CardRecord[] = [
            card({ id: 'c1', content: 'a' }),
            card({ id: 'c2', content: 'b' }),
            card({ id: 'c3', content: 'ungrouped', column: 'improve' }),
        ];
        const summary = buildRetrospectiveSummary({ retrospective, cards, groups, sentimentResults: [], actionItems: [] });
        expect(summary.groupedFeedback).toEqual(
            expect.arrayContaining([
                { groupOrColumn: 'Communication', cardCount: 2, cards: [{ content: 'a', reactionCount: 0 }, { content: 'b', reactionCount: 0 }] },
                { groupOrColumn: 'improve', cardCount: 1, cards: [{ content: 'ungrouped', reactionCount: 0 }] },
            ]),
        );
    });

    it('ranks standout items by total reaction count, excluding zero-reaction cards', () => {
        const cards: CardRecord[] = [
            card({ id: 'c1', content: 'popular', reactions: [{ emoji: '👍', count: 5 }] }),
            card({ id: 'c2', content: 'quiet', reactions: [] }),
            card({ id: 'c3', content: 'somewhat', reactions: [{ emoji: '❤️', count: 2 }] }),
        ];
        const summary = buildRetrospectiveSummary({ retrospective, cards, groups: [], sentimentResults: [], actionItems: [] });
        expect(summary.standoutItems).toEqual([
            { cardId: 'c1', content: 'popular', reactionCount: 5 },
            { cardId: 'c3', content: 'somewhat', reactionCount: 2 },
        ]);
    });

    it('tallies the sentiment breakdown, counting cards with no result as unanalyzed', () => {
        const cards: CardRecord[] = [card({ id: 'c1' }), card({ id: 'c2' }), card({ id: 'c3' })];
        const sentimentResults: SentimentResultRecord[] = [
            { cardId: 'c1', sentiment: 'positive', confidence: 0.9 },
            { cardId: 'c2', sentiment: 'negative', confidence: 0.8 },
        ];
        const summary = buildRetrospectiveSummary({ retrospective, cards, groups: [], sentimentResults, actionItems: [] });
        expect(summary.sentimentBreakdown).toEqual({ positive: 1, neutral: 0, negative: 1, unanalyzed: 1 });
    });

    it('omits groupedFeedback/standoutItems/sentimentBreakdown/actionItems when there is nothing to report', () => {
        const summary = buildRetrospectiveSummary({ retrospective, cards: [], groups: [], sentimentResults: [], actionItems: [] });
        expect(summary).toEqual({ retrospective });
    });

    it('includes actionItems only when present', () => {
        const actionItems: ActionItemRecord[] = [{ content: 'Do X', assignedToName: 'Ana', dueDate: null }];
        const summary = buildRetrospectiveSummary({ retrospective, cards: [], groups: [], sentimentResults: [], actionItems });
        expect(summary.actionItems).toEqual(actionItems);
    });

    it('includes facilitatorNotes as plain strings only when provided and non-empty', () => {
        const withNotes = buildRetrospectiveSummary({
            retrospective,
            cards: [],
            groups: [],
            sentimentResults: [],
            actionItems: [],
            facilitatorNotes: [{ content: 'private note', timestamp: new Date() }],
        });
        expect(withNotes.facilitatorNotes).toEqual(['private note']);

        const withoutNotes = buildRetrospectiveSummary({ retrospective, cards: [], groups: [], sentimentResults: [], actionItems: [] });
        expect(withoutNotes.facilitatorNotes).toBeUndefined();
    });
});
