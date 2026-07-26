import type {
    LoggerPort,
    LogFields,
    MetricsPort,
    Observability,
    Span,
    TracerPort,
} from '../../application/ports/observability';

/** Line sink — defaults to stdout, injectable for tests. */
export type Sink = (line: string) => void;

const defaultSink: Sink = (line) => process.stdout.write(line + '\n');

// Keys whose values must never appear in logs/metrics/traces (secrets, tokens, PII).
const SENSITIVE_KEY = /(token|secret|password|authorization|cookie|signingkey|apikey|credential|email)/i;
const REDACTED = '[REDACTED]';

export function redact(fields: LogFields): LogFields {
    const out: LogFields = {};
    for (const [key, value] of Object.entries(fields)) {
        if (SENSITIVE_KEY.test(key)) {
            out[key] = REDACTED;
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            out[key] = redact(value as LogFields);
        } else {
            out[key] = value;
        }
    }
    return out;
}

class StdoutLogger implements LoggerPort {
    constructor(
        private readonly sink: Sink,
        private readonly bound: LogFields,
    ) {}

    private write(level: string, message: string, fields?: LogFields): void {
        const entry = {
            level,
            msg: message,
            time: new Date().toISOString(),
            ...redact({ ...this.bound, ...(fields ?? {}) }),
        };
        this.sink(JSON.stringify(entry));
    }

    info(message: string, fields?: LogFields): void {
        this.write('info', message, fields);
    }

    warn(message: string, fields?: LogFields): void {
        this.write('warn', message, fields);
    }

    error(message: string, fields?: LogFields): void {
        this.write('error', message, fields);
    }

    child(fields: LogFields): LoggerPort {
        return new StdoutLogger(this.sink, { ...this.bound, ...fields });
    }
}

class StdoutMetrics implements MetricsPort {
    constructor(
        private readonly sink: Sink,
        private readonly bound: LogFields,
    ) {}

    private emit(kind: string, name: string, value: number, tags?: Record<string, string>): void {
        this.sink(
            JSON.stringify({
                type: 'metric',
                kind,
                name,
                value,
                time: new Date().toISOString(),
                ...redact({ ...this.bound, ...(tags ?? {}) }),
            }),
        );
    }

    increment(name: string, tags?: Record<string, string>): void {
        this.emit('count', name, 1, tags);
    }

    timing(name: string, milliseconds: number, tags?: Record<string, string>): void {
        this.emit('timing', name, milliseconds, tags);
    }
}

class SimpleTracer implements TracerPort {
    constructor(
        private readonly logger: LoggerPort,
        private readonly metrics: MetricsPort,
    ) {}

    startSpan(name: string, fields?: LogFields): Span {
        const start = Date.now();
        return {
            end: (endFields?: LogFields): void => {
                const durationMs = Date.now() - start;
                this.logger.info(`span:${name}`, { ...fields, ...endFields, durationMs });
                this.metrics.timing(`span.${name}`, durationMs);
            },
        };
    }
}

/**
 * Build the structured-logging + metrics + tracing bundle. `baseFields` (e.g. service
 * name, correlationId) are merged into and redacted on every entry.
 */
export function createStdoutObservability(baseFields: LogFields = {}, sink: Sink = defaultSink): Observability {
    const logger = new StdoutLogger(sink, baseFields);
    const metrics = new StdoutMetrics(sink, baseFields);
    const tracer = new SimpleTracer(logger, metrics);
    return { logger, metrics, tracer };
}
