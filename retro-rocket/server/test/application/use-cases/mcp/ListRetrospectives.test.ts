import { describe, it, expect } from 'vitest';
import { listRetrospectives } from '../../../../src/application/use-cases/mcp/ListRetrospectives';
import { fakeRetrospectiveReadPort } from './fakes';

describe('listRetrospectives', () => {
    it('returns the retrospectives the port reports for the user, with role', async () => {
        const port = fakeRetrospectiveReadPort({
            listEntries: [
                { id: 'r1', title: 'Sprint 1', createdAt: new Date('2026-01-01'), role: 'facilitator' },
                { id: 'r2', title: 'Sprint 2', createdAt: new Date('2026-02-01'), role: 'participant' },
            ],
        });
        const result = await listRetrospectives({ retrospectiveReadPort: port }, 'u1');
        expect(result).toHaveLength(2);
        expect(result[0].role).toBe('facilitator');
        expect(result[1].role).toBe('participant');
    });

    it('returns an empty list rather than an error when the user has none', async () => {
        const result = await listRetrospectives({ retrospectiveReadPort: fakeRetrospectiveReadPort() }, 'u-none');
        expect(result).toEqual([]);
    });
});
