import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { AppError } from '../../domain/errors';
import type { LoggerPort } from '../../application/ports/observability';

export interface ApiErrorBody {
    error: { code: string; message: string };
    correlationId: string;
}

function correlationOf(res: Response): string {
    const id = res.locals.correlationId;
    return typeof id === 'string' && id !== '' ? id : 'unknown';
}

function body(code: string, message: string, res: Response): ApiErrorBody {
    return { error: { code, message }, correlationId: correlationOf(res) };
}

/** Terminal 404 for any unmatched route — structured, never an HTML page (FR-004). */
export function notFoundHandler(): RequestHandler {
    return (req, res) => {
        res.status(404).json(body('not_found', `Route not found: ${req.method} ${req.path}`, res));
    };
}

/**
 * Uniform error envelope. Known AppErrors surface their code/status; anything else is
 * a 500 with a generic message — stack traces and secrets never reach the client.
 */
export function errorHandler(logger?: LoggerPort): ErrorRequestHandler {
    // The 4th arg (_next) is required for Express to treat this as an error handler.
    return (err, req, res, _next) => {
        const isKnown = err instanceof AppError;
        const status = isKnown ? err.httpStatus : 500;
        const code = isKnown ? err.code : 'internal';
        const message = isKnown ? err.message : 'Internal server error';

        logger?.error('request_error', {
            code,
            status,
            method: req.method,
            path: req.path,
            correlationId: correlationOf(res),
            // Full detail server-side only; never serialized to the client.
            detail: err instanceof Error ? err.message : String(err),
        });

        res.status(status).json(body(code, message, res));
    };
}
