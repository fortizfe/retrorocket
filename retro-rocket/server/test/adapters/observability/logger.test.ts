import { describe, it, expect } from 'vitest';
import { createStdoutObservability, redact } from '../../../src/adapters/observability/stdout';

function capture() {
    const lines: string[] = [];
    return { sink: (l: string) => lines.push(l), lines };
}

describe('redact', () => {
    it('masks sensitive keys and recurses into nested objects', () => {
        const out = redact({
            userId: 'u1',
            token: 'super-secret',
            nested: { sessionCookie: 'abc', ok: 'visible' },
        });
        expect(out.userId).toBe('u1');
        expect(out.token).toBe('[REDACTED]');
        expect((out.nested as Record<string, unknown>).sessionCookie).toBe('[REDACTED]');
        expect((out.nested as Record<string, unknown>).ok).toBe('visible');
    });
});

describe('StdoutLogger', () => {
    it('emits structured JSON with level, message, and time', () => {
        const { sink, lines } = capture();
        const { logger } = createStdoutObservability({}, sink);
        logger.info('hello', { userId: 'u1' });
        const entry = JSON.parse(lines[0]);
        expect(entry.level).toBe('info');
        expect(entry.msg).toBe('hello');
        expect(entry.userId).toBe('u1');
        expect(typeof entry.time).toBe('string');
    });

    it('never logs secrets/tokens/PII (redacts by key)', () => {
        const { sink, lines } = capture();
        const { logger } = createStdoutObservability({}, sink);
        logger.info('auth', { firebaseCustomToken: 'tok_123', email: 'a@b.com', authorization: 'Bearer x' });
        expect(lines[0]).not.toContain('tok_123');
        expect(lines[0]).not.toContain('a@b.com');
        expect(lines[0]).not.toContain('Bearer x');
        expect(lines[0]).toContain('[REDACTED]');
    });

    it('child() merges bound fields (e.g. correlationId) into every entry', () => {
        const { sink, lines } = capture();
        const { logger } = createStdoutObservability({ service: 'svc' }, sink);
        logger.child({ correlationId: 'cid-1' }).warn('warn');
        const entry = JSON.parse(lines[0]);
        expect(entry.service).toBe('svc');
        expect(entry.correlationId).toBe('cid-1');
        expect(entry.level).toBe('warn');
    });
});

describe('metrics + tracer', () => {
    it('emits metric lines for counts and timings', () => {
        const { sink, lines } = capture();
        const { metrics } = createStdoutObservability({}, sink);
        metrics.increment('auth.success', { provider: 'google' });
        metrics.timing('request.latency', 42);
        const count = JSON.parse(lines[0]);
        const timing = JSON.parse(lines[1]);
        expect(count).toMatchObject({ type: 'metric', kind: 'count', name: 'auth.success', value: 1, provider: 'google' });
        expect(timing).toMatchObject({ type: 'metric', kind: 'timing', name: 'request.latency', value: 42 });
    });

    it('spans log a duration and record a timing metric on end', () => {
        const { sink, lines } = capture();
        const { tracer } = createStdoutObservability({}, sink);
        tracer.startSpan('op').end();
        const spanLog = JSON.parse(lines[0]);
        const timing = JSON.parse(lines[1]);
        expect(spanLog.msg).toBe('span:op');
        expect(typeof spanLog.durationMs).toBe('number');
        expect(timing).toMatchObject({ type: 'metric', kind: 'timing', name: 'span.op' });
    });
});
