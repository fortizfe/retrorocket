import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    onSnapshot
} from 'firebase/firestore';
import { CountdownService } from '@/features/boards/countdown/services/countdownService';

// Mock Firebase with simple Timestamp mock
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
        doc: vi.fn(),
        setDoc: vi.fn(),
        getDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        onSnapshot: vi.fn(),
        serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
        Timestamp: MockTimestamp
    };
});

vi.mock('@/lib/services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('CountdownService', () => {
    const mockRetrospectiveId = 'test-retro-id';
    const mockUserId = 'test-user-id';
    const mockDuration = 300; // 5 minutes in seconds

    // Helper function for creating timestamp mocks
    const createTimestampMock = (date: Date) => ({ toDate: () => date });

    const mockTimerData = {
        id: mockRetrospectiveId,
        retrospectiveId: mockRetrospectiveId,
        startTime: new Date(),
        duration: mockDuration,
        originalDuration: mockDuration,
        isRunning: false,
        isPaused: false,
        endTime: null,
        createdBy: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup basic mocks
        (doc as any).mockReturnValue({ _type: 'mockDocRef' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createOrUpdateTimer', () => {
        it('should create timer successfully', async () => {
            await CountdownService.createOrUpdateTimer(
                mockRetrospectiveId,
                mockDuration,
                mockUserId
            );

            expect(setDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    retrospectiveId: mockRetrospectiveId,
                    duration: mockDuration,
                    originalDuration: mockDuration,
                    isRunning: false,
                    isPaused: false,
                    createdBy: mockUserId,
                    createdAt: { _methodName: 'serverTimestamp' },
                    updatedAt: { _methodName: 'serverTimestamp' }
                })
            );
        });
    });

    describe('startTimer', () => {
        it('should start timer successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockTimerData
            });

            await CountdownService.startTimer(mockRetrospectiveId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    startTime: { _methodName: 'serverTimestamp' },
                    isRunning: true,
                    isPaused: false,
                    updatedAt: { _methodName: 'serverTimestamp' }
                })
            );
        });

        it('should throw error when timer not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(
                CountdownService.startTimer(mockRetrospectiveId)
            ).rejects.toThrow('Timer not found');
        });
    });

    describe('pauseTimer', () => {
        it('should throw error when timer not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(
                CountdownService.pauseTimer(mockRetrospectiveId)
            ).rejects.toThrow('Timer not found');
        });

        it('should throw error when timer is not running', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockTimerData // isRunning: false
            });

            await expect(
                CountdownService.pauseTimer(mockRetrospectiveId)
            ).rejects.toThrow('Timer is not running');
        });

        it('should pause running timer with Date startTime', async () => {
            const runningTimer = {
                ...mockTimerData,
                isRunning: true,
                startTime: new Date(), // Use Date object to test line 87-88
                duration: 300
            };

            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => runningTimer
            });

            (updateDoc as any).mockResolvedValue(undefined);

            await CountdownService.pauseTimer(mockRetrospectiveId);

            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    isRunning: false,
                    isPaused: true,
                    startTime: null,
                    endTime: null
                })
            );
        });

        it('should pause running timer with Timestamp startTime', async () => {
            const mockTimestamp = {
                toDate: () => new Date()
            };
            const runningTimer = {
                ...mockTimerData,
                isRunning: true,
                startTime: mockTimestamp, // Use Timestamp object
                duration: 300
            };

            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => runningTimer
            });

            (updateDoc as any).mockResolvedValue(undefined);

            await CountdownService.pauseTimer(mockRetrospectiveId);

            expect(updateDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    isRunning: false,
                    isPaused: true
                })
            );
        });
    });

    describe('resetTimer', () => {
        it('should reset timer successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => mockTimerData
            });

            await CountdownService.resetTimer(mockRetrospectiveId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    startTime: null,
                    endTime: null,
                    isRunning: false,
                    isPaused: false,
                    duration: mockDuration,
                    updatedAt: { _methodName: 'serverTimestamp' }
                })
            );
        });

        it('should reset timer to original duration when available', async () => {
            const modifiedTimer = {
                ...mockTimerData,
                duration: 120, // modified duration
                originalDuration: mockDuration // original duration
            };

            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => modifiedTimer
            });

            await CountdownService.resetTimer(mockRetrospectiveId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    duration: mockDuration // should reset to original
                })
            );
        });

        it('should throw error when timer not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            await expect(
                CountdownService.resetTimer(mockRetrospectiveId)
            ).rejects.toThrow('Timer not found');
        });
    });

    describe('deleteTimer', () => {
        it('should delete timer successfully', async () => {
            await CountdownService.deleteTimer(mockRetrospectiveId);

            expect(deleteDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' });
        });
    });

    describe('subscribeToTimer', () => {
        it('should subscribe to timer changes successfully', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            (onSnapshot as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = CountdownService.subscribeToTimer(mockRetrospectiveId, mockCallback);

            expect(onSnapshot).toHaveBeenCalled();
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should handle non-existent timer', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((ref: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            CountdownService.subscribeToTimer(mockRetrospectiveId, mockCallback);

            // Simulate snapshot with no data
            const mockSnapshot = {
                exists: () => false
            };

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith(null);
        });

        it('should handle subscription errors', () => {
            const mockCallback = vi.fn();
            let errorCallback: any;

            (onSnapshot as any).mockImplementation((ref: any, callback: any, errCallback: any) => {
                errorCallback = errCallback;
                return vi.fn();
            });

            CountdownService.subscribeToTimer(mockRetrospectiveId, mockCallback);

            // Simulate error
            const mockError = new Error('Subscription error');
            errorCallback(mockError);

            expect(mockCallback).toHaveBeenCalledWith(null);
        });

        it('should handle database not initialized in subscription', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            // Ensure onSnapshot returns a function
            (onSnapshot as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = CountdownService.subscribeToTimer(mockRetrospectiveId, mockCallback);
            expect(unsubscribe).toBeDefined();
            expect(typeof unsubscribe).toBe('function');
        });

        it('should handle timer data with different timestamp formats', () => {
            const mockCallback = vi.fn();
            const testDate = new Date('2023-12-01T10:00:00Z');

            const mockSnapshot = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    retrospectiveId: mockRetrospectiveId,
                    startTime: testDate, // Regular Date object
                    duration: mockDuration,
                    originalDuration: mockDuration,
                    isRunning: true,
                    isPaused: false,
                    endTime: testDate,
                    createdBy: mockUserId,
                    createdAt: testDate,
                    updatedAt: testDate
                })
            };

            (onSnapshot as any).mockImplementation((ref: any, callback: any) => {
                callback(mockSnapshot);
                return vi.fn();
            });

            CountdownService.subscribeToTimer(mockRetrospectiveId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockRetrospectiveId,
                    retrospectiveId: mockRetrospectiveId,
                    duration: mockDuration,
                    isRunning: true
                })
            );
        });
    });

    describe('getTimer', () => {
        it('should return null when timer not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            const result = await CountdownService.getTimer(mockRetrospectiveId);

            expect(result).toBeNull();
        });

        it('should get timer successfully with basic data', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => mockTimerData
            });

            const result = await CountdownService.getTimer(mockRetrospectiveId);

            expect(result).toEqual(
                expect.objectContaining({
                    id: mockRetrospectiveId,
                    retrospectiveId: mockRetrospectiveId,
                    duration: mockDuration
                })
            );
        });

        it('should handle missing originalDuration with fallback', async () => {
            const timerWithoutOriginal = { ...mockTimerData };
            delete (timerWithoutOriginal as any).originalDuration;

            (getDoc as any).mockResolvedValue({
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => timerWithoutOriginal
            });

            const result = await CountdownService.getTimer(mockRetrospectiveId);

            expect(result?.originalDuration).toBe(mockDuration); // Should fallback to duration
        });

        it('should handle timer with different timestamp formats in getTimer', async () => {
            const testDate = new Date('2023-12-01T10:00:00Z');

            const timerWithDates = {
                ...mockTimerData,
                startTime: testDate, // Regular Date object
                endTime: testDate,
                createdAt: testDate,
                updatedAt: testDate
            };

            (getDoc as any).mockResolvedValue({
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => timerWithDates
            });

            const result = await CountdownService.getTimer(mockRetrospectiveId);

            expect(result).toBeTruthy();
            expect(result?.id).toBe(mockRetrospectiveId);
            expect(result?.startTime).toEqual(testDate);
            expect(result?.endTime).toEqual(testDate);
        });
    });
});
