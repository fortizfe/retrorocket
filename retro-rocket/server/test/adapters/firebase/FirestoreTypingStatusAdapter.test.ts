import { describe, it, expect } from 'vitest';
import { toTypingStatus, typingStatusDocId } from '../../../src/adapters/firebase/FirestoreTypingStatusAdapter';

describe('typingStatusDocId', () => {
    it('builds the deterministic {retroId}_{userId}_{column} doc id', () => {
        expect(typingStatusDocId('r1', 'u1', 'col1')).toBe('r1_u1_col1');
    });
});

describe('toTypingStatus', () => {
    it('maps a Firestore document into a TypingStatusDTO', () => {
        const data = { userId: 'u1', username: 'Alice', retrospectiveId: 'r1', column: 'col1', timestamp: new Date('2026-01-01T00:00:00Z') };
        expect(toTypingStatus('r1_u1_col1', data)).toEqual({
            id: 'r1_u1_col1',
            userId: 'u1',
            username: 'Alice',
            retrospectiveId: 'r1',
            column: 'col1',
            timestamp: new Date('2026-01-01T00:00:00Z'),
        });
    });
});
