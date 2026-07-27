import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFacilitatorNotes } from '@/features/boards/facilitator/hooks/useFacilitatorNotes';
import * as facilitatorNotesApi from '@/features/boards/facilitator/services/facilitatorNotesApiClient';

// ─── Mocks ────────────────────────────────────────────────────────────────────

type SnapshotHandler = (data: unknown) => void;
let capturedOnSnapshot: SnapshotHandler | null = null;
let capturedOnNotes: SnapshotHandler | null = null;
let capturedBoardId: string | undefined;

vi.mock('@/lib/hooks/useBoardEvents', () => ({
    useBoardEvents: (boardId: string | undefined, options: { onSnapshot?: SnapshotHandler; on?: Record<string, SnapshotHandler> }) => {
        capturedBoardId = boardId;
        capturedOnSnapshot = options.onSnapshot ?? null;
        capturedOnNotes = options.on?.notes ?? null;
        return { connectionState: 'connected' };
    },
}));

vi.mock('@/features/boards/facilitator/services/facilitatorNotesApiClient', () => ({
    createNote: vi.fn(),
    updateNote: vi.fn(),
    deleteNote: vi.fn(),
    parseNotesSnapshot: (raw: Array<Record<string, unknown>>) => raw.map((n) => ({ ...n, timestamp: new Date(n.createdAt as string) })),
}));

const mocked = vi.mocked(facilitatorNotesApi);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const rawNotes = [
    { id: 'n1', content: 'First note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 'n2', content: 'Second note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFacilitatorNotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnSnapshot = null;
        capturedOnNotes = null;
        capturedBoardId = undefined;
    });

    describe('initial state', () => {
        it('starts with notes=[], error=null', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));
            expect(result.current.notes).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it('does not connect when retrospectiveId is empty', () => {
            renderHook(() => useFacilitatorNotes('', 'fac-1'));
            expect(capturedBoardId).toBeUndefined();
        });
    });

    describe('SSE snapshot consumption', () => {
        it('populates notes from the initial snapshot ("notes" key, present only for the facilitator\'s own connection)', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            act(() => { capturedOnSnapshot!({ notes: rawNotes }); });

            expect(result.current.notes).toHaveLength(2);
            expect(result.current.loading).toBe(false);
        });

        it('treats a missing "notes" key as empty (non-facilitator connection)', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            act(() => { capturedOnSnapshot!({}); });

            expect(result.current.notes).toEqual([]);
        });

        it('updates notes on a named "notes" event', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));
            act(() => { capturedOnSnapshot!({ notes: [] }); });
            act(() => { capturedOnNotes!(rawNotes); });

            expect(result.current.notes).toHaveLength(2);
        });
    });

    describe('createNote', () => {
        it('calls the backend endpoint with trimmed content', async () => {
            mocked.createNote.mockResolvedValue(rawNotes[0] as never);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('  My note  '));

            expect(mocked.createNote).toHaveBeenCalledWith('retro-1', 'My note');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('   '));

            expect(mocked.createNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mocked.createNote.mockRejectedValue(new Error('Create failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('Note content'));

            expect(result.current.error).toBe('Create failed');
        });
    });

    describe('updateNote', () => {
        it('calls the backend endpoint with noteId and trimmed content', async () => {
            mocked.updateNote.mockResolvedValue(rawNotes[0] as never);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', '  Updated  '));

            expect(mocked.updateNote).toHaveBeenCalledWith('retro-1', 'n1', 'Updated');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', '  '));

            expect(mocked.updateNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mocked.updateNote.mockRejectedValue(new Error('Update failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', 'content'));

            expect(result.current.error).toBe('Update failed');
        });
    });

    describe('deleteNote', () => {
        it('calls the backend endpoint with noteId', async () => {
            mocked.deleteNote.mockResolvedValue(undefined);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.deleteNote('n1'));

            expect(mocked.deleteNote).toHaveBeenCalledWith('retro-1', 'n1');
        });

        it('sets error on failure', async () => {
            mocked.deleteNote.mockRejectedValue(new Error('Delete failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.deleteNote('n1'));

            expect(result.current.error).toBe('Delete failed');
        });
    });

    describe('clearError', () => {
        it('resets error to null', async () => {
            mocked.createNote.mockRejectedValue(new Error('oops'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('content'));
            expect(result.current.error).toBe('oops');

            act(() => result.current.clearError());
            expect(result.current.error).toBeNull();
        });
    });
});
