import { backendApiClient } from '@/lib/services/backendApiClient';
import { CardGroup } from '@/features/boards/types/card';
import { ColumnGroupingStatesStore } from '@/features/boards/types/columnGrouping';

interface RawGroup extends Omit<CardGroup, 'createdAt'> {
    createdAt: string;
}

function parseGroup(raw: RawGroup): CardGroup {
    return { ...raw, createdAt: new Date(raw.createdAt) };
}

/** Replaces cardGroupService.ts's direct Firestore access (feature 017 US2). */
export async function createCardGroup(
    retrospectiveId: string,
    headCardId: string,
    memberCardIds: string[],
    _createdBy: string,
    customTitle?: string,
): Promise<CardGroup> {
    const raw = await backendApiClient.post<RawGroup>(`/api/boards/${retrospectiveId}/groups`, {
        headCardId,
        memberCardIds,
        title: customTitle,
    });
    return parseGroup(raw);
}

export async function disbandCardGroup(retrospectiveId: string, groupId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/groups/${groupId}`);
}

export async function addCardToGroup(retrospectiveId: string, groupId: string, cardId: string): Promise<CardGroup> {
    const raw = await backendApiClient.put<RawGroup>(`/api/boards/${retrospectiveId}/groups/${groupId}/cards/${cardId}`);
    return parseGroup(raw);
}

export async function removeCardFromGroup(retrospectiveId: string, groupId: string, cardId: string): Promise<CardGroup | null> {
    const raw = await backendApiClient.delete<RawGroup | undefined>(`/api/boards/${retrospectiveId}/groups/${groupId}/cards/${cardId}`);
    return raw ? parseGroup(raw) : null;
}

export async function updateGroupCollapseState(retrospectiveId: string, groupId: string, isCollapsed: boolean): Promise<CardGroup> {
    const raw = await backendApiClient.patch<RawGroup>(`/api/boards/${retrospectiveId}/groups/${groupId}`, { isCollapsed });
    return parseGroup(raw);
}

/** Parses the groups payload as delivered by the `groups` SSE event. */
export function parseGroupsSnapshot(raw: RawGroup[]): CardGroup[] {
    return raw.map(parseGroup);
}

/** Replaces columnGroupingService.ts's direct Firestore access. */
export async function saveColumnGroupingState(retrospectiveId: string, states: ColumnGroupingStatesStore): Promise<void> {
    await backendApiClient.patch(`/api/boards/${retrospectiveId}/column-grouping`, { states });
}

export async function loadColumnGroupingState(retrospectiveId: string): Promise<ColumnGroupingStatesStore> {
    const res = await backendApiClient.get<{ states: ColumnGroupingStatesStore }>(`/api/boards/${retrospectiveId}/column-grouping`);
    return res.states;
}
