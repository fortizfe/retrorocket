import { describe, it, expect } from 'vitest';
import { getRetrospectiveSummary } from '../../../../src/application/use-cases/mcp/GetRetrospectiveSummary';
import { NotFoundError } from '../../../../src/domain/errors';
import { fakeRetrospectiveReadPort } from './fakes';

const RETRO = { id: 'r1', title: 'Sprint 42', createdBy: 'facilitator-1', createdAt: new Date('2026-07-01') };

describe('getRetrospectiveSummary', () => {
    it('returns a structured summary including facilitatorNotes for the facilitator', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [],
            cards: [{ id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [{ emoji: '👍', count: 2 }] }],
            actionItems: [{ content: 'follow up', assignedToName: null, dueDate: null }],
            facilitatorNotes: [{ content: 'private', timestamp: new Date() }],
        });
        const result = await getRetrospectiveSummary({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(result.standoutItems).toHaveLength(1);
        expect(result.actionItems).toHaveLength(1);
        expect(result.facilitatorNotes).toEqual(['private']);
    });

    it('omits facilitatorNotes for a participant (User Story 4, same rule as detail)', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [{ name: 'Bob', userId: 'participant-2', joinedAt: new Date() }],
            facilitatorNotes: [{ content: 'private', timestamp: new Date() }],
        });
        const result = await getRetrospectiveSummary({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'participant-2' });
        expect(result).not.toHaveProperty('facilitatorNotes');
    });

    it('returns a valid, minimal summary (no error) for a retrospective with no reactions/action items', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [],
            cards: [{ id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [] }],
        });
        const result = await getRetrospectiveSummary({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(result.groupedFeedback).toHaveLength(1);
        expect(result).not.toHaveProperty('standoutItems');
        expect(result).not.toHaveProperty('actionItems');
    });

    it('throws the identical NotFoundError for a nonexistent id and an inaccessible one (FR-009)', async () => {
        const portMissing = fakeRetrospectiveReadPort({});
        await expect(
            getRetrospectiveSummary({ retrospectiveReadPort: portMissing }, { retrospectiveId: 'nope', requesterUid: 'u1' }),
        ).rejects.toThrow(NotFoundError);

        const portInaccessible = fakeRetrospectiveReadPort({ retrospectives: [RETRO], participants: [] });
        await expect(
            getRetrospectiveSummary({ retrospectiveReadPort: portInaccessible }, { retrospectiveId: 'r1', requesterUid: 'stranger-3' }),
        ).rejects.toThrow(NotFoundError);
    });
});
