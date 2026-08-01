import type { ProfilePort, ProfileRecord } from '../../ports/profile';
import type { ParticipantPort } from '../../ports/retrospective';
import { AppError } from '../../../domain/errors';

export interface UpdateDisplayNameParams {
    uid: string;
    displayName: string;
}

/**
 * PATCH /api/profile (session-cookie-authenticated). Rejects an empty/blank displayName.
 * On success, fans the new name out to every participants doc belonging to this user
 * (022, FR-007) — synchronous within this same request/response cycle, so a client that
 * reloads immediately after a successful response is guaranteed to see the new name.
 */
export async function updateDisplayName(
    deps: { profilePort: ProfilePort; participantPort: ParticipantPort },
    params: UpdateDisplayNameParams,
): Promise<ProfileRecord> {
    const displayName = params.displayName.trim();
    if (!displayName) {
        throw new AppError('invalid_request', 'displayName is required', 400);
    }

    const profile = await deps.profilePort.updateDisplayName(params.uid, displayName);
    await deps.participantPort.renameParticipantsForUser(params.uid, displayName);
    return profile;
}
