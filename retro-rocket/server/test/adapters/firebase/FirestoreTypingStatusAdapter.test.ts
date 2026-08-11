import { describe, it, expect } from 'vitest';
import { typingStatusDocId } from '../../../src/adapters/firebase/FirestoreTypingStatusAdapter';

describe('typingStatusDocId', () => {
    it('builds the deterministic {retroId}_{userId}_{column} doc id', () => {
        expect(typingStatusDocId('r1', 'u1', 'col1')).toBe('r1_u1_col1');
    });
});
