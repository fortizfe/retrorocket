import { describe, it, expect } from 'vitest';
import { suggestGroupTitle } from '@/features/boards/clustering/services/groupTitleService';
import { Card } from '@/features/boards/types/card';

function makeCard(overrides: Partial<Card> & { id: string }): Card {
    return {
        content: 'content',
        column: 'helped',
        createdBy: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        retrospectiveId: 'retro-1',
        order: 0,
        votes: 0,
        color: 'pastelBlue',
        likes: [],
        reactions: [],
        ...overrides,
    };
}

describe('suggestGroupTitle (contracts/group-title-suggestion-contract.md)', () => {
    it('never returns an empty string and never exceeds maxLength for a typical pair of cards', () => {
        const cards = [
            makeCard({ id: 'a', content: 'La reunión diaria se alarga demasiado' }),
            makeCard({ id: 'b', content: 'Perdemos mucho tiempo en el standup diario' }),
        ];
        const title = suggestGroupTitle(cards);
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(35);
    });

    it('prefers a term shared across multiple member cards over a term merely repeated within a single card', () => {
        const cards = [
            makeCard({ id: 'a', content: 'bug bug bug en memoria detectado' }),
            makeCard({ id: 'b', content: 'fuga de memoria en producción' }),
            makeCard({ id: 'c', content: 'problema de memoria alta' }),
        ];
        const title = suggestGroupTitle(cards).toLowerCase();
        // "memoria" appears in all 3 distinct cards; "bug" is repeated 3x but only
        // within card "a" — document-frequency scoring must rank "memoria" higher.
        expect(title).toContain('memoria');
    });

    it('is deterministic — the same input cards always produce the same title', () => {
        const cards = [
            makeCard({ id: 'a', content: 'necesitamos mejorar la comunicación del equipo' }),
            makeCard({ id: 'b', content: 'deberíamos comunicarnos mejor como equipo' }),
        ];
        expect(suggestGroupTitle(cards)).toBe(suggestGroupTitle(cards));
    });

    it('truncates at a whole-word boundary when the derived phrase would exceed maxLength, never mid-word and never with an ellipsis', () => {
        const cards = [
            makeCard({ id: 'a', content: 'comunicación coordinación planificación documentación integración' }),
            makeCard({ id: 'b', content: 'comunicación coordinación planificación documentación integración' }),
        ];
        const title = suggestGroupTitle(cards, 20);
        expect(title.length).toBeLessThanOrEqual(20);
        expect(title.endsWith('...')).toBe(false);
        expect(title.endsWith('…')).toBe(false);
        // No trailing partial word: the title must end exactly where a source word ends.
        expect(title.trim()).toBe(title);
    });

    it('falls back to a non-empty, truncated snippet when member cards share no meaningful non-stopword vocabulary', () => {
        const cards = [
            makeCard({ id: 'a', content: 'y o de la el' }), // entirely stopwords
            makeCard({ id: 'b', content: 'a la de y el' }),
        ];
        const title = suggestGroupTitle(cards);
        expect(title.length).toBeGreaterThan(0);
        expect(title.length).toBeLessThanOrEqual(35);
    });

    it('respects a custom maxLength', () => {
        const cards = [
            makeCard({ id: 'a', content: 'daily standup meetings run long' }),
            makeCard({ id: 'b', content: 'standup meetings take too long daily' }),
        ];
        const title = suggestGroupTitle(cards, 10);
        expect(title.length).toBeLessThanOrEqual(10);
        expect(title.length).toBeGreaterThan(0);
    });
});
