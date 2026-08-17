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

    describe('compute subcommand', () => {
        it('exits 1 when --pr is missing', async () => {
            const exitCode = await run(['compute']);
            expect(exitCode).toBe(1);
        });

        it('prints the computed slot and OAUTH_REDIRECT_BASE_URL and exits 0', async () => {
            const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

            const exitCode = await run(['compute', '--pr', '7']);

            expect(exitCode).toBe(0);
            expect(logSpy).toHaveBeenCalledWith('slot=3');
            expect(logSpy).toHaveBeenCalledWith(
                'OAUTH_REDIRECT_BASE_URL=https://retro-rocket-pr-slot-3.vercel.app',
            );
            expect(execFileSync).not.toHaveBeenCalled();
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
