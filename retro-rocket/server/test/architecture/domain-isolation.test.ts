import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const DOMAIN_DIR = path.resolve(__dirname, '../../src/domain');

// Forbidden imports in the hexagonal core: delivery frameworks and external services
// must only appear in adapters, never in domain/ (Constitution IV / FR-003).
const FORBIDDEN = [/from\s+['"]express['"]/, /from\s+['"]firebase(-admin)?/, /from\s+['"]arctic['"]/, /from\s+['"]jose['"]/];

function tsFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) return tsFiles(full);
        return full.endsWith('.ts') ? [full] : [];
    });
}

describe('domain isolation', () => {
    it('domain/ imports no framework or external-service modules', () => {
        const offenders: string[] = [];
        for (const file of tsFiles(DOMAIN_DIR)) {
            const src = readFileSync(file, 'utf8');
            if (FORBIDDEN.some((re) => re.test(src))) {
                offenders.push(path.relative(DOMAIN_DIR, file));
            }
        }
        expect(offenders, `domain files with forbidden imports: ${offenders.join(', ')}`).toEqual([]);
    });
});
