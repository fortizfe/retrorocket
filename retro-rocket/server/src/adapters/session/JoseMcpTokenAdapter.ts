import { createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { McpAccessTokenClaims, McpTokenServicePort } from '../../application/ports/mcp';

const ALG = 'HS256';

function deriveKey(signingKey: string): Uint8Array {
    return new Uint8Array(createHash('sha256').update(signingKey).digest());
}

/**
 * Issues/verifies the short-lived MCP access-token JWT (signed, not encrypted — RFC 9068
 * style bearer token whose claims are not sensitive beyond what the bearer already knows).
 * Lives in adapters/session/, mirroring JoseSessionAdapter, per research.md §3: the live
 * revocation check itself is a separate Firestore read (FirestoreMcpConnectionAdapter),
 * not this adapter's concern — this only proves the token wasn't forged/expired.
 */
export class JoseMcpTokenAdapter implements McpTokenServicePort {
    private readonly key: Uint8Array;

    constructor(signingKey: string) {
        this.key = deriveKey(signingKey);
    }

    async issue(claims: McpAccessTokenClaims, nowSeconds: number, ttlSeconds: number): Promise<string> {
        return new SignJWT({ connectionId: claims.connectionId, client_id: claims.clientId })
            .setProtectedHeader({ alg: ALG })
            .setSubject(claims.sub)
            .setIssuedAt(nowSeconds)
            .setExpirationTime(nowSeconds + ttlSeconds)
            .sign(this.key);
    }

    async verify(token: string, nowSeconds: number): Promise<McpAccessTokenClaims | null> {
        try {
            const { payload } = await jwtVerify(token, this.key, {
                algorithms: [ALG],
                currentDate: new Date(nowSeconds * 1000),
            });
            const connectionId = payload.connectionId;
            const clientId = payload.client_id;
            if (typeof payload.sub !== 'string' || typeof connectionId !== 'string' || typeof clientId !== 'string') {
                return null;
            }
            return { sub: payload.sub, connectionId, clientId };
        } catch {
            return null;
        }
    }
}
