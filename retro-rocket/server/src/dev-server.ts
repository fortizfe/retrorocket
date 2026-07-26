import { loadConfig } from './config/env';
import { buildApp } from './http/composition-root';

// Local development entrypoint. In production the app runs as a Vercel serverless
// function (see api/index.ts); here it listens on a port that Vite proxies
// /api/* to, preserving same-origin cookie semantics.
const config = loadConfig();
const app = buildApp();

app.listen(config.serverPort, () => {
    console.log(`[backend] listening on http://localhost:${config.serverPort} (proxied at /api)`);
});
