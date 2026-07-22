import { describe, it, expect } from 'vitest';
import { contrastRatio, aaThreshold } from '@/lib/theme/contrast';
import { TOKENS, CONTRAST_PAIRINGS, type ThemeId } from '@/lib/theme/tokens';

const THEMES: ThemeId[] = ['light', 'dark'];

/**
 * Enforces WCAG 2.1 AA for every declared token pairing in BOTH themes.
 * Covers tasks T020 (light) and T026 (dark).
 */
describe('semantic token contrast (WCAG 2.1 AA)', () => {
    for (const theme of THEMES) {
        describe(`${theme} theme`, () => {
            for (const pairing of CONTRAST_PAIRINGS) {
                const label = `${pairing.fg} on ${pairing.bg} (${pairing.kind})`;
                it(`${label} meets AA`, () => {
                    const fg = TOKENS[pairing.fg][theme];
                    const bg = TOKENS[pairing.bg][theme];
                    const ratio = contrastRatio(fg, bg);
                    const threshold = aaThreshold({
                        large: pairing.kind === 'large',
                        nonText: pairing.kind === 'nonText',
                    });
                    expect(
                        ratio,
                        `${theme}: ${label} was ${ratio.toFixed(2)}:1, needs ${threshold}:1`,
                    ).toBeGreaterThanOrEqual(threshold);
                });
            }
        });
    }
});
