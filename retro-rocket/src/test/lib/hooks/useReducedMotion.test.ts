import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

describe('useReducedMotion', () => {
    let changeListener: ((event: MediaQueryListEvent) => void) | undefined;
    let matchMediaMock: ReturnType<typeof vi.fn>;

    function mockMatchMedia(initialMatches: boolean) {
        changeListener = undefined;
        matchMediaMock = vi.fn().mockImplementation((query: string) => ({
            matches: initialMatches,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((event: string, listener: (e: MediaQueryListEvent) => void) => {
                if (event === 'change') {
                    changeListener = listener;
                }
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: matchMediaMock,
        });
    }

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns false when the user has not requested reduced motion', () => {
        mockMatchMedia(false);

        const { result } = renderHook(() => useReducedMotion());

        expect(result.current).toBe(false);
        expect(matchMediaMock).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('returns true when the user has requested reduced motion', () => {
        mockMatchMedia(true);

        const { result } = renderHook(() => useReducedMotion());

        expect(result.current).toBe(true);
    });

    it('updates when the media query changes after mount', () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => useReducedMotion());
        expect(result.current).toBe(false);

        act(() => {
            changeListener?.({ matches: true } as MediaQueryListEvent);
        });

        expect(result.current).toBe(true);
    });

    it('cleans up the change listener on unmount', () => {
        mockMatchMedia(false);

        const { unmount } = renderHook(() => useReducedMotion());
        unmount();

        const mediaQueryList = matchMediaMock.mock.results[0].value;
        expect(mediaQueryList.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
});
