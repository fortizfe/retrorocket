// ---------------------------------------------------------------------------
// BoardsPort — read/write Firestore access for the Dashboard ("My Boards")
// screen (feature 017). Deliberately separate from RetrospectiveReadPort
// (application/ports/mcp.ts), which is documented as read-only for the MCP
// connector — adding write methods there would silently weaken that
// guarantee for an unrelated feature (research.md §4).
// ---------------------------------------------------------------------------

export interface BoardSummary {
    id: string;
    title: string;
    description: string;
    /** Absent for boards created before templateId was introduced. */
    templateId?: string;
    createdAt: Date;
    updatedAt: Date;
    participantCount: number;
    isActive: boolean;
    createdBy: string;
    /** true when createdBy equals the requesting user's uid. */
    isCreator: boolean;
}

export type BoardTemplateId = 'default' | 'madSadGlad' | 'startStopContinue';

export interface CreateBoardInput {
    templateId: BoardTemplateId;
    title: string;
    createdBy: string; // uid
    createdByName: string;
    locale: 'es' | 'en';
    /** True when the board is created in anonymous mode. Defaults to false downstream when omitted. */
    isAnonymous?: boolean;
}

export interface BoardsPort {
    /** Boards the uid created plus boards it has joined (derived from `participants`, research.md §3). */
    listBoardsForUser(uid: string): Promise<BoardSummary[]>;
    /** Writes the retrospective doc + its columns subcollection atomically (research.md §5a). */
    createBoard(input: CreateBoardInput): Promise<{ boardId: string }>;
    getBoard(id: string): Promise<BoardSummary | null>;
    /** Idempotent: no duplicate participant record if uid is already a member/owner. */
    joinBoard(id: string, uid: string, userName: string): Promise<BoardSummary>;
    /** Throws ForbiddenError if uid !== the board's createdBy. */
    renameBoard(id: string, uid: string, title: string): Promise<void>;
    /** Throws ForbiddenError if uid !== the board's createdBy. Deletes only the top-level doc (research.md §6). */
    deleteBoard(id: string, uid: string): Promise<void>;
}
