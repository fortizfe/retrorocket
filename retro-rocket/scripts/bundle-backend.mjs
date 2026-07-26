// Pre-bundle the hexagonal backend into a single self-contained ESM file that the Vercel
// serverless function imports. This removes all cross-directory/extensionless runtime
// module resolution — Vercel does NOT reliably bundle the api/ function's imports from
// server/src, which caused ERR_MODULE_NOT_FOUND for composition-root at runtime.
//
// npm packages are kept external (`packages: 'external'`) so Vercel's file tracing includes
// them from node_modules (firebase-admin in particular does not bundle cleanly).
import { build } from 'esbuild';

await build({
    entryPoints: ['server/src/http/composition-root.ts'],
    outfile: 'api/_backend.mjs',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    packages: 'external',
    logLevel: 'info',
});

console.log('[bundle-backend] wrote api/_backend.mjs');
