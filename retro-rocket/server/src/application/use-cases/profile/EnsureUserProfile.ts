import type { EnsureProfileInput, ProfilePort, ProfileRecord } from '../../ports/profile';

/**
 * GET /api/profile (session-cookie-authenticated). Idempotent get-or-create: creates the
 * requesting user's profile with OAuth-derived defaults on first sign-in, or unions in any
 * providers missing from an existing profile — both behaviors live in the port
 * implementation (research.md §4), mirroring boards.ts's joinBoard use-case shape.
 */
export async function ensureUserProfile(
    deps: { profilePort: ProfilePort },
    input: EnsureProfileInput,
): Promise<ProfileRecord> {
    return deps.profilePort.ensureProfile(input);
}
