import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { correlationId } from '../../../src/http/middleware/correlationId';
import { errorHandler, notFoundHandler } from '../../../src/http/middleware/errorHandler';
import { AppError } from '../../../src/domain/errors';

function app() {
    const a = express();
    a.use(correlationId());
    a.get('/known', () => {
        throw new AppError('invalid_oauth_state', 'State mismatch', 401);
    });
    a.get('/boom', () => {
        throw new Error('secret internal detail: db-password=hunter2');
    });
    a.use(notFoundHandler());
    a.use(errorHandler());
    return a;
}

describe('errorHandler', () => {
    it('maps a known AppError to its status/code and includes the correlation id', async () => {
        const res = await request(app()).get('/known');
        expect(res.status).toBe(401);
        expect(res.body.error).toEqual({ code: 'invalid_oauth_state', message: 'State mismatch' });
        expect(res.body.correlationId).toBeTruthy();
    });

    it('maps an unknown error to a generic 500 and never leaks the internal detail', async () => {
        const res = await request(app()).get('/boom');
        expect(res.status).toBe(500);
        expect(res.body.error.code).toBe('internal');
        expect(res.body.error.message).toBe('Internal server error');
        expect(JSON.stringify(res.body)).not.toContain('hunter2');
    });
});

describe('notFoundHandler', () => {
    it('returns a structured 404 for unknown routes (not HTML)', async () => {
        const res = await request(app()).get('/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('not_found');
        expect(res.body.correlationId).toBeTruthy();
    });
});
