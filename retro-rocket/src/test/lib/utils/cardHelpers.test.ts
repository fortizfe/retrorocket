import { describe, it, expect } from 'vitest';
import { resolveAuthorDisplayName } from '@/lib/utils/cardHelpers';
import { Card, CardColor } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

function makeCard(overrides: Partial<Card> = {}): Card {
    return {
        id: 'c1',
        content: 'x',
        column: 'col1',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'r1',
        color: 'pastelBlue' as CardColor,
        ...overrides,
    };
}

function makeParticipant(overrides: Partial<Participant> = {}): Participant {
    return {
        id: 'p1',
        userId: 'user-1',
        name: 'Jane Smith',
        retrospectiveId: 'r1',
        joinedAt: new Date(),
        ...overrides,
    };
}

describe('resolveAuthorDisplayName', () => {
    it('returns card.createdByName when present, without consulting participants', () => {
        const card = makeCard({ createdBy: 'user-1', createdByName: 'Jane Smith' });
        expect(resolveAuthorDisplayName(card, [], 'Unknown author')).toBe('Jane Smith');
    });

    it('falls back to a live participant match by userId when createdByName is absent (legacy card)', () => {
        const card = makeCard({ createdBy: 'user-1', createdByName: undefined });
        const participants = [makeParticipant({ userId: 'user-1', name: 'Alex Chen' })];
        expect(resolveAuthorDisplayName(card, participants, 'Unknown author')).toBe('Alex Chen');
    });

    it('falls back to the given fallback label when neither createdByName nor a participant match exists', () => {
        const card = makeCard({ createdBy: 'user-departed', createdByName: undefined });
        expect(resolveAuthorDisplayName(card, [], 'Unknown author')).toBe('Unknown author');
    });

    it('falls back to the given fallback label when participants is undefined', () => {
        const card = makeCard({ createdBy: 'user-1', createdByName: undefined });
        expect(resolveAuthorDisplayName(card, undefined, 'Unknown author')).toBe('Unknown author');
    });

    it('matches participants by userId, not by name, so two authors sharing a display name still resolve to their own record', () => {
        const cardA = makeCard({ id: 'a', createdBy: 'user-a', createdByName: undefined });
        const cardB = makeCard({ id: 'b', createdBy: 'user-b', createdByName: undefined });
        const participants = [
            makeParticipant({ userId: 'user-a', name: 'Sam Lee' }),
            makeParticipant({ userId: 'user-b', name: 'Sam Lee' }),
        ];
        expect(resolveAuthorDisplayName(cardA, participants, 'Unknown author')).toBe('Sam Lee');
        expect(resolveAuthorDisplayName(cardB, participants, 'Unknown author')).toBe('Sam Lee');
    });
});
