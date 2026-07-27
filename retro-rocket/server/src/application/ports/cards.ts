// Ports for cards, card groups, and typing indicators (User Story 2).

export interface Like {
    userId: string;
    username: string;
    timestamp: Date;
}

export interface Reaction {
    userId: string;
    username: string;
    emoji: string;
    timestamp: Date;
}

export interface Card {
    id: string;
    retrospectiveId: string;
    content: string;
    column: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    color?: string;
    votes?: number;
    likes: Like[];
    reactions: Reaction[];
    order: number;
    groupId?: string;
    isGroupHead?: boolean;
    groupOrder?: number;
}

export interface CreateCardInput {
    retrospectiveId: string;
    content: string;
    column: string;
    createdBy: string;
    color?: string;
}

export interface UpdateCardInput {
    content?: string;
    color?: string;
    column?: string;
    order?: number;
    /** Legacy field, carried through generically (no dedicated endpoint) — see data-model.md. */
    votes?: number;
}

export interface ReorderCardUpdate {
    cardId: string;
    order: number;
    column?: string;
}

export interface CardPort {
    getCard(cardId: string): Promise<Card | null>;
    listCards(retrospectiveId: string): Promise<Card[]>;
    createCard(input: CreateCardInput): Promise<Card>;
    updateCard(cardId: string, updates: UpdateCardInput): Promise<Card>;
    deleteCard(cardId: string): Promise<void>;
    /** Atomic: toggles the given user's like in/out of the card's likes array. */
    toggleLike(cardId: string, userId: string, username: string): Promise<Card>;
    /** Atomic: replaces the given user's reaction (one per user). */
    setReaction(cardId: string, userId: string, username: string, emoji: string): Promise<Card>;
    removeReaction(cardId: string, userId: string): Promise<Card>;
    /** Atomic batch: applies every {cardId, order, column?} update as one write. */
    reorderCards(updates: ReorderCardUpdate[]): Promise<void>;
}

export interface CardGroup {
    id: string;
    retrospectiveId: string;
    column: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    isCollapsed: boolean;
    createdAt: Date;
    createdBy: string;
    order: number;
}

export interface CardGroupPort {
    getGroup(groupId: string): Promise<CardGroup | null>;
    listGroups(retrospectiveId: string): Promise<CardGroup[]>;
    createGroup(retrospectiveId: string, headCardId: string, memberCardIds: string[], createdBy: string, title?: string): Promise<CardGroup>;
    disbandGroup(groupId: string): Promise<void>;
    addCardToGroup(groupId: string, cardId: string): Promise<CardGroup>;
    /** Removes a card from its group; promotes the next member to head, or disbands if now empty. Returns null if disbanded. */
    removeCardFromGroup(cardId: string): Promise<CardGroup | null>;
    setGroupCollapsed(groupId: string, isCollapsed: boolean): Promise<CardGroup>;
    saveColumnGroupingState(retrospectiveId: string, states: Record<string, unknown>): Promise<void>;
    getColumnGroupingState(retrospectiveId: string): Promise<Record<string, unknown>>;
}

export interface TypingStatus {
    userId: string;
    username: string;
    column: string;
    isActive: boolean;
    timestamp: Date;
}

export interface TypingPort {
    setTypingStatus(retrospectiveId: string, userId: string, username: string, column: string, isActive: boolean): Promise<void>;
    listTypingStatuses(retrospectiveId: string): Promise<TypingStatus[]>;
}
