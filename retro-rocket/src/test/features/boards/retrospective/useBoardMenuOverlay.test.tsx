import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, render, fireEvent } from '@testing-library/react';
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

    // Feature 038, T011: confirms research.md §2's premise before RetrospectiveTopbar.tsx
    // (T017) adds a second useBoardMenuOverlay instance for the export panel, sharing the
    // options panel's own trigger button via a merged ref callback — rather than each
    // instance owning its own dedicated trigger, as every other consumer of this hook does
    // today. Two independent useFloating instances each tracking their own `open`/
    // `refs.setReference` against the SAME DOM node must not collide.
    it('supports two independent instances whose refs.setReference target the same DOM node without conflict', () => {
        const TwoOverlaysOnOneTrigger: React.FC = () => {
            const optionsOverlay = useBoardMenuOverlay({ role: 'menu' });
            const exportOverlay = useBoardMenuOverlay({ role: 'dialog' });

            // Merged ref callback — both instances' setReference target the same button,
            // matching the shared-trigger pattern T017 needs (research.md §2).
            const setSharedReference = (node: HTMLButtonElement | null) => {
                optionsOverlay.refs.setReference(node);
                exportOverlay.refs.setReference(node);
            };

            return (
                <div>
                    <button ref={setSharedReference} {...optionsOverlay.getReferenceProps()}>
                        Options
                    </button>
                    <button data-testid="open-options" onClick={() => optionsOverlay.setOpen(true)}>
                        open options
                    </button>
                    <button data-testid="open-export" onClick={() => exportOverlay.setOpen(true)}>
                        open export
                    </button>
                    <div data-testid="options-open">{String(optionsOverlay.open)}</div>
                    <div data-testid="export-open">{String(exportOverlay.open)}</div>
                    <div data-testid="options-role">{String((optionsOverlay.getFloatingProps() as Record<string, unknown>).role)}</div>
                    <div data-testid="export-role">{String((exportOverlay.getFloatingProps() as Record<string, unknown>).role)}</div>
                </div>
            );
        };

        const { getByTestId } = render(<TwoOverlaysOnOneTrigger />);

        // Both instances start closed and keep their own configured role — no shared
        // mutable state leaking between them despite targeting the same trigger node.
        expect(getByTestId('options-open').textContent).toBe('false');
        expect(getByTestId('export-open').textContent).toBe('false');
        expect(getByTestId('options-role').textContent).toBe('menu');
        expect(getByTestId('export-role').textContent).toBe('dialog');

        // Opening one instance does not open the other.
        fireEvent.click(getByTestId('open-options'));
        expect(getByTestId('options-open').textContent).toBe('true');
        expect(getByTestId('export-open').textContent).toBe('false');

        // Opening the second instance leaves the first exactly as it was — no cross-talk
        // from sharing the underlying reference node.
        fireEvent.click(getByTestId('open-export'));
        expect(getByTestId('options-open').textContent).toBe('true');
        expect(getByTestId('export-open').textContent).toBe('true');
    });
});
