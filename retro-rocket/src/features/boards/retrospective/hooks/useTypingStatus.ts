import { useState, useEffect, useCallback, useRef } from 'react';
import { useBoardEventsContext } from '@/features/boards/retrospective/contexts/BoardEventsProvider';
import { setTypingStatus, parseTypingSnapshot } from '@/features/boards/retrospective/services/typingApiClient';
import { TypingStatus, TypingIndicator } from '@/features/boards/types/typing';
import { ColumnType } from '@/features/boards/types/retrospective';

interface UseTypingStatusOptions {
    retrospectiveId: string;
    currentUserId?: string;
    currentUsername?: string;
}

interface UseTypingStatusReturn {
    typingIndicators: TypingIndicator[];
    startTyping: (column: string) => void;
    stopTyping: (column: string) => void;
    getTypingUsersForColumn: (column: string) => TypingIndicator[];
}

/**
 * Backend-mediated replacement for both typingStatusService.ts (dead) and
 * OptimizedTypingStatusService.ts (feature 017 US2, research.md §4 — one canonical
 * implementation). Typing state now arrives over the board's shared SSE channel.
 */
export function useTypingStatus({ retrospectiveId, currentUserId, currentUsername }: UseTypingStatusOptions): UseTypingStatusReturn {
    const [typingStatuses, setTypingStatuses] = useState<TypingStatus[]>([]);
    const activeTypingColumns = useRef<Set<string>>(new Set());
    const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const lastUpdateTimers = useRef<Map<string, number>>(new Map());
    const { snapshot } = useBoardEventsContext();
    const rawTyping = snapshot?.typing;

    const UPDATE_THROTTLE = 2000; // 2 seconds between backend updates

    useEffect(() => {
        if (!rawTyping) return;
        const parsed = parseTypingSnapshot(rawTyping as Parameters<typeof parseTypingSnapshot>[0], retrospectiveId);
        setTypingStatuses(parsed.filter((status) => status.userId !== currentUserId));
    }, [rawTyping, retrospectiveId, currentUserId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentUserId && currentUsername) {
                for (const column of activeTypingColumns.current) {
                    void setTypingStatus({ userId: currentUserId, username: currentUsername, retrospectiveId, column: column as ColumnType, isActive: false });
                }
            }
            debounceTimers.current.forEach((timer) => clearTimeout(timer));
            debounceTimers.current.clear();
            lastUpdateTimers.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUserId, currentUsername, retrospectiveId]);

    const stopTyping = useCallback((column: string) => {
        if (!currentUserId || !currentUsername) return;

        const timer = debounceTimers.current.get(column);
        if (timer) {
            clearTimeout(timer);
            debounceTimers.current.delete(column);
        }
        lastUpdateTimers.current.delete(column);

        if (activeTypingColumns.current.has(column)) {
            void setTypingStatus({ userId: currentUserId, username: currentUsername, retrospectiveId, column: column as ColumnType, isActive: false });
            activeTypingColumns.current.delete(column);
        }
    }, [currentUserId, currentUsername, retrospectiveId]);

    // Cleanup on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentUserId && currentUsername) {
                for (const column of activeTypingColumns.current) {
                    void setTypingStatus({ userId: currentUserId, username: currentUsername, retrospectiveId, column: column as ColumnType, isActive: false });
                }
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentUserId, currentUsername, retrospectiveId]);

    const startTyping = useCallback((column: string) => {
        if (!currentUserId || !currentUsername) return;

        const existingTimer = debounceTimers.current.get(column);
        if (existingTimer) clearTimeout(existingTimer);

        const now = Date.now();
        const lastUpdate = lastUpdateTimers.current.get(column) ?? 0;
        const shouldUpdate = now - lastUpdate > UPDATE_THROTTLE || !activeTypingColumns.current.has(column);

        if (shouldUpdate) {
            void setTypingStatus({ userId: currentUserId, username: currentUsername, retrospectiveId, column: column as ColumnType, isActive: true });
            lastUpdateTimers.current.set(column, now);
        }

        activeTypingColumns.current.add(column);

        const timer = setTimeout(() => {
            stopTyping(column);
        }, 4000);
        debounceTimers.current.set(column, timer);
    }, [currentUserId, currentUsername, retrospectiveId, stopTyping]);

    const getTypingUsersForColumn = useCallback((column: string): TypingIndicator[] => {
        return typingStatuses
            .filter((status) => status.column === column)
            .map((status) => ({ userId: status.userId, username: status.username, column: status.column, lastActivity: status.timestamp }));
    }, [typingStatuses]);

    const typingIndicators: TypingIndicator[] = typingStatuses.map((status) => ({
        userId: status.userId,
        username: status.username,
        column: status.column,
        lastActivity: status.timestamp,
    }));

    return { typingIndicators, startTyping, stopTyping, getTypingUsersForColumn };
}
