import type { IncomingMessage, ServerResponse } from 'node:http';

// Type declaration for the generated `api/_backend.mjs` bundle (produced by
// scripts/bundle-backend.mjs at build time). Mirrors the public surface of
// server/src/http/composition-root.ts that the serverless entry consumes.
export declare function buildApp(source?: NodeJS.ProcessEnv): (req: IncomingMessage, res: ServerResponse) => void;
