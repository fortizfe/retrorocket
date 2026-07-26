import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

export const CORRELATION_HEADER = 'x-correlation-id';

/**
 * Assigns a correlation id to every request (reusing an inbound one when present),
 * stores it on res.locals for downstream handlers/loggers, and echoes it back on
 * the response so clients and traces can be tied together (FR-007a).
 */
export function correlationId(): RequestHandler {
    return (req, res, next) => {
        const inbound = req.header(CORRELATION_HEADER);
        const id = inbound && inbound.trim() !== '' ? inbound.trim() : randomUUID();
        res.locals.correlationId = id;
        res.setHeader(CORRELATION_HEADER, id);
        next();
    };
}
