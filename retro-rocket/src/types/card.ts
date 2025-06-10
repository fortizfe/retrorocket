import { ColumnType } from './retrospective';

export interface Card {
    id: string;
    content: string;
    column: ColumnType;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    retrospectiveId: string;
    votes?: number;
}

export interface CreateCardInput {
    content: string;
    column: ColumnType;
    createdBy: string;
    retrospectiveId: string;
}