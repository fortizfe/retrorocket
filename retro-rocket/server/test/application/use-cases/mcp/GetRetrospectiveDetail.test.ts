import { describe, it, expect, vi } from 'vitest';
import { getRetrospectiveDetail, RETROSPECTIVE_DETAIL_CACHE_TTL_MS } from '../../../../src/application/use-cases/mcp/GetRetrospectiveDetail';
import { NotFoundError } from '../../../../src/domain/errors';
import { InMemoryTtlCache } from '../../../../src/adapters/cache/InMemoryTtlCache';
import { fakeRetrospectiveReadPort } from './fakes';

const RETRO = { id: 'r1', title: 'Sprint 42', createdBy: 'facilitator-1', createdAt: new Date('2026-07-01') };

describe('getRetrospectiveDetail', () => {
    it('returns full detail (cards/groups/participants/sentiment/actionItems) for the facilitator', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [{ name: 'Ana', userId: 'facilitator-1', joinedAt: new Date() }],
            cards: [{ id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [] }],
            groups: [{ id: 'g1', title: 'G', cardIds: ['c1'] }],
            sentimentResults: [{ cardId: 'c1', sentiment: 'positive', confidence: 0.9 }],
            actionItems: [{ content: 'follow up', assignedToName: null, dueDate: null }],
            facilitatorNotes: [{ content: 'private', timestamp: new Date() }],
        });
        const result = await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(result.cards).toHaveLength(1);
        expect(result.groups).toHaveLength(1);
        expect(result.sentiment).toHaveLength(1);
        expect(result.actionItems).toHaveLength(1);
        expect(result.facilitatorNotes).toEqual([{ content: 'private', timestamp: expect.any(Date) }]);
    });

    it('omits facilitatorNotes entirely for a participant connection (User Story 4)', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [{ name: 'Bob', userId: 'participant-2', joinedAt: new Date() }],
            facilitatorNotes: [{ content: 'private', timestamp: new Date() }],
        });
        const result = await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'participant-2' });
        expect(result).not.toHaveProperty('facilitatorNotes');
    });

    it('omits facilitatorNotes for the facilitator too when none are recorded (not an error)', async () => {
        const port = fakeRetrospectiveReadPort({ retrospectives: [RETRO], participants: [] });
        const result = await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(result).not.toHaveProperty('facilitatorNotes');
    });

    it('returns empty collections (not an error) for a board with no cards yet', async () => {
        const port = fakeRetrospectiveReadPort({ retrospectives: [RETRO], participants: [] });
        const result = await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(result.cards).toEqual([]);
        expect(result.groups).toEqual([]);
        expect(result.actionItems).toEqual([]);
    });

    it('throws NotFoundError for a nonexistent retrospective id', async () => {
        const port = fakeRetrospectiveReadPort({});
        await expect(
            getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'does-not-exist', requesterUid: 'u1' }),
        ).rejects.toThrow(NotFoundError);
    });

    it('throws the identical NotFoundError for a retrospective the user has no access to (FR-009)', async () => {
        const port = fakeRetrospectiveReadPort({ retrospectives: [RETRO], participants: [] });
        await expect(
            getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'stranger-3' }),
        ).rejects.toThrow(NotFoundError);
    });

    // --- 041, FR-004 -------------------------------------------------------------

    it('passes the already-fetched cardIds to listSentimentResults instead of a retrospectiveId (041, FR-004)', async () => {
        const port = fakeRetrospectiveReadPort({
            retrospectives: [RETRO],
            participants: [],
            cards: [
                { id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [] },
                { id: 'c2', content: 'y', column: 'hindered', createdBy: 'u1', createdAt: new Date(), reactions: [] },
            ],
        });
        const listSentimentResults = vi.spyOn(port, 'listSentimentResults');
        await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
        expect(listSentimentResults).toHaveBeenCalledWith(['c1', 'c2']);
    });

    // --- 041, FR-008/Story 3 -------------------------------------------------------

    describe('detail fan-out cache (041, FR-008/Story 3)', () => {
        it('serves a second call within the cache window without re-fetching cards/groups/sentiment/actionItems', async () => {
            const port = fakeRetrospectiveReadPort({
                retrospectives: [RETRO],
                participants: [],
                cards: [{ id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [] }],
            });
            const listCards = vi.spyOn(port, 'listCards');
            const detailFanOutCache = new InMemoryTtlCache<string, never>();

            await getRetrospectiveDetail({ retrospectiveReadPort: port, detailFanOutCache }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
            await getRetrospectiveDetail({ retrospectiveReadPort: port, detailFanOutCache }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });

            expect(listCards).toHaveBeenCalledTimes(1);
        });

        it('scopes facilitatorNotes live per requester even when the cached portion is shared', async () => {
            const port = fakeRetrospectiveReadPort({
                retrospectives: [RETRO],
                participants: [{ name: 'Bob', userId: 'participant-2', joinedAt: new Date() }],
                facilitatorNotes: [{ content: 'private', timestamp: new Date() }],
            });
            const detailFanOutCache = new InMemoryTtlCache<string, never>();

            const facilitatorResult = await getRetrospectiveDetail(
                { retrospectiveReadPort: port, detailFanOutCache },
                { retrospectiveId: 'r1', requesterUid: 'facilitator-1' },
            );
            const participantResult = await getRetrospectiveDetail(
                { retrospectiveReadPort: port, detailFanOutCache },
                { retrospectiveId: 'r1', requesterUid: 'participant-2' },
            );

            expect(facilitatorResult.facilitatorNotes).toHaveLength(1);
            expect(participantResult).not.toHaveProperty('facilitatorNotes');
        });

        it('does not cache anything when no cache instance is supplied (default, every other caller)', async () => {
            const port = fakeRetrospectiveReadPort({
                retrospectives: [RETRO],
                participants: [],
                cards: [{ id: 'c1', content: 'x', column: 'helped', createdBy: 'u1', createdAt: new Date(), reactions: [] }],
            });
            const listCards = vi.spyOn(port, 'listCards');

            await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });
            await getRetrospectiveDetail({ retrospectiveReadPort: port }, { retrospectiveId: 'r1', requesterUid: 'facilitator-1' });

            expect(listCards).toHaveBeenCalledTimes(2);
        });

        it('exposes a 15-second TTL constant matching the upper bound of the Clarifications window', () => {
            expect(RETROSPECTIVE_DETAIL_CACHE_TTL_MS).toBe(15_000);
        });
    });
});
