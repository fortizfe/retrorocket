import { useCallback, useEffect, useRef } from 'react';
import { OptimizedTypingStatusService } from '@/features/boards/retrospective/services/OptimizedTypingStatusService';
import { TypingIndicator } from '@/features/boards/types/typing';
import { ColumnType } from '@/features/boards/types/retrospective';
import type { TypingStatusEntry } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';

interface UseTypingStatusOptions {
    retrospectiveId: string;
    currentUserId?: string;
    currentUsername?: string;
    /** Sourced from useRetrospectiveRealtimeSync's live typingStatuses slice (feature
     * 019, US3) — replaces this hook's own onSnapshot subscription. */
    typingStatuses: TypingStatusEntry[];
}

interface UseTypingStatusReturn {
    typingIndicators: TypingIndicator[];
    startTyping: (column: string) => void;
    stopTyping: (column: string) => void;
    getTypingUsersForColumn: (column: string) => TypingIndicator[];
}

/**
 * Hook to manage typing status for real-time collaboration. This hook is the sole owner
 * of the "has this user stopped typing" decision (feature 026, research.md §2): it
 * throttles refresh writes to at most one per UPDATE_THROTTLE, and independently tracks
 * per-column keystroke recency to fire an explicit stop after INACTIVITY_TIMEOUT_MS of
 * silence. OptimizedTypingStatusService is just a thin write-forwarder with no timing
 * logic of its own; reads come from the live channel via the `typingStatuses` param.
 */
export function useTypingStatus({
    retrospectiveId,
    currentUserId,
    currentUsername,
    typingStatuses,
}: UseTypingStatusOptions): UseTypingStatusReturn {
    const activeTypingColumns = useRef<Set<string>>(new Set());
    const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const lastUpdateTimers = useRef<Map<string, number>>(new Map());

    const UPDATE_THROTTLE = 2000; // 2 seconds between backend updates
    const INACTIVITY_TIMEOUT_MS = 3000; // grace period before assuming the user stopped typing

    // Cleanup on unmount / page unload — stop any typing signal this user left active.
    useEffect(() => {
        const cleanup = () => {
            if (currentUserId && currentUsername) {
                OptimizedTypingStatusService.cleanupUserTypingStatus(currentUserId, retrospectiveId);
            }
            debounceTimers.current.forEach((timer) => clearTimeout(timer));
            debounceTimers.current.clear();
            lastUpdateTimers.current.clear();
        };

        window.addEventListener('beforeunload', cleanup);
        return () => {
            window.removeEventListener('beforeunload', cleanup);
            cleanup();
        };
    }, [currentUserId, currentUsername, retrospectiveId]);

    /** Start typing in a specific column. */
    const startTyping = useCallback(
        (column: string) => {
            if (!currentUserId || !currentUsername) return;

            const existingTimer = debounceTimers.current.get(column);
            if (existingTimer) clearTimeout(existingTimer);

            const now = Date.now();
            const lastUpdate = lastUpdateTimers.current.get(column) ?? 0;
            const shouldUpdate = now - lastUpdate > UPDATE_THROTTLE || !activeTypingColumns.current.has(column);

            if (shouldUpdate) {
                OptimizedTypingStatusService.setTypingStatusDebounced({
                    userId: currentUserId,
                    username: currentUsername,
                    retrospectiveId,
                    column: column as ColumnType,
                    isActive: true,
                });
                lastUpdateTimers.current.set(column, now);
            }

            activeTypingColumns.current.add(column);

            const timer = setTimeout(() => {
                stopTyping(column);
                // eslint-disable-next-line react-hooks/exhaustive-deps -- stopTyping is stable within this closure's lifetime
            }, INACTIVITY_TIMEOUT_MS);
            debounceTimers.current.set(column, timer);
        },
        [currentUserId, currentUsername, retrospectiveId],
    );

    /** Stop typing in a specific column. */
    const stopTyping = useCallback(
        (column: string) => {
            if (!currentUserId || !currentUsername) return;

            const timer = debounceTimers.current.get(column);
            if (timer) {
                clearTimeout(timer);
                debounceTimers.current.delete(column);
            }
            lastUpdateTimers.current.delete(column);

            if (activeTypingColumns.current.has(column)) {
                OptimizedTypingStatusService.setTypingStatusDebounced({
                    userId: currentUserId,
                    username: currentUsername,
                    retrospectiveId,
                    column: column as ColumnType,
                    isActive: false,
                });
                activeTypingColumns.current.delete(column);
            }
        },
        [currentUserId, currentUsername, retrospectiveId],
    );

    const otherUsersTyping = typingStatuses.filter((status) => status.userId !== currentUserId);

    const typingIndicators: TypingIndicator[] = otherUsersTyping.map((status) => ({
        userId: status.userId,
        username: status.username,
        column: status.column as ColumnType,
        lastActivity: status.timestamp,
    }));

    const getTypingUsersForColumn = useCallback(
        (column: string): TypingIndicator[] => typingIndicators.filter((indicator) => indicator.column === column),
        [typingIndicators],
    );

    return { typingIndicators, startTyping, stopTyping, getTypingUsersForColumn };
}
