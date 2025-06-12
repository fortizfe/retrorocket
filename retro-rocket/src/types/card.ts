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

// Similarity algorithms for automatic grouping
export type SimilarityAlgorithm = 'levenshtein' | 'jaccard' | 'keyword' | 'combined';

// Group suggestion for automatic grouping
export interface GroupSuggestion {
    id: string;
    cardIds: string[];
    similarity: number;      // Similarity score (0-1)
    reason: string;          // Reason for suggestion
    algorithm: SimilarityAlgorithm;
    keywords?: string[];     // Common keywords found
}

// Card group entity
export interface CardGroup {
    id: string;
    retrospectiveId: string;
    column: ColumnType;
    headCardId: string;      // ID of the main card
    memberCardIds: string[]; // IDs of member cards
    title?: string;          // Custom group title (optional)
    isCollapsed: boolean;    // Expansion/collapse state
    createdAt: Date;
    createdBy: string;
    order: number;           // Group order in column

    // Calculated aggregations
    totalVotes?: number;     // Sum of votes from all cards
    totalLikes?: number;     // Sum of likes from all cards
    allReactions?: Reaction[]; // All reactions from the group
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

    // NEW: Grouping fields
    groupId?: string;        // ID of the group this card belongs to
    isGroupHead?: boolean;   // Whether this card is the main card of a group
    groupOrder?: number;     // Order within the group (for member cards)
}

export interface CreateCardInput {
    content: string;
    column: ColumnType;
    createdBy: string;
    retrospectiveId: string;
    color?: CardColor; // Optional color selection
    groupId?: string;  // Optional group ID for creating cards within groups
}