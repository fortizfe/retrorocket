import { useEffect, useState } from 'react';

export type ThemeVariant = 'light' | 'dark';

function resolveInitialVariant(): ThemeVariant {
    if (typeof document === 'undefined') return 'light';
    if (document.documentElement.classList.contains('dark')) return 'dark';

    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
    if (saved === 'dark') return 'dark';
    if (saved === 'light') return 'light';

    const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
}

/**
 * Tracks the same `dark` class on <html> that ThemeToggle.tsx already writes
 * (research.md #6), via a MutationObserver, so Media Assets update the
 * instant the visitor toggles the theme (FR-006) without a duplicate theme
 * context/provider (Constitution Principle V).
 */
export function useThemeVariant(): ThemeVariant {
    const [variant, setVariant] = useState<ThemeVariant>(() => resolveInitialVariant());

    useEffect(() => {
        const root = document.documentElement;

        const observer = new MutationObserver(() => {
            setVariant(root.classList.contains('dark') ? 'dark' : 'light');
        });
        observer.observe(root, { attributes: true, attributeFilter: ['class'] });

        return () => observer.disconnect();
    }, []);

    return variant;
}
