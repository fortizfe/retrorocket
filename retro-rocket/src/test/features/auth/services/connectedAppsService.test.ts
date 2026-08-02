import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchConnectedApps } from '@/features/auth/services/connectedAppsService';

describe('connectedAppsService', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchConnectedApps', () => {
        it('passes origin and lastUsedAt through unchanged from the backend response', async () => {
            const connections = [
                { id: 'c1', clientName: 'Claude', createdAt: '2026-07-20T10:00:00Z', status: 'active', origin: 'desktop', lastUsedAt: '2026-07-30T09:15:00Z' },
                { id: 'c2', clientName: 'Claude', createdAt: '2026-07-29T08:00:00Z', status: 'active', origin: 'mobile', lastUsedAt: null },
            ];
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ connections }) }) as unknown as Response));

            const result = await fetchConnectedApps();

            expect(result).toEqual(connections);
        });

        it('defensively drops any entry whose status is not "active", even if the API ever regressed (research.md §5)', async () => {
            const connections = [
                { id: 'c1', clientName: 'Claude', createdAt: '2026-07-20T10:00:00Z', status: 'active', origin: 'desktop', lastUsedAt: null },
                { id: 'c2', clientName: 'Claude', createdAt: '2026-07-29T08:00:00Z', status: 'pending', origin: 'mobile', lastUsedAt: null },
            ];
            vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ connections }) }) as unknown as Response));

            const result = await fetchConnectedApps();

            expect(result.map((c) => c.id)).toEqual(['c1']);
        });
    });
});
