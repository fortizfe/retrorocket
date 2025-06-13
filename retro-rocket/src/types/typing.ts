import { ColumnType } from './retrospective';

export interface TypingStatus {
    id: string;
    userId: string;
    username: string;
    retrospectiveId: string;
    column: ColumnType;
    timestamp: Date;
    isActive: boolean;
}

export interface TypingIndicator {
    userId: string;
    username: string;
    column: ColumnType;
    lastActivity: Date;
}

export interface TypingStatusUpdate {
    userId: string;
    username: string;
    retrospectiveId: string;
    column: ColumnType;
    isActive: boolean;
}
