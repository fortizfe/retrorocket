import React, { ReactNode } from 'react';
import { useTypingStatus } from '@/features/boards/retrospective/hooks/useTypingStatus';
import { TypingContext } from '@/features/boards/retrospective/contexts/useTypingContext';
import type { TypingStatusEntry } from '@/features/boards/retrospective/hooks/useRetrospectiveRealtimeSync';

interface TypingProviderProps {
    children: ReactNode;
    retrospectiveId: string;
    currentUserId?: string;
    currentUsername?: string;
    /** Sourced from useRetrospectiveRealtimeSync's live state (feature 019, US3). */
    typingStatuses: TypingStatusEntry[];
}

/**
 * Provider for typing status management across the retrospective board
 */
export const TypingProvider: React.FC<TypingProviderProps> = ({
    children,
    retrospectiveId,
    currentUserId,
    currentUsername,
    typingStatuses
}) => {
    const typingStatus = useTypingStatus({
        retrospectiveId,
        currentUserId,
        currentUsername,
        typingStatuses
    });

    return (
        <TypingContext.Provider value={typingStatus}>
            {children}
        </TypingContext.Provider>
    );
};
