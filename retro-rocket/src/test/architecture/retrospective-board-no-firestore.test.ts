import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../..'); // retro-rocket/
const SRC = path.join(REPO_ROOT, 'src');

// 019 / FR-001, FR-002, SC-002: the retrospective board screen and its supporting
// components/hooks/services MUST NOT establish any direct connection to
// Firebase/Firestore once migrated. A static import-boundary check is a more reliable
// way to guarantee this than E2E network sniffing (mirrors
// src/test/architecture/dashboard-no-firestore.test.ts / profile-no-firestore.test.ts).
//
// 019 migrated ~10 collections' worth of operations across many files in
// priority-ordered user stories (US1-US7), tracked via an EXPECTED allowlist that
// shrank story by story. Feature 021 (research.md §2, §3, §6) closes the two live
// offenders 019 deliberately deferred (useRetrospectiveColumns.ts — its data is
// already served by the existing board-state payload, no live listener needed —
// and the one PERMANENT_EXCEPTIONS entry, UserProfileCache.ts — its only output,
// photoURL, is already on every Participant) plus the last dead-but-present
// direct-Firestore files (participantService.ts, cardService.ts,
// cardInteractionService.ts, reachable only via already-unused JoinPanelForm.tsx/
// useParticipants.ts/useCards.ts/CreateCardForm.tsx — all deleted outright). Both
// allowlists are now empty: this test is a true zero-tolerance guard against any
// future direct-Firebase regression on this screen (FR-007).
const SCAN_ROOTS = [path.join(SRC, 'pages/RetrospectivePage.tsx'), path.join(SRC, 'features/boards')];

/** No permanent exceptions remain — see the comment above (021, research.md §3). */
const PERMANENT_EXCEPTIONS: string[] = [];

/** No expected remaining offenders — see the comment above (021, research.md §2, §4). */
const EXPECTED_REMAINING_OFFENDERS: string[] = [];

function scanFiles(): string[] {
    const paths = SCAN_ROOTS.map((p) => `"${p}"`).join(' ');
    const out = execSync(`find ${paths} -type f \\( -name '*.ts' -o -name '*.tsx' \\)`, { encoding: 'utf-8' });
    return out
        .split('\n')
        .filter(Boolean)
        .filter((f) => !f.includes('/test/') && !f.endsWith('.test.ts') && !f.endsWith('.test.tsx'));
}

function relative(filePath: string): string {
    return path.relative(REPO_ROOT, filePath);
}

describe('Retrospective board backend-mediated access (FR-001, FR-002, SC-002)', () => {
    const files = scanFiles();

    it('scans at least the known retrospective-board source files', () => {
        expect(files.length).toBeGreaterThan(20);
    });

    it('imports the Firebase Firestore client SDK only in files on the tracked allowlist', () => {
        const importPattern = /from\s+['"]firebase\/firestore['"]/;
        const allowlist = new Set([...PERMANENT_EXCEPTIONS, ...EXPECTED_REMAINING_OFFENDERS]);
        const offenders = files.filter((f) => importPattern.test(readFileSync(f, 'utf-8'))).map(relative);

        const unexpected = offenders.filter((f) => !allowlist.has(f));
        expect(unexpected, `Unexpected new firebase/firestore import(s) — migrate via backendRetrospectiveClient or add to the allowlist with justification:\n${unexpected.join('\n')}`).toEqual([]);
    });

    it('does not list an allowlist entry that has already been migrated (keeps the allowlist honest)', () => {
        const importPattern = /from\s+['"]firebase\/firestore['"]/;
        const stillOffending = new Set(files.filter((f) => importPattern.test(readFileSync(f, 'utf-8'))).map(relative));

        const staleEntries = EXPECTED_REMAINING_OFFENDERS.filter((entry) => !stillOffending.has(entry));
        expect(staleEntries, `These allowlist entries no longer import firebase/firestore — remove them from EXPECTED_REMAINING_OFFENDERS:\n${staleEntries.join('\n')}`).toEqual([]);
    });
});
