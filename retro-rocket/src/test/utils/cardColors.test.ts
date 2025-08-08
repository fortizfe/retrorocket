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
        it('should return correct hex colors for card colors', () => {
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
        it('should return true for valid card colors', () => {
            expect(isValidColor('pastelWhite')).toBe(true);
            expect(isValidColor('pastelGreen')).toBe(true);
            expect(isValidColor('pastelRed')).toBe(true);
        });

        it('should return false for invalid colors', () => {
            expect(isValidColor('invalidColor')).toBe(false);
            expect(isValidColor('')).toBe(false);
        });
    });

    describe('getAvailableColors', () => {
        it('should return all valid card color options', () => {
            const colors = getAvailableColors();
            expect(colors).toHaveLength(10);
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
                'pastelGray'
            ]);
        });
    });

    describe('getSuggestedColorForColumn', () => {
        it('should return correct colors for column IDs', () => {
            expect(getSuggestedColorForColumn('', 'helped')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('', 'hindered')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('', 'improve')).toBe('pastelYellow');
        });

        it('should fallback to title-based mapping', () => {
            expect(getSuggestedColorForColumn('Qué ayudó')).toBe('pastelGreen');
            expect(getSuggestedColorForColumn('Qué retrasó')).toBe('pastelRed');
            expect(getSuggestedColorForColumn('Qué mejorar')).toBe('pastelYellow');
        });

        it('should return default for unknown columns', () => {
            expect(getSuggestedColorForColumn('Unknown column')).toBe('pastelWhite');
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
    });
});
