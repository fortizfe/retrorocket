import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockJoinRetrospectiveById = vi.fn();
const mockIncrementParticipantCount = vi.fn();
const mockAddParticipant = vi.fn();
const mockAddBoardToUserHistory = vi.fn();
const mockAddJoinedBoard = vi.fn();
const mockNavigate = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('../../services/retrospectiveService', () => ({
    joinRetrospectiveById: (...args: any[]) => mockJoinRetrospectiveById(...args),
    incrementParticipantCount: (...args: any[]) => mockIncrementParticipantCount(...args),
}));

vi.mock('../../services/participantService', () => ({
    addParticipant: (...args: any[]) => mockAddParticipant(...args),
}));

vi.mock('../../services/userService', () => ({
    userService: {
        addBoardToUserHistory: (...args: any[]) => mockAddBoardToUserHistory(...args),
        addJoinedBoard: (...args: any[]) => mockAddJoinedBoard(...args),
    },
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

vi.mock('../../contexts/UserContext', () => ({
    useUser: () => ({ user: mockUser, userProfile: mockUserProfile }),
}));

import { useJoinRetrospective } from '../../hooks/useJoinRetrospective';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useJoinRetrospective', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        mockJoinRetrospectiveById.mockResolvedValue({ id: 'retro-1', title: 'Sprint 10' });
        mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
        mockIncrementParticipantCount.mockResolvedValue(undefined);
        mockAddBoardToUserHistory.mockResolvedValue(undefined);
        mockAddJoinedBoard.mockResolvedValue(undefined);
    });

    it('starts with isJoining=false and error=null', () => {
        const { result } = renderHook(() => useJoinRetrospective());
        expect(result.current.isJoining).toBe(false);
        expect(result.current.error).toBeNull();
    });

    describe('joinByIdAndNavigate — success', () => {
        it('calls joinRetrospectiveById with trimmed boardId', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('  retro-1  '));

            expect(mockJoinRetrospectiveById).toHaveBeenCalledWith('retro-1', 'uid-1', 'Test User');
        });

        it('calls addParticipant with correct data', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockAddParticipant).toHaveBeenCalledWith({
                name: 'Test User',
                userId: 'uid-1',
                retrospectiveId: 'retro-1',
            });
        });

        it('increments participant count when isNew=true', async () => {
            mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockIncrementParticipantCount).toHaveBeenCalledWith('retro-1');
        });

        it('does NOT increment participant count when isNew=false', async () => {
            mockAddParticipant.mockResolvedValue({ id: 'p-existing', isNew: false });
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockIncrementParticipantCount).not.toHaveBeenCalled();
        });

        it('saves participantId to localStorage', async () => {
            mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(localStorage.getItem('participant_retro-1_uid-1')).toBe('p-new');
        });

        it('calls addBoardToUserHistory and addJoinedBoard', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1'));

            expect(mockAddBoardToUserHistory).toHaveBeenCalledWith('uid-1', 'retro-1', 'Sprint 10');
            expect(mockAddJoinedBoard).toHaveBeenCalledWith('uid-1', 'retro-1');
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
    });

    describe('joinByIdAndNavigate — errors', () => {
        it('throws immediately when boardId is empty', async () => {
            const { result } = renderHook(() => useJoinRetrospective());

            await expect(
                act(async () => result.current.joinByIdAndNavigate('   '))
            ).rejects.toThrow('ID del tablero requerido');
        });

        it('sets error and calls toast.error on service failure', async () => {
            mockJoinRetrospectiveById.mockRejectedValue(new Error('Board not found'));
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
            mockJoinRetrospectiveById.mockRejectedValue(new Error('oops'));
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1').catch(() => {}));

            expect(result.current.isJoining).toBe(false);
        });
    });

    describe('clearError', () => {
        it('resets error to null', async () => {
            mockJoinRetrospectiveById.mockRejectedValue(new Error('some error'));
            const { result } = renderHook(() => useJoinRetrospective());

            await act(async () => result.current.joinByIdAndNavigate('retro-1').catch(() => {}));
            expect(result.current.error).toBe('some error');

            act(() => result.current.clearError());
            expect(result.current.error).toBeNull();
        });
    });
});
