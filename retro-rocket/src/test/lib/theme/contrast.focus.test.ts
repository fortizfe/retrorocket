import { describe, it, expect } from 'vitest';
import { contrastRatio, AA_NON_TEXT } from '@/lib/theme/contrast';
import { TOKENS, type ThemeId } from '@/lib/theme/tokens';

/**
 * WCAG 2.1 SC 1.4.11 / 2.4.7 — the focus indicator must be visible, i.e. the
 * `focus` ring token must reach >= 3:1 against every surface a focusable element
 * can sit on, in BOTH themes. Covers task T032.
 */
const THEMES: ThemeId[] = ['light', 'dark'];
const SURFACES = ['surface', 'surface-raised', 'surface-overlay'] as const;

describe('focus indicator visibility (WCAG 2.1 AA non-text contrast)', () => {
    for (const theme of THEMES) {
        for (const surface of SURFACES) {
            it(`focus ring >= 3:1 vs ${surface} in ${theme}`, () => {
                const ratio = contrastRatio(TOKENS.focus[theme], TOKENS[surface][theme]);
                expect(
                    ratio,
                    `${theme}: focus on ${surface} was ${ratio.toFixed(2)}:1`,
                ).toBeGreaterThanOrEqual(AA_NON_TEXT);
            });
        }
    }
});
