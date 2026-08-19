import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..'); // retro-rocket/
const SRC = path.join(REPO_ROOT, 'src');

// 054-team-management (T015/T018) — mirrors src/test/architecture/dashboard-no-firestore.test.ts:
// the Teams overview/detail screens and their supporting feature module MUST NOT establish any
// direct connection to Firebase/Firestore. Every operation goes through backendTeamsClient.ts's
// session-cookie-authenticated /api/teams/* endpoints instead (contracts/teams-api.md). A static
// import-boundary check is a more reliable guarantee across every operation (create/list/get/add
// member/remove member) than E2E network sniffing.
const TEAMS_FILES = [
    path.join(SRC, 'pages/Teams.tsx'),
    path.join(SRC, 'pages/TeamDetail.tsx'),
    path.join(SRC, 'features/teams'),
];

function teamsSourceFiles(): string[] {
    const paths = TEAMS_FILES.map((p) => `"${p}"`).join(' ');
    const out = execSync(`find ${paths} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`, { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean).filter((f) => !f.includes('/test/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
}

describe('Teams backend-mediated access (spec 054)', () => {
    const files = teamsSourceFiles();

    it('scans at least the known Teams source files', () => {
        expect(files.length).toBeGreaterThan(3);
    });

    it("no Teams source file imports the Firebase Firestore client SDK", () => {
        const importPattern = /from\s+['"]firebase\/firestore['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found firebase/firestore import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it("no Teams source file imports the app's Firestore-backed services", () => {
        const importPattern = /from\s+['"]@\/lib\/services\/(firebase|OptimizedRetrospectiveService)['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found direct Firestore-service import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });
});
