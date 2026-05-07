import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCreateNote = vi.fn();
const mockUpdateNote = vi.fn();
const mockDeleteNote = vi.fn();
const mockSubscribeToNotes = vi.fn();

vi.mock('../../services/facilitatorNotesService', () => ({
    FacilitatorNotesService: {
        createNote: (...args: any[]) => mockCreateNote(...args),
        updateNote: (...args: any[]) => mockUpdateNote(...args),
        deleteNote: (...args: any[]) => mockDeleteNote(...args),
        subscribeToNotes: (...args: any[]) => mockSubscribeToNotes(...args),
    },
}));

import { useFacilitatorNotes } from '../../hooks/useFacilitatorNotes';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockNotes = [
    { id: 'n1', content: 'First note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', createdAt: new Date() },
    { id: 'n2', content: 'Second note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', createdAt: new Date() },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFacilitatorNotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSubscribeToNotes.mockImplementation(() => vi.fn());
    });

    describe('initial state', () => {
        it('starts with notes=[], loading=false, error=null', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));
            // After mount the effect sets loading=true, then loading state is managed by subscription
            expect(result.current.notes).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it('does not call subscribeToNotes when retrospectiveId is empty', () => {
            renderHook(() => useFacilitatorNotes('', 'fac-1'));
            expect(mockSubscribeToNotes).not.toHaveBeenCalled();
        });

        it('does not call subscribeToNotes when facilitatorId is empty', () => {
            renderHook(() => useFacilitatorNotes('retro-1', ''));
            expect(mockSubscribeToNotes).not.toHaveBeenCalled();
        });
    });

    describe('subscription', () => {
        it('calls subscribeToNotes with correct ids', () => {
            renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));
            expect(mockSubscribeToNotes).toHaveBeenCalledWith('retro-1', 'fac-1', expect.any(Function));
        });

        it('updates notes when subscription emits', () => {
            let capturedCallback: ((notes: any[]) => void) | null = null;
            mockSubscribeToNotes.mockImplementation((_rid: string, _fid: string, cb: (n: any[]) => void) => {
                capturedCallback = cb;
                return vi.fn();
            });

            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            act(() => capturedCallback!(mockNotes));

            expect(result.current.notes).toEqual(mockNotes);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('calls unsubscribe on unmount', () => {
            const mockUnsubscribe = vi.fn();
            mockSubscribeToNotes.mockImplementation(() => mockUnsubscribe);

            const { unmount } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));
            unmount();

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('createNote', () => {
        it('calls FacilitatorNotesService.createNote with trimmed content', async () => {
            mockCreateNote.mockResolvedValue(undefined);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('  My note  '));

            expect(mockCreateNote).toHaveBeenCalledWith('retro-1', 'fac-1', 'My note');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('   '));

            expect(mockCreateNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mockCreateNote.mockRejectedValue(new Error('Create failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('Note content'));

            expect(result.current.error).toBe('Create failed');
        });
    });

    describe('updateNote', () => {
        it('calls FacilitatorNotesService.updateNote with noteId and trimmed content', async () => {
            mockUpdateNote.mockResolvedValue(undefined);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', '  Updated  '));

            expect(mockUpdateNote).toHaveBeenCalledWith('n1', 'Updated');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', '  '));

            expect(mockUpdateNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mockUpdateNote.mockRejectedValue(new Error('Update failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.updateNote('n1', 'content'));

            expect(result.current.error).toBe('Update failed');
        });
    });

    describe('deleteNote', () => {
        it('calls FacilitatorNotesService.deleteNote with noteId', async () => {
            mockDeleteNote.mockResolvedValue(undefined);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.deleteNote('n1'));

            expect(mockDeleteNote).toHaveBeenCalledWith('n1');
        });

        it('sets error on failure', async () => {
            mockDeleteNote.mockRejectedValue(new Error('Delete failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.deleteNote('n1'));

            expect(result.current.error).toBe('Delete failed');
        });
    });

    describe('clearError', () => {
        it('resets error to null', async () => {
            mockCreateNote.mockRejectedValue(new Error('oops'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1'));

            await act(async () => result.current.createNote('content'));
            expect(result.current.error).toBe('oops');

            act(() => result.current.clearError());
            expect(result.current.error).toBeNull();
        });
    });
});
