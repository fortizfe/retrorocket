// ---------------------------------------------------------------------------
// CardPort + CardGroupPort — read/write Firestore access for cards and card
// groups (feature 019). See research.md §6 (Interface Segregation), §7 (vote/
// like/reaction atomicity), §8 (reorder atomicity).
// ---------------------------------------------------------------------------

export interface LikeDTO {
    userId: string;
    username: string;
    timestamp: Date;
}

export interface ReactionDTO {
    userId: string;
    username: string;
    emoji: string;
    timestamp: Date;
}

export interface CardDTO {
    id: string;
    content: string;
    column: string;
    createdBy: string;
    /** Author's display name, captured at creation time. Absent on cards created
     * before this field existed ("legacy cards") — callers must resolve those via
     * a live participants lookup, then a generic fallback label; never render
     * `createdBy` directly (spec 020-user-display-name-fix). */
    createdByName?: string;
    createdAt: Date;
    updatedAt: Date;
    retrospectiveId: string;
    color?: string;
    votes: number;
    likes: LikeDTO[];
    reactions: ReactionDTO[];
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
    /** Server-derived from the session (never client-supplied) — same trust model
     * as `createdBy` (spec 020-user-display-name-fix). */
    createdByName: string;
    color?: string;
}

export interface ReorderUpdate {
    cardId: string;
    order: number;
    column?: string;
}

export interface CardPort {
    listCards(retrospectiveId: string): Promise<CardDTO[]>;
    createCard(input: CreateCardInput): Promise<CardDTO>;
    /** Throws ForbiddenError if uid !== the card's createdBy. */
    editCard(cardId: string, uid: string, updates: { content?: string; color?: string }): Promise<CardDTO>;
    /** Throws ForbiddenError if uid !== the card's createdBy. */
    deleteCard(cardId: string, uid: string): Promise<void>;
    /** Atomic FieldValue.increment() — no lost updates under concurrency (FR-008). */
    voteCard(cardId: string, delta: number): Promise<CardDTO>;
    /** Atomic arrayUnion/arrayRemove toggle keyed by uid (FR-009). */
    toggleLike(cardId: string, uid: string, username: string): Promise<CardDTO>;
    /** Add-or-replace the caller's reaction; removes any prior reaction from the same user first. */
    setReaction(cardId: string, uid: string, username: string, emoji: string): Promise<CardDTO>;
    removeReaction(cardId: string, uid: string): Promise<CardDTO>;
    /** Single atomic WriteBatch — all updates commit or none do (FR-010). */
    reorderCards(retrospectiveId: string, updates: ReorderUpdate[]): Promise<void>;
    getCard(cardId: string): Promise<CardDTO | null>;
}

/** Provenance of a group: created by a drag/menu move or by accepting a suggestion (spec 059). */
export type GroupOrigin = 'manual' | 'suggestion';

export interface CardGroupDTO {
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
    /** How the group came to exist (spec 059 FR-033). Absent on legacy groups, which are treated as 'suggestion'. */
    origin?: GroupOrigin;
}

export interface CreateCardGroupInput {
    retrospectiveId: string;
    column: string;
    headCardId: string;
    memberCardIds: string[];
    title?: string;
    createdBy: string;
    /** Defaults to 'suggestion' at the use-case layer (spec 059 C1). */
    origin?: GroupOrigin;
}

/** Where `CardGroupPort.moveCard` places the card (spec 059 C0, data-model § State transitions). */
export type MoveTarget =
    | { kind: 'position'; order: number }
    | { kind: 'card'; cardId: string }
    | { kind: 'group'; groupId: string };

export interface MoveCardResult {
    /** Set when the move created a new group (target kind 'card'). */
    createdGroupId?: string;
    /** Groups removed in the same transaction because they were left with fewer than 2 cards (I5). */
    dissolvedGroupIds: string[];
}

/** One entry of a column renormalisation (spec 059 C4). */
export interface ColumnOrderItem {
    kind: 'card' | 'group';
    id: string;
    order: number;
}

export interface CardGroupPort {
    listGroups(retrospectiveId: string): Promise<CardGroupDTO[]>;
    createGroup(input: CreateCardGroupInput): Promise<CardGroupDTO>;
    /** Disbands the group and clears groupId/isGroupHead/groupOrder on its member cards. */
    disbandGroup(groupId: string): Promise<void>;
    /** Adds a card to the group, updating the card's groupId/groupOrder in the same atomic write. */
    addCardToGroup(groupId: string, cardId: string): Promise<CardGroupDTO>;
    /**
     * Removes a card from the group. Promotes a new head if the removed card was the
     * head; disbands the group (returns null) if no members remain.
     */
    removeCardFromGroup(groupId: string, cardId: string): Promise<CardGroupDTO | null>;
    setGroupCollapse(groupId: string, isCollapsed: boolean): Promise<CardGroupDTO>;
    /** Sets the group title; `null` deletes it (never stored as empty). Input is already trimmed/validated by the use case (spec 059 C3). */
    setGroupTitle(groupId: string, title: string | null): Promise<CardGroupDTO>;
    /**
     * Atomically moves a card: detaches it from its current group (head promotion, reindex,
     * dissolve-at-1) then attaches it per `target`. Throws NotFoundError (M2/M3), ConflictError
     * `group_conflict` (M4/M5/M7) or AppError `invalid_request` (M6); no writes on failure (spec 059 C0).
     */
    moveCard(retrospectiveId: string, cardId: string, target: MoveTarget): Promise<MoveCardResult>;
    /** Writes every item's `order` in one transaction after validating column membership (spec 059 C4, R2/R3). */
    renormalizeColumnOrder(retrospectiveId: string, columnId: string, items: ColumnOrderItem[]): Promise<void>;
    getGroup(groupId: string): Promise<CardGroupDTO | null>;
    /** Corrects a group's column association (self-heal repair, spec 046 FR-009) — an
     * internal primitive, not HTTP-exposed. */
    repairGroupColumn(groupId: string, column: string): Promise<void>;
}
