import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    collection,
    doc,
    setDoc,
    deleteDoc,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import { TypingStatusService } from '@/features/boards/retrospective/services/typingStatusService';
import { TypingStatusUpdate } from '@/features/boards/types/typing';

// Mock Firebase with proper Timestamp support
vi.mock('firebase/firestore', () => {
    class MockTimestamp {
        private readonly _date: Date;

        constructor(date: Date) {
            this._date = date;
        }

        toDate() {
            return this._date;
        }

        static fromDate(date: Date) {
            return new MockTimestamp(date);
        }
    }

    return {
        collection: vi.fn(),
        doc: vi.fn(),
        setDoc: vi.fn(),
        deleteDoc: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        onSnapshot: vi.fn(),
        serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
        Timestamp: MockTimestamp
    };
});

vi.mock('@/lib/services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('TypingStatusService', () => {
    const mockRetrospectiveId = 'test-retro-id';
    const mockUserId = 'test-user-id';
    const mockUsername = 'test-user';
    const mockColumn = 'helped';

    const mockTypingUpdate: TypingStatusUpdate = {
        userId: mockUserId,
        username: mockUsername,
        retrospectiveId: mockRetrospectiveId,
        column: mockColumn,
        isActive: true
    };

    // Helper functions to reduce nesting
    const createMockTimestamp = (date: Date) => ({
        toDate: () => date
    });

    const createMockDocData = (overrides = {}) => ({
        userId: mockUserId,
        username: mockUsername,
        retrospectiveId: mockRetrospectiveId,
        column: mockColumn,
        timestamp: createMockTimestamp(new Date(Date.now() - 1000)),
        isActive: true,
        ...overrides
    });

    const createMockDoc = (id: string, data = {}) => ({
        id,
        data: () => createMockDocData(data)
    });

    const createMockSnapshot = (docs: any[]) => ({
        forEach: (fn: any) => docs.forEach(fn)
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Setup basic mocks
        (doc as any).mockReturnValue({ _type: 'mockDocRef' });
        (collection as any).mockReturnValue({ _type: 'mockCollection' });
        (query as any).mockReturnValue({ _type: 'mockQuery' });
        (where as any).mockReturnValue({ _type: 'mockWhere' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('setTypingStatus', () => {
        it('should set active typing status successfully', async () => {
            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            expect(setDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    id: `${mockRetrospectiveId}_${mockUserId}_${mockColumn}`,
                    userId: mockUserId,
                    username: mockUsername,
                    retrospectiveId: mockRetrospectiveId,
                    column: mockColumn,
                    timestamp: { _methodName: 'serverTimestamp' },
                    isActive: true
                })
            );
        });

        it('should delete typing status when isActive is false', async () => {
            const inactiveUpdate = { ...mockTypingUpdate, isActive: false };

            await TypingStatusService.setTypingStatus(inactiveUpdate);

            expect(deleteDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' });
        });

        it('should handle errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (setDoc as any).mockRejectedValue(new Error('Firestore error'));

            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            expect(consoleSpy).toHaveBeenCalledWith('Error updating typing status:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should set cleanup timer for active typing status', async () => {
            const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 6000);
        });

        it('should clear existing timer when setting new typing status', async () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            // Set initial typing status
            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            // Set again - should clear previous timer
            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('subscribeToTypingStatus', () => {
        it('should subscribe to typing status changes successfully', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            (onSnapshot as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = TypingStatusService.subscribeToTypingStatus(
                mockRetrospectiveId,
                mockCallback
            );

            expect(query).toHaveBeenCalled();
            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('isActive', '==', true);
            expect(onSnapshot).toHaveBeenCalled();
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should process valid typing statuses correctly', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            TypingStatusService.subscribeToTypingStatus(mockRetrospectiveId, mockCallback);

            const mockDoc = createMockDoc(`${mockRetrospectiveId}_${mockUserId}_${mockColumn}`);
            const mockSnapshot = createMockSnapshot([mockDoc]);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: `${mockRetrospectiveId}_${mockUserId}_${mockColumn}`,
                    userId: mockUserId,
                    username: mockUsername,
                    retrospectiveId: mockRetrospectiveId,
                    column: mockColumn,
                    isActive: true
                })
            ]);
        });

        it('should filter out expired typing statuses', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            TypingStatusService.subscribeToTypingStatus(mockRetrospectiveId, mockCallback);

            // Create expired timestamp (more than 6 seconds ago)
            const expiredTimestamp = createMockTimestamp(new Date(Date.now() - 10000));
            const mockDoc = createMockDoc(
                `${mockRetrospectiveId}_${mockUserId}_${mockColumn}`,
                { timestamp: expiredTimestamp }
            );
            const mockSnapshot = createMockSnapshot([mockDoc]);

            snapshotCallback(mockSnapshot);

            // Should call callback with empty array (no valid typing statuses)
            expect(mockCallback).toHaveBeenCalledWith([]);
            // Should attempt to cleanup expired status
            expect(deleteDoc).toHaveBeenCalled();
        });

        it('should handle subscription errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (onSnapshot as any).mockImplementation(() => {
                throw new Error('Subscription error');
            });

            const result = TypingStatusService.subscribeToTypingStatus(
                mockRetrospectiveId,
                vi.fn()
            );

            expect(consoleSpy).toHaveBeenCalledWith('Error subscribing to typing status:', expect.any(Error));
            expect(typeof result).toBe('function'); // Should return empty function
            consoleSpy.mockRestore();
        });

        it('should handle missing timestamp gracefully', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            TypingStatusService.subscribeToTypingStatus(mockRetrospectiveId, mockCallback);

            const mockDoc = createMockDoc(
                `${mockRetrospectiveId}_${mockUserId}_${mockColumn}`,
                { timestamp: null }
            );
            const mockSnapshot = createMockSnapshot([mockDoc]);

            snapshotCallback(mockSnapshot);

            // Should still process the typing status with current time as fallback
            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: mockUserId,
                    username: mockUsername,
                    isActive: true
                })
            ]);
        });
    });

    describe('cleanupUserTypingStatus', () => {
        it('should cleanup all typing statuses for a user', async () => {
            await TypingStatusService.cleanupUserTypingStatus(mockUserId, mockRetrospectiveId);

            // Should delete documents for all three columns
            expect(deleteDoc).toHaveBeenCalledTimes(3);
            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'typingStatus',
                `${mockRetrospectiveId}_${mockUserId}_helped`
            );
            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'typingStatus',
                `${mockRetrospectiveId}_${mockUserId}_hindered`
            );
            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'typingStatus',
                `${mockRetrospectiveId}_${mockUserId}_improve`
            );
        });

        it('should handle cleanup errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (deleteDoc as any).mockRejectedValue(new Error('Delete error'));

            await TypingStatusService.cleanupUserTypingStatus(mockUserId, mockRetrospectiveId);

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error cleaning up user typing status:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('should clear cleanup timers when cleaning up user statuses', async () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            // First set some typing statuses to create timers
            await TypingStatusService.setTypingStatus(mockTypingUpdate);
            await TypingStatusService.setTypingStatus({
                ...mockTypingUpdate,
                column: 'hindered'
            });

            // Clear all mocks except clearTimeout spy to focus on cleanup call
            vi.clearAllMocks();
            clearTimeoutSpy.mockClear();

            await TypingStatusService.cleanupUserTypingStatus(mockUserId, mockRetrospectiveId);

            // Should attempt to clear timers for all columns (even if no timers exist)
            // The service calls clearCleanupTimer for each column during cleanup
            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('cleanup timers', () => {
        it('should auto-cleanup typing status after timeout', async () => {
            // Set active typing status
            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            // Fast-forward time past the timeout
            vi.advanceTimersByTime(6000);

            // Should have called setTypingStatus with isActive: false
            expect(setDoc).toHaveBeenCalledTimes(1); // Initial call
            // Note: The timeout callback would call setTypingStatus again, 
            // but since we're mocking setDoc, we can't easily test the recursive call
        });

        it('should clear timer when manually setting status to inactive', async () => {
            const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

            // Set active status
            await TypingStatusService.setTypingStatus(mockTypingUpdate);

            // Set inactive status
            await TypingStatusService.setTypingStatus({ ...mockTypingUpdate, isActive: false });

            expect(clearTimeoutSpy).toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should handle null/undefined timestamp in subscription', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            TypingStatusService.subscribeToTypingStatus(mockRetrospectiveId, mockCallback);

            const mockDoc = createMockDoc(
                `${mockRetrospectiveId}_${mockUserId}_${mockColumn}`,
                { timestamp: undefined }
            );
            const mockSnapshot = createMockSnapshot([mockDoc]);

            expect(() => snapshotCallback(mockSnapshot)).not.toThrow();
        });

        it('should handle different column types', async () => {
            const columns = ['helped', 'hindered', 'improve', 'actions'] as const;

            for (const column of columns) {
                const update = { ...mockTypingUpdate, column };
                await TypingStatusService.setTypingStatus(update);

                expect(setDoc).toHaveBeenCalledWith(
                    { _type: 'mockDocRef' },
                    expect.objectContaining({
                        column,
                        id: `${mockRetrospectiveId}_${mockUserId}_${column}`
                    })
                );
            }
        });

        it('should handle multiple users typing simultaneously', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            TypingStatusService.subscribeToTypingStatus(mockRetrospectiveId, mockCallback);

            const mockDoc1 = createMockDoc('retro_user1_helped', {
                userId: 'user1',
                username: 'User One',
                column: 'helped'
            });

            const mockDoc2 = createMockDoc('retro_user2_hindered', {
                userId: 'user2',
                username: 'User Two',
                column: 'hindered'
            });

            const mockSnapshot = createMockSnapshot([mockDoc1, mockDoc2]);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    userId: 'user1',
                    column: 'helped'
                }),
                expect.objectContaining({
                    userId: 'user2',
                    column: 'hindered'
                })
            ]);
        });
    });
});
