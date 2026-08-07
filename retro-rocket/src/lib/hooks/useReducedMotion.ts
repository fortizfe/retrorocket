import { useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Tracks the user's `prefers-reduced-motion` preference. framer-motion
 * animations already honor it via the app-root `MotionConfig` (see
 * `src/App.tsx`) — this hook is for plain-CSS/Tailwind motion that isn't
 * covered by that wrapper.
 */
export function useReducedMotion(): boolean {
    const mediaQueryListRef = useRef<MediaQueryList>();
    if (!mediaQueryListRef.current) {
        // Resolved once per component instance so mount and cleanup act on
        // the same MediaQueryList — matchMedia() is not guaranteed to
        // return a cached/identical object across calls.
        mediaQueryListRef.current = window.matchMedia(REDUCED_MOTION_QUERY);
    }

    const [reducedMotion, setReducedMotion] = useState(
        () => mediaQueryListRef.current!.matches
    );

    useEffect(() => {
        const mediaQueryList = mediaQueryListRef.current!;

        const handleChange = (event: MediaQueryListEvent): void => {
            setReducedMotion(event.matches);
        };

        setReducedMotion(mediaQueryList.matches);
        mediaQueryList.addEventListener('change', handleChange);

        return () => {
            mediaQueryList.removeEventListener('change', handleChange);
        };
    }, []);

    return reducedMotion;
}
