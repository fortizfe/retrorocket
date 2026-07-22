import { describe, it, expect } from 'vitest';
import {
    parseColor,
    relativeLuminance,
    contrastRatio,
    meetsAA,
    aaThreshold,
    AA_NORMAL_TEXT,
    AA_LARGE_TEXT,
} from '@/lib/theme/contrast';

describe('parseColor', () => {
    it('parses 6-digit hex', () => {
        expect(parseColor('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 });
        expect(parseColor('#3b82f6')).toEqual({ r: 59, g: 130, b: 246 });
    });

    it('parses shorthand 3-digit hex', () => {
        expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
        expect(parseColor('#000')).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('parses space-separated channels (CSS custom-property format)', () => {
        expect(parseColor('248 250 252')).toEqual({ r: 248, g: 250, b: 252 });
    });

    it('parses comma-separated and rgb() forms', () => {
        expect(parseColor('15, 23, 42')).toEqual({ r: 15, g: 23, b: 42 });
        expect(parseColor('rgb(15 23 42)')).toEqual({ r: 15, g: 23, b: 42 });
    });

    it('throws on invalid input', () => {
        expect(() => parseColor('#12')).toThrow();
        expect(() => parseColor('300 0 0')).toThrow();
        expect(() => parseColor('not-a-color')).toThrow();
    });
});

describe('relativeLuminance', () => {
    it('is 0 for black and 1 for white', () => {
        expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
        expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    });
});

describe('contrastRatio', () => {
    it('is 21:1 for black on white', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    });

    it('is 1:1 for identical colors', () => {
        expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 5);
    });

    it('is order-independent', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(
            contrastRatio('#ffffff', '#000000'),
            5,
        );
    });

    it('matches a known reference pair (#767676 on white ≈ 4.54)', () => {
        // #767676 on white is the canonical "just passes AA normal text" grey.
        expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio('#767676', '#ffffff')).toBeLessThan(4.6);
    });
});

describe('aaThreshold', () => {
    it('is 4.5 for normal text and 3 for large / non-text', () => {
        expect(aaThreshold()).toBe(AA_NORMAL_TEXT);
        expect(aaThreshold({ large: true })).toBe(AA_LARGE_TEXT);
        expect(aaThreshold({ nonText: true })).toBe(AA_LARGE_TEXT);
    });
});

describe('meetsAA', () => {
    it('passes black on white for normal text', () => {
        expect(meetsAA('#000000', '#ffffff')).toBe(true);
    });

    it('fails a low-contrast pair for both normal and large text', () => {
        // #aaaaaa on white ≈ 2.32:1 — below 4.5 and below 3.
        const fg = '#aaaaaa';
        const bg = '#ffffff';
        expect(contrastRatio(fg, bg)).toBeLessThan(3);
        expect(meetsAA(fg, bg)).toBe(false);
        expect(meetsAA(fg, bg, { large: true })).toBe(false);
    });

    it('treats a ~3.1:1 pair as passing for large/non-text only', () => {
        const fg = '#8a8a8a';
        const bg = '#ffffff';
        const ratio = contrastRatio(fg, bg);
        expect(ratio).toBeGreaterThanOrEqual(3);
        expect(ratio).toBeLessThan(4.5);
        expect(meetsAA(fg, bg)).toBe(false);
        expect(meetsAA(fg, bg, { large: true })).toBe(true);
        expect(meetsAA(fg, bg, { nonText: true })).toBe(true);
    });
});
