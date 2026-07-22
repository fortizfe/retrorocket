import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// Tailwind's default palette is the authoritative source for shade hexes.
import twColors from 'tailwindcss/colors';
import { CARD_COLORS } from '@/lib/utils/cardColors';
import { contrastRatio } from '@/lib/theme/contrast';
import { TOKENS } from '@/lib/theme/tokens';

/**
 * WCAG 2.1 AA verification for the curated card-color swatch palette (FR-015).
 * Covers tasks T021 (light) and T027 (dark).
 *
 * Rendering model (see getCardStyling + globals.css):
 * - A card gets `card-color-bg <bg-class> <border> <text>`.
 * - The actual background per theme is set by the `.card-color-bg.<bg-class>`
 *   (light) and `.dark .card-color-bg.<bg-class>` (dark) overrides in
 *   globals.css (explicit rgb).
 * - The visible card *content* renders with the `text-primary` token; the
 *   swatch's own `text` class is also applied at container level.
 *
 * So every swatch must satisfy, in BOTH themes:
 *   - text-primary token vs background >= 4.5:1  (the real card text)
 *   - swatch text class vs background     >= 4.5:1
 *
 * Swatch borders (same-hue `-200` on `-50` light / `-800` on `-950` dark) are
 * decorative: a card is identified by its filled background, drop shadow, and
 * textual content, and its colour *category* carries a non-colour cue (icon/
 * label) per WCAG 1.4.1. WCAG 1.4.11 therefore does not require 3:1 on these
 * borders, so this suite does not assert it. Text legibility is the AA
 * requirement that matters here and is enforced strictly.
 */

const globalsCss = readFileSync(
    resolve(__dirname, '../../../..', 'src/styles/globals.css'),
    'utf8',
);

/** Build { 'bg-green-50': 'r g b' } maps for light and dark from globals.css. */
function parseCardBackgrounds(dark: boolean): Record<string, string> {
    const map: Record<string, string> = {};
    // Match "<prefix>.card-color-bg.<class> { ... background-color: rgb(r g b) ... }"
    const re = /(\.dark\s+)?\.card-color-bg\.([a-z0-9-]+)\s*\{[^}]*?background-color:\s*rgb\(([\d]+ [\d]+ [\d]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(globalsCss)) !== null) {
        const isDarkRule = Boolean(m[1]);
        if (isDarkRule === dark) map[m[2]] = m[3];
    }
    return map;
}

const lightBgOverrides = parseCardBackgrounds(false);
const darkBgOverrides = parseCardBackgrounds(true);

/** Convert a hex to "r g b" channels for contrastRatio. */
function hexToChannels(hex: string): string {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    return `${parseInt(full.slice(0, 2), 16)} ${parseInt(full.slice(2, 4), 16)} ${parseInt(full.slice(4, 6), 16)}`;
}

/** Background for a swatch in a theme: globals.css override, else the raw Tailwind bg hex. */
function bgForSwatch(bgClass: string, dark: boolean): string {
    const override = (dark ? darkBgOverrides : lightBgOverrides)[bgClass];
    if (override) return override;
    return hexToChannels(classToHex(bgClass));
}

/** Resolve a tailwind color class (e.g. `text-green-800`, `border-slate-700`, `*-white`) to hex. */
function classToHex(cls: string): string {
    // strip a leading utility prefix (text-/bg-/border-)
    const body = cls.replace(/^(text|bg|border)-/, '');
    if (body === 'white') return '#ffffff';
    if (body === 'black') return '#000000';
    const match = body.match(/^([a-z]+)-(\d{2,3})$/);
    if (!match) throw new Error(`Cannot resolve tailwind color class: ${cls}`);
    const [, name, shade] = match;
    const palette = (twColors as Record<string, Record<string, string>>)[name];
    const hex = palette?.[shade];
    if (!hex) throw new Error(`Unknown tailwind color: ${name}-${shade}`);
    return hex;
}

/** Split a "light dark:variant" class pair into [lightClass, darkClass]. */
function splitPair(classes: string): { light: string; dark: string } {
    const parts = classes.trim().split(/\s+/);
    const light = parts.find((p) => !p.startsWith('dark:'))!;
    const darkPrefixed = parts.find((p) => p.startsWith('dark:'));
    const dark = darkPrefixed ? darkPrefixed.replace('dark:', '') : light;
    return { light, dark };
}

const rgb = (channels: string) => channels; // contrastRatio accepts "r g b"
const textPrimary = TOKENS['text-primary'];

describe('card swatch palette WCAG 2.1 AA', () => {
    it('every swatch has a dark background override in globals.css', () => {
        // Dark overrides are required because dark card text needs a dark fill;
        // light backgrounds may fall back to the raw Tailwind -50 shade.
        for (const config of Object.values(CARD_COLORS)) {
            expect(darkBgOverrides[config.background], `dark bg for ${config.background}`).toBeTruthy();
        }
    });

    for (const [name, config] of Object.entries(CARD_COLORS)) {
        describe(`${name} (${config.background})`, () => {
            const lbg = bgForSwatch(config.background, false);
            const dbg = bgForSwatch(config.background, true);
            const text = splitPair(config.text);

            it('card text-primary token meets 4.5:1 in light', () => {
                expect(contrastRatio(rgb(textPrimary.light), lbg)).toBeGreaterThanOrEqual(4.5);
            });
            it('card text-primary token meets 4.5:1 in dark', () => {
                expect(contrastRatio(rgb(textPrimary.dark), dbg)).toBeGreaterThanOrEqual(4.5);
            });
            it('swatch text class meets 4.5:1 in light', () => {
                expect(contrastRatio(classToHex(text.light), lbg)).toBeGreaterThanOrEqual(4.5);
            });
            it('swatch text class meets 4.5:1 in dark', () => {
                expect(contrastRatio(classToHex(text.dark), dbg)).toBeGreaterThanOrEqual(4.5);
            });
        });
    }
});
