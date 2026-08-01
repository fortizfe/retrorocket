import { describe, it, expect } from 'vitest';
import { classifyOrigin } from '../../../src/domain/mcp/ConnectionOrigin';

describe('classifyOrigin', () => {
    it('classifies an Electron-based desktop app User-Agent as desktop', () => {
        const ua =
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ClaudeDesktop/1.2.3 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36';
        expect(classifyOrigin(ua)).toBe('desktop');
    });

    it('classifies an iPhone Safari User-Agent as mobile', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
        expect(classifyOrigin(ua)).toBe('mobile');
    });

    it('classifies an Android browser User-Agent as mobile', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
        expect(classifyOrigin(ua)).toBe('mobile');
    });

    it('classifies a plain desktop-browser User-Agent (no Electron/Mobile marker) as web', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        expect(classifyOrigin(ua)).toBe('web');
    });

    it('classifies an undefined User-Agent as unknown', () => {
        expect(classifyOrigin(undefined)).toBe('unknown');
    });

    it('classifies an empty User-Agent as unknown', () => {
        expect(classifyOrigin('')).toBe('unknown');
    });

    it('classifies a non-browser User-Agent as unknown', () => {
        expect(classifyOrigin('curl/8.0.1')).toBe('unknown');
    });
});
