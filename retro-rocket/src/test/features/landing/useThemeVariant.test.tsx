import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act as rtlAct } from '@testing-library/react';
import { useThemeVariant } from '@/features/landing/hooks/useThemeVariant';

function mockMatchMedia(matches: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
    // NOT vi.restoreAllMocks(): see SectionMedia.test.tsx for why that's unsafe
    // against setup.ts's shared global mocks.
    vi.clearAllMocks();
});

describe('useThemeVariant (research.md #6, FR-006)', () => {
    it('returns "dark" when the `dark` class is present on <html>', () => {
        mockMatchMedia(false);
        document.documentElement.classList.add('dark');

        const { result } = renderHook(() => useThemeVariant());

        expect(result.current).toBe('dark');
    });

    it('returns "light" when the `dark` class is absent', () => {
        mockMatchMedia(false);

        const { result } = renderHook(() => useThemeVariant());

        expect(result.current).toBe('light');
    });

    it('falls back to localStorage("theme") on first render when the class is not yet applied', () => {
        mockMatchMedia(false);
        localStorage.setItem('theme', 'dark');

        const { result } = renderHook(() => useThemeVariant());

        expect(result.current).toBe('dark');
    });

    it('falls back to prefers-color-scheme when neither the class nor localStorage is set', () => {
        mockMatchMedia(true); // (prefers-color-scheme: dark) matches

        const { result } = renderHook(() => useThemeVariant());

        expect(result.current).toBe('dark');
    });

    it('updates live when the `dark` class is toggled after mount', async () => {
        mockMatchMedia(false);
        const { result } = renderHook(() => useThemeVariant());
        expect(result.current).toBe('light');

        await rtlAct(async () => {
            document.documentElement.classList.add('dark');
            // MutationObserver callbacks are microtask-scheduled.
            await Promise.resolve();
        });

        expect(result.current).toBe('dark');
    });
});
