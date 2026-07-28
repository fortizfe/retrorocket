import type { ProfilePort, ProfileRecord } from '../../ports/profile';
import { AppError } from '../../../domain/errors';

export interface UpdateDisplayNameParams {
    uid: string;
    displayName: string;
}

/** PATCH /api/profile (session-cookie-authenticated). Rejects an empty/blank displayName. */
export async function updateDisplayName(
    deps: { profilePort: ProfilePort },
    params: UpdateDisplayNameParams,
): Promise<ProfileRecord> {
    const displayName = params.displayName.trim();
    if (!displayName) {
        throw new AppError('invalid_request', 'displayName is required', 400);
    }

    return deps.profilePort.updateDisplayName(params.uid, displayName);
}
