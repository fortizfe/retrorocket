// Observability ports (FR-007a). Driven adapters implement these so use cases and
// HTTP wiring depend on interfaces, not a concrete logging/metrics/tracing library.

export type LogFields = Record<string, unknown>;

export interface LoggerPort {
    info(message: string, fields?: LogFields): void;
    warn(message: string, fields?: LogFields): void;
    error(message: string, fields?: LogFields): void;
    /** Returns a logger that merges the given fields into every subsequent entry. */
    child(fields: LogFields): LoggerPort;
}

export interface MetricsPort {
    increment(name: string, tags?: Record<string, string>): void;
    timing(name: string, milliseconds: number, tags?: Record<string, string>): void;
}

export interface Span {
    end(fields?: LogFields): void;
}

export interface TracerPort {
    startSpan(name: string, fields?: LogFields): Span;
}

export interface Observability {
    logger: LoggerPort;
    metrics: MetricsPort;
    tracer: TracerPort;
}
