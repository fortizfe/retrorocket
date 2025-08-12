import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    getCardColorHex,
    getColorConfig,
    getAvailableColors,
    isValidColor,
    getSuggestedColorForColumn,
    validateColor,
    getDefaultColor,
    getCardStyling
} from '../../utils/cardColors';

describe('cardColors utilities', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getCardColorHex', () => {
        it('should return correct hex colors for all 30 card colors', () => {
            // Original 10 colors
            expect(getCardColorHex('pastelWhite')).toBe('#FFFFFF');
            expect(getCardColorHex('pastelGreen')).toBe('#F0FDF4');
            expect(getCardColorHex('pastelRed')).toBe('#FEF2F2');
            expect(getCardColorHex('pastelYellow')).toBe('#FEFCE8');
            expect(getCardColorHex('pastelBlue')).toBe('#EFF6FF');
            expect(getCardColorHex('pastelPurple')).toBe('#FAF5FF');
            expect(getCardColorHex('pastelOrange')).toBe('#FFF7ED');
            expect(getCardColorHex('pastelPink')).toBe('#FDF2F8');
            expect(getCardColorHex('pastelTeal')).toBe('#F0FDFA');
            expect(getCardColorHex('pastelGray')).toBe('#F9FAFB');

            // Extended colors (8 more)
            expect(getCardColorHex('pastelIndigo')).toBe('#EEF2FF');
            expect(getCardColorHex('pastelEmerald')).toBe('#ECFDF5');
            expect(getCardColorHex('pastelAmber')).toBe('#FFFBEB');
            expect(getCardColorHex('pastelCyan')).toBe('#ECFEFF');
            expect(getCardColorHex('pastelLime')).toBe('#F7FEE7');
            expect(getCardColorHex('pastelRose')).toBe('#FFF1F2');
            expect(getCardColorHex('pastelSlate')).toBe('#F8FAFC');
            expect(getCardColorHex('pastelViolet')).toBe('#F5F3FF');

            // Latest expansion (12 more) - Total 30 colors
            expect(getCardColorHex('pastelSky')).toBe('#F0F9FF');
            expect(getCardColorHex('pastelFuchsia')).toBe('#FDF4FF');
            expect(getCardColorHex('pastelMint')).toBe('#F0FDF9');
            expect(getCardColorHex('pastelPeach')).toBe('#FFF8F1');
            expect(getCardColorHex('pastelLavender')).toBe('#FAF5FF');
            expect(getCardColorHex('pastelCream')).toBe('#FFFEF7');
            expect(getCardColorHex('pastelCoral')).toBe('#FEF7F7');
            expect(getCardColorHex('pastelTurquoise')).toBe('#F0FFFE');
            expect(getCardColorHex('pastelGold')).toBe('#FFFDF2');
            expect(getCardColorHex('pastelSilver')).toBe('#FEFFFE');
            expect(getCardColorHex('pastelBronze')).toBe('#FFF9F5');
            expect(getCardColorHex('pastelIvory')).toBe('#FEFEF9');
        });

        it('should return default color for invalid color', () => {
            expect(getCardColorHex('invalidColor' as any)).toBe('#FFFFFF');
        });
    });

    describe('getColorConfig', () => {
        it('should return correct config for card colors', () => {
            const config = getColorConfig('pastelGreen');
            expect(config).toBeDefined();
            expect(config.name).toBe('Verde Menta Suave');
            expect(config.value).toBe('pastelGreen');
            expect(config.background).toBe('bg-green-50');
            expect(config.border).toBe('border-green-200');
        });

        it('should have all required properties in config', () => {
            const config = getColorConfig('pastelWhite');
            expect(config).toHaveProperty('name');
            expect(config).toHaveProperty('value');
            expect(config).toHaveProperty('background');
            expect(config).toHaveProperty('border');
            expect(config).toHaveProperty('text');
            expect(config).toHaveProperty('preview');
            expect(config).toHaveProperty('ariaLabel');
            expect(config).toHaveProperty('tooltip');
        });
    });

    describe('isValidColor', () => {
        it('should return true for all 30 valid card colors', () => {
            // Original 10 colors
            expect(isValidColor('pastelWhite')).toBe(true);
            expect(isValidColor('pastelGreen')).toBe(true);
            expect(isValidColor('pastelRed')).toBe(true);
            expect(isValidColor('pastelYellow')).toBe(true);
            expect(isValidColor('pastelBlue')).toBe(true);
            expect(isValidColor('pastelPurple')).toBe(true);
            expect(isValidColor('pastelOrange')).toBe(true);
            expect(isValidColor('pastelPink')).toBe(true);
            expect(isValidColor('pastelTeal')).toBe(true);
            expect(isValidColor('pastelGray')).toBe(true);

            // Extended colors
            expect(isValidColor('pastelIndigo')).toBe(true);
            expect(isValidColor('pastelEmerald')).toBe(true);
            expect(isValidColor('pastelAmber')).toBe(true);
            expect(isValidColor('pastelCyan')).toBe(true);
            expect(isValidColor('pastelLime')).toBe(true);
            expect(isValidColor('pastelRose')).toBe(true);
            expect(isValidColor('pastelSlate')).toBe(true);
            expect(isValidColor('pastelViolet')).toBe(true);

            // Latest expansion
            expect(isValidColor('pastelSky')).toBe(true);
            expect(isValidColor('pastelFuchsia')).toBe(true);
            expect(isValidColor('pastelMint')).toBe(true);
            expect(isValidColor('pastelPeach')).toBe(true);
            expect(isValidColor('pastelLavender')).toBe(true);
            expect(isValidColor('pastelCream')).toBe(true);
            expect(isValidColor('pastelCoral')).toBe(true);
            expect(isValidColor('pastelTurquoise')).toBe(true);
            expect(isValidColor('pastelGold')).toBe(true);
            expect(isValidColor('pastelSilver')).toBe(true);
            expect(isValidColor('pastelBronze')).toBe(true);
            expect(isValidColor('pastelIvory')).toBe(true);
        });

        it('should return false for invalid colors', () => {
            expect(isValidColor('invalidColor')).toBe(false);
            expect(isValidColor('')).toBe(false);
            expect(isValidColor(undefined as any)).toBe(false);
            expect(isValidColor(null as any)).toBe(false);
        });
    });

    describe('getAvailableColors', () => {
        it('should return all 30 valid card color options in correct order', () => {
            const colors = getAvailableColors();
            expect(colors).toHaveLength(30);
            expect(colors).toEqual([
                'pastelWhite',
                'pastelGreen',
                'pastelRed',
                'pastelYellow',
                'pastelBlue',
                'pastelPurple',
                'pastelOrange',
                'pastelPink',
                'pastelTeal',
                'pastelGray',
                'pastelIndigo',
                'pastelEmerald',
                'pastelAmber',
                'pastelCyan',
                'pastelLime',
                'pastelRose',
                'pastelSlate',
                'pastelViolet',
                'pastelSky',
                'pastelFuchsia',
                'pastelMint',
                'pastelPeach',
                'pastelLavender',
                'pastelCream',
                'pastelCoral',
                'pastelTurquoise',
                'pastelGold',
                'pastelSilver',
                'pastelBronze',
                'pastelIvory'
            ]);
        });

        it('should contain only unique colors', () => {
            const colors = getAvailableColors();
            const uniqueColors = [...new Set(colors)];
            expect(colors).toHaveLength(uniqueColors.length);
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

        it('should return default for invalid color', () => {
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

        it('should handle all new color variants', () => {
            // Test some of the new colors
            const skyStyle = getCardStyling('pastelSky');
            expect(skyStyle).toContain('bg-sky-50');
            expect(skyStyle).toContain('border-sky-200');
            expect(skyStyle).toContain('text-sky-800');

            const goldStyle = getCardStyling('pastelGold');
            expect(goldStyle).toContain('bg-amber-25');
            expect(goldStyle).toContain('border-amber-100');
            expect(goldStyle).toContain('text-amber-900');
        });
    });

    describe('Color Configuration Quality', () => {
        it('should ensure all colors have complete configuration', () => {
            const colors = getAvailableColors();

            colors.forEach(color => {
                const config = getColorConfig(color);
                expect(config.name).toBeTruthy();
                expect(config.value).toBe(color);
                expect(config.background).toBeTruthy();
                expect(config.border).toBeTruthy();
                expect(config.text).toBeTruthy();
                expect(config.preview).toBeTruthy();
                expect(config.ariaLabel).toBeTruthy();
                expect(config.tooltip).toBeTruthy();
            });
        });

        it('should have unique names for all colors', () => {
            const colors = getAvailableColors();
            const names = colors.map(color => getColorConfig(color).name);
            const uniqueNames = [...new Set(names)];
            expect(names).toHaveLength(uniqueNames.length);
        });

        it('should have proper accessibility labels', () => {
            const colors = getAvailableColors();

            colors.forEach(color => {
                const config = getColorConfig(color);
                expect(config.ariaLabel).toContain('Seleccionar color');
                expect(config.ariaLabel.length).toBeGreaterThan(10);
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
            expect(['pastelGray', 'pastelSlate', 'pastelOrange'].includes(getSuggestedColorForColumn('', 'mad'))).toBe(true);
        });

        it('should provide consistent action-oriented colors', () => {
            // Action items should consistently use yellow tones
            expect(['pastelYellow', 'pastelAmber', 'pastelGold'].includes(getSuggestedColorForColumn('', 'actionItems'))).toBe(true);
            expect(['pastelYellow', 'pastelAmber', 'pastelGold'].includes(getSuggestedColorForColumn('', 'improve'))).toBe(true);
        });
    });
});
