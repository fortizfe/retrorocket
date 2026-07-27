import { describe, expect, it } from 'vitest';
import { isFacilitator } from '../../../src/domain/boards/FacilitatorAccess';

describe('isFacilitator', () => {
    it('allows the board creator', () => {
        expect(isFacilitator({ createdBy: 'u1' }, 'u1')).toBe(true);
    });

    it('rejects a non-creator', () => {
        expect(isFacilitator({ createdBy: 'u1' }, 'u2')).toBe(false);
    });

    it('rejects an empty uid', () => {
        expect(isFacilitator({ createdBy: 'u1' }, '')).toBe(false);
    });
});
