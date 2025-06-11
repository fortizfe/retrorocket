import { ColumnType } from './retrospective';

// Available emoji reactions
export type EmojiReaction = '👍' | '❤️' | '😂' | '😮' | '😢' | '😡' | '🎉' | '🤔' | '✨' | '🚀' | '💡' | '⚡';

// Card color palette - 10 beautiful pastel colors
export type CardColor =
    | 'pastelWhite'      // Base blanco suave
    | 'pastelGreen'      // Verde menta
    | 'pastelRed'        // Rosa coral suave
    | 'pastelYellow'     // Amarillo mantequilla
    | 'pastelBlue'       // Azul cielo suave
    | 'pastelPurple'     // Lavanda
    | 'pastelOrange'     // Melocotón
    | 'pastelPink'       // Rosa suave
    | 'pastelTeal'       // Verde azulado
    | 'pastelGray';      // Gris perla

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
    color?: CardColor; // Card background color
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
    color?: CardColor; // Optional color selection
}