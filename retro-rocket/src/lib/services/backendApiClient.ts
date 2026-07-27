/**
 * Shared fetch wrapper for every backend-API-client service file this refactor introduces
 * (research.md/plan.md: same-origin `/api/*`, `credentials: 'include'`, no Firebase client
 * SDK). Parses the backend's uniform `{ error: { code, message }, correlationId }` error
 * envelope (server/src/http/middleware/errorHandler.ts) into a typed error.
 */

export class BackendApiError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly status: number,
        public readonly correlationId: string,
    ) {
        super(message);
        this.name = 'BackendApiError';
    }
}

interface ApiErrorBody {
    error?: { code?: string; message?: string };
    correlationId?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(path, { credentials: 'include', ...init, headers });

    if (!res.ok) {
        let body: ApiErrorBody | null = null;
        try {
            body = (await res.json()) as ApiErrorBody;
        } catch {
            body = null;
        }
        throw new BackendApiError(
            body?.error?.code ?? 'unknown_error',
            body?.error?.message ?? `Request failed with status ${res.status}`,
            res.status,
            body?.correlationId ?? 'unknown',
        );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
}

function withBody(method: string, body?: unknown): RequestInit {
    return { method, body: body !== undefined ? JSON.stringify(body) : undefined };
}

export const backendApiClient = {
    get: <T>(path: string): Promise<T> => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, withBody('POST', body)),
    patch: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, withBody('PATCH', body)),
    put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, withBody('PUT', body)),
    delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
};
