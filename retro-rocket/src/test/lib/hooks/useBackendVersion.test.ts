import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBackendVersion } from '@/lib/hooks/useBackendVersion';
import { backendApiClient } from '@/lib/services/backendApiClient';

vi.mock('@/lib/services/backendApiClient', () => ({
    backendApiClient: { get: vi.fn() },
}));

const mockedGet = vi.mocked(backendApiClient.get);

describe('useBackendVersion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('is not stale when the backend version matches the build-time version', async () => {
        mockedGet.mockResolvedValue({ status: 'ok', version: __APP_VERSION__, time: new Date().toISOString() });
        const { result } = renderHook(() => useBackendVersion());

        await waitFor(() => expect(mockedGet).toHaveBeenCalledWith('/api/health'));
        await waitFor(() => expect(result.current.isStale).toBe(false));
    });

    it('is stale when the backend version differs from the build-time version', async () => {
        mockedGet.mockResolvedValue({ status: 'ok', version: 'some-other-version', time: new Date().toISOString() });
        const { result } = renderHook(() => useBackendVersion());

        await waitFor(() => expect(result.current.isStale).toBe(true));
    });

    it('stays non-stale (best-effort) when the health check fails', async () => {
        mockedGet.mockRejectedValue(new Error('network error'));
        const { result } = renderHook(() => useBackendVersion());

        await waitFor(() => expect(mockedGet).toHaveBeenCalled());
        expect(result.current.isStale).toBe(false);
    });
});
