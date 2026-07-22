import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOKENS, TOKEN_NAMES } from '@/lib/theme/tokens';

const root = resolve(__dirname, '../../../..');
const globalsCss = readFileSync(resolve(root, 'src/styles/globals.css'), 'utf8');
const tailwindConfig = readFileSync(resolve(root, 'tailwind.config.js'), 'utf8');

/**
 * Structural parity: every token defined in tokens.ts must exist in both theme
 * blocks of globals.css AND in the Tailwind color map — no orphans in any
 * direction. Values may change freely; this test stays green. Covers T009.
 */
describe('token parity across tokens.ts, globals.css, tailwind.config.js', () => {
    it('defines both light and dark RGB channels for every token', () => {
        for (const name of TOKEN_NAMES) {
            expect(TOKENS[name].light, `${name}.light`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
            expect(TOKENS[name].dark, `${name}.dark`).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
        }
    });

    it('declares every --color-* custom property under :root (light)', () => {
        const rootBlock = globalsCss.slice(globalsCss.indexOf(':root'));
        for (const name of TOKEN_NAMES) {
            expect(rootBlock, `--color-${name} in :root`).toContain(`--color-${name}:`);
        }
    });

    it('declares every --color-* custom property under .dark', () => {
        const darkBlock = globalsCss.slice(globalsCss.indexOf('.dark'));
        for (const name of TOKEN_NAMES) {
            expect(darkBlock, `--color-${name} in .dark`).toContain(`--color-${name}:`);
        }
    });

    it('maps every token to a Tailwind color using its CSS variable', () => {
        for (const name of TOKEN_NAMES) {
            expect(tailwindConfig, `tailwind color for ${name}`).toContain(`var(--color-${name}`);
        }
    });

    it('has no --color-* variable in globals.css without a matching token (no orphans)', () => {
        const declared = [...globalsCss.matchAll(/--color-([a-z0-9-]+):/g)].map((m) => m[1]);
        const unique = [...new Set(declared)];
        for (const cssName of unique) {
            expect(TOKEN_NAMES, `orphan --color-${cssName} in globals.css`).toContain(cssName);
        }
    });
});
