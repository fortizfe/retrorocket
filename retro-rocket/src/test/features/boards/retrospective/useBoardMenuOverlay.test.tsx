import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBoardMenuOverlay } from '@/features/boards/retrospective/hooks/useBoardMenuOverlay';

describe('useBoardMenuOverlay', () => {
    it('starts closed and exposes Floating UI wiring (anchored, not static flow)', () => {
        const { result } = renderHook(() => useBoardMenuOverlay());
        expect(result.current.open).toBe(false);
        expect(typeof result.current.floatingStyles.position).toBe('string');
        expect(typeof result.current.getReferenceProps()).toBe('object');
        expect(typeof result.current.getFloatingProps()).toBe('object');
        expect(result.current.context).toBeDefined();
        expect(result.current.refs).toBeDefined();
    });

    it('opens and closes via setOpen', () => {
        const { result } = renderHook(() => useBoardMenuOverlay());
        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(true);
        act(() => result.current.setOpen(false));
        expect(result.current.open).toBe(false);
    });

    it('calls onOpenChange when provided', () => {
        const onOpenChange = vi.fn();
        const { result } = renderHook(() => useBoardMenuOverlay({ onOpenChange }));
        act(() => result.current.setOpen(true));
        expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('does not open when disabled', () => {
        const { result } = renderHook(() => useBoardMenuOverlay({ disabled: true }));
        act(() => result.current.setOpen(true));
        expect(result.current.open).toBe(false);
    });

    it('respects a controlled open/onOpenChange pair without an internal setOpen call', () => {
        const onOpenChange = vi.fn();
        const { result, rerender } = renderHook(
            (props: { open: boolean }) => useBoardMenuOverlay({ open: props.open, onOpenChange }),
            { initialProps: { open: false } }
        );
        expect(result.current.open).toBe(false);
        rerender({ open: true });
        expect(result.current.open).toBe(true);
    });

    it('defaults to role="menu" for the floating element', () => {
        const { result } = renderHook(() => useBoardMenuOverlay());
        const floatingProps = result.current.getFloatingProps() as Record<string, unknown>;
        expect(floatingProps.role).toBe('menu');
    });

    it('accepts a custom role for non-menu overlays (e.g. the facilitator panel)', () => {
        const { result } = renderHook(() => useBoardMenuOverlay({ role: 'dialog' }));
        const floatingProps = result.current.getFloatingProps() as Record<string, unknown>;
        expect(floatingProps.role).toBe('dialog');
    });
});
