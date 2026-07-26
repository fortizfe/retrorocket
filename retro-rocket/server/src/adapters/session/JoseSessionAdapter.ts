import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { OAuthStateCodecPort, SessionServicePort } from '../../application/ports';
import { Session, type SessionData } from '../../domain/auth/Session';
import { OAuthState, type OAuthStateData } from '../../domain/auth/OAuthState';
import type { PublicUser } from '../../domain/auth/types';

const ALG = 'HS256';

/**
 * Signs/verifies the app session as a stateless HS256 JWT (the backend is the session
 * authority — R5). The full SessionData is nested under a `session` claim so its own
 * `exp`/`absExp` fields never collide with the JWT's reserved `exp`, which we set to the
 * absolute expiry for cryptographic enforcement of the absolute lifetime.
 */
export class JoseSessionAdapter implements SessionServicePort {
    private readonly secret: Uint8Array;

    constructor(signingKey: string) {
        this.secret = new TextEncoder().encode(signingKey);
    }

    private sign(session: Session): Promise<string> {
        return new SignJWT({ session: session.data })
            .setProtectedHeader({ alg: ALG })
            .setIssuedAt(session.data.iat)
            .setExpirationTime(session.data.absExp)
            .sign(this.secret);
    }

    async issue(user: PublicUser, nowSeconds: number): Promise<{ token: string; session: Session }> {
        const session = Session.issue(user, nowSeconds, randomUUID());
        return { token: await this.sign(session), session };
    }

    async verify(token: string, nowSeconds: number): Promise<Session | null> {
        try {
            const { payload } = await jwtVerify(token, this.secret, { currentDate: new Date(nowSeconds * 1000) });
            const data = payload.session as SessionData | undefined;
            if (!data || typeof data.sub !== 'string' || typeof data.absExp !== 'number') return null;
            return new Session(data);
        } catch {
            return null;
        }
    }

    async refresh(session: Session, nowSeconds: number): Promise<{ token: string; session: Session }> {
        const refreshed = session.refreshed(nowSeconds);
        return { token: await this.sign(refreshed), session: refreshed };
    }
}

/**
 * Signs/verifies the short-lived OAuth state cookie. Only integrity/authenticity is
 * enforced here; the 10-minute TTL is checked in the domain (OAuthState.assertMatches)
 * against the injected clock, keeping this adapter clock-free and deterministic.
 */
export class JoseOAuthStateCodec implements OAuthStateCodecPort {
    private readonly secret: Uint8Array;

    constructor(signingKey: string) {
        this.secret = new TextEncoder().encode(signingKey);
    }

    async encode(state: OAuthState): Promise<string> {
        return new SignJWT({ st: state.data }).setProtectedHeader({ alg: ALG }).sign(this.secret);
    }

    async decode(cookieValue: string): Promise<OAuthState | null> {
        try {
            const { payload } = await jwtVerify(cookieValue, this.secret);
            const data = payload.st as OAuthStateData | undefined;
            if (!data || typeof data.state !== 'string') return null;
            return new OAuthState(data);
        } catch {
            return null;
        }
    }
}
