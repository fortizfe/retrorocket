import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

describe('useKeyboardShortcut', () => {
    const mockCallback = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should call callback when correct key combination is pressed', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should work with uppercase key', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'M',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when only key is pressed', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: false,
            shiftKey: false,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should not call callback when wrong key is pressed', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'n',
            ctrlKey: true,
            shiftKey: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should not call callback when ctrl key is missing', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: false,
            shiftKey: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should not call callback when shift key is missing', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: false,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).not.toHaveBeenCalled();
    });

    it('should prevent default behavior by default', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should not prevent default when preventDefault is false', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
                preventDefault: false,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
            cancelable: true,
        });

        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).not.toHaveBeenCalled();
        expect(mockCallback).toHaveBeenCalled();
    });

    it('should support alt key', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                altKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            altKey: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should support meta key', () => {
        renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                metaKey: true,
            })
        );

        const event = new KeyboardEvent('keydown', {
            key: 'm',
            metaKey: true,
        });

        act(() => {
            window.dispatchEvent(event);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should clean up event listener on unmount', () => {
        const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() =>
            useKeyboardShortcut(mockCallback, {
                key: 'm',
                ctrlKey: true,
                shiftKey: true,
            })
        );

        unmount();

        expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should update when callback changes', () => {
        const newCallback = vi.fn();

        const { rerender } = renderHook(
            ({ callback }) =>
                useKeyboardShortcut(callback, {
                    key: 'm',
                    ctrlKey: true,
                    shiftKey: true,
                }),
            { initialProps: { callback: mockCallback } }
        );

        // Test with original callback
        const event1 = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
        });

        act(() => {
            window.dispatchEvent(event1);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1);
        expect(newCallback).not.toHaveBeenCalled();

        // Update callback
        rerender({ callback: newCallback });

        // Test with new callback
        const event2 = new KeyboardEvent('keydown', {
            key: 'm',
            ctrlKey: true,
            shiftKey: true,
        });

        act(() => {
            window.dispatchEvent(event2);
        });

        expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
        expect(newCallback).toHaveBeenCalledTimes(1); // Should be called once
    });
});
