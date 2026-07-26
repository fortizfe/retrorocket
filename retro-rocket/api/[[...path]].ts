import { buildApp } from '../server/src/http/composition-root';

// Vercel serverless shell. This catch-all function receives every /api/* request and
// delegates to the single Express app. The app is built once at module scope so warm
// invocations reuse it (cold-start friendly, FR-006). An Express app is itself a
// (req, res) handler, which is exactly what the Vercel Node runtime expects.
const app = buildApp();

export default app;
