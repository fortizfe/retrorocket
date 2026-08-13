import { describe, it, expect } from 'vitest';
import { computeParallaxRange } from '@/features/landing/utils/parallax';

/**
 * Real scroll-driven displacement isn't meaningfully testable in jsdom (no
 * layout/scroll engine) — the decision logic is isolated into a pure,
 * directly-testable function instead (research.md #1, #9; FR-003).
 */
describe('computeParallaxRange (FR-003, research.md #9)', () => {
    it('returns [0, 0] under reduced motion, regardless of intensity/viewport', () => {
        expect(computeParallaxRange('standard', true, true)).toEqual([0, 0]);
        expect(computeParallaxRange('reduced', false, true)).toEqual([0, 0]);
    });

    it('produces a smaller magnitude on mobile than on desktop for the same intensity', () => {
        const [desktopMax] = computeParallaxRange('standard', true, false);
        const [mobileMax] = computeParallaxRange('standard', false, false);

        expect(mobileMax).toBeGreaterThan(0);
        expect(mobileMax).toBeLessThan(desktopMax);
    });

    it('produces a smaller magnitude for "reduced" intensity than "standard" on desktop', () => {
        const [standardMax] = computeParallaxRange('standard', true, false);
        const [reducedMax] = computeParallaxRange('reduced', true, false);

        expect(reducedMax).toBeGreaterThan(0);
        expect(reducedMax).toBeLessThan(standardMax);
    });

    it('returns a symmetric [positive, negative] range when motion is enabled', () => {
        const [max, min] = computeParallaxRange('standard', true, false);
        expect(min).toBe(-max);
    });
});
