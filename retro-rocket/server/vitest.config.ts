/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Backend (Node-environment) test suite, isolated from the frontend jsdom suite.
// Per constitution Principle VI, the 80% coverage floor applies to new backend code.
export default defineConfig({
    root: path.resolve(__dirname),
    test: {
        globals: true,
        environment: 'node',
        include: ['test/**/*.test.ts'],
        exclude: ['node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: [
                'src/**/*.d.ts',
                'src/dev-server.ts',
                // Thin composition glue over external SDKs (arctic, firebase-admin);
                // exercised by US3 E2E against the emulator, not unit tests.
                'src/http/auth-wiring.ts',
                'src/http/mcp-wiring.ts',
                'src/http/boards-wiring.ts',
                'src/adapters/system.ts',
            ],
            thresholds: {
                branches: 80,
                functions: 80,
                lines: 80,
                statements: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@server': path.resolve(__dirname, './src'),
        },
    },
});
