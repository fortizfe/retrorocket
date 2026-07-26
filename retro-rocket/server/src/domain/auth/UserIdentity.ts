import { AppError } from '../errors';
import type { OAuthProvider, PublicUser } from './types';

export class EmailNotVerifiedError extends AppError {
    constructor() {
        super('email_not_verified', 'The email associated with this account is not verified by the provider', 401);
        this.name = 'EmailNotVerifiedError';
    }
}

export interface ProviderProfile {
    provider: OAuthProvider;
    providerAccountId: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
}

/**
 * The canonical authenticated person, keyed by email and mapped to a single Firebase
 * uid. Signing in with a second provider for the same verified email links to the same
 * identity (FR-013).
 */
export class UserIdentity {
    constructor(
        public readonly uid: string,
        public readonly email: string,
        public readonly displayName: string | null,
        public readonly photoURL: string | null,
        public readonly providers: OAuthProvider[],
    ) {}

    /** Returns a copy with the given provider added (set-union, order-preserving). */
    withProvider(provider: OAuthProvider): UserIdentity {
        if (this.providers.includes(provider)) return this;
        return new UserIdentity(this.uid, this.email, this.displayName, this.photoURL, [...this.providers, provider]);
    }

    toPublicUser(): PublicUser {
        return {
            uid: this.uid,
            email: this.email,
            displayName: this.displayName,
            photoURL: this.photoURL,
            providers: this.providers,
        };
    }
}

/**
 * Validates a provider profile before it is trusted to establish/link an identity.
 * A verified, non-empty email is mandatory — no silent merge on unverified email.
 */
export function assertVerifiedEmail(profile: ProviderProfile): string {
    if (!profile.email || profile.email.trim() === '' || !profile.emailVerified) {
        throw new EmailNotVerifiedError();
    }
    return profile.email.trim().toLowerCase();
}
