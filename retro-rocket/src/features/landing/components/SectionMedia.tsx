import React, { useState } from 'react';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { useInViewVideo } from '@/features/landing/hooks/useInViewVideo';
import { useThemeVariant } from '@/features/landing/hooks/useThemeVariant';
import { MediaAsset } from '@/features/landing/data/types';

interface SectionMediaProps {
    asset: MediaAsset;
    alt: string;
    className?: string;
}

const FADE_CLASS = 'transition-opacity duration-500';

/**
 * Theme-aware screenshot/video renderer (FR-006, FR-007). Resolves the
 * light/dark variant live via useThemeVariant so it tracks the ThemeToggle,
 * not just initial load (FR-006). Falls back to the poster-only <img> under
 * a reduced-motion preference or a blocked autoplay (research.md #4) — the
 * poster is the first frame of the same capture, not a separately designed
 * asset. Fades in on load rather than popping in abruptly once lazy-loaded
 * (FR-014 — no blank hold, no skeleton, a smooth reveal as it becomes ready).
 */
const SectionMedia: React.FC<SectionMediaProps> = ({ asset, alt, className }) => {
    const theme = useThemeVariant();
    const reducedMotion = useReducedMotion();
    const variant = theme === 'dark' ? asset.dark : asset.light;
    const { ref, autoplayBlocked } = useInViewVideo<HTMLVideoElement>();
    const [loaded, setLoaded] = useState(false);
    const fadeClassName = `${className ?? ''} ${FADE_CLASS} ${loaded ? 'opacity-100' : 'opacity-0'}`.trim();

    if (asset.kind === 'screenshot') {
        return (
            <img
                src={variant.src}
                alt={alt}
                loading="lazy"
                className={fadeClassName}
                onLoad={() => setLoaded(true)}
            />
        );
    }

    const showStaticFallback = reducedMotion || autoplayBlocked;

    if (showStaticFallback) {
        return (
            <img
                src={variant.poster}
                alt={alt}
                loading="lazy"
                className={fadeClassName}
                onLoad={() => setLoaded(true)}
            />
        );
    }

    const videoMimeType = variant.src.endsWith('.webm') ? 'video/webm' : 'video/mp4';

    return (
        <video
            ref={ref}
            muted
            loop
            playsInline
            poster={variant.poster}
            aria-label={alt}
            className={fadeClassName}
            onLoadedData={() => setLoaded(true)}
        >
            <source src={variant.src} type={videoMimeType} />
        </video>
    );
};

export default SectionMedia;
