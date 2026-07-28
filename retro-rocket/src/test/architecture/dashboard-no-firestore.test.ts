import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..'); // retro-rocket/
const SRC = path.join(REPO_ROOT, 'src');

// 017 / FR-001, SC-002: the Dashboard ("My Boards") screen and its supporting
// components/services MUST NOT establish any direct connection to Firebase/Firestore.
// A static import-boundary check is a more reliable way to guarantee this across every
// operation (list/create/join/rename/delete) than E2E network sniffing, which races
// against client-side navigation into the (out-of-scope) board detail page that
// legitimately still uses Firestore — mirrors server/test/architecture/domain-isolation.test.ts
// and mcp-read-only.test.ts's use of static checks for this same class of guarantee.
const DASHBOARD_FILES = [
    path.join(SRC, 'pages/Dashboard.tsx'),
    path.join(SRC, 'features/dashboard'),
    path.join(SRC, 'features/create-board'),
    // Lives outside features/dashboard by historical naming, but is the Join flow's hook.
    path.join(SRC, 'features/boards/retrospective/hooks/useJoinRetrospective.ts'),
];

function dashboardSourceFiles(): string[] {
    const paths = DASHBOARD_FILES.map((p) => `"${p}"`).join(' ');
    const out = execSync(`find ${paths} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`, { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean).filter((f) => !f.includes('/test/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
}

describe('Dashboard boards backend-mediated access (FR-001, SC-002)', () => {
    const files = dashboardSourceFiles();

    it('scans at least the known Dashboard/board-creation source files', () => {
        expect(files.length).toBeGreaterThan(5);
    });

    it('no Dashboard/create-board source file imports the Firebase Firestore client SDK', () => {
        const importPattern = /from\s+['"]firebase\/firestore['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found firebase/firestore import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('no Dashboard/create-board source file imports the app\'s Firestore-backed services', () => {
        const importPattern = /from\s+['"]@\/lib\/services\/(firebase|OptimizedRetrospectiveService)['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found direct Firestore-service import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('no Dashboard/create-board source file imports the legacy Firestore-backed board/participant services', () => {
        const importPattern = /from\s+['"]@\/features\/boards\/(retrospective\/services\/retrospectiveService|participants\/services\/participantService)['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found legacy board/participant service import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });
});
