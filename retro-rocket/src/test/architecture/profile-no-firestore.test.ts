import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..'); // retro-rocket/
const SRC = path.join(REPO_ROOT, 'src');

// 018 / FR-001, SC-002: the "Mi Perfil" screen and its supporting components/services
// MUST NOT establish any direct connection to Firebase/Firestore. A static import-boundary
// check is a more reliable, permanent regression guard than E2E network sniffing — mirrors
// src/test/architecture/dashboard-no-firestore.test.ts (017) and
// server/test/architecture/domain-isolation.test.ts's use of static checks for this same
// class of guarantee.
const PROFILE_FILES = [
    path.join(SRC, 'pages/Profile.tsx'),
    path.join(SRC, 'features/auth'),
    path.join(SRC, 'lib/contexts/UserContext.tsx'),
];

function profileSourceFiles(): string[] {
    const paths = PROFILE_FILES.map((p) => `"${p}"`).join(' ');
    const out = execSync(`find ${paths} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`, { encoding: 'utf-8' });
    return out.split('\n').filter(Boolean).filter((f) => !f.includes('/test/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
}

describe('Mi Perfil backend-mediated access (FR-001, SC-002)', () => {
    const files = profileSourceFiles();

    it('scans at least the known Profile/auth source files', () => {
        expect(files.length).toBeGreaterThan(5);
    });

    it('no Profile/auth source file imports the Firebase Firestore client SDK', () => {
        // Deliberately narrower than dashboard-no-firestore.test.ts's second check: this
        // area's UserContext.tsx/backendAuthClient.ts legitimately import from
        // @/lib/services/firebase for firebase/auth's signOut()/signInWithCustomToken()
        // (research.md §5, §10 — the guard targets firebase/firestore specifically, not
        // every import from the shared firebase.ts module, which also exports `auth`).
        const importPattern = /from\s+['"]firebase\/firestore['"]/;
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found firebase/firestore import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('no Profile/auth source file imports the Firestore db export from the shared firebase service', () => {
        const dbImportPattern = /import\s*\{[^}]*\bdb\b[^}]*\}\s*from\s+['"]@\/lib\/services\/firebase['"]/;
        const offenders = files.filter((f) => dbImportPattern.test(readFileSync(f, 'utf-8')));
        expect(offenders, `Found Firestore 'db' import(s) in:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('userService.ts (the legacy Firestore-direct profile service) no longer exists', () => {
        expect(existsSync(path.join(SRC, 'features/auth/services/userService.ts'))).toBe(false);
    });
});
