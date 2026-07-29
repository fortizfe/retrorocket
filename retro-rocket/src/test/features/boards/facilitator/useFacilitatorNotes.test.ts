import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as backendRetrospectiveClient from '@/features/boards/retrospective/services/backendRetrospectiveClient';
import { useFacilitatorNotes } from '@/features/boards/facilitator/hooks/useFacilitatorNotes';

vi.mock('@/features/boards/retrospective/services/backendRetrospectiveClient', () => ({
    createNote: vi.fn(),
    editNote: vi.fn(),
    deleteNote: vi.fn(),
}));

const mockedClient = vi.mocked(backendRetrospectiveClient);

const mockNotes = [
    { id: 'n1', content: 'First note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', timestamp: new Date() },
    { id: 'n2', content: 'Second note', retrospectiveId: 'retro-1', facilitatorId: 'fac-1', timestamp: new Date() },
];

describe('useFacilitatorNotes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('notes input', () => {
        it('reflects an empty notes input', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));
            expect(result.current.notes).toEqual([]);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('reflects the notes passed in', () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', mockNotes));
            expect(result.current.notes).toEqual(mockNotes);
        });

        it('reflects a live update to the notes input across a rerender', () => {
            const { result, rerender } = renderHook(({ notes }) => useFacilitatorNotes('retro-1', 'fac-1', notes), {
                initialProps: { notes: [] as typeof mockNotes },
            });

            expect(result.current.notes).toEqual([]);

            rerender({ notes: mockNotes });

            expect(result.current.notes).toEqual(mockNotes);
        });
    });

    describe('createNote', () => {
        it('calls backendRetrospectiveClient.createNote with trimmed content', async () => {
            mockedClient.createNote.mockResolvedValue(mockNotes[0]);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.createNote('  My note  '));

            expect(mockedClient.createNote).toHaveBeenCalledWith('retro-1', 'My note');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.createNote('   '));

            expect(mockedClient.createNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mockedClient.createNote.mockRejectedValue(new Error('Create failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.createNote('Note content'));

            expect(result.current.error).toBe('Create failed');
        });
    });

    describe('updateNote', () => {
        it('calls backendRetrospectiveClient.editNote with noteId and trimmed content', async () => {
            mockedClient.editNote.mockResolvedValue(mockNotes[0]);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.updateNote('n1', '  Updated  '));

            expect(mockedClient.editNote).toHaveBeenCalledWith('n1', 'Updated');
        });

        it('does nothing when content is empty', async () => {
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.updateNote('n1', '  '));

            expect(mockedClient.editNote).not.toHaveBeenCalled();
        });

        it('sets error on failure', async () => {
            mockedClient.editNote.mockRejectedValue(new Error('Update failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.updateNote('n1', 'content'));

            expect(result.current.error).toBe('Update failed');
        });
    });

    describe('deleteNote', () => {
        it('calls backendRetrospectiveClient.deleteNote with noteId', async () => {
            mockedClient.deleteNote.mockResolvedValue(undefined);
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.deleteNote('n1'));

            expect(mockedClient.deleteNote).toHaveBeenCalledWith('n1');
        });

        it('sets error on failure', async () => {
            mockedClient.deleteNote.mockRejectedValue(new Error('Delete failed'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.deleteNote('n1'));

            expect(result.current.error).toBe('Delete failed');
        });
    });

    describe('clearError', () => {
        it('resets error to null', async () => {
            mockedClient.createNote.mockRejectedValue(new Error('oops'));
            const { result } = renderHook(() => useFacilitatorNotes('retro-1', 'fac-1', []));

            await act(async () => result.current.createNote('content'));
            expect(result.current.error).toBe('oops');

            act(() => result.current.clearError());
            expect(result.current.error).toBeNull();
        });
    });
});
