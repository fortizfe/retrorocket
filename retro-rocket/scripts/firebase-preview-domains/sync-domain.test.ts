import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from './sync-domain.mjs';

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 500) => ({
    ok,
    status,
    json: () => Promise.resolve(body),
});

describe('sync-domain.mjs run()', () => {
    beforeEach(() => {
        process.env.GOOGLE_ACCESS_TOKEN = 'test-token';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.GOOGLE_ACCESS_TOKEN;
    });

    it('exits 1 when --project is missing', async () => {
        const exitCode = await run(['--add', 'new.vercel.app']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when neither --add nor --remove is given', async () => {
        const exitCode = await run(['--project', 'retrorocket-staging']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when GOOGLE_ACCESS_TOKEN is missing', async () => {
        delete process.env.GOOGLE_ACCESS_TOKEN;
        const exitCode = await run(['--project', 'retrorocket-staging', '--add', 'new.vercel.app']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when the GET call returns a non-2xx response', async () => {
        const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse({}, false));
        vi.stubGlobal('fetch', fetchMock);

        const exitCode = await run(['--project', 'retrorocket-staging', '--add', 'new.vercel.app']);

        expect(exitCode).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('exits 1 when the PATCH call returns a non-2xx response', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse({ authorizedDomains: ['localhost'] }))
            .mockResolvedValueOnce(jsonResponse({}, false));
        vi.stubGlobal('fetch', fetchMock);

        const exitCode = await run(['--project', 'retrorocket-staging', '--add', 'new.vercel.app']);

        expect(exitCode).toBe(1);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('exits 0 and PATCHes the result of computeNextDomains on the happy path', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse({ authorizedDomains: ['localhost', 'old.vercel.app'] }))
            .mockResolvedValueOnce(jsonResponse({}));
        vi.stubGlobal('fetch', fetchMock);

        const exitCode = await run([
            '--project',
            'retrorocket-staging',
            '--add',
            'new.vercel.app',
            '--remove',
            'old.vercel.app',
        ]);

        expect(exitCode).toBe(0);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        const [getUrl, getOptions] = fetchMock.mock.calls[0];
        expect(getUrl).toBe('https://identitytoolkit.googleapis.com/admin/v2/projects/retrorocket-staging/config');
        expect(getOptions.headers.Authorization).toBe('Bearer test-token');

        const [patchUrl, patchOptions] = fetchMock.mock.calls[1];
        expect(patchUrl).toContain('updateMask=authorizedDomains');
        expect(patchOptions.method).toBe('PATCH');
        expect(JSON.parse(patchOptions.body)).toEqual({ authorizedDomains: ['localhost', 'new.vercel.app'] });
    });
});
