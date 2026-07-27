import { defineConfig, devices } from '@playwright/test';

/**
 * E2E specs run against the real app. The frontend itself no longer talks to Firebase
 * directly at all (feature 017) — every Firestore/Auth interaction happens through the
 * backend's Admin SDK, which is wired to the local Firebase Emulator Suite (never a
 * production or cloud staging project, see spec.md Clarifications, 2026-07-21).
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
    // Emulator so the test-login endpoint can resolve/create the test user's Firebase Auth
    // record and custom claims (identityStore.resolveUser — see routes/auth.ts). The Auth
    // Emulator is still required here even though the frontend no longer talks to Firebase
    // Auth directly (research.md §7 anticipated dropping it, but the backend's own
    // test-login flow depends on it independently of the frontend). OAuth client creds are
    // dummy values (test-login never performs the real OAuth handshake).
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:3000',
            reuseExistingServer: !process.env.CI,
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
                FIREBASE_PROJECT_ID: 'demo-retrorocket',
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
