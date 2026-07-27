import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJoinBoard = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/features/boards/participants/services/participantsApiClient', () => ({
    joinBoard: (...args: any[]) => mockJoinBoard(...args),
}));

vi.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: (...args: any[]) => mockToastSuccess(...args),
        error: (...args: any[]) => mockToastError(...args),
    },
}));

const mockUser = { uid: 'uid-1', email: 'test@example.com', displayName: 'Test User' };

vi.mock('@/lib/contexts/UserContext', () => ({
    useUser: () => ({ user: mockUser }),
}));

import { useJoinRetrospective } from '@/features/boards/retrospective/hooks/useJoinRetrospective';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useJoinRetrospective', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockJoinBoard.mockResolvedValue({ id: 'p-new', isNew: true, boardTitle: 'Sprint 10' });
    });

    it('starts with isJoining=false and error=null', () => {
        const { result } = renderHook(() => useJoinRetrospective());
        expect(result.current.isJoining).toBe(false);
        expect(result.current.error).toBeNull();
    });

    describe('joinByIdAndNavigate — success', () => {
        it('calls the consolidated join endpoint with the trimmed boardId (single atomic call — no separate participant/history/join-bookkeeping steps)', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('  retro-1  '));

            expect(mockJoinBoard).toHaveBeenCalledWith('retro-1');
            expect(mockJoinBoard).toHaveBeenCalledTimes(1);
        });

        it('saves participantId to localStorage', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(localStorage.getItem('participant_retro-1_uid-1')).toBe('p-new');
        });

        it('shows a success toast with the board title from the join response', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockToastSuccess).toHaveBeenCalledWith(expect.stringContaining('Sprint 10'));
        });

        it('navigates to /retro/:id after success', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockNavigate).toHaveBeenCalledWith('/retro/retro-1');
        });

        it('sets isJoining=false after completion', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(result.current.isJoining).toBe(false);
        });

        it('works whether the user is new or already a participant (isNew is not consumed here — the backend handles idempotency)', async () => {
            mockJoinBoard.mockResolvedValue({ id: 'p-existing', isNew: false, boardTitle: 'Sprint 10' });
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockNavigate).toHaveBeenCalledWith('/retro/retro-1');
        });
    });

    describe('joinByIdAndNavigate — errors', () => {
        it('throws immediately when boardId is empty', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await expect(
                act(async () => result.current.joinByIdAndNavigate('   '))
            ).rejects.toThrow('ID del tablero requerido');
        });

        it('sets error and calls toast.error on join failure', async () => {
            mockJoinBoard.mockRejectedValue(new Error('Board not found'));
            const { result } = renderHook(() => useJoinRetrospective());

            let caughtMessage = '';
            await act(async () => {
                try {
                    await result.current.joinByIdAndNavigate('retro-bad');
                } catch (e) {
                    caughtMessage = e instanceof Error ? e.message : String(e);
                }
            });

            expect(caughtMessage).toBe('Board not found');
            expect(result.current.error).toBe('Board not found');
            expect(mockToastError).toHaveBeenCalledWith('Board not found');
        });

        it('always resets isJoining=false after error (finally block)', async () => {
            mockJoinBoard.mockRejectedValue(new Error('oops'));
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1').catch(() => {}));

            expect(result.current.isJoining).toBe(false);
        });
    });

    describe('clearError', () => {
        it('resets error to null', async () => {
            mockJoinBoard.mockRejectedValue(new Error('some error'));
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1').catch(() => {}));
            expect(result.current.error).toBe('some error');

            act(() => result.current.clearError());
            expect(result.current.error).toBeNull();
        });
    });
});
