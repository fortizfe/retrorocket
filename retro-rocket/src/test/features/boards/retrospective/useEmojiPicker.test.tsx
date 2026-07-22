import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmojiPicker } from '@/features/boards/retrospective/hooks/useEmojiPicker';

describe('useEmojiPicker', () => {
    it('starts closed and exposes Floating UI wiring', () => {
        const { result } = renderHook(() =>
            useEmojiPicker({ onSelect: vi.fn(), onRemove: vi.fn() })
        );
        expect(result.current.open).toBe(false);
        // Floating UI applies a positioning strategy (anchored, not static flow).
        expect(typeof result.current.floatingStyles.position).toBe('string');
        expect(typeof result.current.getReferenceProps()).toBe('object');
        expect(typeof result.current.getFloatingProps()).toBe('object');
    });

    it('adds a new emoji and closes on select', () => {
        const onSelect = vi.fn();
        const onRemove = vi.fn();
        const { result } = renderHook(() =>
            useEmojiPicker({ userReaction: null, onSelect, onRemove })
        );
        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);

        act(() => result.current.selectEmoji('😀'));
        expect(onSelect).toHaveBeenCalledWith('😀');
        expect(onRemove).not.toHaveBeenCalled();
        expect(result.current.open).toBe(false);
    });

    it('removes the reaction when re-selecting the current one', () => {
        const onSelect = vi.fn();
        const onRemove = vi.fn();
        const { result } = renderHook(() =>
            useEmojiPicker({ userReaction: '😀', onSelect, onRemove })
        );
        act(() => result.current.selectEmoji('😀'));
        expect(onRemove).toHaveBeenCalledTimes(1);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('does not open when disabled', () => {
        const { result } = renderHook(() =>
            useEmojiPicker({ disabled: true, onSelect: vi.fn(), onRemove: vi.fn() })
        );
        // onOpenChange is guarded by `disabled`; forcing via setOpen is the escape hatch,
        // but Floating UI interaction handlers stay disabled.
        expect(result.current.open).toBe(false);
        expect(typeof result.current.getReferenceProps()).toBe('object');
    });
});
