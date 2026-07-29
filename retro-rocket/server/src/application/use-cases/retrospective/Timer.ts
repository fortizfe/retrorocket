import type { CountdownTimerDTO, RetrospectiveBoardPort } from '../../ports/retrospective';

export interface TimerDeps {
    retrospectiveBoardPort: RetrospectiveBoardPort;
}

export interface TimerParams {
    retrospectiveId: string;
    uid: string;
}

export interface ConfigureTimerParams extends TimerParams {
    duration: number;
}

/**
 * PUT .../timer — facilitator-only (FR-014). ForbiddenError/NotFoundError are enforced
 * by the adapter (data-model.md's duration/originalDuration/startTime/endTime
 * semantics), so these use-cases are thin delegates, mirroring ReorderCards.ts.
 */
export async function configureTimer(deps: TimerDeps, params: ConfigureTimerParams): Promise<CountdownTimerDTO> {
    return deps.retrospectiveBoardPort.configureTimer(params.retrospectiveId, params.uid, params.duration);
}

/** POST .../timer/start — facilitator-only (FR-014). */
export async function startTimer(deps: TimerDeps, params: TimerParams): Promise<CountdownTimerDTO> {
    return deps.retrospectiveBoardPort.startTimer(params.retrospectiveId, params.uid);
}

/** POST .../timer/pause — facilitator-only (FR-014). */
export async function pauseTimer(deps: TimerDeps, params: TimerParams): Promise<CountdownTimerDTO> {
    return deps.retrospectiveBoardPort.pauseTimer(params.retrospectiveId, params.uid);
}

/** POST .../timer/reset — facilitator-only (FR-014). */
export async function resetTimer(deps: TimerDeps, params: TimerParams): Promise<CountdownTimerDTO> {
    return deps.retrospectiveBoardPort.resetTimer(params.retrospectiveId, params.uid);
}

/** DELETE .../timer — facilitator-only (FR-014). */
export async function deleteTimer(deps: TimerDeps, params: TimerParams): Promise<void> {
    await deps.retrospectiveBoardPort.deleteTimer(params.retrospectiveId, params.uid);
}
