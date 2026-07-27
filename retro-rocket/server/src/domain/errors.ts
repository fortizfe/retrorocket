// Pure domain errors — no framework or external-service imports.
// The hexagonal core must remain free of Express/Firebase (see architecture test).

export class AppError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly httpStatus: number = 400,
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super('not_found', message, 404);
        this.name = 'NotFoundError';
    }
}

export class ConfigError extends AppError {
    constructor(message: string) {
        super('config_error', message, 500);
        this.name = 'ConfigError';
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Not authorized to perform this action') {
        super('forbidden', message, 403);
        this.name = 'ForbiddenError';
    }
}

export class ConflictError extends AppError {
    constructor(message = 'The resource was modified concurrently') {
        super('conflict', message, 409);
        this.name = 'ConflictError';
    }
}
