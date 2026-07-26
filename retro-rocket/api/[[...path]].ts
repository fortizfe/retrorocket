import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../server/src/http/composition-root';

// Vercel serverless shell. A STATIC import is required so the bundler (esbuild) inlines
// the whole server/src graph into this function — a dynamic import() is left as a runtime
// import and Node's ESM resolver then can't find the extensionless module. The Express app
// is built once at module scope (cold-start friendly); any build failure is captured and
// surfaced as a readable JSON 500 instead of an opaque FUNCTION_INVOCATION_FAILED.

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let app: NodeHandler | undefined;
let bootError: Error | undefined;

try {
    app = buildApp() as unknown as NodeHandler;
} catch (error) {
    bootError = error instanceof Error ? error : new Error(String(error));
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
    if (bootError) {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(
            JSON.stringify({
                error: { code: 'backend_boot_error', message: bootError.message },
                // Hide the stack only on real production; show it on preview/dev for debugging.
                stack: process.env.VERCEL_ENV === 'production' ? undefined : bootError.stack,
            }),
        );
        return;
    }
    app!(req, res);
}
