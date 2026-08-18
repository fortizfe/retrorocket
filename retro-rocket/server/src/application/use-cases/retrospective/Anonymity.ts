import type { RetrospectiveBoardPort, RetrospectiveDTO } from '../../ports/retrospective';

export interface AnonymityDeps {
    retrospectiveBoardPort: RetrospectiveBoardPort;
}

export interface SetAnonymityParams {
    retrospectiveId: string;
    uid: string;
    isAnonymous: boolean;
}

/**
 * PUT .../anonymity — facilitator-only. ForbiddenError is enforced by the adapter, so
 * this use-case is a thin delegate, mirroring Timer.ts's configureTimer.
 */
export async function setAnonymity(deps: AnonymityDeps, params: SetAnonymityParams): Promise<RetrospectiveDTO> {
    return deps.retrospectiveBoardPort.setAnonymous(params.retrospectiveId, params.uid, params.isAnonymous);
}
