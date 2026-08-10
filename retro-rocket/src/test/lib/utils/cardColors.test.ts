import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getCardColorHex,
    getColorConfig,
    getAvailableColors,
    isValidColor,
    getSuggestedColorForColumn,
    validateColor,
    getDefaultColor,
    getCardStyling,
    resolveCardColor,
    CARD_COLORS
} from '@/lib/utils/cardColors';
import { CardColor } from '@/features/boards/types/card';

// spec 037: catalog curated from 30 colors down to 15 (data-model.md's
// "Color Catalog Curation Mapping"). This is the finalized 15-member
// curated catalog, mirrored here so tests don't silently drift from
// getAvailableColors()'s own source of truth.
const CURATED_COLORS: CardColor[] = [
    'pastelWhite', 'pastelBlue', 'pastelGreen', 'pastelYellow', 'pastelRed',
    'pastelPurple', 'pastelOrange', 'pastelPink', 'pastelTeal', 'pastelGray',
    'pastelIndigo', 'pastelEmerald', 'pastelRose', 'pastelSky', 'pastelAmber',
];

// The finalized Color Catalog Curation Mapping (data-model.md, FR-013a):
// every color removed by curation → its closest surviving equivalent.
const REMAP_TABLE: Record<string, CardColor> = {
    pastelCyan: 'pastelTeal',
    pastelLime: 'pastelGreen',
    pastelSlate: 'pastelGray',
    pastelViolet: 'pastelPurple',
    pastelFuchsia: 'pastelPink',
    pastelMint: 'pastelTeal',
    pastelPeach: 'pastelOrange',
    pastelLavender: 'pastelPurple',
    pastelCream: 'pastelYellow',
    pastelCoral: 'pastelRed',
    pastelTurquoise: 'pastelTeal',
    pastelGold: 'pastelAmber',
    pastelSilver: 'pastelGray',
    pastelBronze: 'pastelOrange',
    pastelIvory: 'pastelWhite',
};

describe('cardColors utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCardColorHex', () => {
        it('should return correct hex colors for all 15 curated card colors', () => {
            expect(getCardColorHex('pastelWhite')).toBe('#FFFFFF');
            expect(getCardColorHex('pastelBlue')).toBe('#EFF6FF');
            expect(getCardColorHex('pastelGreen')).toBe('#F0FDF4');
            expect(getCardColorHex('pastelYellow')).toBe('#FEFCE8');
            expect(getCardColorHex('pastelRed')).toBe('#FEF2F2');
            expect(getCardColorHex('pastelPurple')).toBe('#FAF5FF');
            expect(getCardColorHex('pastelOrange')).toBe('#FFF7ED');
            expect(getCardColorHex('pastelPink')).toBe('#FDF2F8');
            expect(getCardColorHex('pastelTeal')).toBe('#F0FDFA');
            expect(getCardColorHex('pastelGray')).toBe('#F9FAFB');
            expect(getCardColorHex('pastelIndigo')).toBe('#EEF2FF');
            expect(getCardColorHex('pastelEmerald')).toBe('#ECFDF5');
            expect(getCardColorHex('pastelRose')).toBe('#FFF1F2');
            expect(getCardColorHex('pastelSky')).toBe('#F0F9FF');
            expect(getCardColorHex('pastelAmber')).toBe('#FFFBEB');
        });

        it('should resolve a curated-away legacy color to its remapped equivalent hex (FR-013a)', () => {
            // pastelCoral was removed and remaps to pastelRed.
            expect(getCardColorHex('pastelCoral')).toBe(getCardColorHex('pastelRed'));
            // pastelIvory was removed and remaps to pastelWhite (the identity/default).
            expect(getCardColorHex('pastelIvory')).toBe('#FFFFFF');
        });

        it('should return default color hex for a genuinely invalid color', () => {
            expect(getCardColorHex('not-a-real-color')).toBe('#FFFFFF');
        });
    });

    describe('getColorConfig', () => {
        it('should return correct config for card colors', () => {
            const config = getColorConfig('pastelGreen');
            expect(config).toBeDefined();
            expect(config.nameKey).toBe('colors.green');
            expect(config.value).toBe('pastelGreen');
            expect(config.background).toBe('bg-green-50');
            expect(config.border).toBe('border-green-200 dark:border-green-800');
        });

        it('should have all required properties in config', () => {
            const config = getColorConfig('pastelWhite');
            expect(config).toHaveProperty('nameKey');
            expect(config).toHaveProperty('value');
            expect(config).toHaveProperty('background');
            expect(config).toHaveProperty('border');
            expect(config).toHaveProperty('text');
            expect(config).toHaveProperty('preview');
            expect(config).toHaveProperty('ariaLabelKey');
            expect(config).toHaveProperty('tooltipKey');
        });

        it('should resolve a curated-away legacy color to its remapped config (FR-013a)', () => {
            const config = getColorConfig('pastelLavender');
            expect(config.value).toBe('pastelPurple');
        });
    });

    describe('isValidColor', () => {
        it('should return true for all 15 curated card colors', () => {
            CURATED_COLORS.forEach((color) => {
                expect(isValidColor(color)).toBe(true);
            });
        });

        it('should return false for a color removed by curation (not a current catalog member)', () => {
            expect(isValidColor('pastelCoral')).toBe(false);
            expect(isValidColor('pastelIvory')).toBe(false);
        });

        it('should return false for invalid colors', () => {
            expect(isValidColor('invalidColor')).toBe(false);
            expect(isValidColor('')).toBe(false);
            expect(isValidColor(undefined as unknown as string)).toBe(false);
            expect(isValidColor(null as unknown as string)).toBe(false);
        });
    });

    describe('getAvailableColors', () => {
        it('should return all 15 curated card color options in the reviewed panel order', () => {
            const colors = getAvailableColors();
            expect(colors).toHaveLength(15);
            expect(colors).toEqual(CURATED_COLORS);
        });

        it('should contain only unique colors', () => {
            const colors = getAvailableColors();
            const uniqueColors = [...new Set(colors)];
            expect(colors).toHaveLength(uniqueColors.length);
        });

        it('should exactly match the CARD_COLORS catalog keys', () => {
            const colors = getAvailableColors();
            expect(colors.sort()).toEqual(Object.keys(CARD_COLORS).sort());
        });
    });

    describe('resolveCardColor (FR-013a Color Catalog Curation Mapping)', () => {
        it('should pass through every already-curated color unchanged (identity)', () => {
            CURATED_COLORS.forEach((color) => {
                expect(resolveCardColor(color)).toBe(color);
            });
        });

        it('should remap every removed color to its documented closest equivalent', () => {
            Object.entries(REMAP_TABLE).forEach(([previousColor, newColor]) => {
                expect(resolveCardColor(previousColor)).toBe(newColor);
            });
        });

        it('should map the neutral/default color to itself (FR-012 identity)', () => {
            expect(resolveCardColor('pastelWhite')).toBe('pastelWhite');
            expect(resolveCardColor('pastelIvory')).toBe('pastelWhite');
        });

        it('should fall back to the neutral default for a genuinely unrecognized value', () => {
            expect(resolveCardColor('not-a-real-color')).toBe('pastelWhite');
        });

        it('should fall back to the neutral default for null/undefined/empty', () => {
            expect(resolveCardColor(undefined)).toBe('pastelWhite');
            expect(resolveCardColor(null)).toBe('pastelWhite');
            expect(resolveCardColor('')).toBe('pastelWhite');
        });

        it('should achieve total coverage: every pre-curation (30-member) color resolves to a member of the current 15-color catalog', () => {
            const preCurationColors = [...CURATED_COLORS, ...Object.keys(REMAP_TABLE)];
            expect(preCurationColors).toHaveLength(30);
            preCurationColors.forEach((color) => {
                expect(isValidColor(resolveCardColor(color))).toBe(true);
            });
        });
    });

    describe('getSuggestedColorForColumn', () => {
        it('should return correct colors for default template column IDs', () => {
            expect(getSuggestedColorForColumn('', 'helped')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('', 'hindered')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('', 'improve')).toBe('pastelYellow');
        });

        it('should return correct colors for madSadGlad template column IDs', () => {
            expect(getSuggestedColorForColumn('', 'mad')).toBe('pastelOrange');
            expect(getSuggestedColorForColumn('', 'sad')).toBe('pastelGray');
            expect(getSuggestedColorForColumn('', 'glad')).toBe('pastelGreen');
        });

        it('should return correct colors for startStopContinue template column IDs', () => {
            expect(getSuggestedColorForColumn('', 'start')).toBe('pastelTeal');
            expect(getSuggestedColorForColumn('', 'stop')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('', 'continue')).toBe('pastelBlue');
        });

        it('should return correct color for action items column', () => {
            expect(getSuggestedColorForColumn('', 'actionItems')).toBe('pastelYellow');
        });

        it('should fallback to title-based mapping when columnId is not specific', () => {
            expect(getSuggestedColorForColumn('Qué ayudó')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('Qué retrasó')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('Qué mejorar')).toBe('pastelYellow');
            expect(getSuggestedColorForColumn('What went well')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('What hindered')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('Action items')).toBe('pastelYellow');
        });

        it('should handle case-insensitive title matching', () => {
            expect(getSuggestedColorForColumn('AYUDÓ')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('RETRASÓ')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('MEJORAR')).toBe('pastelYellow');
        });

        it('should return default for unknown columns', () => {
            expect(getSuggestedColorForColumn('Unknown column')).toBe('pastelWhite');
            expect(getSuggestedColorForColumn('')).toBe('pastelWhite');
            expect(getSuggestedColorForColumn('Random text')).toBe('pastelWhite');
        });
    });

    describe('validateColor', () => {
        it('should return valid color as-is', () => {
            expect(validateColor('pastelGreen')).toBe('pastelGreen');
        });

        it('should remap a curated-away color to its closest equivalent, not reset to default (FR-013a)', () => {
            // Confirms validateColor now delegates to resolveCardColor rather
            // than performing the previously-rejected reset-to-neutral behavior.
            expect(validateColor('pastelCoral')).toBe('pastelRed');
            expect(validateColor('pastelLavender')).toBe('pastelPurple');
        });

        it('should return default for a genuinely invalid color or empty input', () => {
            expect(validateColor('invalidColor')).toBe('pastelWhite');
            expect(validateColor(undefined)).toBe('pastelWhite');
            expect(validateColor(null)).toBe('pastelWhite');
        });
    });

    describe('getDefaultColor', () => {
        it('should return pastelWhite as default', () => {
            expect(getDefaultColor()).toBe('pastelWhite');
        });
    });

    describe('getCardStyling', () => {
        it('should return correct CSS classes for card colors', () => {
            const styling = getCardStyling('pastelGreen');
            expect(styling).toContain('card-color-bg');
            expect(styling).toContain('bg-green-50');
            expect(styling).toContain('border-green-200');
            expect(styling).toContain('text-green-800');
        });

        it('should use default color when no color provided', () => {
            const styling = getCardStyling();
            expect(styling).toContain('bg-white');
            expect(styling).toContain('border-gray-200');
        });

        it('should handle every curated color variant', () => {
            const skyStyle = getCardStyling('pastelSky');
            expect(skyStyle).toContain('bg-sky-50');
            expect(skyStyle).toContain('border-sky-200');
            expect(skyStyle).toContain('text-sky-800');

            const amberStyle = getCardStyling('pastelAmber');
            expect(amberStyle).toContain('bg-amber-50');
            expect(amberStyle).toContain('border-amber-200');
            expect(amberStyle).toContain('text-amber-800');
        });

        it('should style a card holding a curated-away legacy color via its remapped equivalent (FR-013a)', () => {
            const legacyStyle = getCardStyling('pastelGold');
            const amberStyle = getCardStyling('pastelAmber');
            expect(legacyStyle).toBe(amberStyle);
        });
    });

    describe('Color Configuration Quality', () => {
        it('should ensure all colors have complete configuration', () => {
            const colors = getAvailableColors();

            colors.forEach(color => {
                const config = getColorConfig(color);
                expect(config.nameKey).toBeTruthy();
                expect(config.value).toBe(color);
                expect(config.background).toBeTruthy();
                expect(config.border).toBeTruthy();
                expect(config.text).toBeTruthy();
                expect(config.preview).toBeTruthy();
                expect(config.ariaLabelKey).toBeTruthy();
                expect(config.tooltipKey).toBeTruthy();
            });
        });

        it('should have unique name keys for all colors', () => {
            const colors = getAvailableColors();
            const nameKeys = colors.map(color => getColorConfig(color).nameKey);
            const uniqueNameKeys = [...new Set(nameKeys)];
            expect(nameKeys).toHaveLength(uniqueNameKeys.length);
        });

        it('should have aria-label keys following the colors.<slug>_aria convention', () => {
            const colors = getAvailableColors();

            colors.forEach(color => {
                const config = getColorConfig(color);
                expect(config.ariaLabelKey).toMatch(/^colors\.\w+_aria$/);
            });
        });
    });

    describe('Template Color Integration', () => {
        it('should provide appropriate colors for emotional states', () => {
            // Positive emotions should have warm/bright colors
            expect(['pastelGreen', 'pastelYellow', 'pastelBlue'].includes(getSuggestedColorForColumn('', 'helped'))).toBe(true);
            expect(['pastelGreen', 'pastelBlue', 'pastelTeal'].includes(getSuggestedColorForColumn('', 'glad'))).toBe(true);

            // Negative emotions should have cooler/neutral colors
            expect(['pastelRed', 'pastelOrange', 'pastelPink'].includes(getSuggestedColorForColumn('', 'hindered'))).toBe(true);
            expect(['pastelGray', 'pastelOrange'].includes(getSuggestedColorForColumn('', 'mad'))).toBe(true);
        });

        it('should provide consistent action-oriented colors', () => {
            // Action items should consistently use yellow/amber tones
            expect(['pastelYellow', 'pastelAmber'].includes(getSuggestedColorForColumn('', 'actionItems'))).toBe(true);
            expect(['pastelYellow', 'pastelAmber'].includes(getSuggestedColorForColumn('', 'improve'))).toBe(true);
        });
    });
});
