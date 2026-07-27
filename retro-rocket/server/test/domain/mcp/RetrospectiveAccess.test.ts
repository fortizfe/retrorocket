import { describe, it, expect } from 'vitest';
import { hasRetrospectiveAccess } from '../../../src/domain/mcp/RetrospectiveAccess';

const retro = { createdBy: 'facilitator-1' };

describe('hasRetrospectiveAccess', () => {
    it('grants access to the facilitator (creator)', () => {
        expect(hasRetrospectiveAccess(retro, [], 'facilitator-1')).toBe(true);
    });

    it('grants access to a listed participant', () => {
        expect(hasRetrospectiveAccess(retro, [{ userId: 'participant-2' }], 'participant-2')).toBe(true);
    });

    it('denies access to a uid that is neither facilitator nor participant', () => {
        expect(hasRetrospectiveAccess(retro, [{ userId: 'participant-2' }], 'stranger-3')).toBe(false);
    });

    it('denies an empty uid', () => {
        expect(hasRetrospectiveAccess(retro, [], '')).toBe(false);
    });
});
