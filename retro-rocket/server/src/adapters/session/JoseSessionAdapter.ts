import { createHash, randomUUID } from 'node:crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import type { OAuthStateCodecPort, SessionServicePort } from '../../application/ports';
import { Session, type SessionData } from '../../domain/auth/Session';
import { OAuthState, type OAuthStateData } from '../../domain/auth/OAuthState';
import type { PublicUser } from '../../domain/auth/types';

// Cookies are ENCRYPTED (JWE, dir + A256GCM), not merely signed: their payloads carry
// PII (email/uid) and the PKCE code_verifier, so the contents must be opaque at rest, not
// base64-readable. A 256-bit content-encryption key is derived from the signing secret.
const ALG = 'dir';
const ENC = 'A256GCM';

function deriveKey(signingKey: string): Uint8Array {
    // SHA-256 → exactly 32 bytes, the key size A256GCM requires for `dir`.
    return new Uint8Array(createHash('sha256').update(signingKey).digest());
}

/**
 * Encrypts/decrypts the app session as a stateless JWE (the backend is the session
 * authority — R5). The full SessionData is nested under a `session` claim so its own
 * `exp`/`absExp` fields never collide with the JWT's reserved `exp`, which is set to the
 * absolute expiry for cryptographic enforcement of the absolute lifetime.
 */
export class JoseSessionAdapter implements SessionServicePort {
    private readonly key: Uint8Array;

    constructor(signingKey: string) {
        this.key = deriveKey(signingKey);
    }

    private encrypt(session: Session): Promise<string> {
        return new EncryptJWT({ session: session.data })
            .setProtectedHeader({ alg: ALG, enc: ENC })
            .setIssuedAt(session.data.iat)
            .setExpirationTime(session.data.absExp)
            .encrypt(this.key);
    }

    async issue(user: PublicUser, nowSeconds: number): Promise<{ token: string; session: Session }> {
        const session = Session.issue(user, nowSeconds, randomUUID());
        return { token: await this.encrypt(session), session };
    }

    async verify(token: string, nowSeconds: number): Promise<Session | null> {
        try {
            const { payload } = await jwtDecrypt(token, this.key, { currentDate: new Date(nowSeconds * 1000) });
            const data = payload.session as SessionData | undefined;
            if (!data || typeof data.sub !== 'string' || typeof data.absExp !== 'number') return null;
            return new Session(data);
        } catch {
            return null;
        }
    }

    async refresh(session: Session, nowSeconds: number): Promise<{ token: string; session: Session }> {
        const refreshed = session.refreshed(nowSeconds);
        return { token: await this.encrypt(refreshed), session: refreshed };
    }
}

/**
 * Encrypts/decrypts the short-lived OAuth state cookie (which carries the PKCE
 * code_verifier — a secret). Confidentiality + integrity via JWE; the 10-minute TTL is
 * checked in the domain (OAuthState.assertMatches) against the injected clock, keeping this
 * adapter clock-free and deterministic.
 */
export class JoseOAuthStateCodec implements OAuthStateCodecPort {
    private readonly key: Uint8Array;

    constructor(signingKey: string) {
        this.key = deriveKey(signingKey);
    }

    async encode(state: OAuthState): Promise<string> {
        return new EncryptJWT({ st: state.data }).setProtectedHeader({ alg: ALG, enc: ENC }).encrypt(this.key);
    }

    async decode(cookieValue: string): Promise<OAuthState | null> {
        try {
            const { payload } = await jwtDecrypt(cookieValue, this.key);
            const data = payload.st as OAuthStateData | undefined;
            if (!data || typeof data.state !== 'string') return null;
            return new OAuthState(data);
        } catch {
            return null;
        }
    }
}
