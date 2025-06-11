import { ColumnType } from './retrospective';

// Available emoji reactions
export type EmojiReaction = '👍' | '❤️' | '😂' | '😮' | '😢' | '😡' | '🎉' | '🤔';

// Individual like record
export interface Like {
    userId: string;
    username: string;
    timestamp: Date;
}

// Individual emoji reaction record
export interface Reaction {
    userId: string;
    username: string;
    emoji: EmojiReaction;
    timestamp: Date;
}

// Grouped reactions for display
export interface GroupedReaction {
    emoji: EmojiReaction;
    count: number;
    users: string[]; // usernames who reacted with this emoji
}

export interface Card {
    id: string;
    content: string;
    column: ColumnType;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    retrospectiveId: string;
    votes?: number; // Deprecated - keeping for backward compatibility
    likes?: Like[]; // New likes system
    reactions?: Reaction[]; // New reactions system
    order?: number; // For drag and drop ordering
}

export interface CreateCardInput {
    content: string;
    column: ColumnType;
    createdBy: string;
    retrospectiveId: string;
}