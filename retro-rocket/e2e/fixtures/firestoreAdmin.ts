import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Direct Admin SDK access to the Firestore emulator for E2E fixtures that need to
 * write data bypassing the backend REST API entirely — e.g. the synthetic live-relay
 * check in retrospective-board.spec.ts (US1), which proves the realtime channel
 * relays a change regardless of what wrote it, not just changes the backend's own
 * routes produced. `npm run e2e` runs via `firebase emulators:exec`, which sets
 * FIRESTORE_EMULATOR_HOST for the wrapped Playwright process automatically — the same
 * mechanism the backend itself relies on (playwright.config.ts's webServer env).
 */
export function getEmulatorFirestore(): Firestore {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is not set — run this spec via `npm run e2e` (firebase emulators:exec)');
    }
    const app = getApps()[0] ?? initializeApp({ projectId: 'demo-retrorocket' });
    return getFirestore(app);
}
