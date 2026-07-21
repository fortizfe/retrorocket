export interface ActionItem {
    id: string;
    content: string;
    retrospectiveId: string;
    createdBy: string; // facilitatorId (UID)
    createdAt: Date;
    updatedAt: Date;
    assignedTo: string | null; // userId del responsable (opcional)
    assignedToName: string | null; // nombre del responsable (opcional)
    dueDate: Date | null; // fecha de vencimiento (opcional)
    order?: number; // Para drag and drop ordering
}

export interface CreateActionItemInput {
    content: string;
    retrospectiveId: string;
    createdBy: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

export interface ActionItemsState {
    actionItems: ActionItem[];
    loading: boolean;
    error: string | null;
}
