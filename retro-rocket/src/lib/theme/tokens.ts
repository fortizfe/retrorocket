/**
 * Semantic color-token catalog — the single source of truth for both themes.
 *
 * Each token maps a color *role* (surface, text, border, focus, status, …) to a
 * concrete value per theme, stored as space-separated RGB channels so the values
 * can be dropped straight into CSS custom properties
 * (`--color-surface: 248 250 252;`) and consumed by Tailwind via
 * `rgb(var(--color-surface) / <alpha-value>)`.
 *
 * Values here are chosen to satisfy WCAG 2.1 AA in BOTH themes; the pairings that
 * must hold are declared in {@link CONTRAST_PAIRINGS} and enforced by
 * `contrast.tokens.*.test.ts`. See `contracts/design-tokens.md`.
 */

export type ThemeId = 'light' | 'dark';

export type TokenName =
    | 'surface'
    | 'surface-raised'
    | 'surface-overlay'
    | 'text-primary'
    | 'text-secondary'
    | 'text-muted'
    | 'text-inverse'
    | 'border-default'
    | 'border-strong'
    | 'focus'
    | 'action'
    | 'action-hover'
    | 'action-active'
    | 'success-fg'
    | 'success-bg'
    | 'warning-fg'
    | 'warning-bg'
    | 'error-fg'
    | 'error-bg'
    | 'info-fg'
    | 'info-bg';

/** RGB channels ("r g b") per theme for one token. */
export interface TokenValue {
    light: string;
    dark: string;
}

export const TOKENS: Record<TokenName, TokenValue> = {
    // Surfaces
    surface: { light: '248 250 252', dark: '2 6 23' }, // slate-50 / slate-950
    'surface-raised': { light: '255 255 255', dark: '15 23 42' }, // white / slate-900
    'surface-overlay': { light: '255 255 255', dark: '30 41 59' }, // white / slate-800

    // Text
    'text-primary': { light: '15 23 42', dark: '241 245 249' }, // slate-900 / slate-100
    'text-secondary': { light: '51 65 85', dark: '203 213 225' }, // slate-700 / slate-300
    'text-muted': { light: '71 85 105', dark: '148 163 184' }, // slate-600 / slate-400
    'text-inverse': { light: '255 255 255', dark: '255 255 255' }, // white on filled action

    // Borders
    'border-default': { light: '203 213 225', dark: '51 65 85' }, // slate-300 / slate-700 (decorative)
    'border-strong': { light: '100 116 139', dark: '148 163 184' }, // slate-500 / slate-400 (control boundary, ≥3:1)

    // Focus ring (≥3:1 vs adjacent)
    focus: { light: '37 99 235', dark: '96 165 250' }, // blue-600 / blue-400

    // Interactive (filled action)
    action: { light: '29 78 216', dark: '29 78 216' }, // blue-700
    'action-hover': { light: '30 64 175', dark: '37 99 235' }, // blue-800 / blue-600
    'action-active': { light: '30 58 138', dark: '30 64 175' }, // blue-900 / blue-800

    // Status (each fg meets ≥4.5:1 vs its bg, both themes)
    'success-fg': { light: '6 95 70', dark: '110 231 183' }, // green-800 / green-300
    'success-bg': { light: '236 253 245', dark: '6 78 59' }, // green-50 / green-900
    'warning-fg': { light: '146 64 14', dark: '252 211 77' }, // amber-800 / amber-300
    'warning-bg': { light: '255 251 235', dark: '120 53 15' }, // amber-50 / amber-900
    'error-fg': { light: '153 27 27', dark: '252 165 165' }, // red-800 / red-300
    'error-bg': { light: '254 242 242', dark: '127 29 29' }, // red-50 / red-900
    'info-fg': { light: '30 64 175', dark: '147 197 253' }, // blue-800 / blue-300
    'info-bg': { light: '239 246 255', dark: '30 58 138' }, // blue-50 / blue-900
};

/** All token names, in declaration order. */
export const TOKEN_NAMES = Object.keys(TOKENS) as TokenName[];

export type PairingKind = 'text' | 'large' | 'nonText';

/**
 * Contrast pairings that MUST hold in both themes.
 * `fg` over `bg`, checked against the AA threshold implied by `kind`.
 */
export interface ContrastPairing {
    fg: TokenName;
    bg: TokenName;
    kind: PairingKind;
    note?: string;
}

export const CONTRAST_PAIRINGS: ContrastPairing[] = [
    // Body text on every surface (≥4.5:1)
    { fg: 'text-primary', bg: 'surface', kind: 'text' },
    { fg: 'text-primary', bg: 'surface-raised', kind: 'text' },
    { fg: 'text-primary', bg: 'surface-overlay', kind: 'text' },
    { fg: 'text-secondary', bg: 'surface', kind: 'text' },
    { fg: 'text-secondary', bg: 'surface-raised', kind: 'text' },
    { fg: 'text-secondary', bg: 'surface-overlay', kind: 'text' },
    { fg: 'text-muted', bg: 'surface', kind: 'text' },
    { fg: 'text-muted', bg: 'surface-raised', kind: 'text' },
    { fg: 'text-muted', bg: 'surface-overlay', kind: 'text' },
    // Text on filled action (≥4.5:1)
    { fg: 'text-inverse', bg: 'action', kind: 'text' },
    { fg: 'text-inverse', bg: 'action-hover', kind: 'text' },
    { fg: 'text-inverse', bg: 'action-active', kind: 'text' },
    // Status foreground on status background (≥4.5:1)
    { fg: 'success-fg', bg: 'success-bg', kind: 'text' },
    { fg: 'warning-fg', bg: 'warning-bg', kind: 'text' },
    { fg: 'error-fg', bg: 'error-bg', kind: 'text' },
    { fg: 'info-fg', bg: 'info-bg', kind: 'text' },
    // Non-text: control boundaries & focus ring (≥3:1)
    { fg: 'border-strong', bg: 'surface', kind: 'nonText' },
    { fg: 'border-strong', bg: 'surface-raised', kind: 'nonText' },
    { fg: 'focus', bg: 'surface', kind: 'nonText' },
    { fg: 'focus', bg: 'surface-raised', kind: 'nonText' },
    { fg: 'action', bg: 'surface', kind: 'nonText', note: 'filled control distinguishable from page' },
];
