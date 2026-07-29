import type { TypingStatusPort } from '../../ports/typing';

export interface SetTypingStatusParams {
    retrospectiveId: string;
    userId: string;
    username: string;
    column: string;
    isActive: boolean;
}

/**
 * POST /api/retrospectives/:id/typing (session-cookie-authenticated) — FR-017.
 * Immediate write on isActive:true, immediate delete on isActive:false, preserving
 * the exact doc-id pattern `{retroId}_{userId}_{column}` (data-model.md).
 */
export async function setTypingStatus(deps: { typingStatusPort: TypingStatusPort }, params: SetTypingStatusParams): Promise<void> {
    await deps.typingStatusPort.setTypingStatus(params.retrospectiveId, params.userId, params.username, params.column, params.isActive);
}
