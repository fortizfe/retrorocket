import { describe, expect, it, vi, afterEach } from 'vitest';
import { setTypingStatus } from '../../../../src/application/use-cases/boards/SetTypingStatus';
import { inMemoryTypingStore } from './cardFakes';

describe('setTypingStatus', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('records an active typing status for a user+column', async () => {
        const typingPort = inMemoryTypingStore();
        await setTypingStatus({ typingPort }, { retrospectiveId: 'b1', userId: 'u1', username: 'Ana', column: 'helped', isActive: true });
        const statuses = await typingPort.listTypingStatuses('b1');
        expect(statuses).toEqual([expect.objectContaining({ userId: 'u1', column: 'helped', isActive: true })]);
    });

    it('generalizes to arbitrary column ids (not a hardcoded list)', async () => {
        const typingPort = inMemoryTypingStore();
        await setTypingStatus({ typingPort }, { retrospectiveId: 'b1', userId: 'u1', username: 'Ana', column: 'a-custom-template-column', isActive: true });
        const statuses = await typingPort.listTypingStatuses('b1');
        expect(statuses[0].column).toBe('a-custom-template-column');
    });

    it('clears the status when isActive is false', async () => {
        const typingPort = inMemoryTypingStore();
        await setTypingStatus({ typingPort }, { retrospectiveId: 'b1', userId: 'u1', username: 'Ana', column: 'helped', isActive: true });
        await setTypingStatus({ typingPort }, { retrospectiveId: 'b1', userId: 'u1', username: 'Ana', column: 'helped', isActive: false });
        expect(await typingPort.listTypingStatuses('b1')).toEqual([]);
    });
});
