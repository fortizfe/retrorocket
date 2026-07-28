/**
 * Client for the "Mi Perfil" profile API (feature 018). The browser no longer talks to
 * Firestore directly for loading or updating the profile (FR-001): both operations go
 * through the backend's session-cookie-authenticated /api/profile endpoint instead.
 * Mirrors the fetch conventions of backendAuthClient.ts / backendBoardsClient.ts.
 */

import type { UserProfile } from '@/features/auth/types/user';

interface ProfileDTO {
    uid: string;
    email: string;
    displayName: string;
    photoURL: string | null;
    providers: UserProfile['providers'];
    primaryProvider: UserProfile['primaryProvider'];
    createdAt: string;
    updatedAt: string;
}

const API = '/api/profile';

function fromDTO(dto: ProfileDTO): UserProfile {
    return {
        uid: dto.uid,
        email: dto.email,
        displayName: dto.displayName,
        photoURL: dto.photoURL,
        providers: dto.providers,
        primaryProvider: dto.primaryProvider,
        joinedBoards: [],
        createdAt: new Date(dto.createdAt),
        updatedAt: new Date(dto.updatedAt),
    };
}

/**
 * Extracts the backend's error message from the { error: { code, message } } envelope
 * (errorHandler.ts) when present, so callers keep seeing a specific message rather than
 * a generic "request failed".
 */
async function errorMessageOf(res: Response, fallback: string): Promise<string> {
    try {
        const body = (await res.json()) as { error?: { message?: string } };
        return body.error?.message ?? fallback;
    } catch {
        return fallback;
    }
}

/** GET /api/profile — get-or-create the requesting user's profile. */
export async function fetchProfile(): Promise<UserProfile> {
    const res = await fetch(API, { credentials: 'include' });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to load profile: ${res.status}`));
    return fromDTO((await res.json()) as ProfileDTO);
}

/** PATCH /api/profile — update the requesting user's display name. */
export async function updateDisplayName(displayName: string): Promise<UserProfile> {
    const res = await fetch(API, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
    });
    if (!res.ok) throw new Error(await errorMessageOf(res, `Failed to update display name: ${res.status}`));
    return fromDTO((await res.json()) as ProfileDTO);
}
