import { backendApiClient } from '@/lib/services/backendApiClient';
import { FacilitatorNote } from '@/features/boards/types/facilitatorNotes';

interface RawFacilitatorNote extends Omit<FacilitatorNote, 'createdAt' | 'updatedAt' | 'timestamp'> {
    createdAt: string;
    updatedAt: string;
}

function parseNote(raw: RawFacilitatorNote): FacilitatorNote {
    return { ...raw, timestamp: new Date(raw.createdAt) };
}

/** Replaces facilitatorNotesService.ts's direct Firestore access (feature 017 US3). */
export async function createNote(retrospectiveId: string, content: string): Promise<FacilitatorNote> {
    const raw = await backendApiClient.post<RawFacilitatorNote>(`/api/boards/${retrospectiveId}/notes`, { content });
    return parseNote(raw);
}

export async function updateNote(retrospectiveId: string, noteId: string, content: string): Promise<FacilitatorNote> {
    const raw = await backendApiClient.patch<RawFacilitatorNote>(`/api/boards/${retrospectiveId}/notes/${noteId}`, { content });
    return parseNote(raw);
}

export async function deleteNote(retrospectiveId: string, noteId: string): Promise<void> {
    await backendApiClient.delete(`/api/boards/${retrospectiveId}/notes/${noteId}`);
}

/** Parses the `notes` SSE snapshot/event payload — present only for the facilitator's own connection. */
export function parseNotesSnapshot(raw: RawFacilitatorNote[]): FacilitatorNote[] {
    return raw.map(parseNote);
}
