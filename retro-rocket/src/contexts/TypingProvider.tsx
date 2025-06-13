import React, { createContext, useContext, ReactNode } from 'react';
import { useTypingStatus } from '../hooks/useTypingStatus';
import { TypingIndicator } from '../types/typing';
import { ColumnType } from '../types/retrospective';

interface TypingContextType {
    typingIndicators: TypingIndicator[];
    startTyping: (column: ColumnType) => void;
    stopTyping: (column: ColumnType) => void;
    getTypingUsersForColumn: (column: ColumnType) => TypingIndicator[];
}

const TypingContext = createContext<TypingContextType | null>(null);

interface TypingProviderProps {
    children: ReactNode;
    retrospectiveId: string;
    currentUserId?: string;
    currentUsername?: string;
}

/**
 * Provider for typing status management across the retrospective board
 */
export const TypingProvider: React.FC<TypingProviderProps> = ({
    children,
    retrospectiveId,
    currentUserId,
    currentUsername
}) => {
    const typingStatus = useTypingStatus({
        retrospectiveId,
        currentUserId,
        currentUsername
    });

    return (
        <TypingContext.Provider value={typingStatus}>
            {children}
        </TypingContext.Provider>
    );
};

/**
 * Hook to use typing context
 */
export const useTypingContext = (): TypingContextType => {
    const context = useContext(TypingContext);
    if (!context) {
        throw new Error('useTypingContext must be used within a TypingProvider');
    }
    return context;
};
