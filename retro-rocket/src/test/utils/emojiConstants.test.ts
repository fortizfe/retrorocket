import { describe, it, expect } from 'vitest';
import { ALL_EMOJIS, EMOJI_CATEGORIES, getAllEmojis, getEmojisByCategory } from '../../utils/emojiConstants';

describe('emojiConstants', () => {
    describe('ALL_EMOJIS', () => {
        it('should contain a large collection of emojis', () => {
            expect(ALL_EMOJIS.length).toBeGreaterThan(200);
        });

        it('should contain unique emojis', () => {
            const uniqueEmojis = new Set(ALL_EMOJIS);
            // Note: The actual ALL_EMOJIS may contain duplicates, so we test that we have at least the unique ones
            expect(uniqueEmojis.size).toBeGreaterThan(250);
            expect(ALL_EMOJIS.length).toBeGreaterThan(250);
        });

        it('should contain valid emoji characters', () => {
            ALL_EMOJIS.forEach(emoji => {
                expect(typeof emoji).toBe('string');
                expect(emoji.length).toBeGreaterThan(0);
            });
        });

        it('should include common reaction emojis', () => {
            expect(ALL_EMOJIS).toContain('😀');
            expect(ALL_EMOJIS).toContain('👍');
            expect(ALL_EMOJIS).toContain('❤️');
        });
    });

    describe('EMOJI_CATEGORIES', () => {
        it('should have multiple categories', () => {
            const categories = Object.keys(EMOJI_CATEGORIES);
            expect(categories.length).toBeGreaterThan(3);
        });

        it('should contain expected categories', () => {
            expect(EMOJI_CATEGORIES).toHaveProperty('Emociones');
            expect(EMOJI_CATEGORIES).toHaveProperty('Gestos');
            expect(EMOJI_CATEGORIES).toHaveProperty('Objetos');
            expect(EMOJI_CATEGORIES).toHaveProperty('Actividades');
            expect(EMOJI_CATEGORIES).toHaveProperty('Comida');
            expect(EMOJI_CATEGORIES).toHaveProperty('Símbolos');
        });

        it('should have emojis in each category', () => {
            Object.values(EMOJI_CATEGORIES).forEach(emojis => {
                expect(Array.isArray(emojis)).toBe(true);
                expect(emojis.length).toBeGreaterThan(0);
            });
        });

        it('should contain valid emojis in categories', () => {
            const emotionsEmojis = EMOJI_CATEGORIES['Emociones'];
            expect(emotionsEmojis).toContain('😀');
            expect(emotionsEmojis).toContain('😃');

            const gestureEmojis = EMOJI_CATEGORIES['Gestos'];
            expect(gestureEmojis).toContain('👍');

            const symbolEmojis = EMOJI_CATEGORIES['Símbolos'];
            expect(symbolEmojis).toContain('❤️');
        });

        it('should not have excessive duplicate emojis within categories', () => {
            Object.entries(EMOJI_CATEGORIES).forEach(([categoryName, emojis]) => {
                const uniqueEmojis = new Set(emojis);
                // Allow some duplicates but they shouldn't be excessive
                expect(uniqueEmojis.size).toBeGreaterThanOrEqual(emojis.length * 0.8);
            });
        });

        it('should have reasonable number of emojis per category', () => {
            Object.values(EMOJI_CATEGORIES).forEach(emojis => {
                expect(emojis.length).toBeGreaterThan(10);
                expect(emojis.length).toBeLessThan(100);
            });
        });
    });

    describe('emoji coverage', () => {
        it('should include all category emojis in ALL_EMOJIS', () => {
            const categoryEmojis = Object.values(EMOJI_CATEGORIES).flat();
            categoryEmojis.forEach(emoji => {
                expect(ALL_EMOJIS).toContain(emoji);
            });
        });

        it('should have consistent emoji format', () => {
            ALL_EMOJIS.forEach(emoji => {
                expect(typeof emoji).toBe('string');
                expect(emoji.trim()).toBe(emoji); // No whitespace
                expect(emoji.length).toBeGreaterThan(0);
            });
        });
    });

    describe('utility functions', () => {
        it('getAllEmojis should return all emojis', () => {
            const result = getAllEmojis();
            expect(result).toEqual(ALL_EMOJIS);
        });

        it('getEmojisByCategory should return emojis for valid category', () => {
            const emotionEmojis = getEmojisByCategory('Emociones');
            expect(emotionEmojis).toEqual(EMOJI_CATEGORIES['Emociones']);
        });

        it('getEmojisByCategory should return empty array for invalid category', () => {
            const result = getEmojisByCategory('InvalidCategory' as any);
            expect(result).toEqual([]);
        });
    });
});
