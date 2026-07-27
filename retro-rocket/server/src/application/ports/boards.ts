// Ports for the "boards" bounded context (this refactor). Split into one file per
// sub-context (boards.ts / users.ts / cards.ts / facilitator.ts) rather than one growing
// index.ts, per the existing convention noted in application/ports/mcp.ts.

export interface BoardColumn {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    order: number;
    defaultColor: string;
}

export interface Board {
    id: string;
    title: string;
    description?: string;
    templateId: string;
    createdBy: string;
    createdByName: string;
    locale: 'es' | 'en';
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
}

export interface BoardWithColumns extends Board {
    columns: BoardColumn[];
}

export interface CreateBoardColumnInput {
    id: string;
    i18nKey: string;
    type: 'regular' | 'action';
    order: number;
    defaultColor: string;
}

export interface CreateBoardInput {
    templateId: string;
    title: string;
    description?: string;
    createdBy: string;
    createdByName: string;
    locale: 'es' | 'en';
    columns: CreateBoardColumnInput[];
}

export interface UpdateBoardInput {
    title?: string;
    description?: string;
}

export interface BoardReadPort {
    getBoard(boardId: string): Promise<BoardWithColumns | null>;
    /** User Story 4 (T093/contracts/boards-api.md `GET /api/boards`) — boards this user created. */
    listBoardsCreatedBy(userId: string): Promise<Board[]>;
}

export interface BoardWritePort {
    createBoard(input: CreateBoardInput): Promise<BoardWithColumns>;
    incrementParticipantCount(boardId: string): Promise<void>;
    /** User Story 4 — owner-only rename (`PATCH /api/boards/:id`). */
    renameBoard(boardId: string, updates: UpdateBoardInput): Promise<BoardWithColumns>;
    /**
     * User Story 4 — owner-only full cascade delete (`DELETE /api/boards/:id`,
     * research.md §3): removes the board doc, its `columns` subcollection, and every
     * card/group/participant/countdown/facilitator-note/action-item/sentiment-result/
     * typing-status document referencing it.
     */
    deleteBoardCascade(boardId: string): Promise<void>;
}

export interface Participant {
    id: string;
    retrospectiveId: string;
    userId: string;
    name: string;
    photoURL: string | null;
    joinedAt: Date;
    isFacilitator: boolean;
    /** Derived from SSE connection lifecycle (data-model.md), not manually toggled. */
    isActive: boolean;
}

export interface CreateParticipantInput {
    retrospectiveId: string;
    userId: string;
    name: string;
    photoURL: string | null;
}

export interface ParticipantPort {
    listParticipants(retrospectiveId: string): Promise<Participant[]>;
    getParticipantByUser(retrospectiveId: string, userId: string): Promise<Participant | null>;
    /**
     * User Story 4 (T093) — every board this user has ever joined, across all boards.
     * `ListBoards` derives the "joined" half of the dashboard list from this rather than
     * a separate `joinedBoards` array (research.md §3's original design): the
     * `participants` collection is already the single source of truth for board
     * membership, so a redundant array can only drift out of sync with it.
     */
    listParticipantRecordsForUser(userId: string): Promise<Participant[]>;
    /** Idempotent: returns the existing participant (isNew: false) if the user already joined. */
    addParticipant(input: CreateParticipantInput): Promise<{ participant: Participant; isNew: boolean }>;
    /**
     * Presence, set on SSE connect/disconnect (User Story 2). Written to Firestore (rather
     * than kept purely in-memory) so the change fans out correctly to every connected
     * client via the existing `participants` collection listener, even across
     * horizontally-scaled serverless instances (research.md §1).
     */
    setActive(participantId: string, isActive: boolean): Promise<void>;
}
