import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJoinBoard = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/features/dashboard/services/backendBoardsClient', () => ({
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
const mockUserProfile = { uid: 'uid-1', displayName: 'Test User', email: 'test@example.com' };

vi.mock('@/lib/contexts/useUserContext', () => ({
    useUser: () => ({ user: mockUser, userProfile: mockUserProfile }),
}));

import { useJoinRetrospective } from '@/features/boards/retrospective/hooks/useJoinRetrospective';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useJoinRetrospective', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockJoinBoard.mockResolvedValue({ id: 'retro-1', title: 'Sprint 10' });
    });

    it('starts with isJoining=false and error=null', () => {
        const { result } = renderHook(() => useJoinRetrospective());
        expect(result.current.isJoining).toBe(false);
        expect(result.current.error).toBeNull();
    });

    describe('joinByIdAndNavigate — success', () => {
        it('calls backendBoardsClient.joinBoard with the trimmed boardId', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('  retro-1  '));

            expect(mockJoinBoard).toHaveBeenCalledWith('retro-1');
        });

        it('navigates to /retro/:id after success', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockNavigate).toHaveBeenCalledWith('/retro/retro-1');
        });

        it('shows a success toast with the board title', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockToastSuccess).toHaveBeenCalledWith('Te has unido a "Sprint 10" exitosamente');
        });

        it('sets isJoining=false after completion', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(result.current.isJoining).toBe(false);
        });
    });

    describe('joinByIdAndNavigate — errors', () => {
        it('throws immediately when boardId is empty', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await expect(
                act(async () => result.current.joinByIdAndNavigate('   '))
            ).rejects.toThrow('ID del tablero requerido');
        });

        it('sets error and calls toast.error on backend failure', async () => {
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
