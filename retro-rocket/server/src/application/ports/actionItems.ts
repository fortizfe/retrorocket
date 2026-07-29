// ---------------------------------------------------------------------------
// ActionItemPort — read/write Firestore access for action items (feature 019).
// ---------------------------------------------------------------------------

export interface ActionItemDTO {
    id: string;
    content: string;
    retrospectiveId: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    assignedTo: string | null;
    assignedToName: string | null;
    dueDate: Date | null;
    order: number;
}

export interface CreateActionItemInput {
    retrospectiveId: string;
    content: string;
    createdBy: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

export interface EditActionItemInput {
    content?: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

export interface ActionItemPort {
    listActionItems(retrospectiveId: string): Promise<ActionItemDTO[]>;
    createActionItem(input: CreateActionItemInput): Promise<ActionItemDTO>;
    editActionItem(actionItemId: string, updates: EditActionItemInput): Promise<ActionItemDTO>;
    deleteActionItem(actionItemId: string): Promise<void>;
    getActionItem(actionItemId: string): Promise<ActionItemDTO | null>;
}
