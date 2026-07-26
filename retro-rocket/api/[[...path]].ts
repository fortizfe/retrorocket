import type { IncomingMessage, ServerResponse } from 'node:http';

// Vercel serverless shell. The Express app is built lazily on first request (and memoized)
// via a dynamic import, wrapped in try/catch, so that ANY boot failure — including a
// module-load error such as require()-ing an ESM-only dependency — is surfaced as a
// readable JSON 500 instead of an opaque FUNCTION_INVOCATION_FAILED. An Express app is a
// (req, res) handler, which is exactly what the Vercel Node runtime expects.

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let appPromise: Promise<NodeHandler> | undefined;

async function loadApp(): Promise<NodeHandler> {
    const mod = await import('../server/src/http/composition-root');
    return mod.buildApp() as unknown as NodeHandler;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
        if (!appPromise) appPromise = loadApp();
        const app = await appPromise;
        app(req, res);
    } catch (error) {
        // Reset so a subsequent request can retry the build (e.g. after fixing config).
        appPromise = undefined;
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(
            JSON.stringify({
                error: { code: 'backend_boot_error', message },
                // Hide the stack only on real production; show it on preview/dev for debugging.
                stack: process.env.VERCEL_ENV === 'production' ? undefined : stack,
            }),
        );
    }
}
