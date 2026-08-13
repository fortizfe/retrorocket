import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { LandingParallaxIntensity } from '@/features/landing/data/types';
import { computeParallaxRange } from '@/features/landing/utils/parallax';

// Matches Tailwind's `md` breakpoint (research.md #9) — below it, parallax is
// scaled down rather than disabled outright, per the resolved Clarification.
const MOBILE_BREAKPOINT_QUERY = '(min-width: 768px)';

function useIsDesktopViewport(): boolean {
    const [isDesktop, setIsDesktop] = useState(
        () => typeof window !== 'undefined' && window.matchMedia(MOBILE_BREAKPOINT_QUERY).matches
    );

    useEffect(() => {
        const mediaQueryList = window.matchMedia(MOBILE_BREAKPOINT_QUERY);
        const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
        setIsDesktop(mediaQueryList.matches);
        mediaQueryList.addEventListener('change', handleChange);
        return () => mediaQueryList.removeEventListener('change', handleChange);
    }, []);

    return isDesktop;
}

interface ParallaxLayerProps {
    intensity: LandingParallaxIntensity;
    /** MUST include a `position` (`absolute`/`relative`) and `overflow-hidden` — this component sets no position/overflow of its own so the caller has full control (e.g. an absolutely-positioned full-bleed background vs. a relatively-positioned inline card). */
    className?: string;
    ariaHidden?: boolean;
    children: React.ReactNode;
}

/**
 * framer-motion useScroll/useTransform wrapper (research.md #1) — reduced on
 * mobile viewports (research.md #9) and fully static under
 * prefers-reduced-motion (FR-003). Animation decision (Constitution
 * Principle IX, `animate` skill): purpose is ambient depth behind a
 * section's content as the visitor scrolls through it, expressed purely via
 * `transform` (compositor-friendly, no layout thrash), continuously driven
 * by scroll progress rather than a fixed duration — it has no
 * "interruption" case since it never runs independently of the scroll
 * gesture itself, and its only "exit" is reaching [0,0] under reduced
 * motion.
 *
 * The `mover` inside is deliberately oversized — its top/bottom extend past
 * the caller's clipping frame by the parallax magnitude on each side — so
 * translating it within that range only ever reveals more of the same
 * layer, never an empty gap.
 */
const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ intensity, className, ariaHidden, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const isDesktop = useIsDesktopViewport();
    const reducedMotion = useReducedMotion();

    const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
    const [magnitude] = computeParallaxRange(intensity, isDesktop, reducedMotion);
    const y = useTransform(scrollYProgress, [0, 1], [magnitude, -magnitude]);

    return (
        <div ref={ref} className={className} aria-hidden={ariaHidden}>
            <motion.div
                style={{ y, position: 'absolute', left: 0, right: 0, top: -magnitude, bottom: -magnitude }}
            >
                {children}
            </motion.div>
        </div>
    );
};

export default ParallaxLayer;
