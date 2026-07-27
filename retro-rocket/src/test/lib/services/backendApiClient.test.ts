import { afterEach, describe, expect, it, vi } from 'vitest';
import { backendApiClient, BackendApiError } from '@/lib/services/backendApiClient';

function jsonResponse(status: number, body: unknown): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    } as Response;
}

describe('backendApiClient', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('sends credentials: include and parses a successful JSON response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { hello: 'world' }));
        vi.stubGlobal('fetch', fetchMock);

        const result = await backendApiClient.get<{ hello: string }>('/api/boards/b1');

        expect(result).toEqual({ hello: 'world' });
        expect(fetchMock).toHaveBeenCalledWith('/api/boards/b1', expect.objectContaining({ credentials: 'include', method: 'GET' }));
    });

    it('serializes the request body and sets Content-Type for POST', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { id: 'b1' }));
        vi.stubGlobal('fetch', fetchMock);

        await backendApiClient.post('/api/boards', { title: 'X' });

        expect(fetchMock).toHaveBeenCalledWith(
            '/api/boards',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ title: 'X' }),
                headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
            }),
        );
    });

    it('returns undefined for a 204 response', async () => {
        const fetchMock = vi.fn().mockResolvedValue(jsonResponse(204, null));
        vi.stubGlobal('fetch', fetchMock);

        const result = await backendApiClient.delete('/api/boards/b1');
        expect(result).toBeUndefined();
    });

    it('throws a BackendApiError parsed from the error envelope', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(403, { error: { code: 'forbidden', message: 'Not authorized' }, correlationId: 'corr-1' }),
        );
        vi.stubGlobal('fetch', fetchMock);

        await expect(backendApiClient.get('/api/boards/b1')).rejects.toMatchObject({
            code: 'forbidden',
            message: 'Not authorized',
            status: 403,
            correlationId: 'corr-1',
        });
    });

    it('falls back to a generic error when the response body is not JSON', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => {
                throw new Error('not json');
            },
        } as unknown as Response);
        vi.stubGlobal('fetch', fetchMock);

        await expect(backendApiClient.get('/api/boards/b1')).rejects.toBeInstanceOf(BackendApiError);
    });
});
