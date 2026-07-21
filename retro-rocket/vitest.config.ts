/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        css: true,
        // Playwright specs live under e2e/ and use the same *.spec.ts naming Vitest's
        // default glob would otherwise pick up — exclude them so `npm run test` stays
        // scoped to unit/integration tests (FR-001: one test runner per file, not two).
        exclude: ['node_modules/**', 'e2e/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'src/test/**',
                '**/*.d.ts',
                'src/vite-env.d.ts',
                'coverage/**',
                'dist/**',
                'src/**/*.stories.tsx',
                'postcss.config.js',
                'tailwind.config.js',
                'babel.config.js',
                '.babelrc.js',
                'vite.config.ts',
                'vitest.config.ts',
                'eslint.config.js',
                'playwright.config.ts',
                'e2e/**',
            ],
            // NOTE (constitution compliance audit, 2026-07-21): these thresholds were
            // previously nested under a `global` key, which is a pre-Vitest-3 schema that
            // this version silently ignores — the 80% floor was never actually enforced.
            // Fixing the schema now surfaces real coverage (~52% statements/lines, ~66%
            // functions, ~81% branches), far below the original aspirational 80% target.
            // Thresholds below are set to the true, currently-passing baseline (not 80%)
            // so this gate is honest and enforceable today; raising branches/functions/
            // lines/statements coverage toward 80% is tracked as a separate follow-up
            // effort, not part of this compliance pass (see FR-012).
            thresholds: {
                branches: 78,
                functions: 64,
                lines: 50,
                statements: 50
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
