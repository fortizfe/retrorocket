/**
 * WCAG 2.1 contrast utilities.
 *
 * Pure functions implementing the WCAG relative-luminance and contrast-ratio
 * formulas (https://www.w3.org/TR/WCAG21/#dfn-relative-luminance,
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio). Used by unit tests to
 * assert that every semantic token pairing and every card swatch meets the AA
 * thresholds in both the light and dark themes.
 *
 * Kept dependency-free on purpose (Constitution: Simplicity / YAGNI) — the WCAG
 * math is small and stable.
 */

/** WCAG AA contrast thresholds. */
export const AA_NORMAL_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;
/** Non-text (UI components, graphical objects, focus indicators) — WCAG 1.4.11. */
export const AA_NON_TEXT = 3;

export interface Rgb {
    r: number;
    g: number;
    b: number;
}

/**
 * Parse a color into 0–255 RGB channels.
 *
 * Accepts:
 * - `#rgb` / `#rrggbb` hex
 * - `"r g b"` space-separated channels (the format stored in CSS custom
 *   properties, e.g. `--color-surface: 248 250 252`)
 * - `"r, g, b"` / `rgb(r, g, b)` / `rgb(r g b)`
 */
export function parseColor(input: string): Rgb {
    const value = input.trim();

    if (value.startsWith('#')) {
        let hex = value.slice(1);
        if (hex.length === 3) {
            hex = hex
                .split('')
                .map((c) => c + c)
                .join('');
        }
        if (hex.length !== 6 || /[^0-9a-fA-F]/.test(hex)) {
            throw new Error(`Invalid hex color: ${input}`);
        }
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16),
        };
    }

    // Strip an optional rgb()/rgba() wrapper, then split on spaces/commas.
    const inner = value.replace(/^rgba?\(/i, '').replace(/\)$/, '');
    const parts = inner
        .split(/[\s,]+/)
        .filter(Boolean)
        .slice(0, 3)
        .map(Number);

    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
        throw new Error(`Invalid RGB color: ${input}`);
    }
    return { r: parts[0], g: parts[1], b: parts[2] };
}

/** Linearize a single 0–255 channel per the WCAG relative-luminance formula. */
function linearizeChannel(channel: number): number {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance (0 = black, 1 = white) per WCAG 2.1. */
export function relativeLuminance(color: string | Rgb): number {
    const { r, g, b } = typeof color === 'string' ? parseColor(color) : color;
    return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
}

/**
 * WCAG contrast ratio between two colors, in the range [1, 21].
 * Order-independent.
 */
export function contrastRatio(a: string | Rgb, b: string | Rgb): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    const lighter = Math.max(la, lb);
    const darker = Math.min(la, lb);
    return (lighter + 0.05) / (darker + 0.05);
}

export interface AaOptions {
    /** Large text (≥18.66px bold or ≥24px) uses the 3:1 threshold. */
    large?: boolean;
    /** Non-text element (UI boundary, icon, focus ring) uses the 3:1 threshold. */
    nonText?: boolean;
}

/** The AA threshold that applies for the given usage. */
export function aaThreshold({ large, nonText }: AaOptions = {}): number {
    return large || nonText ? AA_LARGE_TEXT : AA_NORMAL_TEXT;
}

/** Whether `fg` on `bg` meets the applicable WCAG 2.1 AA contrast threshold. */
export function meetsAA(fg: string | Rgb, bg: string | Rgb, options: AaOptions = {}): boolean {
    return contrastRatio(fg, bg) >= aaThreshold(options);
}
