import { describe, it, expect } from 'vitest';
import { formatLocalizedDate } from '@/lib/utils/localeDate';

describe('formatLocalizedDate', () => {
    const date = new Date('2026-03-05T00:00:00Z');

    it('formats using the Spanish locale when language is "es"', () => {
        const result = formatLocalizedDate(date, 'es');
        expect(result).toBe(
            new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
        );
    });

    it('formats using the English locale when language is "en"', () => {
        const result = formatLocalizedDate(date, 'en');
        expect(result).toBe(
            new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
        );
    });

    it('produces different output for "en" vs "es" (regression guard against a hardcoded locale)', () => {
        const es = formatLocalizedDate(date, 'es');
        const en = formatLocalizedDate(date, 'en');
        expect(en).not.toBe(es);
    });

    it('falls back to Spanish formatting for an unrecognized language code', () => {
        const result = formatLocalizedDate(date, 'fr');
        expect(result).toBe(
            new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
        );
    });

    it('respects custom Intl.DateTimeFormatOptions', () => {
        const result = formatLocalizedDate(date, 'en', { day: '2-digit', month: '2-digit', year: 'numeric' });
        expect(result).toBe(
            new Intl.DateTimeFormat('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
        );
    });
});
