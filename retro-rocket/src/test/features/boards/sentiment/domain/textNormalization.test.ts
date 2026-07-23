import { describe, it, expect } from 'vitest';
import { normalizeForInference } from '@/features/boards/sentiment/domain/textNormalization';

describe('normalizeForInference', () => {
    it('trims and collapses internal whitespace', () => {
        expect(normalizeForInference('  hola   mundo \n\t equipo ')).toBe('hola mundo equipo');
    });

    it('strips bare URLs', () => {
        expect(normalizeForInference('great work see https://example.com/report for details'))
            .toBe('great work see for details');
        expect(normalizeForInference('check www.example.com now please')).toBe('check now please');
    });

    it('returns null for fewer than 3 non-whitespace characters', () => {
        expect(normalizeForInference('ok')).toBeNull();
        expect(normalizeForInference('  a  ')).toBeNull();
        expect(normalizeForInference('')).toBeNull();
        expect(normalizeForInference('   ')).toBeNull();
    });

    it('returns null when only a URL remains', () => {
        expect(normalizeForInference('https://example.com')).toBeNull();
    });

    it('keeps content with exactly 3 non-whitespace characters', () => {
        expect(normalizeForInference('abc')).toBe('abc');
    });

    it('caps length at 512 characters on a word boundary', () => {
        const word = 'palabra ';
        const long = word.repeat(100); // 800 chars
        const out = normalizeForInference(long)!;
        expect(out.length).toBeLessThanOrEqual(512);
        // cut on a word boundary → no trailing partial word / space
        expect(out.endsWith('palabra')).toBe(true);
        expect(out).not.toContain('  ');
    });

    it('falls back to the hard cap for a single very long token', () => {
        const out = normalizeForInference('x'.repeat(600))!;
        expect(out.length).toBe(512);
    });
});
