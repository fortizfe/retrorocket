import { Google, GitHub } from 'arctic';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { ServerConfig } from '../config/env';
import type { LoggerPort } from '../application/ports/observability';
import type { AuthRouterDeps } from './routes/auth';
import type { OAuthProvider } from '../domain/auth/types';
import type { OAuthProviderPort } from '../application/ports';
import { JoseSessionAdapter, JoseOAuthStateCodec } from '../adapters/session/JoseSessionAdapter';
import { FirebaseIdentityAdapter, type FirebaseAuthLike } from '../adapters/firebase/FirebaseIdentityAdapter';
import { GoogleOAuthAdapter } from '../adapters/oauth/GoogleOAuthAdapter';
import { GithubOAuthAdapter } from '../adapters/oauth/GithubOAuthAdapter';
import { SystemClock, SystemRandom } from '../adapters/system';

/**
 * Composition glue that instantiates external SDKs (arctic, firebase-admin) from env.
 * Returns null when the minimum auth configuration is absent, so the app can still serve
 * health without crashing. Excluded from unit coverage — it is thin wiring over third
 * parties, exercised by E2E (US3) against the emulator.
 */
export function buildAuthDeps(source: NodeJS.ProcessEnv, config: ServerConfig, logger: LoggerPort): AuthRouterDeps | null {
    const signingKey = source.SESSION_SIGNING_KEY;
    const redirectBase = source.OAUTH_REDIRECT_BASE_URL;

    if (!signingKey || !redirectBase) {
        logger.warn('auth_disabled', { reason: 'missing SESSION_SIGNING_KEY or OAUTH_REDIRECT_BASE_URL' });
        return null;
    }

    let auth: FirebaseAuthLike;
    try {
        auth = getFirebaseAuth(source) as unknown as FirebaseAuthLike;
    } catch (error) {
        logger.error('auth_disabled', { reason: 'firebase-admin init failed', detail: (error as Error).message });
        return null;
    }

    const providers: Partial<Record<OAuthProvider, OAuthProviderPort>> = {};
    if (source.GOOGLE_OAUTH_CLIENT_ID && source.GOOGLE_OAUTH_CLIENT_SECRET) {
        const google = new Google(source.GOOGLE_OAUTH_CLIENT_ID, source.GOOGLE_OAUTH_CLIENT_SECRET, `${redirectBase}/api/auth/callback/google`);
        providers.google = new GoogleOAuthAdapter(google);
    }
    if (source.GITHUB_OAUTH_CLIENT_ID && source.GITHUB_OAUTH_CLIENT_SECRET) {
        const github = new GitHub(source.GITHUB_OAUTH_CLIENT_ID, source.GITHUB_OAUTH_CLIENT_SECRET, `${redirectBase}/api/auth/callback/github`);
        providers.github = new GithubOAuthAdapter(github);
    }

    if (Object.keys(providers).length === 0) {
        logger.warn('auth_disabled', { reason: 'no OAuth provider credentials configured' });
        return null;
    }

    return {
        providers,
        identityStore: new FirebaseIdentityAdapter(auth),
        sessionService: new JoseSessionAdapter(signingKey),
        stateCodec: new JoseOAuthStateCodec(signingKey),
        clock: new SystemClock(),
        random: new SystemRandom(),
        testMode: config.authTestMode,
    };
}

function getFirebaseAuth(source: NodeJS.ProcessEnv): ReturnType<typeof getAuth> {
    if (getApps().length === 0) {
        const svc = source.FIREBASE_SERVICE_ACCOUNT;
        if (svc && svc.trim() !== '') {
            initializeApp({ credential: cert(JSON.parse(svc)) });
        } else {
            // Emulator-backed runs auto-detect FIREBASE_AUTH_EMULATOR_HOST; a projectId is enough.
            initializeApp({ projectId: source.FIREBASE_PROJECT_ID ?? 'demo-retrorocket' });
        }
        // Must be set once, before any other Firestore call on this instance. Every
        // *-wiring.ts file below calls getFirestore() lazily on demand (boards/profile/
        // retrospective), all sharing this one default app — an omitted optional field
        // (e.g. a card's color, a group's title) would otherwise throw
        // "Cannot use 'undefined' as a Firestore value" the first time any adapter
        // writes one, rather than silently omitting it (feature 019).
        getFirestore().settings({ ignoreUndefinedProperties: true });
    }
    return getAuth();
}
