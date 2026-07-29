import { describe, it, expect, vi } from 'vitest';
import { setTypingStatus } from '../../../../src/application/use-cases/retrospective/SetTypingStatus';
import type { TypingStatusPort } from '../../../../src/application/ports/typing';

function fakeTypingStatusPort(): TypingStatusPort {
    return {
        setTypingStatus: vi.fn(async () => {}),
        listActive: vi.fn(async () => []),
    };
}

describe('setTypingStatus', () => {
    it('delegates to the port with isActive:true when starting to type', async () => {
        const typingStatusPort = fakeTypingStatusPort();
        await setTypingStatus({ typingStatusPort }, { retrospectiveId: 'r1', userId: 'u1', username: 'Alice', column: 'col1', isActive: true });
        expect(typingStatusPort.setTypingStatus).toHaveBeenCalledWith('r1', 'u1', 'Alice', 'col1', true);
    });

    it('delegates to the port with isActive:false when stopping', async () => {
        const typingStatusPort = fakeTypingStatusPort();
        await setTypingStatus({ typingStatusPort }, { retrospectiveId: 'r1', userId: 'u1', username: 'Alice', column: 'col1', isActive: false });
        expect(typingStatusPort.setTypingStatus).toHaveBeenCalledWith('r1', 'u1', 'Alice', 'col1', false);
    });
});
