import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFileSync, rmSync } from 'node:fs';

vi.mock('@actions/cache', () => ({
    restoreCache: vi.fn(),
}));

const { restoreCache } = await import('@actions/cache');
const { run } = await import('./cleanup-orphans.mjs');

const jsonResponse = (body: unknown, ok = true, status = ok ? 200 : 500) => ({
    ok,
    status,
    json: () => Promise.resolve(body),
});

describe('cleanup-orphans.mjs run()', () => {
    beforeEach(() => {
        process.env.GOOGLE_ACCESS_TOKEN = 'test-token';
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.mocked(restoreCache).mockReset();
        delete process.env.GOOGLE_ACCESS_TOKEN;
        rmSync('.preview-domain-pr-1', { force: true });
        rmSync('.preview-domain-pr-2', { force: true });
    });

    it('exits 1 when --project is missing', async () => {
        const exitCode = await run(['--open-pr-numbers', '1,2']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when --open-pr-numbers is missing', async () => {
        const exitCode = await run(['--project', 'retrorocket-staging']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when GOOGLE_ACCESS_TOKEN is missing', async () => {
        delete process.env.GOOGLE_ACCESS_TOKEN;
        const exitCode = await run(['--project', 'retrorocket-staging', '--open-pr-numbers', '1']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when restoreCache fails for one PR number', async () => {
        vi.mocked(restoreCache).mockRejectedValueOnce(new Error('boom'));
        const exitCode = await run(['--project', 'retrorocket-staging', '--open-pr-numbers', '1']);
        expect(exitCode).toBe(1);
    });

    it('exits 1 when the GET call returns a non-2xx response', async () => {
        vi.mocked(restoreCache).mockResolvedValue(undefined);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse({}, false)));
        const exitCode = await run(['--project', 'retrorocket-staging', '--open-pr-numbers', '1']);
        expect(exitCode).toBe(1);
    });

    it('removes only vercel.app entries that are not tied to any currently-open PR', async () => {
        // PR 1's cache entry resolves to a real hostname; PR 2 has no cache entry at all.
        vi.mocked(restoreCache).mockImplementation(async (paths, key) => {
            if (key === 'preview-domain-pr-1') {
                writeFileSync(paths[0], 'pr1.vercel.app');
                return key;
            }
            return undefined;
        });

        const fetchMock = vi.fn().mockResolvedValueOnce(
            jsonResponse({
                authorizedDomains: [
                    'localhost',
                    'retrorocket-staging.firebaseapp.com',
                    'pr1.vercel.app',
                    'orphaned-pr3.vercel.app',
                ],
            })
        ).mockResolvedValueOnce(jsonResponse({}));
        vi.stubGlobal('fetch', fetchMock);

        const exitCode = await run(['--project', 'retrorocket-staging', '--open-pr-numbers', '1,2']);

        expect(exitCode).toBe(0);
        const [, patchOptions] = fetchMock.mock.calls[1];
        expect(JSON.parse(patchOptions.body)).toEqual({
            authorizedDomains: ['localhost', 'retrorocket-staging.firebaseapp.com', 'pr1.vercel.app'],
        });
    });

    it('exits 0 with no changes when there are zero orphans', async () => {
        vi.mocked(restoreCache).mockImplementation(async (paths, key) => {
            writeFileSync(paths[0], 'pr1.vercel.app');
            return key;
        });
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                jsonResponse({ authorizedDomains: ['localhost', 'pr1.vercel.app'] })
            )
            .mockResolvedValueOnce(jsonResponse({}));
        vi.stubGlobal('fetch', fetchMock);

        const exitCode = await run(['--project', 'retrorocket-staging', '--open-pr-numbers', '1']);

        expect(exitCode).toBe(0);
        const [, patchOptions] = fetchMock.mock.calls[1];
        expect(JSON.parse(patchOptions.body)).toEqual({ authorizedDomains: ['localhost', 'pr1.vercel.app'] });
    });
});
