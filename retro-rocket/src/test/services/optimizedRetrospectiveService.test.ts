import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OptimizedRetrospectiveService } from '../../services/optimization/OptimizedRetrospectiveService';
import { FirebaseMetricsService } from '../../services/optimization/FirebaseMetricsService';
import * as firebaseFirestore from 'firebase/firestore';

// Mock Firebase Firestore
vi.mock('firebase/firestore');
vi.mock('../../services/optimization/FirebaseMetricsService');
vi.mock('../../services/firebase', () => ({
    db: {
        type: 'mock-firestore',
        app: { name: 'mock-app' }
    },
    FIRESTORE_COLLECTIONS: {
        RETROSPECTIVES: 'retrospectives',
        CARDS: 'cards',
        PARTICIPANTS: 'participants'
    }
}));

describe('OptimizedRetrospectiveService', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockFacilitatorId = 'facilitator-456';

    let mockDoc: ReturnType<typeof vi.fn>;
    let mockUpdateDoc: ReturnType<typeof vi.fn>;
    let mockOnSnapshot: ReturnType<typeof vi.fn>;
    let mockQuery: ReturnType<typeof vi.fn>;
    let mockCollection: ReturnType<typeof vi.fn>;
    let mockWhere: ReturnType<typeof vi.fn>;
    let mockOrderBy: ReturnType<typeof vi.fn>;
    let mockLimit: ReturnType<typeof vi.fn>;
    let mockGetDocs: ReturnType<typeof vi.fn>;
    let mockServerTimestamp: ReturnType<typeof vi.fn>;
    let mockIncrement: ReturnType<typeof vi.fn>;
    let mockRecordWrite: ReturnType<typeof vi.fn>;
    let mockRecordRead: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        mockDoc = vi.fn();
        mockUpdateDoc = vi.fn();
        mockOnSnapshot = vi.fn();
        mockQuery = vi.fn();
        mockCollection = vi.fn();
        mockWhere = vi.fn();
        mockOrderBy = vi.fn();
        mockLimit = vi.fn();
        mockGetDocs = vi.fn();
        mockServerTimestamp = vi.fn().mockReturnValue({ __type: 'server_timestamp' });
        mockIncrement = vi.fn().mockReturnValue('increment_value');
        mockRecordWrite = vi.fn();
        mockRecordRead = vi.fn();

        vi.mocked(firebaseFirestore.doc).mockImplementation(mockDoc);
        vi.mocked(firebaseFirestore.updateDoc).mockImplementation(mockUpdateDoc);
        vi.mocked(firebaseFirestore.onSnapshot).mockImplementation(mockOnSnapshot);
        vi.mocked(firebaseFirestore.query).mockImplementation(mockQuery);
        vi.mocked(firebaseFirestore.collection).mockImplementation(mockCollection);
        vi.mocked(firebaseFirestore.where).mockImplementation(mockWhere);
        vi.mocked(firebaseFirestore.orderBy).mockImplementation(mockOrderBy);
        vi.mocked(firebaseFirestore.limit).mockImplementation(mockLimit);
        vi.mocked(firebaseFirestore.getDocs).mockImplementation(mockGetDocs);
        vi.mocked(firebaseFirestore.serverTimestamp).mockImplementation(mockServerTimestamp);
        vi.mocked(firebaseFirestore.increment).mockImplementation(mockIncrement);
        vi.mocked(FirebaseMetricsService.recordWrite).mockImplementation(mockRecordWrite);
        vi.mocked(FirebaseMetricsService.recordRead).mockImplementation(mockRecordRead);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('softDeleteRetrospective', () => {
        it('should soft delete a retrospective successfully', async () => {
            const mockDocRef = { id: mockRetrospectiveId };
            mockDoc.mockReturnValue(mockDocRef);
            mockUpdateDoc.mockResolvedValue(undefined);

            await OptimizedRetrospectiveService.softDeleteRetrospective(mockRetrospectiveId, mockUserId);

            expect(mockDoc).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'mock-firestore' }),
                'retrospectives',
                mockRetrospectiveId
            );
            expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
                isDeleted: true,
                deletedAt: { __type: 'server_timestamp' },
                deletedBy: mockUserId,
                updatedAt: { __type: 'server_timestamp' }
            });
            expect(mockRecordWrite).toHaveBeenCalledWith('retrospectives-soft-delete', 1);
        });

        it('should throw error when soft delete fails', async () => {
            mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

            await expect(
                OptimizedRetrospectiveService.softDeleteRetrospective(mockRetrospectiveId, mockUserId)
            ).rejects.toThrow('Could not delete retrospective');
        });
    });

    describe('restoreRetrospective', () => {
        it('should restore a soft-deleted retrospective successfully', async () => {
            const mockDocRef = { id: mockRetrospectiveId };
            mockDoc.mockReturnValue(mockDocRef);
            mockUpdateDoc.mockResolvedValue(undefined);

            await OptimizedRetrospectiveService.restoreRetrospective(mockRetrospectiveId);

            expect(mockDoc).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'mock-firestore' }),
                'retrospectives',
                mockRetrospectiveId
            );
            expect(mockUpdateDoc).toHaveBeenCalledWith(mockDocRef, {
                isDeleted: false,
                deletedAt: null,
                deletedBy: null,
                updatedAt: { __type: 'server_timestamp' }
            });
            expect(mockRecordWrite).toHaveBeenCalledWith('retrospectives-restore', 1);
        });

        it('should throw error when restore fails', async () => {
            mockUpdateDoc.mockRejectedValue(new Error('Firestore error'));

            await expect(
                OptimizedRetrospectiveService.restoreRetrospective(mockRetrospectiveId)
            ).rejects.toThrow('Could not restore retrospective');
        });
    });

    describe('subscribeToActiveRetrospectives', () => {
        it('should subscribe to active retrospectives with correct query', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();
            const mockQueryObj = { type: 'query' };

            mockCollection.mockReturnValue({ type: 'collection' });
            mockWhere.mockReturnValue({ type: 'where' });
            mockOrderBy.mockReturnValue({ type: 'orderBy' });
            mockQuery.mockReturnValue(mockQueryObj);
            mockOnSnapshot.mockReturnValue(mockUnsubscribe);

            const unsubscribe = OptimizedRetrospectiveService.subscribeToActiveRetrospectives(
                mockFacilitatorId,
                mockCallback
            );

            expect(mockCollection).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'mock-firestore' }),
                'retrospectives'
            );
            expect(mockWhere).toHaveBeenCalledWith('facilitator', '==', mockFacilitatorId);
            expect(mockWhere).toHaveBeenCalledWith('isDeleted', '!=', true);
            expect(mockOrderBy).toHaveBeenCalledWith('updatedAt', 'desc');
            expect(mockOnSnapshot).toHaveBeenCalledWith(mockQueryObj, expect.any(Function));
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should apply limit when provided', () => {
            const mockCallback = vi.fn();
            const mockQueryObj = { type: 'query' };
            const mockLimitedQuery = { type: 'limited-query' };

            mockQuery.mockReturnValueOnce(mockQueryObj).mockReturnValueOnce(mockLimitedQuery);
            mockLimit.mockReturnValue({ type: 'limit' });
            mockOnSnapshot.mockReturnValue(vi.fn());

            OptimizedRetrospectiveService.subscribeToActiveRetrospectives(
                mockFacilitatorId,
                mockCallback,
                10
            );

            expect(mockLimit).toHaveBeenCalledWith(10);
            expect(mockQuery).toHaveBeenCalledWith(mockQueryObj, { type: 'limit' });
            expect(mockOnSnapshot).toHaveBeenCalledWith(mockLimitedQuery, expect.any(Function));
        });

        it('should process snapshot data correctly', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            mockOnSnapshot.mockImplementation((query, callback) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            OptimizedRetrospectiveService.subscribeToActiveRetrospectives(
                mockFacilitatorId,
                mockCallback
            );

            // Mock snapshot data
            const mockTimestamp = {
                toDate: vi.fn().mockReturnValue(new Date('2024-01-01'))
            };

            const mockSnapshot = {
                docs: [
                    {
                        id: 'retro-1',
                        data: vi.fn().mockReturnValue({
                            title: 'Test Retro 1',
                            facilitator: mockFacilitatorId,
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp
                        })
                    },
                    {
                        id: 'retro-2',
                        data: vi.fn().mockReturnValue({
                            title: 'Test Retro 2',
                            facilitator: mockFacilitatorId,
                            createdAt: mockTimestamp,
                            updatedAt: mockTimestamp
                        })
                    }
                ]
            };

            // Trigger the callback
            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'retro-1',
                    title: 'Test Retro 1',
                    facilitator: mockFacilitatorId,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                }),
                expect.objectContaining({
                    id: 'retro-2',
                    title: 'Test Retro 2',
                    facilitator: mockFacilitatorId,
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                })
            ]);

            expect(mockRecordRead).toHaveBeenCalledWith('retrospectives-active-list', 2);
        });

        it('should handle errors gracefully', () => {
            const mockCallback = vi.fn();
            mockQuery.mockImplementation(() => {
                throw new Error('Query error');
            });

            const unsubscribe = OptimizedRetrospectiveService.subscribeToActiveRetrospectives(
                mockFacilitatorId,
                mockCallback
            );

            // Should return a no-op function
            expect(typeof unsubscribe).toBe('function');
            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    describe('subscribeToRetrospective', () => {
        it('should subscribe to single retrospective with correct parameters', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();
            const mockDocRef = { id: mockRetrospectiveId };

            mockDoc.mockReturnValue(mockDocRef);
            mockOnSnapshot.mockReturnValue(mockUnsubscribe);

            const unsubscribe = OptimizedRetrospectiveService.subscribeToRetrospective(
                mockRetrospectiveId,
                mockCallback
            );

            expect(mockDoc).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'mock-firestore' }),
                'retrospectives',
                mockRetrospectiveId
            );
            expect(mockOnSnapshot).toHaveBeenCalledWith(mockDocRef, expect.any(Function), expect.any(Function));
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should filter out soft-deleted retrospective when includeDeleted is false', () => {
            const mockCallback = vi.fn();
            let docSnapshotCallback: any;

            mockOnSnapshot.mockImplementation((docRef, callback) => {
                docSnapshotCallback = callback;
                return vi.fn();
            });

            OptimizedRetrospectiveService.subscribeToRetrospective(
                mockRetrospectiveId,
                mockCallback,
                false // includeDeleted = false
            );

            // Mock soft-deleted document
            const mockDoc = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    title: 'Deleted Retro',
                    isDeleted: true,
                    deletedAt: { toDate: () => new Date() },
                    createdAt: { toDate: () => new Date() },
                    updatedAt: { toDate: () => new Date() }
                })
            };

            docSnapshotCallback(mockDoc);

            // Should call callback with null for soft-deleted retrospective
            expect(mockCallback).toHaveBeenCalledWith(null);
            expect(mockRecordRead).not.toHaveBeenCalled();
        });

        it('should include soft-deleted retrospective when includeDeleted is true', () => {
            const mockCallback = vi.fn();
            let docSnapshotCallback: any;

            mockOnSnapshot.mockImplementation((docRef, callback) => {
                docSnapshotCallback = callback;
                return vi.fn();
            });

            OptimizedRetrospectiveService.subscribeToRetrospective(
                mockRetrospectiveId,
                mockCallback,
                true // includeDeleted = true
            );

            // Mock soft-deleted document
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            const mockDoc = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    title: 'Deleted Retro',
                    isDeleted: true,
                    deletedAt: mockTimestamp,
                    deletedBy: mockUserId,
                    createdAt: mockTimestamp,
                    updatedAt: mockTimestamp
                })
            };

            docSnapshotCallback(mockDoc);

            // Should call callback with the retrospective data
            expect(mockCallback).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: mockRetrospectiveId,
                    title: 'Deleted Retro',
                    isDeleted: true,
                    deletedBy: mockUserId
                })
            );
            expect(mockRecordRead).toHaveBeenCalledWith('retrospectives-single', 1);
        });

        it('should handle non-existent document', () => {
            const mockCallback = vi.fn();
            let docSnapshotCallback: any;

            mockOnSnapshot.mockImplementation((docRef, callback) => {
                docSnapshotCallback = callback;
                return vi.fn();
            });

            OptimizedRetrospectiveService.subscribeToRetrospective(
                mockRetrospectiveId,
                mockCallback
            );

            // Mock non-existent document
            const mockDoc = {
                exists: () => false
            };

            docSnapshotCallback(mockDoc);

            expect(mockCallback).toHaveBeenCalledWith(null);
        });
    });

    describe('getSoftDeletedRetrospectives', () => {
        it('should get soft-deleted retrospectives with correct query', async () => {
            const mockQueryObj = { type: 'query' };
            const mockSnapshot = {
                docs: [
                    {
                        id: 'deleted-retro-1',
                        data: () => ({
                            title: 'Deleted Retro 1',
                            isDeleted: true,
                            deletedAt: { toDate: () => new Date('2024-01-01') },
                            deletedBy: mockUserId,
                            createdAt: { toDate: () => new Date('2023-12-01') },
                            updatedAt: { toDate: () => new Date('2024-01-01') }
                        })
                    }
                ]
            };

            mockQuery.mockReturnValue(mockQueryObj);
            mockGetDocs.mockResolvedValue(mockSnapshot);

            const result = await OptimizedRetrospectiveService.getSoftDeletedRetrospectives(mockFacilitatorId);

            expect(mockWhere).toHaveBeenCalledWith('facilitator', '==', mockFacilitatorId);
            expect(mockWhere).toHaveBeenCalledWith('isDeleted', '==', true);
            expect(mockOrderBy).toHaveBeenCalledWith('deletedAt', 'desc');
            expect(mockLimit).toHaveBeenCalledWith(50);
            expect(mockGetDocs).toHaveBeenCalledWith(mockQueryObj);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: 'deleted-retro-1',
                    title: 'Deleted Retro 1',
                    isDeleted: true,
                    deletedBy: mockUserId
                })
            );
            expect(mockRecordRead).toHaveBeenCalledWith('retrospectives-soft-deleted', 1);
        });

        it('should handle errors gracefully', async () => {
            mockGetDocs.mockRejectedValue(new Error('Firestore error'));

            const result = await OptimizedRetrospectiveService.getSoftDeletedRetrospectives(mockFacilitatorId);

            expect(result).toEqual([]);
        });
    });

    describe('getRetrospectiveStats', () => {
        it('should get correct retrospective statistics', async () => {
            const mockActiveSnapshot = { size: 5 };
            const mockDeletedSnapshot = { size: 3 };

            mockGetDocs
                .mockResolvedValueOnce(mockActiveSnapshot)
                .mockResolvedValueOnce(mockDeletedSnapshot);

            const result = await OptimizedRetrospectiveService.getRetrospectiveStats(mockFacilitatorId);

            expect(result).toEqual({
                active: 5,
                softDeleted: 3,
                total: 8
            });
            expect(mockRecordRead).toHaveBeenCalledWith('retrospectives-stats', 2);
        });

        it('should handle errors gracefully', async () => {
            mockGetDocs.mockRejectedValue(new Error('Firestore error'));

            const result = await OptimizedRetrospectiveService.getRetrospectiveStats(mockFacilitatorId);

            expect(result).toEqual({
                active: 0,
                softDeleted: 0,
                total: 0
            });
        });
    });

    describe('cleanupOldSoftDeletedRetrospectives', () => {
        it('should cleanup old soft-deleted retrospectives', async () => {
            const mockQueryObj = { type: 'query' };
            const mockDocRefs = [
                { id: 'old-retro-1', ref: { id: 'old-retro-1' } },
                { id: 'old-retro-2', ref: { id: 'old-retro-2' } }
            ];
            const mockSnapshot = { docs: mockDocRefs };

            mockQuery.mockReturnValue(mockQueryObj);
            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockUpdateDoc.mockResolvedValue(undefined);

            const result = await OptimizedRetrospectiveService.cleanupOldSoftDeletedRetrospectives(90);

            expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
            expect(mockRecordWrite).toHaveBeenCalledWith('retrospectives-cleanup', 2);
            expect(result).toEqual({ cleaned: 2, errors: 0 });
        });

        it('should handle update errors gracefully', async () => {
            const mockQueryObj = { type: 'query' };
            const mockDocRefs = [
                { id: 'old-retro-1', ref: { id: 'old-retro-1' } },
                { id: 'old-retro-2', ref: { id: 'old-retro-2' } }
            ];
            const mockSnapshot = { docs: mockDocRefs };

            mockQuery.mockReturnValue(mockQueryObj);
            mockGetDocs.mockResolvedValue(mockSnapshot);
            mockUpdateDoc
                .mockResolvedValueOnce(undefined)
                .mockRejectedValueOnce(new Error('Update failed'));

            const result = await OptimizedRetrospectiveService.cleanupOldSoftDeletedRetrospectives(90);

            expect(result).toEqual({ cleaned: 1, errors: 1 });
        });
    });

    describe('Participant Count Management', () => {
        describe('incrementParticipantCount', () => {
            it('should increment participant count successfully', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);

                await OptimizedRetrospectiveService.incrementParticipantCount('retro-123');

                expect(mockDoc).toHaveBeenCalledWith(
                    expect.any(Object),
                    'retrospectives',
                    'retro-123'
                );
                expect(mockUpdateDoc).toHaveBeenCalledWith(
                    undefined,
                    expect.objectContaining({
                        participantCount: 'increment_value',
                        updatedAt: { __type: 'server_timestamp' }
                    })
                );
                expect(mockRecordWrite).toHaveBeenCalledWith(
                    'retrospectives-increment-participants',
                    1
                );
            });

            it('should handle increment errors gracefully', async () => {
                const mockError = new Error('Update failed');
                mockUpdateDoc.mockRejectedValue(mockError);

                await expect(
                    OptimizedRetrospectiveService.incrementParticipantCount('retro-123')
                ).rejects.toThrow('Could not increment participant count');

                expect(mockUpdateDoc).toHaveBeenCalled();
            });

            it('should log increment operations', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);
                const consoleSpy = vi.spyOn(console, 'log');
                consoleSpy.mockImplementation(() => { });

                await OptimizedRetrospectiveService.incrementParticipantCount('retro-123');

                expect(consoleSpy).toHaveBeenCalledWith(
                    'Participant count incremented for retrospective retro-123'
                );

                consoleSpy.mockRestore();
            });
        });

        describe('decrementParticipantCount', () => {
            it('should decrement participant count successfully', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);

                await OptimizedRetrospectiveService.decrementParticipantCount('retro-123');

                expect(mockDoc).toHaveBeenCalledWith(
                    expect.any(Object),
                    'retrospectives',
                    'retro-123'
                );
                expect(mockUpdateDoc).toHaveBeenCalledWith(
                    undefined,
                    expect.objectContaining({
                        participantCount: 'increment_value',
                        updatedAt: { __type: 'server_timestamp' }
                    })
                );
                expect(mockRecordWrite).toHaveBeenCalledWith(
                    'retrospectives-decrement-participants',
                    1
                );
            });

            it('should handle decrement errors gracefully', async () => {
                const mockError = new Error('Update failed');
                mockUpdateDoc.mockRejectedValue(mockError);

                await expect(
                    OptimizedRetrospectiveService.decrementParticipantCount('retro-123')
                ).rejects.toThrow('Could not decrement participant count');

                expect(mockUpdateDoc).toHaveBeenCalled();
            });

            it('should log decrement operations', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);
                const consoleSpy = vi.spyOn(console, 'log');
                consoleSpy.mockImplementation(() => { });

                await OptimizedRetrospectiveService.decrementParticipantCount('retro-123');

                expect(consoleSpy).toHaveBeenCalledWith(
                    'Participant count decremented for retrospective retro-123'
                );

                consoleSpy.mockRestore();
            });
        });

        describe('Integration with other services', () => {
            it('should work together with soft delete functionality', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);

                await OptimizedRetrospectiveService.softDeleteRetrospective('retro-123', 'user-123');
                await OptimizedRetrospectiveService.decrementParticipantCount('retro-123');

                expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
            });

            it('should record metrics for all participant count operations', async () => {
                mockUpdateDoc.mockResolvedValue(undefined);

                await OptimizedRetrospectiveService.incrementParticipantCount('retro-123');
                await OptimizedRetrospectiveService.decrementParticipantCount('retro-123');

                expect(mockRecordWrite).toHaveBeenCalledWith(
                    'retrospectives-increment-participants',
                    1
                );
                expect(mockRecordWrite).toHaveBeenCalledWith(
                    'retrospectives-decrement-participants',
                    1
                );
                expect(mockRecordWrite).toHaveBeenCalledTimes(2);
            });
        });
    });
});
