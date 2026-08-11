import type { ParticipantDTO, ParticipantPort, RetrospectiveBoardPort } from '../../ports/retrospective';
import { NotFoundError } from '../../../domain/errors';

export interface JoinRetrospectiveDeps {
    retrospectiveBoardPort: RetrospectiveBoardPort;
    participantPort: ParticipantPort;
}

export interface JoinRetrospectiveParams {
    retrospectiveId: string;
    uid: string;
    userName: string;
    photoURL: string | null;
}

/**
 * POST /api/retrospectives/:id/join (session-cookie-authenticated). Idempotent: no
 * duplicate participant record if uid already joined (FR-005). Rejects a nonexistent
 * or inactive board with NotFoundError. Passes the board it already fetched through to
 * participantPort.join() as `knownBoard` (040, FR-001) so a conforming adapter's own
 * existence check doesn't re-read the same document within this reconnection cycle.
 */
export async function joinRetrospective(deps: JoinRetrospectiveDeps, params: JoinRetrospectiveParams): Promise<ParticipantDTO> {
    const board = await deps.retrospectiveBoardPort.getRetrospective(params.retrospectiveId);
    if (!board || !board.isActive) {
        throw new NotFoundError('El tablero especificado no existe o no está disponible');
    }

    return deps.participantPort.join(params.retrospectiveId, params.uid, params.userName, params.photoURL, board);
}
