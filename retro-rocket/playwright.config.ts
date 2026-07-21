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
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        env: {
            VITE_USE_FIREBASE_EMULATOR: 'true',
        },
        timeout: 30_000,
    },
});
