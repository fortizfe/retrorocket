import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { correlationId, CORRELATION_HEADER } from '../../../src/http/middleware/correlationId';

function app() {
    const a = express();
    a.use(correlationId());
    a.get('/x', (_req, res) => res.json({ cid: res.locals.correlationId }));
    return a;
}

describe('correlationId middleware', () => {
    it('generates an id, echoes it on the response, and exposes it via res.locals', async () => {
        const res = await request(app()).get('/x');
        const header = res.headers[CORRELATION_HEADER];
        expect(header).toBeTruthy();
        expect(res.body.cid).toBe(header);
    });

    it('reuses a valid inbound correlation id', async () => {
        const res = await request(app()).get('/x').set(CORRELATION_HEADER, 'client-supplied-id');
        expect(res.headers[CORRELATION_HEADER]).toBe('client-supplied-id');
        expect(res.body.cid).toBe('client-supplied-id');
    });

    it('ignores a blank inbound id and generates a fresh one', async () => {
        const res = await request(app()).get('/x').set(CORRELATION_HEADER, '   ');
        expect(res.headers[CORRELATION_HEADER].trim()).not.toBe('');
        expect(res.headers[CORRELATION_HEADER]).not.toBe('   ');
    });
});
