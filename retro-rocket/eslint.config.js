// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
    {
        ignores: [
            'dist/**',
            'coverage/**',
            'node_modules/**',
            'e2e/**',
            'public/**',
            '*.config.js',
            '*.config.ts',
            '.babelrc.js',
            'babel.config.js',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            'jsx-a11y': jsxA11y,
        },
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
            },
        },
        rules: {
            // eslint-plugin-react-hooks v7's `recommended` config bundles the full
            // React Compiler readiness ruleset (purity/immutability/set-state-in-effect/etc.),
            // which this project does not target. Keep only the two classic, universally-
            // applicable hook-safety rules every React project should enforce.
            'react-hooks/rules-of-hooks': 'error',
            'react-hooks/exhaustive-deps': 'warn',
            ...jsxA11y.configs.recommended.rules,
            // Every autoFocus usage in this codebase targets the primary field of a
            // just-opened modal or inline-edit form (a user-initiated interaction), which
            // is the standard, accessible WAI-ARIA Dialog pattern of moving focus into the
            // dialog on open — not page-load focus theft. Downgraded to a warning (documented
            // exception per FR-005) rather than stripped from 13 reviewed, legitimate call sites.
            'jsx-a11y/no-autofocus': 'warn',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        files: ['src/test/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            'react-refresh/only-export-components': 'off',
            // Dynamic require() after vi.resetModules() is a standard Vitest pattern for
            // re-acquiring a fresh module-level singleton mid-test; not achievable with static import.
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
);
