import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
    collection,
    addDoc,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    where,
    getDocs
} from 'firebase/firestore';
import {
    createRetrospective,
    getRetrospective,
    updateRetrospective,
    deleteRetrospective,
    subscribeToRetrospective,
    incrementParticipantCount,
    decrementParticipantCount,
    joinRetrospectiveById,
    deleteRetrospectiveCompletely,
    CreateRetrospectiveInput
} from '../../services/retrospectiveService';
import { Retrospective } from '../../types/retrospective';

// Mock Firebase functions
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    increment: vi.fn((value: number) => ({ _methodName: 'increment', _value: value })),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn()
}));

// Mock Firebase config
vi.mock('../../services/firebase', () => ({
    db: { _type: 'mockDb' },
    FIRESTORE_COLLECTIONS: {
        RETROSPECTIVES: 'retrospectives',
        PARTICIPANTS: 'participants'
    }
}));

// Mock console methods
beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('RetrospectiveService', () => {
    const mockDb = { _type: 'mockDb' };
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-456';
    const mockUserName = 'Test User';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset all mocks to default behavior
        (collection as Mock).mockReturnValue({ _type: 'mockCollection' });
        (doc as Mock).mockReturnValue({ _type: 'mockDocRef' });
        (query as Mock).mockReturnValue({ _type: 'mockQuery' });
        (where as Mock).mockReturnValue({ _type: 'mockWhereClause' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createRetrospective', () => {
        it('should create a new retrospective successfully', async () => {
            const mockDocRef = { id: mockRetrospectiveId };
            (addDoc as Mock).mockResolvedValue(mockDocRef);

            const retrospectiveInput: CreateRetrospectiveInput = {
                title: 'Sprint Retrospective',
                description: 'Q1 Sprint Review',
                createdBy: mockUserId,
                createdByName: mockUserName
            };

            const result = await createRetrospective(retrospectiveInput);

            expect(result).toBe(mockRetrospectiveId);
            expect(collection).toHaveBeenCalledWith(mockDb, 'retrospectives');
            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    title: 'Sprint Retrospective',
                    description: 'Q1 Sprint Review',
                    createdBy: mockUserId,
                    createdByName: mockUserName,
                    createdAt: { _methodName: 'serverTimestamp' },
                    updatedAt: { _methodName: 'serverTimestamp' },
                    participantCount: 0,
                    isActive: true
                })
            );
        });

        it('should create retrospective with minimal data', async () => {
            const mockDocRef = { id: mockRetrospectiveId };
            (addDoc as Mock).mockResolvedValue(mockDocRef);

            const retrospectiveInput: CreateRetrospectiveInput = {
                title: 'Simple Retro'
            };

            const result = await createRetrospective(retrospectiveInput);

            expect(result).toBe(mockRetrospectiveId);
            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    title: 'Simple Retro',
                    participantCount: 0,
                    isActive: true
                })
            );
        });

        it('should handle Firebase errors during creation', async () => {
            const firebaseError = new Error('Firebase creation failed');
            (addDoc as Mock).mockRejectedValue(firebaseError);

            const retrospectiveInput: CreateRetrospectiveInput = {
                title: 'Test Retrospective'
            };

            await expect(createRetrospective(retrospectiveInput))
                .rejects.toThrow('Could not create retrospective');

            expect(console.error).toHaveBeenCalledWith('Error creating retrospective: ', firebaseError);
        });
    });

    describe('getRetrospective', () => {
        it('should retrieve retrospective successfully', async () => {
            const mockTimestamp = {
                toDate: () => new Date('2024-01-01')
            };

            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    title: 'Test Retrospective',
                    description: 'Test Description',
                    createdBy: mockUserId,
                    createdByName: mockUserName,
                    createdAt: mockTimestamp,
                    updatedAt: mockTimestamp,
                    participantCount: 5,
                    isActive: true
                })
            };

            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            const result = await getRetrospective(mockRetrospectiveId);

            expect(result).toEqual({
                id: mockRetrospectiveId,
                title: 'Test Retrospective',
                description: 'Test Description',
                createdBy: mockUserId,
                createdByName: mockUserName,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01'),
                participantCount: 5,
                isActive: true
            });

            expect(doc).toHaveBeenCalledWith(mockDb, 'retrospectives', mockRetrospectiveId);
            expect(getDoc).toHaveBeenCalled();
        });

        it('should return null when retrospective does not exist', async () => {
            const mockDocSnap = {
                exists: () => false
            };

            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            const result = await getRetrospective(mockRetrospectiveId);

            expect(result).toBeNull();
        });

        it('should handle missing timestamps gracefully', async () => {
            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    title: 'Test Retrospective',
                    createdBy: mockUserId,
                    participantCount: 0,
                    isActive: true
                    // Missing createdAt and updatedAt
                })
            };

            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            const result = await getRetrospective(mockRetrospectiveId);

            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(result?.updatedAt).toBeInstanceOf(Date);
        });

        it('should handle Firebase errors during retrieval', async () => {
            const firebaseError = new Error('Firebase fetch failed');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(getRetrospective(mockRetrospectiveId))
                .rejects.toThrow('Could not fetch retrospective');

            expect(console.error).toHaveBeenCalledWith('Error fetching retrospective: ', firebaseError);
        });
    });

    describe('updateRetrospective', () => {
        it('should update retrospective successfully', async () => {
            (updateDoc as Mock).mockResolvedValue(undefined);

            const updates: Partial<Retrospective> = {
                title: 'Updated Title',
                description: 'Updated Description',
                isActive: false
            };

            await updateRetrospective(mockRetrospectiveId, updates);

            expect(doc).toHaveBeenCalledWith(mockDb, 'retrospectives', mockRetrospectiveId);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    title: 'Updated Title',
                    description: 'Updated Description',
                    isActive: false,
                    updatedAt: { _methodName: 'serverTimestamp' }
                })
            );
        });

        it('should handle Firebase errors during update', async () => {
            const firebaseError = new Error('Firebase update failed');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            const updates: Partial<Retrospective> = {
                title: 'Updated Title'
            };

            await expect(updateRetrospective(mockRetrospectiveId, updates))
                .rejects.toThrow('Could not update retrospective');

            expect(console.error).toHaveBeenCalledWith('Error updating retrospective: ', firebaseError);
        });
    });

    describe('deleteRetrospective', () => {
        it('should delete retrospective successfully', async () => {
            (deleteDoc as Mock).mockResolvedValue(undefined);

            await deleteRetrospective(mockRetrospectiveId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'retrospectives', mockRetrospectiveId);
            expect(deleteDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' });
        });

        it('should handle Firebase errors during deletion', async () => {
            const firebaseError = new Error('Firebase delete failed');
            (deleteDoc as Mock).mockRejectedValue(firebaseError);

            await expect(deleteRetrospective(mockRetrospectiveId))
                .rejects.toThrow('Could not delete retrospective');

            expect(console.error).toHaveBeenCalledWith('Error deleting retrospective: ', firebaseError);
        });
    });

    describe('subscribeToRetrospective', () => {
        const createMockTimestamp = (dateString: string) => ({
            toDate: () => new Date(dateString)
        });

        it('should subscribe to retrospective and handle data correctly', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            const mockSnapshot = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    title: 'Live Retrospective',
                    description: 'Real-time updates',
                    createdBy: mockUserId,
                    createdAt: createMockTimestamp('2024-01-01'),
                    updatedAt: createMockTimestamp('2024-01-02'),
                    participantCount: 3,
                    isActive: true
                })
            };

            (onSnapshot as Mock).mockImplementation((docRef, successCallback) => {
                successCallback(mockSnapshot);
                return mockUnsubscribe;
            });

            const unsubscribe = subscribeToRetrospective(mockRetrospectiveId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith({
                id: mockRetrospectiveId,
                title: 'Live Retrospective',
                description: 'Real-time updates',
                createdBy: mockUserId,
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-02'),
                participantCount: 3,
                isActive: true
            });

            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should handle retrospective not found', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            const mockSnapshot = {
                exists: () => false
            };

            (onSnapshot as Mock).mockImplementation((docRef, successCallback) => {
                successCallback(mockSnapshot);
                return mockUnsubscribe;
            });

            subscribeToRetrospective(mockRetrospectiveId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith(null);
        });

        it('should handle subscription errors', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();
            const subscriptionError = new Error('Subscription failed');

            (onSnapshot as Mock).mockImplementation((docRef, successCallback, errorCallback) => {
                errorCallback(subscriptionError);
                return mockUnsubscribe;
            });

            subscribeToRetrospective(mockRetrospectiveId, mockCallback);

            expect(console.error).toHaveBeenCalledWith('Error subscribing to retrospective:', subscriptionError);
            expect(mockCallback).toHaveBeenCalledWith(null);
        });
    });

    describe('incrementParticipantCount', () => {
        it('should increment participant count successfully', async () => {
            (updateDoc as Mock).mockResolvedValue(undefined);

            await incrementParticipantCount(mockRetrospectiveId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'retrospectives', mockRetrospectiveId);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    participantCount: { _methodName: 'increment', _value: 1 },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle Firebase errors during increment', async () => {
            const firebaseError = new Error('Firebase increment failed');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            await expect(incrementParticipantCount(mockRetrospectiveId))
                .rejects.toThrow('Could not update participant count');

            expect(console.error).toHaveBeenCalledWith('Error incrementing participant count: ', firebaseError);
        });
    });

    describe('decrementParticipantCount', () => {
        it('should decrement participant count successfully', async () => {
            (updateDoc as Mock).mockResolvedValue(undefined);

            await decrementParticipantCount(mockRetrospectiveId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'retrospectives', mockRetrospectiveId);
            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                {
                    participantCount: { _methodName: 'increment', _value: -1 },
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle Firebase errors during decrement', async () => {
            const firebaseError = new Error('Firebase decrement failed');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            await expect(decrementParticipantCount(mockRetrospectiveId))
                .rejects.toThrow('Could not update participant count');

            expect(console.error).toHaveBeenCalledWith('Error decrementing participant count: ', firebaseError);
        });
    });

    describe('joinRetrospectiveById', () => {
        it('should join active retrospective successfully', async () => {
            const mockRetrospective: Retrospective = {
                id: mockRetrospectiveId,
                title: 'Test Retrospective',
                createdBy: 'facilitator-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 2,
                isActive: true
            };

            const createdAtConverter = { toDate: () => mockRetrospective.createdAt };
            const updatedAtConverter = { toDate: () => mockRetrospective.updatedAt };

            // Mock getRetrospective
            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    ...mockRetrospective,
                    createdAt: createdAtConverter,
                    updatedAt: updatedAtConverter
                })
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            // Mock participants query - user not already participating
            const mockParticipantsSnapshot = {
                empty: true,
                docs: []
            };
            (getDocs as Mock).mockResolvedValue(mockParticipantsSnapshot);

            const result = await joinRetrospectiveById(mockRetrospectiveId, mockUserId, mockUserName);

            expect(result).toEqual(mockRetrospective);
            expect(query).toHaveBeenCalled();
            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('userId', '==', mockUserId);
        });

        it('should return retrospective when user is already a participant', async () => {
            const mockRetrospective: Retrospective = {
                id: mockRetrospectiveId,
                title: 'Test Retrospective',
                createdBy: 'facilitator-123',
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 2,
                isActive: true
            };

            const createdAtConverter = { toDate: () => mockRetrospective.createdAt };
            const updatedAtConverter = { toDate: () => mockRetrospective.updatedAt };

            // Mock getRetrospective
            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    ...mockRetrospective,
                    createdAt: createdAtConverter,
                    updatedAt: updatedAtConverter
                })
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            // Mock participants query - user already participating
            const mockParticipantsSnapshot = {
                empty: false,
                docs: [{ id: 'participant-123' }]
            };
            (getDocs as Mock).mockResolvedValue(mockParticipantsSnapshot);

            const result = await joinRetrospectiveById(mockRetrospectiveId, mockUserId, mockUserName);

            expect(result).toEqual(mockRetrospective);
        });

        it('should throw error when retrospective does not exist', async () => {
            const mockDocSnap = {
                exists: () => false
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            await expect(joinRetrospectiveById(mockRetrospectiveId, mockUserId, mockUserName))
                .rejects.toThrow('El tablero especificado no existe o no está disponible');
        });

        it('should throw error when retrospective is not active', async () => {
            const mockDate = new Date();
            const createdAtConverter = { toDate: () => mockDate };
            const updatedAtConverter = { toDate: () => mockDate };

            const mockRetrospective = {
                id: mockRetrospectiveId,
                title: 'Inactive Retrospective',
                isActive: false,
                createdAt: createdAtConverter,
                updatedAt: updatedAtConverter
            };

            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => mockRetrospective
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            await expect(joinRetrospectiveById(mockRetrospectiveId, mockUserId, mockUserName))
                .rejects.toThrow('Este tablero ya no está activo');
        });

        it('should handle Firebase errors during join', async () => {
            const firebaseError = new Error('Firebase join failed');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(joinRetrospectiveById(mockRetrospectiveId, mockUserId, mockUserName))
                .rejects.toThrow('Could not fetch retrospective');

            // The error is first logged from getRetrospective, then from joinRetrospectiveById
            expect(console.error).toHaveBeenCalledWith('Error fetching retrospective: ', firebaseError);
        });
    });

    describe('deleteRetrospectiveCompletely', () => {
        it('should delete retrospective completely when user is owner', async () => {
            const mockRetrospective: Retrospective = {
                id: mockRetrospectiveId,
                title: 'Test Retrospective',
                createdBy: mockUserId, // User is the owner
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 2,
                isActive: true
            };

            const createdAtConverter = { toDate: () => mockRetrospective.createdAt };
            const updatedAtConverter = { toDate: () => mockRetrospective.updatedAt };

            // Mock getRetrospective
            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    ...mockRetrospective,
                    createdAt: createdAtConverter,
                    updatedAt: updatedAtConverter
                })
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            // Mock participants query
            const mockParticipantsSnapshot = {
                docs: [
                    { ref: { _type: 'participantDocRef1' } },
                    { ref: { _type: 'participantDocRef2' } }
                ]
            };
            (getDocs as Mock).mockResolvedValueOnce(mockParticipantsSnapshot);

            // Mock cards query
            const mockCardsSnapshot = {
                docs: [
                    { ref: { _type: 'cardDocRef1' } },
                    { ref: { _type: 'cardDocRef2' } }
                ]
            };
            (getDocs as Mock).mockResolvedValueOnce(mockCardsSnapshot);

            // Mock delete operations
            (deleteDoc as Mock).mockResolvedValue(undefined);

            await deleteRetrospectiveCompletely(mockRetrospectiveId, mockUserId);

            // Verify all delete operations were called
            expect(deleteDoc).toHaveBeenCalledTimes(5); // 2 participants + 2 cards + 1 retrospective
        });

        it('should throw error when user is not the owner', async () => {
            const mockRetrospective: Retrospective = {
                id: mockRetrospectiveId,
                title: 'Test Retrospective',
                createdBy: 'different-user-123', // Different user is the owner
                createdAt: new Date(),
                updatedAt: new Date(),
                participantCount: 2,
                isActive: true
            };

            const createdAtConverter = { toDate: () => mockRetrospective.createdAt };
            const updatedAtConverter = { toDate: () => mockRetrospective.updatedAt };

            const mockDocSnap = {
                exists: () => true,
                id: mockRetrospectiveId,
                data: () => ({
                    ...mockRetrospective,
                    createdAt: createdAtConverter,
                    updatedAt: updatedAtConverter
                })
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            await expect(deleteRetrospectiveCompletely(mockRetrospectiveId, mockUserId))
                .rejects.toThrow('You can only delete retrospectives you created');
        });

        it('should throw error when retrospective does not exist', async () => {
            const mockDocSnap = {
                exists: () => false
            };
            (getDoc as Mock).mockResolvedValue(mockDocSnap);

            await expect(deleteRetrospectiveCompletely(mockRetrospectiveId, mockUserId))
                .rejects.toThrow('Retrospective not found');
        });

        it('should handle Firebase errors during complete deletion', async () => {
            const firebaseError = new Error('Firebase deletion failed');
            (getDoc as Mock).mockRejectedValue(firebaseError);

            await expect(deleteRetrospectiveCompletely(mockRetrospectiveId, mockUserId))
                .rejects.toThrow('Could not fetch retrospective');

            // The error is first logged from getRetrospective, then from deleteRetrospectiveCompletely
            expect(console.error).toHaveBeenCalledWith('Error fetching retrospective: ', firebaseError);
        });
    });

    describe('Database initialization check', () => {
        it('should work correctly with initialized database', async () => {
            // Test that methods work correctly when database is initialized
            const mockDocRef = { id: mockRetrospectiveId };
            (addDoc as Mock).mockResolvedValue(mockDocRef);

            const retrospectiveInput: CreateRetrospectiveInput = {
                title: 'Test Retrospective'
            };

            // Test createRetrospective works
            const result = await createRetrospective(retrospectiveInput);
            expect(result).toBe(mockRetrospectiveId);

            // Test updateRetrospective works
            (updateDoc as Mock).mockResolvedValue(undefined);
            await updateRetrospective(mockRetrospectiveId, { title: 'Updated Title' });
            expect(updateDoc).toHaveBeenCalled();

            // Test deleteRetrospective works
            (deleteDoc as Mock).mockResolvedValue(undefined);
            await deleteRetrospective(mockRetrospectiveId);
            expect(deleteDoc).toHaveBeenCalled();
        });
    });
});
