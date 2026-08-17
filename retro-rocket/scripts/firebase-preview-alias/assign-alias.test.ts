import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSlot, slotHostname, run } from './assign-alias.mjs';

vi.mock('node:child_process', () => {
    const execFileSync = vi.fn();
    return { execFileSync, default: { execFileSync } };
});

import { execFileSync } from 'node:child_process';

describe('computeSlot', () => {
    it('maps PR number 0 to slot 1', () => {
        expect(computeSlot(0)).toBe(1);
    });

    it('maps PR number 4 to slot 5 (last slot before wrapping)', () => {
        expect(computeSlot(4)).toBe(5);
    });

    it('wraps back to slot 1 at PR number 5', () => {
        expect(computeSlot(5)).toBe(1);
    });

    it('respects a custom pool size', () => {
        expect(computeSlot(2, 3)).toBe(3);
        expect(computeSlot(3, 3)).toBe(1);
    });

    it('throws for a non-integer PR number', () => {
        expect(() => computeSlot(1.5)).toThrow();
    });

    it('throws for a negative PR number', () => {
        expect(() => computeSlot(-1)).toThrow();
    });
});

describe('slotHostname', () => {
    it('builds the expected retro-rocket-pr-slot-<n>.vercel.app hostname', () => {
        expect(slotHostname(3)).toBe('retro-rocket-pr-slot-3.vercel.app');
    });
});

describe('assign-alias.mjs run()', () => {
    beforeEach(() => {
        vi.mocked(execFileSync).mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('set-redirect subcommand', () => {
        it('exits 1 when --pr, --branch, or --token is missing', async () => {
            expect(await run(['set-redirect', '--branch', 'b', '--token', 't'])).toBe(1);
            expect(await run(['set-redirect', '--pr', '7', '--token', 't'])).toBe(1);
            expect(await run(['set-redirect', '--pr', '7', '--branch', 'b'])).toBe(1);
            expect(execFileSync).not.toHaveBeenCalled();
        });

        it('removes any existing branch-scoped override, adds the computed one, and exits 0', async () => {
            vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

            const exitCode = await run(['set-redirect', '--pr', '7', '--branch', 'feat/x', '--token', 'secret-token']);

            expect(exitCode).toBe(0);
            expect(execFileSync).toHaveBeenNthCalledWith(1, 'vercel', [
                'env',
                'rm',
                'OAUTH_REDIRECT_BASE_URL',
                'preview',
                'feat/x',
                '--yes',
                '--token',
                'secret-token',
            ]);
            expect(execFileSync).toHaveBeenNthCalledWith(
                2,
                'vercel',
                ['env', 'add', 'OAUTH_REDIRECT_BASE_URL', 'preview', 'feat/x', '--token', 'secret-token'],
                { input: 'https://retro-rocket-pr-slot-3.vercel.app' },
            );
            expect(logSpy).toHaveBeenCalledWith('slot=3');
            expect(logSpy).toHaveBeenCalledWith(
                'OAUTH_REDIRECT_BASE_URL=https://retro-rocket-pr-slot-3.vercel.app',
            );
        });

        it('tolerates the remove call failing (nothing to remove on a first deploy) and still adds', async () => {
            vi.mocked(execFileSync)
                .mockImplementationOnce(() => {
                    throw new Error('not found');
                })
                .mockReturnValueOnce(Buffer.from(''));

            const exitCode = await run(['set-redirect', '--pr', '7', '--branch', 'feat/x', '--token', 'secret-token']);

            expect(exitCode).toBe(0);
            expect(execFileSync).toHaveBeenCalledTimes(2);
        });

        it('exits 1 (without swallowing the error) when the add call fails', async () => {
            vi.mocked(execFileSync)
                .mockImplementationOnce(() => Buffer.from('')) // rm succeeds
                .mockImplementationOnce(() => {
                    throw new Error('add failed');
                });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            const exitCode = await run(['set-redirect', '--pr', '7', '--branch', 'feat/x', '--token', 'secret-token']);

            expect(exitCode).toBe(1);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('add failed'));
        });
    });

    describe('alias subcommand', () => {
        it('exits 1 when --pr, --url, or --token is missing', async () => {
            expect(await run(['alias', '--url', 'https://x.vercel.app', '--token', 't'])).toBe(1);
            expect(await run(['alias', '--pr', '1', '--token', 't'])).toBe(1);
            expect(await run(['alias', '--pr', '1', '--url', 'https://x.vercel.app'])).toBe(1);
            expect(execFileSync).not.toHaveBeenCalled();
        });

        it('runs vercel alias set with the computed slot hostname and exits 0 on success', async () => {
            vi.mocked(execFileSync).mockReturnValue(Buffer.from(''));

            const exitCode = await run([
                'alias',
                '--pr',
                '8',
                '--url',
                'https://retro-rocket-abc123.vercel.app',
                '--token',
                'secret-token',
            ]);

            expect(exitCode).toBe(0);
            expect(execFileSync).toHaveBeenCalledWith('vercel', [
                'alias',
                'set',
                'https://retro-rocket-abc123.vercel.app',
                'retro-rocket-pr-slot-4.vercel.app',
                '--token',
                'secret-token',
            ]);
        });

        it('exits 1 (without swallowing the error) when vercel alias set fails', async () => {
            vi.mocked(execFileSync).mockImplementation(() => {
                throw new Error('non-zero exit');
            });
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

            const exitCode = await run([
                'alias',
                '--pr',
                '8',
                '--url',
                'https://retro-rocket-abc123.vercel.app',
                '--token',
                'secret-token',
            ]);

            expect(exitCode).toBe(1);
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('non-zero exit'));
        });
    });

    it('exits 1 for an unknown subcommand', async () => {
        const exitCode = await run(['bogus']);
        expect(exitCode).toBe(1);
    });
});
