import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParticipants } from '../../hooks/useParticipants';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSubscribeToParticipants = vi.fn();
const mockGetParticipantsByRetrospective = vi.fn();
const mockAddParticipant = vi.fn();
const mockRemoveParticipant = vi.fn();

vi.mock('../../services/participantService', () => ({
    subscribeToParticipants: (...args: any[]) => mockSubscribeToParticipants(...args),
    getParticipantsByRetrospective: (...args: any[]) => mockGetParticipantsByRetrospective(...args),
    addParticipant: (...args: any[]) => mockAddParticipant(...args),
    removeParticipant: (...args: any[]) => mockRemoveParticipant(...args),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockParticipants = [
    { id: 'p1', name: 'Alice', userId: 'u1', retrospectiveId: 'retro-1', joinedAt: new Date() },
    { id: 'p2', name: 'Bob', userId: 'u2', retrospectiveId: 'retro-1', joinedAt: new Date() },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useParticipants', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: subscription captures callback, does not emit immediately
        mockSubscribeToParticipants.mockImplementation(() => vi.fn());
    });

    describe('initial state', () => {
        it('without retrospectiveId — loading=false, participants=[]', () => {
            const { result } = renderHook(() => useParticipants());
            expect(result.current.loading).toBe(false);
            expect(result.current.participants).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it('with retrospectiveId — loading starts true until subscription emits', () => {
            const { result } = renderHook(() => useParticipants('retro-1'));
            expect(result.current.loading).toBe(true);
            expect(result.current.participants).toEqual([]);
        });

        it('does not call subscribeToParticipants without an id', () => {
            renderHook(() => useParticipants());
            expect(mockSubscribeToParticipants).not.toHaveBeenCalled();
        });
    });

    describe('real-time subscription', () => {
        it('calls subscribeToParticipants with the retrospective id', () => {
            renderHook(() => useParticipants('retro-1'));
            expect(mockSubscribeToParticipants).toHaveBeenCalledWith('retro-1', expect.any(Function));
        });

        it('updates participants when subscription emits', () => {
            let capturedCallback: ((p: any[]) => void) | null = null;
            mockSubscribeToParticipants.mockImplementation((_id: string, cb: (p: any[]) => void) => {
                capturedCallback = cb;
                return vi.fn();
            });

            const { result } = renderHook(() => useParticipants('retro-1'));

            act(() => {
                capturedCallback!(mockParticipants);
            });

            expect(result.current.participants).toEqual(mockParticipants);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('calls the returned unsubscribe function on unmount', () => {
            const mockUnsubscribe = vi.fn();
            mockSubscribeToParticipants.mockImplementation(() => mockUnsubscribe);

            const { unmount } = renderHook(() => useParticipants('retro-1'));
            unmount();

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('addParticipant', () => {
        it('returns id and isNew from the service', async () => {
            mockAddParticipant.mockResolvedValue({ id: 'p-new', isNew: true });
            const { result } = renderHook(() => useParticipants('retro-1'));

            const res = await act(async () =>
                result.current.addParticipant({ name: 'Carol', userId: 'u3', retrospectiveId: 'retro-1' })
            );

            expect(res).toEqual({ id: 'p-new', isNew: true });
            expect(mockAddParticipant).toHaveBeenCalledWith({
                name: 'Carol',
                userId: 'u3',
                retrospectiveId: 'retro-1',
            });
        });

        it('sets error and rethrows on failure', async () => {
            mockAddParticipant.mockRejectedValue(new Error('Add failed'));
            const { result } = renderHook(() => useParticipants('retro-1'));

            let caughtMessage = '';
            await act(async () => {
                try {
                    await result.current.addParticipant({ name: 'Carol', userId: 'u3', retrospectiveId: 'retro-1' });
                } catch (e) {
                    caughtMessage = e instanceof Error ? e.message : String(e);
                }
            });

            expect(caughtMessage).toBe('Add failed');
            expect(result.current.error).toBe('Add failed');
        });
    });

    describe('removeParticipant', () => {
        it('calls service with participant id', async () => {
            mockRemoveParticipant.mockResolvedValue(undefined);
            const { result } = renderHook(() => useParticipants('retro-1'));

            await act(async () => result.current.removeParticipant('p1'));

            expect(mockRemoveParticipant).toHaveBeenCalledWith('p1');
        });

        it('sets error and rethrows on failure', async () => {
            mockRemoveParticipant.mockRejectedValue(new Error('Remove failed'));
            const { result } = renderHook(() => useParticipants('retro-1'));

            let caughtMessage = '';
            await act(async () => {
                try {
                    await result.current.removeParticipant('p1');
                } catch (e) {
                    caughtMessage = e instanceof Error ? e.message : String(e);
                }
            });

            expect(caughtMessage).toBe('Remove failed');
            expect(result.current.error).toBe('Remove failed');
        });
    });

    describe('refetch', () => {
        it('calls getParticipantsByRetrospective and updates participants', async () => {
            mockGetParticipantsByRetrospective.mockResolvedValue(mockParticipants);
            const { result } = renderHook(() => useParticipants('retro-1'));

            await act(async () => result.current.refetch());

            expect(mockGetParticipantsByRetrospective).toHaveBeenCalledWith('retro-1');
            expect(result.current.participants).toEqual(mockParticipants);
            expect(result.current.loading).toBe(false);
        });

        it('does nothing without retrospectiveId', async () => {
            const { result } = renderHook(() => useParticipants());

            await act(async () => result.current.refetch());

            expect(mockGetParticipantsByRetrospective).not.toHaveBeenCalled();
        });
    });
});
