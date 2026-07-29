import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import type { ActionItemDTO, ActionItemPort, CreateActionItemInput, EditActionItemInput } from '../../application/ports/actionItems';
import { NotFoundError } from '../../domain/errors';

const ACTION_ITEMS = 'actionItems';

function toDate(value: unknown): Date {
    if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
        return (value as { toDate: () => Date }).toDate();
    }
    return value instanceof Date ? value : new Date(value as string);
}

export function toActionItem(id: string, data: FirebaseFirestore.DocumentData): ActionItemDTO {
    return {
        id,
        content: data.content,
        retrospectiveId: data.retrospectiveId,
        createdBy: data.createdBy,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
        assignedTo: data.assignedTo ?? null,
        assignedToName: data.assignedToName ?? null,
        dueDate: data.dueDate ? toDate(data.dueDate) : null,
        order: data.order ?? 0,
    };
}

/**
 * Read/write Admin SDK access to the actionItems collection (feature 019). No
 * ownership restriction on edit/delete — any authenticated participant may manage any
 * action item directly (FR-015), unlike cards (owner-only edit/delete).
 */
export class FirestoreActionItemAdapter implements ActionItemPort {
    constructor(private readonly db: Firestore) {}

    async listActionItems(retrospectiveId: string): Promise<ActionItemDTO[]> {
        const snap = await this.db.collection(ACTION_ITEMS).where('retrospectiveId', '==', retrospectiveId).get();
        return snap.docs.map((doc) => toActionItem(doc.id, doc.data()));
    }

    async getActionItem(actionItemId: string): Promise<ActionItemDTO | null> {
        const snap = await this.db.collection(ACTION_ITEMS).doc(actionItemId).get();
        if (!snap.exists) return null;
        return toActionItem(snap.id, snap.data()!);
    }

    async createActionItem(input: CreateActionItemInput): Promise<ActionItemDTO> {
        const docRef = this.db.collection(ACTION_ITEMS).doc();
        const data = {
            content: input.content,
            retrospectiveId: input.retrospectiveId,
            createdBy: input.createdBy,
            assignedTo: input.assignedTo ?? null,
            assignedToName: input.assignedToName ?? null,
            dueDate: input.dueDate ?? null,
            // Timestamp-based ordering (matches cards' scheme, FirestoreCardAdapter).
            order: Date.now(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };
        await docRef.set(data);
        const created = await docRef.get();
        return toActionItem(created.id, created.data()!);
    }

    async editActionItem(actionItemId: string, updates: EditActionItemInput): Promise<ActionItemDTO> {
        const docRef = this.db.collection(ACTION_ITEMS).doc(actionItemId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Action item not found');

        const patch: FirebaseFirestore.DocumentData = { updatedAt: FieldValue.serverTimestamp() };
        if (updates.content !== undefined) patch.content = updates.content;
        if (updates.assignedTo !== undefined) patch.assignedTo = updates.assignedTo;
        if (updates.assignedToName !== undefined) patch.assignedToName = updates.assignedToName;
        if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate;
        await docRef.update(patch);

        const updated = await docRef.get();
        return toActionItem(updated.id, updated.data()!);
    }

    async deleteActionItem(actionItemId: string): Promise<void> {
        const docRef = this.db.collection(ACTION_ITEMS).doc(actionItemId);
        const snap = await docRef.get();
        if (!snap.exists) throw new NotFoundError('Action item not found');
        await docRef.delete();
    }
}
