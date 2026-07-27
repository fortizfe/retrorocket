import { backendApiClient } from '@/lib/services/backendApiClient';
import { TypingStatus, TypingStatusUpdate } from '@/features/boards/types/typing';

interface RawTypingStatus extends Omit<TypingStatus, 'id' | 'retrospectiveId' | 'timestamp'> {
    timestamp: string;
}

/**
 * Canonical typing-indicator API client (feature 017 US2, research.md §4 — replaces both
 * typingStatusService.ts and OptimizedTypingStatusService.ts with a single implementation).
 */
export async function setTypingStatus(update: TypingStatusUpdate): Promise<void> {
    await backendApiClient.post(`/api/boards/${update.retrospectiveId}/typing`, {
        column: update.column,
        isActive: update.isActive,
    });
}

/** Parses the typing payload as delivered by the `typing` SSE event. */
export function parseTypingSnapshot(raw: RawTypingStatus[], retrospectiveId: string): TypingStatus[] {
    return raw.map((status) => ({
        id: `${retrospectiveId}_${status.userId}_${status.column}`,
        retrospectiveId,
        userId: status.userId,
        username: status.username,
        column: status.column,
        isActive: status.isActive,
        timestamp: new Date(status.timestamp),
    }));
}
