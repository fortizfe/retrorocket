import type { ClockPort, SessionServicePort } from '../ports';

export interface LogoutDeps {
    sessionService: SessionServicePort;
    clock: ClockPort;
}

/**
 * Terminates a session. The backend is stateless, so termination is achieved by the
 * route clearing the cookie; this use case best-effort resolves the user id for audit
 * logging (and is the seam where a future revocation denylist would live — see spec
 * FR-012, deferred). Never throws for an absent/invalid cookie.
 */
export async function logout(deps: LogoutDeps, sessionCookie: string | undefined): Promise<{ userId: string | null }> {
    if (!sessionCookie) return { userId: null };
    const now = deps.clock.nowSeconds();
    const session = await deps.sessionService.verify(sessionCookie, now);
    return { userId: session?.data.sub ?? null };
}
