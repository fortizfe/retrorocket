import { ALL_EMOJIS } from '@/lib/utils/emojiConstants';

// Available emoji reactions - Now includes all available emojis
export type EmojiReaction = typeof ALL_EMOJIS[number];

// Card color palette - 15 curated pastel colors (spec 037: curated down
// from 30 for scannability; a card holding a pre-curation value not listed
// here is remapped to its closest surviving equivalent at read time via
// `resolveCardColor` in cardColors.ts, never left broken — FR-013a).
export type CardColor =
    | 'pastelWhite'
    | 'pastelBlue'
    | 'pastelGreen'
    | 'pastelYellow'
    | 'pastelRed'
    | 'pastelPurple'
    | 'pastelOrange'
    | 'pastelPink'
    | 'pastelTeal'
    | 'pastelGray'
    | 'pastelIndigo'
    | 'pastelEmerald'
    | 'pastelRose'
    | 'pastelSky'
    | 'pastelAmber';

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
    users: string[]; // resolved display names who reacted with this emoji
    userIds: string[]; // raw userIds, parallel-indexed with `users`
}

// Group suggestion for automatic grouping — computed from on-device AI semantic
// analysis (spec 044); `algorithm`/`keywords`/`reason` were specific to the removed
// text-similarity algorithm and have no equivalent here (data-model.md).
export interface GroupSuggestion {
    id: string;
    cardIds: string[];
    similarity: number;      // Cosine similarity between card embeddings, clamped to [0, 1]
}

// Card group entity
export interface CardGroup {
    id: string;
    retrospectiveId: string;
    column: string; // Changed from ColumnType to string for dynamic column support
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
    column: string; // Changed from ColumnType to string for dynamic column support
    createdBy: string;
    /** Author's display name, captured at creation time. Absent on cards created
     * before this field existed ("legacy cards") — resolve those via
     * resolveAuthorDisplayName (cardHelpers.ts), never render createdBy directly. */
    createdByName?: string;
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
    column: string; // Changed from ColumnType to string for dynamic column support
    createdBy: string;
    retrospectiveId: string;
    color?: CardColor; // Optional color selection
    groupId?: string;  // Optional group ID for creating cards within groups
}