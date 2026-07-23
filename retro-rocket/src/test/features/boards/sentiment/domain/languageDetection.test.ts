import { describe, it, expect } from 'vitest';
import { detectLanguage } from '@/features/boards/sentiment/domain/languageDetection';
import { LABELLED_CARDS } from '@/test/features/boards/sentiment/fixtures/cards';

describe('detectLanguage (FR-008/FR-009)', () => {
    it('detects Spanish from diacritics on short, informal text', () => {
        expect(detectLanguage('faltó tiempo')).toBe('es');
        expect(detectLanguage('reuniones eternas')).toBe('es');
        expect(detectLanguage('El equipo colaboró muy bien')).toBe('es');
    });

    it('detects English from stop-words on short, informal text', () => {
        expect(detectLanguage('great teamwork')).toBe('en');
        expect(detectLanguage('the meetings were a waste of time')).toBe('en');
        expect(detectLanguage('we fell behind on every deadline')).toBe('en');
    });

    it('returns unknown when there is no clear signal', () => {
        expect(detectLanguage('')).toBe('unknown');
        expect(detectLanguage('12345 :) !!!')).toBe('unknown');
        expect(detectLanguage('kubernetes docker')).toBe('unknown');
    });

    it('never throws on odd input', () => {
        expect(() => detectLanguage('   ')).not.toThrow();
        expect(() => detectLanguage('😀😀😀')).not.toThrow();
    });

    it('agrees with the human-tagged language on the bulk of the curated set', () => {
        // Short neutral cards can be ambiguous; require a strong majority, not 100%,
        // since detection only needs to route well enough to help accuracy.
        const decidable = LABELLED_CARDS.filter(c => detectLanguage(c.content) !== 'unknown');
        const correct = decidable.filter(c => detectLanguage(c.content) === c.lang).length;
        expect(correct / decidable.length).toBeGreaterThanOrEqual(0.85);
    });
});
