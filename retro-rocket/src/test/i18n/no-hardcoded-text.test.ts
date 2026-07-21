import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Guard test for the constitution's Internationalization standard: "hardcoded strings
 * in components are prohibited." Scans every .tsx file under src/ (excluding src/test
 * and src/features/dev-tools, matching this compliance effort's stated scope) for
 * literal JSX text content that looks like human-readable copy rather than markup/code,
 * and fails listing the offending files/lines if any is found.
 *
 * This runs under `npm run test` per FR-001 — it is the general-purpose replacement for
 * the narrower, single-feature `verify-i18n-teamMood.js` ad-hoc script retired in US1.
 */

const SRC_DIR = path.resolve(__dirname, '../../');
const EXCLUDED_DIRS = ['test', 'features/dev-tools'];
// Matches literal text between JSX tags that starts with a letter and is at least
// 4 characters — the same heuristic used during the manual audit for this effort.
const HARDCODED_TEXT_PATTERN = />[A-Za-zÁÉÍÓÚáéíóúñÑ][a-zA-ZÁÉÍÓÚáéíóúñÑ ,.!?]{3,}</g;

function collectTsxFiles(dir: string): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(SRC_DIR, fullPath);

        if (EXCLUDED_DIRS.some((excluded) => relativePath === excluded || relativePath.startsWith(`${excluded}${path.sep}`))) {
            continue;
        }

        if (entry.isDirectory()) {
            files.push(...collectTsxFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }

    return files;
}

describe('i18n: no hardcoded user-facing text', () => {
    it('finds no literal JSX text outside src/test and src/features/dev-tools', () => {
        const violations: string[] = [];

        for (const file of collectTsxFiles(SRC_DIR)) {
            const content = fs.readFileSync(file, 'utf-8');
            const lines = content.split('\n');

            lines.forEach((line, index) => {
                const matches = line.match(HARDCODED_TEXT_PATTERN);
                if (matches) {
                    const relativePath = path.relative(SRC_DIR, file);
                    violations.push(`${relativePath}:${index + 1} → ${matches.join(', ')}`);
                }
            });
        }

        expect(violations, `Hardcoded text found (route through t() instead):\n${violations.join('\n')}`).toEqual([]);
    });
});
