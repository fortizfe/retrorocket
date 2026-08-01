import { describe, it, expect } from 'vitest';
import { resolveDisplayName, groupReactions } from '@/lib/utils/cardHelpers';
import { Reaction } from '@/features/boards/types/card';
import { Participant } from '@/features/boards/types/participant';

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

function makeReaction(overrides: Partial<Reaction> = {}): Reaction {
    return {
        userId: 'user-1',
        username: 'Jane Smith',
        emoji: '👍',
        timestamp: new Date(),
        ...overrides,
    };
}

describe('resolveDisplayName', () => {
    it('prefers a live participant match over the captured name', () => {
        const participants = [makeParticipant({ userId: 'user-1', name: 'Jane S.' })];
        expect(resolveDisplayName('user-1', 'Jane Smith', participants, 'Unknown author')).toBe('Jane S.');
    });

    it('falls back to the captured name when no participant match exists', () => {
        expect(resolveDisplayName('user-departed', 'Old Name', [], 'Unknown author')).toBe('Old Name');
    });

    it('falls back to the given fallback label when neither a participant match nor a captured name exists', () => {
        expect(resolveDisplayName('user-departed', undefined, [], 'Unknown author')).toBe('Unknown author');
    });

    it('falls back to the given fallback label when participants is undefined and no captured name exists', () => {
        expect(resolveDisplayName('user-1', undefined, undefined, 'Unknown author')).toBe('Unknown author');
    });

    it('never returns the raw userId', () => {
        expect(resolveDisplayName('user-raw-id', undefined, [], 'Unknown author')).not.toBe('user-raw-id');
    });

    it('matches participants by userId, not by name, so two authors sharing a display name still resolve to their own record', () => {
        const participants = [
            makeParticipant({ userId: 'user-a', name: 'Sam Lee' }),
            makeParticipant({ userId: 'user-b', name: 'Sam Lee' }),
        ];
        expect(resolveDisplayName('user-a', undefined, participants, 'Unknown author')).toBe('Sam Lee');
        expect(resolveDisplayName('user-b', undefined, participants, 'Unknown author')).toBe('Sam Lee');
    });
});

describe('groupReactions', () => {
    it('resolves each entry in `users` via the current participant match, preferring it over the captured username', () => {
        const reactions = [makeReaction({ userId: 'user-1', username: 'Old Name', emoji: '👍' })];
        const participants = [makeParticipant({ userId: 'user-1', name: 'New Name' })];
        const grouped = groupReactions(reactions, participants, 'Unknown author');
        expect(grouped).toEqual([{ emoji: '👍', count: 1, users: ['New Name'], userIds: ['user-1'] }]);
    });

    it('falls back to the captured username when no participant match exists', () => {
        const reactions = [makeReaction({ userId: 'user-departed', username: 'Captured Name', emoji: '🎉' })];
        const grouped = groupReactions(reactions, [], 'Unknown author');
        expect(grouped[0].users).toEqual(['Captured Name']);
    });

    it('falls back to the fallback label when neither a participant match nor a captured username exists', () => {
        const reactions = [makeReaction({ userId: 'user-departed', username: '', emoji: '🎉' })];
        const grouped = groupReactions(reactions, [], 'Unknown author');
        expect(grouped[0].users).toEqual(['Unknown author']);
    });

    it('populates userIds parallel-indexed with users, carrying the raw reaction.userId values', () => {
        const reactions = [
            makeReaction({ userId: 'user-a', username: 'A', emoji: '🎉' }),
            makeReaction({ userId: 'user-b', username: 'B', emoji: '🎉' }),
        ];
        const grouped = groupReactions(reactions, [], 'Unknown author');
        expect(grouped[0].userIds).toEqual(['user-a', 'user-b']);
        expect(grouped[0].users).toEqual(['A', 'B']);
    });

    it('groups by emoji and counts correctly, unaffected by name resolution', () => {
        const reactions = [
            makeReaction({ userId: 'user-a', username: 'A', emoji: '🎉' }),
            makeReaction({ userId: 'user-b', username: 'B', emoji: '🎉' }),
            makeReaction({ userId: 'user-c', username: 'C', emoji: '👍' }),
        ];
        const grouped = groupReactions(reactions, [], 'Unknown author');
        const byEmoji = Object.fromEntries(grouped.map(g => [g.emoji, g.count]));
        expect(byEmoji).toEqual({ '🎉': 2, '👍': 1 });
    });
});
