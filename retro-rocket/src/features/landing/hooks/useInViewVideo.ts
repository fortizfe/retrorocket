import { useEffect, useRef, useState } from 'react';

const IN_VIEW_THRESHOLD = 0.5;

/**
 * Plays/pauses a <video> as it crosses ~50% in-view, via the native
 * IntersectionObserver (research.md #3) — decoupled from framer-motion's own
 * reduced-motion handling since video playback and parallax motion are
 * different concerns (FR-007).
 */
export function useInViewVideo<T extends HTMLVideoElement>(): {
    ref: React.RefObject<T>;
    isInView: boolean;
    autoplayBlocked: boolean;
} {
    const ref = useRef<T>(null);
    const [isInView, setIsInView] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
                if (entry.isIntersecting) {
                    node.play()
                        .then(() => setAutoplayBlocked(false))
                        .catch(() => {
                            // Autoplay blocked by the browser/platform — SectionMedia falls
                            // back to the poster frame (FR-007 edge case).
                            setAutoplayBlocked(true);
                        });
                } else {
                    node.pause();
                }
            },
            { threshold: IN_VIEW_THRESHOLD }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return { ref, isInView, autoplayBlocked };
}
