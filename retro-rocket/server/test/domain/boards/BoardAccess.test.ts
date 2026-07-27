import { describe, expect, it } from 'vitest';
import { isParticipantOrCreator } from '../../../src/domain/boards/BoardAccess';

describe('isParticipantOrCreator', () => {
    it('allows the board creator', () => {
        expect(isParticipantOrCreator({ createdBy: 'u1' }, [], 'u1')).toBe(true);
    });

    it('allows a listed participant', () => {
        expect(isParticipantOrCreator({ createdBy: 'u1' }, [{ userId: 'u2' }], 'u2')).toBe(true);
    });

    it('rejects a uid that is neither creator nor participant', () => {
        expect(isParticipantOrCreator({ createdBy: 'u1' }, [{ userId: 'u2' }], 'u3')).toBe(false);
    });

    it('rejects an empty uid', () => {
        expect(isParticipantOrCreator({ createdBy: 'u1' }, [{ userId: 'u2' }], '')).toBe(false);
    });
});
