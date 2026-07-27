import { backendApiClient } from '@/lib/services/backendApiClient';
import { ActionItem } from '@/features/boards/types/actionItem';

interface RawActionItem extends Omit<ActionItem, 'createdAt' | 'updatedAt' | 'dueDate'> {
    createdAt: string;
    updatedAt: string;
    dueDate: string | null;
}

function parseActionItem(raw: RawActionItem): ActionItem {
    return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt), dueDate: raw.dueDate ? new Date(raw.dueDate) : null };
}

export interface CreateActionItemBody {
    content: string;
    assignedTo?: string | null;
    assignedToName?: string | null;
    dueDate?: Date | null;
}

/** Replaces actionItemsService.ts's direct Firestore access (feature 017 US3). */
export async function createActionItem(retrospectiveId: string, input: CreateActionItemBody): Promise<ActionItem> {
    const raw = await backendApiClient.post<RawActionItem>(`/api/boards/${retrospectiveId}/action-items`, {
        content: input.content,
        assignedTo: input.assignedTo ?? null,
        assignedToName: input.assignedToName ?? null,
        dueDate: input.dueDate ? input.dueDate.toISOString() : null,
    });
    return parseActionItem(raw);
}

export async function convertCardToActionItem(
    retrospectiveId: string,
    cardContent: string,
    assignedTo?: string | null,
    assignedToName?: string | null,
    dueDate?: Date | null,
): Promise<ActionItem> {
    const raw = await backendApiClient.post<RawActionItem>(`/api/boards/${retrospectiveId}/action-items/from-card`, {
        cardContent,
        assignedTo: assignedTo ?? null,
        assignedToName: assignedToName ?? null,
        dueDate: dueDate ? dueDate.toISOString() : null,
    });
    return parseActionItem(raw);
}

export async function updateActionItem(retrospectiveId: string, actionItemId: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    const body: Record<string, unknown> = { ...updates };
    if (updates.dueDate !== undefined) body.dueDate = updates.dueDate ? updates.dueDate.toISOString() : null;
    const raw = await backendApiClient.patch<RawActionItem>(`/api/boards/${retrospectiveId}/action-items/${actionItemId}`, body);
    return parseActionItem(raw);
}

export async function deleteActionItem(retrospectiveId: string, actionItemId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/action-items/${actionItemId}`);
}

/** Parses the `actionItems` SSE snapshot/event payload (contracts/realtime-events.md). */
export function parseActionItemsSnapshot(raw: RawActionItem[]): ActionItem[] {
    return raw.map(parseActionItem);
}
