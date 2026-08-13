import { LandingParallaxIntensity } from '@/features/landing/data/types';

// Redirected from the section's real screenshot (first two passes) onto a
// purely decorative background wash (per user feedback: moving the actual
// product screenshot read as "backwards"/unnatural — screenshots are UI
// content people read, not photography, so they should stay static and
// sharp; the parallax now lives in SectionBackground instead). A background
// wash has no legibility concern, so the range can be larger than the
// former media-card treatment.
const BASE_RANGE_PX = 260;
const REDUCED_INTENSITY_SCALE = 0.5;
const MOBILE_SCALE = 0.35;

/**
 * Pure range calculation, kept separate from ParallaxLayer.tsx (which stays
 * component-only for react-refresh) and exported for direct unit testing
 * (research.md #1, #9) — real scroll-driven displacement is not meaningfully
 * testable in jsdom, so the decision logic is isolated here instead of
 * asserted via rendered DOM transforms.
 */
export function computeParallaxRange(
    intensity: LandingParallaxIntensity,
    isDesktop: boolean,
    reducedMotion: boolean
): [number, number] {
    if (reducedMotion) return [0, 0];

    let magnitude = intensity === 'reduced' ? BASE_RANGE_PX * REDUCED_INTENSITY_SCALE : BASE_RANGE_PX;
    if (!isDesktop) magnitude *= MOBILE_SCALE;

    return [magnitude, -magnitude];
}
