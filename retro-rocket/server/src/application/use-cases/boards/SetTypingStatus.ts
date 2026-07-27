import type { TypingPort } from '../../ports/cards';

export interface SetTypingStatusDeps {
    typingPort: TypingPort;
}

export interface SetTypingStatusParams {
    retrospectiveId: string;
    userId: string;
    username: string;
    column: string;
    isActive: boolean;
}

/** contracts/realtime-events.md `POST /api/boards/:id/typing` (research.md §4). */
export async function setTypingStatus(deps: SetTypingStatusDeps, params: SetTypingStatusParams): Promise<void> {
    await deps.typingPort.setTypingStatus(params.retrospectiveId, params.userId, params.username, params.column, params.isActive);
}
