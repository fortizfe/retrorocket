import { createContext, useContext } from 'react';
import { TypingIndicator } from '@/features/boards/types/typing';

export interface TypingContextType {
    typingIndicators: TypingIndicator[];
    startTyping: (column: string) => void;
    stopTyping: (column: string) => void;
    getTypingUsersForColumn: (column: string) => TypingIndicator[];
}

export const TypingContext = createContext<TypingContextType | null>(null);

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
