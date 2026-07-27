import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import type { ActionItem, ActionItemPort, CreateActionItemInput, UpdateActionItemInput } from '../../application/ports/facilitator';
import { ACTION_ITEMS } from './collections';
import { toDate } from './firestoreUtil';

/** Admin SDK access to the `actionItems` collection. */
export class FirestoreActionItemAdapter implements ActionItemPort {
    constructor(private readonly db: Firestore) {}

    async listActionItems(retrospectiveId: string): Promise<ActionItem[]> {
        const snap = await this.db
            .collection(ACTION_ITEMS)
            .where('retrospectiveId', '==', retrospectiveId)
            .orderBy('order', 'asc')
            .get();
        return snap.docs.map((doc) => this.toActionItem(doc.id, doc.data()));
    }

    async getActionItem(actionItemId: string): Promise<ActionItem | null> {
        const doc = await this.db.collection(ACTION_ITEMS).doc(actionItemId).get();
        if (!doc.exists) return null;
        return this.toActionItem(doc.id, doc.data()!);
    }

    async createActionItem(input: CreateActionItemInput): Promise<ActionItem> {
        const ref = this.db.collection(ACTION_ITEMS).doc();
        const now = FieldValue.serverTimestamp();
        await ref.set({
            retrospectiveId: input.retrospectiveId,
            content: input.content,
            createdBy: input.createdBy,
            assignedTo: input.assignedTo ?? null,
            assignedToName: input.assignedToName ?? null,
            dueDate: input.dueDate ?? null,
            order: Date.now(),
            createdAt: now,
            updatedAt: now,
        });
        return (await this.getActionItem(ref.id))!;
    }

    async updateActionItem(actionItemId: string, updates: UpdateActionItemInput): Promise<ActionItem> {
        await this.db
            .collection(ACTION_ITEMS)
            .doc(actionItemId)
            .update({ ...updates, updatedAt: FieldValue.serverTimestamp() } as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>);
        return (await this.getActionItem(actionItemId))!;
    }

    async deleteActionItem(actionItemId: string): Promise<void> {
        await this.db.collection(ACTION_ITEMS).doc(actionItemId).delete();
    }

    private toActionItem(id: string, data: FirebaseFirestore.DocumentData): ActionItem {
        return {
            id,
            retrospectiveId: data.retrospectiveId,
            content: data.content,
            createdBy: data.createdBy,
            assignedTo: data.assignedTo ?? null,
            assignedToName: data.assignedToName ?? null,
            dueDate: data.dueDate ? toDate(data.dueDate) : null,
            order: data.order ?? 0,
            createdAt: toDate(data.createdAt),
            updatedAt: toDate(data.updatedAt),
        };
    }
}
