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
// Unlike those two (fully migrated, single-shot features), 019 migrates ~10
// collections' worth of operations across many files in priority-ordered user
// stories (US1-US7) — this test tracks that migration precisely via an EXPECTED
// allowlist rather than a simple boolean, so it fails loudly both if a file is
// migrated without updating this list (forgotten allowlist trim) AND if a new
// Firestore-direct import creeps into an already-migrated file (regression). The
// allowlist should shrink to just PERMANENT_EXCEPTIONS by the time Phase 10 (Polish,
// T110) runs — see that task for the final assertion.
const SCAN_ROOTS = [path.join(SRC, 'pages/RetrospectivePage.tsx'), path.join(SRC, 'features/boards')];

/**
 * Files not part of this feature's retirement list (plan.md's Source Code section) —
 * legitimately out of scope, expected to remain Firestore-direct indefinitely.
 * UserProfileCache.ts batch-reads the `users` collection for display-name caching, a
 * concern this feature's ports don't cover (no UserPort exists here or elsewhere).
 */
const PERMANENT_EXCEPTIONS = ['src/features/boards/participants/services/UserProfileCache.ts'];

/**
 * Story-by-story retirement list (plan.md): trimmed as each user story's rewiring
 * task lands. US1 (T036) migrated RetrospectivePage.tsx + RetrospectiveTopbar.tsx (the
 * global Header's board-chrome component, an unplanned-for gap found via E2E — it had
 * its own independent useRetrospective/useParticipants calls) to
 * useRetrospectiveRealtimeSync via BoardDataContext; retrospectiveService.ts and
 * useRetrospective.ts had zero remaining callers afterward and were deleted outright
 * (research.md §10 precedent). US3 (T060/T061) migrated OptimizedTypingStatusService.ts
 * to write via backendRetrospectiveClient.setTypingStatus() and deleted
 * typingStatusService.ts (confirmed dead, zero callers). US4 (T074) migrated
 * useCardGroups.ts and useColumnGrouping.ts to backendRetrospectiveClient; trimmed
 * cardGroupService.ts down to just its pure calculateGroupAggregations helper (all
 * Firestore-direct CRUD/subscription exports retired) and deleted
 * columnGroupingService.ts outright (confirmed zero remaining callers). US5 (T088)
 * migrated the timer (useCountdown.ts) and facilitator-notes (useFacilitatorNotes.ts)
 * hooks and the convert-card-to-action-item path (useActionItems.ts) to
 * backendRetrospectiveClient; deleted countdownService.ts and
 * facilitatorNotesService.ts outright (confirmed zero remaining callers), plus three
 * dead components discovered along the way that still called the old hook signatures
 * (FacilitatorControls.tsx, TimerTab.tsx, PdfExporter.tsx/ExportPopover.tsx/
 * FacilitatorNotes.tsx — all zero-caller). US6 (T098) migrated useActionItems.ts's
 * remaining reads/writes (create/edit/delete, not just convert) to
 * backendRetrospectiveClient and deleted actionItemsService.ts outright (confirmed
 * zero remaining callers). US7 (T108) migrated useSentimentResults.ts (results loaded
 * once from board state, not live-synced, per spec Assumptions) to
 * backendRetrospectiveClient and deleted sentimentResultsService.ts outright
 * (confirmed zero remaining callers) — this was the last slice tied to a numbered
 * user story (US1-US7 all now migrated). Every service still below has no dedicated
 * story of its own — participantService.ts/cardInteractionService.ts/cardService.ts
 * are left for Polish (T110) to resolve (both retain real callers outside this
 * feature — CreateCardForm.tsx, useCards.ts — so deleting them isn't this feature's
 * call to make unilaterally); useRetrospectiveColumns.ts is out of scope entirely
 * (columns are seeded once at board creation by 017, never written by this feature).
 */
const EXPECTED_REMAINING_OFFENDERS = [
    'src/features/boards/participants/services/participantService.ts',
    'src/features/boards/retrospective/hooks/useRetrospectiveColumns.ts',
    'src/features/boards/retrospective/services/cardInteractionService.ts',
    'src/features/boards/retrospective/services/cardService.ts',
];

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
