import React from 'react';
import ParallaxLayer from '@/features/landing/components/ParallaxLayer';
import { LandingParallaxIntensity } from '@/features/landing/data/types';

export type SectionTone = 'blue' | 'emerald';

// Purely decorative marketing accent hues — deliberately distinct from the
// app's functional status tokens (success/warning/error/info) so a colorful
// background wash is never mistaken for a status signal. Exactly two tones,
// alternated by section order (Landing.tsx's TONE_CYCLE) rather than one
// distinct color per section, per the resolved feedback.
const TONE_RGB: Record<SectionTone, string> = {
    blue: '37 99 235',
    emerald: '16 185 129',
};

interface SectionBackgroundProps {
    tone: SectionTone;
    intensity: LandingParallaxIntensity;
}

/**
 * Full-bleed, scroll-parallaxed color wash behind a section's content
 * (FR-003). Kept at low opacity so body text (rendered in the ordinary
 * `text-primary`/`text-secondary` tokens against the section's normal
 * surface color) stays comfortably within WCAG 2.1 AA contrast — this is an
 * ambient tint, not a solid color block.
 *
 * A flat, near-uniform tint — not a radial "hot spot" — deliberately: the
 * moving layer is oversized (ParallaxLayer insets it by the parallax
 * magnitude on each side, research.md #1) so the visible crop shifts as the
 * visitor scrolls, and a radial gradient's peak only ever lands in view at
 * one specific scroll position, reading as barely-there gray the rest of
 * the time. A gentle top-to-bottom gradient between two alpha stops of the
 * same tone keeps the color legible across the whole scroll range while
 * still carrying a touch of depth.
 */
const SectionBackground: React.FC<SectionBackgroundProps> = ({ tone, intensity }) => {
    const rgb = TONE_RGB[tone];

    return (
        <ParallaxLayer
            intensity={intensity}
            ariaHidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
            <div
                className="absolute inset-0"
                style={{
                    background: `linear-gradient(180deg, rgb(${rgb} / 0.22), rgb(${rgb} / 0.09))`,
                }}
            />
        </ParallaxLayer>
    );
};

export default SectionBackground;
