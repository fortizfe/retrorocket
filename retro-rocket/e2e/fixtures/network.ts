import { Page } from '@playwright/test';

// The Firestore emulator historically listened on localhost:8080 when
// src/lib/services/firebase.ts still initialized a Firestore client. As of 021
// (research.md §3/§4) that client no longer exists at all — bootstrapSession() no
// longer calls signInWithCustomToken either, so the Auth emulator (localhost:9099) is
// not expected to see any traffic from this app anymore either. This pattern is kept as
// a standing regression guard for Firestore specifically.
const FIRESTORE_EMULATOR_HOST_PATTERN = /localhost:8080|127\.0\.0\.1:8080/;

/**
 * Blocks the page from reaching the Firestore emulator and returns a function to lift
 * the block. Proving a Dashboard operation (list/create/join/rename/delete) still
 * succeeds while Firestore is unreachable is a more robust way to verify FR-001
 * ("MUST NOT establish any direct connection... for any of its operations") than
 * recording-and-asserting-empty: client-side navigation into the (out-of-scope) board
 * detail page can fire its own legitimate Firestore listeners essentially
 * simultaneously with a backend response, which races unpredictably against any
 * attempt to stop recording at the network-event level. Blocking sidesteps the race
 * entirely — if the action under test required Firestore, it would simply fail.
 */
export async function blockFirestoreRequests(page: Page): Promise<() => Promise<void>> {
    await page.route(FIRESTORE_EMULATOR_HOST_PATTERN, (route) => route.abort('blockedbyclient'));
    return () => page.unroute(FIRESTORE_EMULATOR_HOST_PATTERN);
}
