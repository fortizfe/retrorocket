import { defineConfig, devices } from '@playwright/test';

/**
 * E2E specs run against the real app (real Firebase SDK calls) wired to the local
 * Firebase Emulator Suite via VITE_USE_FIREBASE_EMULATOR — never a production or
 * cloud staging project (see spec.md Clarifications, 2026-07-21).
 */
export default defineConfig({
    testDir: './e2e',
    // Specs share one dev server and one Firestore/Auth Emulator instance (no per-worker
    // isolation), so they run serially rather than in parallel to avoid cross-test
    // contention on that shared state.
    fullyParallel: false,
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    // CI runners are noticeably slower than a local dev machine for this app + emulator
    // combo (observed: a few interactions crossed the 30s/5s defaults on GitHub Actions
    // even though the same specs comfortably passed locally) — give both more headroom.
    timeout: 60_000,
    expect: {
        timeout: 10_000,
    },
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        actionTimeout: 15_000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Two servers: the Vite SPA and the hexagonal backend. Vite proxies /api/* to the
    // backend (:3001), which runs with AUTH_TEST_MODE + firebase-admin pointed at the Auth
    // Emulator so the test-login endpoint can mint custom tokens. OAuth client creds are
    // dummy values (test-login never performs the real OAuth handshake).
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:3000',
            reuseExistingServer: !process.env.CI,
            env: {
                VITE_USE_FIREBASE_EMULATOR: 'true',
                // Belt-and-suspenders alongside src/lib/services/firebase.ts's own
                // useEmulator-gated "demo-retrorocket" default: force the same project id
                // the backend uses (FIREBASE_PROJECT_ID below) so the emulator's
                // singleProjectMode has nothing to reconcile between the two SDKs (017 E2E fix).
                VITE_FIREBASE_PROJECT_ID: 'demo-retrorocket',
            },
            timeout: 30_000,
        },
        {
            command: 'npm run dev:server',
            url: 'http://localhost:3001/api/health',
            reuseExistingServer: !process.env.CI,
            env: {
                SERVER_PORT: '3001',
                AUTH_TEST_MODE: 'true',
                NODE_ENV: 'development',
                FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
                // firebase-admin's Firestore client (FirestoreBoardsAdapter, and
                // FirestoreRetrospectiveReadAdapter for MCP) auto-detects this var the
                // same way Auth auto-detects FIREBASE_AUTH_EMULATOR_HOST — without it,
                // Admin SDK Firestore calls target real/default Firestore instead of the
                // local emulator the frontend's client SDK is connected to (017 E2E fix).
                FIRESTORE_EMULATOR_HOST: 'localhost:8080',
                FIREBASE_PROJECT_ID: 'demo-retrorocket',
                // `vite-node` auto-loads the developer's .env, which may contain a real
                // FIREBASE_SERVICE_ACCOUNT for local Firestore-backed development.
                // auth-wiring.ts's getFirebaseAuth() prefers a present service account
                // over FIREBASE_PROJECT_ID, so without this override E2E runs would
                // silently authenticate the Admin SDK against the real project instead of
                // the emulator — while the frontend's client SDK stays on "demo-retrorocket"
                // — leaving admin-written data invisible to the browser (017 E2E fix).
                FIREBASE_SERVICE_ACCOUNT: '',
                SESSION_SIGNING_KEY: 'e2e-test-signing-key-not-a-secret',
                OAUTH_REDIRECT_BASE_URL: 'http://localhost:3000',
                GOOGLE_OAUTH_CLIENT_ID: 'e2e-dummy',
                GOOGLE_OAUTH_CLIENT_SECRET: 'e2e-dummy',
                GITHUB_OAUTH_CLIENT_ID: 'e2e-dummy',
                GITHUB_OAUTH_CLIENT_SECRET: 'e2e-dummy',
            },
            timeout: 30_000,
        },
    ],
});
