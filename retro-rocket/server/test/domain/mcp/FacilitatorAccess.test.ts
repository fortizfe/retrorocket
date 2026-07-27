import { describe, it, expect } from 'vitest';
import { canIncludeFacilitatorNotes } from '../../../src/domain/mcp/FacilitatorAccess';

describe('canIncludeFacilitatorNotes', () => {
    it('returns true when the requester is the retrospective facilitator (creator)', () => {
        expect(canIncludeFacilitatorNotes({ createdBy: 'facilitator-1' }, 'facilitator-1')).toBe(true);
    });

    it('returns false when the requester is a participant, not the facilitator', () => {
        expect(canIncludeFacilitatorNotes({ createdBy: 'facilitator-1' }, 'participant-2')).toBe(false);
    });

    it('returns false for an empty/undefined requester uid', () => {
        expect(canIncludeFacilitatorNotes({ createdBy: 'facilitator-1' }, '')).toBe(false);
    });
});
