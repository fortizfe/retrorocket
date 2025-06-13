import { useState, useEffect, useCallback, useRef } from 'react';
import { TypingStatusService } from '../services/typingStatusService';
import { TypingStatus, TypingIndicator } from '../types/typing';
import { ColumnType } from '../types/retrospective';

interface UseTypingStatusOptions {
    retrospectiveId: string;
    currentUserId?: string;
    currentUsername?: string;
}

interface UseTypingStatusReturn {
    typingIndicators: TypingIndicator[];
    startTyping: (column: ColumnType) => void;
    stopTyping: (column: ColumnType) => void;
    getTypingUsersForColumn: (column: ColumnType) => TypingIndicator[];
}

/**
 * Hook to manage typing status for real-time collaboration
 */
export function useTypingStatus({
    retrospectiveId,
    currentUserId,
    currentUsername
}: UseTypingStatusOptions): UseTypingStatusReturn {
    const [typingStatuses, setTypingStatuses] = useState<TypingStatus[]>([]);
    const activeTypingColumns = useRef<Set<ColumnType>>(new Set());
    const debounceTimers = useRef<Map<ColumnType, NodeJS.Timeout>>(new Map());
    const lastUpdateTimers = useRef<Map<ColumnType, number>>(new Map());

    const UPDATE_THROTTLE = 2000; // 2 seconds between Firebase updates

    // Subscribe to typing status changes
    useEffect(() => {
        if (!retrospectiveId) return;

        const unsubscribe = TypingStatusService.subscribeToTypingStatus(
            retrospectiveId,
            (statuses) => {
                // Filter out current user's typing status
                const otherUsersTyping = statuses.filter(status =>
                    status.userId !== currentUserId
                );
                setTypingStatuses(otherUsersTyping);
            }
        );

        return unsubscribe;
    }, [retrospectiveId, currentUserId]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (currentUserId && currentUsername) {
                TypingStatusService.cleanupUserTypingStatus(currentUserId, retrospectiveId);
            }

            // Clear all debounce timers
            debounceTimers.current.forEach(timer => clearTimeout(timer));
            debounceTimers.current.clear();

            // Clear all update timers
            lastUpdateTimers.current.clear();
        };
    }, [currentUserId, currentUsername, retrospectiveId]);

    // Cleanup on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (currentUserId && currentUsername) {
                // Cleanup user typing status on page unload
                TypingStatusService.cleanupUserTypingStatus(currentUserId, retrospectiveId);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentUserId, currentUsername, retrospectiveId]);

    /**
     * Start typing in a specific column
     */
    const startTyping = useCallback((column: ColumnType) => {
        if (!currentUserId || !currentUsername) return;

        // Clear existing debounce timer for this column
        const existingTimer = debounceTimers.current.get(column);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        // Check if we need to update Firebase (throttle updates)
        const now = Date.now();
        const lastUpdate = lastUpdateTimers.current.get(column) ?? 0;
        const shouldUpdate = now - lastUpdate > UPDATE_THROTTLE || !activeTypingColumns.current.has(column);

        if (shouldUpdate) {
            // Send/update typing status to refresh timestamp
            TypingStatusService.setTypingStatus({
                userId: currentUserId,
                username: currentUsername,
                retrospectiveId,
                column,
                isActive: true
            });

            lastUpdateTimers.current.set(column, now);
        }

        // Mark as active
        activeTypingColumns.current.add(column);

        // Set a debounced stop timer (longer delay for better UX)
        const timer = setTimeout(() => {
            stopTyping(column);
        }, 4000); // 4 seconds of inactivity (less than the 6s Firebase timeout)

        debounceTimers.current.set(column, timer);
    }, [currentUserId, currentUsername, retrospectiveId, UPDATE_THROTTLE]);

    /**
     * Stop typing in a specific column
     */
    const stopTyping = useCallback((column: ColumnType) => {
        if (!currentUserId || !currentUsername) return;

        // Clear debounce timer
        const timer = debounceTimers.current.get(column);
        if (timer) {
            clearTimeout(timer);
            debounceTimers.current.delete(column);
        }

        // Clear last update timer
        lastUpdateTimers.current.delete(column);

        // Only send stop status if currently active for this column
        if (activeTypingColumns.current.has(column)) {
            TypingStatusService.setTypingStatus({
                userId: currentUserId,
                username: currentUsername,
                retrospectiveId,
                column,
                isActive: false
            });

            activeTypingColumns.current.delete(column);
        }
    }, [currentUserId, currentUsername, retrospectiveId]);

    /**
     * Get typing users for a specific column
     */
    const getTypingUsersForColumn = useCallback((column: ColumnType): TypingIndicator[] => {
        return typingStatuses
            .filter(status => status.column === column)
            .map(status => ({
                userId: status.userId,
                username: status.username,
                column: status.column,
                lastActivity: status.timestamp
            }));
    }, [typingStatuses]);

    // Convert typing statuses to indicators
    const typingIndicators: TypingIndicator[] = typingStatuses.map(status => ({
        userId: status.userId,
        username: status.username,
        column: status.column,
        lastActivity: status.timestamp
    }));

    return {
        typingIndicators,
        startTyping,
        stopTyping,
        getTypingUsersForColumn
    };
}
