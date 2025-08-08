import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCardColors } from '../../hooks/useCardColors';

// Mock the cardColors utilities
vi.mock('../../utils/cardColors', () => ({
    getAvailableColors: vi.fn(() => ['pastelWhite', 'pastelGreen', 'pastelRed']),
    getColorConfig: vi.fn((color) => ({
        name: `Mock ${color}`,
        value: color,
        background: `bg-${color}`,
        border: `border-${color}`,
        text: `text-${color}`,
        preview: `preview-${color}`,
        ariaLabel: `Select ${color}`,
        tooltip: `${color} tooltip`
    })),
    getDefaultColor: vi.fn(() => 'pastelWhite'),
    isValidColor: vi.fn((color) => ['pastelWhite', 'pastelGreen', 'pastelRed'].includes(color)),
    validateColor: vi.fn((color) => color && ['pastelWhite', 'pastelGreen', 'pastelRed'].includes(color) ? color : 'pastelWhite'),
}));

describe('useCardColors hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return available colors', () => {
        const { result } = renderHook(() => useCardColors());

        expect(result.current.availableColors).toEqual(['pastelWhite', 'pastelGreen', 'pastelRed']);
    });

    it('should return default color', () => {
        const { result } = renderHook(() => useCardColors());

        expect(result.current.defaultColor).toBe('pastelWhite');
    });

    it('should validate colors correctly', () => {
        const { result } = renderHook(() => useCardColors());

        expect(result.current.isValidColor('pastelGreen')).toBe(true);
        expect(result.current.isValidColor('invalidColor')).toBe(false);
    });

    it('should get color config', () => {
        const { result } = renderHook(() => useCardColors());

        const config = result.current.getColorConfig('pastelGreen');
        expect(config.name).toBe('Mock pastelGreen');
        expect(config.value).toBe('pastelGreen');
    });

    it('should validate and return valid color or fallback', () => {
        const { result } = renderHook(() => useCardColors());

        expect(result.current.validateColor('pastelGreen')).toBe('pastelGreen');
        expect(result.current.validateColor('invalidColor')).toBe('pastelWhite');
    });

    it('should handle selected color state', () => {
        const { result } = renderHook(() => useCardColors('pastelRed'));

        expect(result.current.selectedColor).toBe('pastelRed');

        act(() => {
            result.current.setSelectedColor('pastelGreen');
        });

        expect(result.current.selectedColor).toBe('pastelGreen');
    });

    it('should use default color when no initial color provided', () => {
        const { result } = renderHook(() => useCardColors());

        expect(result.current.selectedColor).toBe('pastelWhite');
    });

    it('should validate initial color and use default if invalid', () => {
        const { result } = renderHook(() => useCardColors('invalidColor' as any));

        expect(result.current.selectedColor).toBe('pastelWhite');
    });
});
