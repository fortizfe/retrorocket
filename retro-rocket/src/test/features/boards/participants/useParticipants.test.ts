import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParticipants } from '@/features/boards/participants/hooks/useParticipants';
import { joinBoard } from '@/features/boards/participants/services/participantsApiClient';

// ─── Mocks ────────────────────────────────────────────────────────────────────

type SnapshotHandler = (data: unknown) => void;
type OnHandlers = Record<string, SnapshotHandler>;

let capturedOnSnapshot: SnapshotHandler | null = null;
let capturedOn: OnHandlers | null = null;
let mockConnectionState: 'connecting' | 'connected' | 'reconnecting' = 'connecting';

vi.mock('@/lib/hooks/useBoardEvents', () => ({
    useBoardEvents: (_boardId: string | undefined, options: { onSnapshot?: SnapshotHandler; on?: OnHandlers }) => {
        capturedOnSnapshot = options.onSnapshot ?? null;
        capturedOn = options.on ?? null;
        return { connectionState: mockConnectionState };
    },
}));

vi.mock('@/features/boards/participants/services/participantsApiClient', () => ({
    joinBoard: vi.fn(),
    parseParticipantsSnapshot: (raw: Array<Record<string, unknown>>) =>
        raw.map((p) => ({ ...p, joinedAt: new Date(p.joinedAt as string) })),
}));

const mockedJoinBoard = vi.mocked(joinBoard);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const rawParticipants = [
    { id: 'p1', name: 'Alice', userId: 'u1', retrospectiveId: 'retro-1', joinedAt: new Date().toISOString(), isFacilitator: false, isActive: true },
    { id: 'p2', name: 'Bob', userId: 'u2', retrospectiveId: 'retro-1', joinedAt: new Date().toISOString(), isFacilitator: false, isActive: true },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useParticipants', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        capturedOnSnapshot = null;
        capturedOn = null;
        mockConnectionState = 'connecting';
    });

    describe('initial state', () => {
        it('without retrospectiveId — loading=false, participants=[]', () => {
            const { result } = renderHook(() => useParticipants());
            expect(result.current.loading).toBe(false);
            expect(result.current.participants).toEqual([]);
            expect(result.current.error).toBeNull();
        });

        it('with retrospectiveId — loading starts true until a snapshot arrives', () => {
            const { result } = renderHook(() => useParticipants('retro-1'));
            expect(result.current.loading).toBe(true);
            expect(result.current.participants).toEqual([]);
        });
    });

    describe('SSE snapshot consumption', () => {
        it('populates participants from the initial snapshot event', () => {
            const { result } = renderHook(() => useParticipants('retro-1'));

            act(() => {
                capturedOnSnapshot!({ participants: rawParticipants });
            });

            expect(result.current.participants).toHaveLength(2);
            expect(result.current.participants[0].name).toBe('Alice');
            expect(result.current.loading).toBe(false);
        });

        it('updates participants on a named "participants" event', () => {
            const { result } = renderHook(() => useParticipants('retro-1'));

            act(() => {
                capturedOnSnapshot!({ participants: [] });
            });
            act(() => {
                capturedOn!.participants(rawParticipants);
            });

            expect(result.current.participants).toHaveLength(2);
        });
    });

    describe('addParticipant', () => {
        it('calls the backend join endpoint with no arguments and returns id/isNew', async () => {
            mockedJoinBoard.mockResolvedValue({ id: 'p-new', isNew: true });
            const { result } = renderHook(() => useParticipants('retro-1'));

            const res = await act(async () => result.current.addParticipant());

            expect(res).toEqual({ id: 'p-new', isNew: true });
            expect(mockedJoinBoard).toHaveBeenCalledWith('retro-1');
        });

        it('sets error and rethrows on failure', async () => {
            mockedJoinBoard.mockRejectedValue(new Error('Add failed'));
            const { result } = renderHook(() => useParticipants('retro-1'));

            let caughtMessage = '';
            await act(async () => {
                try {
                    await result.current.addParticipant();
                } catch (e) {
                    caughtMessage = e instanceof Error ? e.message : String(e);
                }
            });

            expect(caughtMessage).toBe('Add failed');
            expect(result.current.error).toBe('Add failed');
        });

        it('rejects without a retrospectiveId', async () => {
            const { result } = renderHook(() => useParticipants());
            await expect(result.current.addParticipant()).rejects.toThrow('Missing retrospectiveId');
        });
    });

});
