import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../..'); // retro-rocket/
const SRC = path.join(REPO_ROOT, 'src');

function sourceFiles(): string[] {
    const out = execSync(`find "${SRC}" -type f \\( -name '*.ts' -o -name '*.tsx' \\)`, { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean);
}

describe('sentiment module boundary (Library-First, SC-007)', () => {
    const files = sourceFiles();

    // The sentiment types live under types/ but are part of the sentiment capability
    // (they delegate to domain/*), so they are allowed to reference internals.
    const MODULE_INTERNAL = [
        '/features/boards/sentiment/',
        '/features/boards/types/sentiment.ts',
        '/features/boards/types/teamMood.ts',
    ];
    const isModuleInternal = (f: string) => MODULE_INTERNAL.some(p => f.includes(p));

    it('no non-test source file imports the frozen @xenova/transformers package', () => {
        const importPattern = /from\s+['"]@xenova\/transformers['"]/;
        const offenders = files.filter(f => !f.includes('/test/') && importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found @xenova/transformers import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('external consumers import sentiment only via the barrel, never deep paths', () => {
        const deepImport = /from\s+['"]@\/features\/boards\/sentiment\/(?!index)/;
        const offenders = files.filter(f => {
            if (isModuleInternal(f)) return false;
            if (f.includes('/test/')) return false;
            return deepImport.test(readFileSync(f, 'utf-8'));
        });
        expect(offenders, `Deep sentiment imports outside the module:\n${offenders.join('\n')}`).toEqual([]);
    });
});
