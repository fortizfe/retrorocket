import { randomUUID } from 'node:crypto';
import { generateState, generateCodeVerifier } from 'arctic';
import type { ClockPort, RandomPort } from '../application/ports';

export class SystemClock implements ClockPort {
    nowSeconds(): number {
        return Math.floor(Date.now() / 1000);
    }
}

export class SystemRandom implements RandomPort {
    state(): string {
        return generateState();
    }

    codeVerifier(): string {
        return generateCodeVerifier();
    }

    sessionId(): string {
        return randomUUID();
    }
}
