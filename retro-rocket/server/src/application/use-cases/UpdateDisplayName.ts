import type { ClockPort, IdentityStorePort, SessionServicePort } from '../ports';
import { AppError } from '../../domain/errors';
import type { PublicUser } from '../../domain/auth/types';

export interface UpdateDisplayNameDeps {
    identityStore: IdentityStorePort;
    sessionService: SessionServicePort;
    clock: ClockPort;
}

export interface UpdateDisplayNameParams {
    uid: string;
    displayName: string;
}

export interface UpdateDisplayNameResult {
    user: PublicUser;
    /** The session cookie must be re-set: it embeds the user, which just changed. */
    refreshedCookie: { token: string; maxAgeSeconds: number };
}

/**
 * Replaces the frontend's direct `userService.updateUserProfile({ displayName })` Firestore
 * write (feature 017, US1). Persists the change on the Firebase Auth user record itself —
 * no separate `users` Firestore document is needed for this (research finding: Firebase
 * Auth already natively owns displayName/photoURL/email/uid/creationTime; only the
 * providers/primaryProvider custom claims and this edit were previously duplicated into
 * Firestore for no reason other than the frontend's direct-Firestore access pattern).
 */
export async function updateDisplayName(deps: UpdateDisplayNameDeps, params: UpdateDisplayNameParams): Promise<UpdateDisplayNameResult> {
    const trimmed = params.displayName.trim();
    if (trimmed === '') {
        throw new AppError('invalid_request', 'displayName must not be empty', 400);
    }

    const identity = await deps.identityStore.updateDisplayName(params.uid, trimmed);
    const user = identity.toPublicUser();

    const now = deps.clock.nowSeconds();
    const { token, session } = await deps.sessionService.issue(user, now);
    return { user, refreshedCookie: { token, maxAgeSeconds: session.cookieMaxAgeSeconds(now) } };
}
