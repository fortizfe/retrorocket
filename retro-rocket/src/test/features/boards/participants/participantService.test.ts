import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    onSnapshot
} from 'firebase/firestore';
import {
    getActiveParticipantByUser,
    addParticipant,
    updateParticipant,
    removeParticipant,
    getParticipantsByRetrospective,
    subscribeToParticipants,
    setParticipantInactive,
    CreateParticipantInput
} from '@/features/boards/participants/services/participantService';
import { Participant } from '@/features/boards/types/participant';

// Mock Firebase dependencies
vi.mock('firebase/firestore', () => ({
    collection: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
    Timestamp: vi.fn()
}));

vi.mock('@/lib/services/firebase', () => ({
    db: { _type: 'mockDb' },
    FIRESTORE_COLLECTIONS: {
        PARTICIPANTS: 'participants'
    }
}));

describe('ParticipantService', () => {
    const mockDb = { _type: 'mockDb' };
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-123';
    const mockParticipantId = 'participant-123';

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset console.error mock
        vi.spyOn(console, 'error').mockImplementation(() => { });

        // Reset all mocks to default behavior
        (collection as Mock).mockReturnValue({ _type: 'mockCollection' });
        (doc as Mock).mockReturnValue({ _type: 'mockDocRef' });
        (query as Mock).mockReturnValue({ _type: 'mockQuery' });
        (where as Mock).mockReturnValue({ _type: 'mockWhereClause' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getActiveParticipantByUser', () => {
        it('should return active participant when found', async () => {
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            const mockSnapshot = {
                empty: false,
                docs: [
                    {
                        id: mockParticipantId,
                        data: () => ({
                            name: 'Test User',
                            userId: mockUserId,
                            retrospectiveId: mockRetrospectiveId,
                            joinedAt: mockTimestamp,
                            isActive: true
                        })
                    }
                ]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toEqual({
                id: mockParticipantId,
                name: 'Test User',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId,
                joinedAt: new Date('2024-01-01'),
                isActive: true
            });

            expect(collection).toHaveBeenCalledWith(mockDb, 'participants');
            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('userId', '==', mockUserId);
            expect(where).toHaveBeenCalledWith('isActive', '==', true);
        });

        it('should return null when no active participant found', async () => {
            const mockSnapshot = {
                empty: true,
                docs: []
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeNull();
        });

        it('should handle missing joinedAt timestamp', async () => {
            const mockSnapshot = {
                empty: false,
                docs: [
                    {
                        id: mockParticipantId,
                        data: () => ({
                            name: 'Test User',
                            userId: mockUserId,
                            retrospectiveId: mockRetrospectiveId,
                            isActive: true
                            // Missing joinedAt
                        })
                    }
                ]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toEqual({
                id: mockParticipantId,
                name: 'Test User',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId,
                joinedAt: expect.any(Date),
                isActive: true
            });
        });

        it('should handle Firebase errors gracefully', async () => {
            const firebaseError = new Error('Firebase error');
            (getDocs as Mock).mockRejectedValue(firebaseError);

            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith('Error getting active participant by user:', firebaseError);
        });

        it('should work correctly with initialized database', async () => {
            // Test that method works correctly when database is initialized
            const mockSnapshot = {
                empty: false,
                docs: [{
                    id: mockParticipantId,
                    data: () => ({
                        name: 'Test Participant',
                        userId: mockUserId,
                        retrospectiveId: mockRetrospectiveId,
                        joinedAt: { toDate: () => new Date() },
                        isActive: true
                    })
                }]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toEqual({
                id: mockParticipantId,
                name: 'Test Participant',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId,
                joinedAt: expect.any(Date),
                isActive: true
            });
        });
    });

    describe('addParticipant', () => {
        it('should add new participant when user is not already participating', async () => {
            // Mock that no existing participant is found
            (getDocs as Mock).mockResolvedValue({ empty: true, docs: [] });

            // Mock successful document creation
            const mockDocRef = { id: mockParticipantId };
            (addDoc as Mock).mockResolvedValue(mockDocRef);

            const participantInput: CreateParticipantInput = {
                name: 'New Participant',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId
            };

            const result = await addParticipant(participantInput);

            expect(result).toEqual({
                id: mockParticipantId,
                isNew: true
            });

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    name: 'New Participant',
                    userId: mockUserId,
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: { _methodName: 'serverTimestamp' },
                    isActive: true
                })
            );
        });

        it('should return existing participant when user is already participating', async () => {
            // Mock that existing participant is found
            const mockTimestamp = { toDate: () => new Date('2024-01-01') };
            const mockSnapshot = {
                empty: false,
                docs: [
                    {
                        id: 'existing-participant-123',
                        data: () => ({
                            name: 'Existing Participant',
                            userId: mockUserId,
                            retrospectiveId: mockRetrospectiveId,
                            joinedAt: mockTimestamp,
                            isActive: true
                        })
                    }
                ]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const participantInput: CreateParticipantInput = {
                name: 'New Participant',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId
            };

            const result = await addParticipant(participantInput);

            expect(result).toEqual({
                id: 'existing-participant-123',
                isNew: false
            });

            // addDoc should not be called since participant already exists
            expect(addDoc).not.toHaveBeenCalled();
        });

        it('should handle Firebase errors during participant creation', async () => {
            // Mock that no existing participant is found
            (getDocs as Mock).mockResolvedValue({ empty: true, docs: [] });

            // Mock Firebase error during creation
            const firebaseError = new Error('Creation failed');
            (addDoc as Mock).mockRejectedValue(firebaseError);

            const participantInput: CreateParticipantInput = {
                name: 'New Participant',
                userId: mockUserId,
                retrospectiveId: mockRetrospectiveId
            };

            await expect(addParticipant(participantInput))
                .rejects.toThrow('Failed to add participant');

            expect(console.error).toHaveBeenCalledWith('Error adding participant:', firebaseError);
        });
    });

    describe('updateParticipant', () => {
        it('should update participant successfully', async () => {
            (updateDoc as Mock).mockResolvedValue(undefined);

            const updates: Partial<Participant> = {
                name: 'Updated Name',
                isActive: false
            };

            await updateParticipant(mockParticipantId, updates);

            expect(doc).toHaveBeenCalledWith(mockDb, 'participants', mockParticipantId);
            expect(updateDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' }, updates);
        });

        it('should handle Firebase errors during update', async () => {
            const firebaseError = new Error('Update failed');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            const updates: Partial<Participant> = {
                name: 'Updated Name'
            };

            await expect(updateParticipant(mockParticipantId, updates))
                .rejects.toThrow('Failed to update participant');

            expect(console.error).toHaveBeenCalledWith('Error updating participant:', firebaseError);
        });
    });

    describe('removeParticipant', () => {
        it('should remove participant successfully', async () => {
            (deleteDoc as Mock).mockResolvedValue(undefined);

            await removeParticipant(mockParticipantId);

            expect(doc).toHaveBeenCalledWith(mockDb, 'participants', mockParticipantId);
            expect(deleteDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' });
        });

        it('should handle Firebase errors during removal', async () => {
            const firebaseError = new Error('Removal failed');
            (deleteDoc as Mock).mockRejectedValue(firebaseError);

            await expect(removeParticipant(mockParticipantId))
                .rejects.toThrow('Failed to remove participant');

            expect(console.error).toHaveBeenCalledWith('Error removing participant:', firebaseError);
        });
    });

    describe('getParticipantsByRetrospective', () => {
        it('should return all active participants for retrospective', async () => {
            const createMockTimestamp = (dateString: string) => ({
                toDate: () => new Date(dateString)
            });

            const mockSnapshot = {
                docs: [
                    {
                        id: 'participant-1',
                        data: () => ({
                            name: 'Participant One',
                            userId: 'user-1',
                            retrospectiveId: mockRetrospectiveId,
                            joinedAt: createMockTimestamp('2024-01-01'),
                            isActive: true
                        })
                    },
                    {
                        id: 'participant-2',
                        data: () => ({
                            name: 'Participant Two',
                            userId: 'user-2',
                            retrospectiveId: mockRetrospectiveId,
                            joinedAt: createMockTimestamp('2024-01-02'),
                            isActive: true
                        })
                    }
                ]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getParticipantsByRetrospective(mockRetrospectiveId);

            expect(result).toEqual([
                {
                    id: 'participant-1',
                    name: 'Participant One',
                    userId: 'user-1',
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: new Date('2024-01-01'),
                    isActive: true
                },
                {
                    id: 'participant-2',
                    name: 'Participant Two',
                    userId: 'user-2',
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: new Date('2024-01-02'),
                    isActive: true
                }
            ]);

            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('isActive', '==', true);
        });

        it('should handle missing timestamps gracefully', async () => {
            const mockSnapshot = {
                docs: [
                    {
                        id: 'participant-minimal',
                        data: () => ({
                            name: 'Minimal Participant',
                            userId: 'user-minimal',
                            retrospectiveId: mockRetrospectiveId,
                            isActive: true
                            // Missing joinedAt
                        })
                    }
                ]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            const result = await getParticipantsByRetrospective(mockRetrospectiveId);

            expect(result).toEqual([
                {
                    id: 'participant-minimal',
                    name: 'Minimal Participant',
                    userId: 'user-minimal',
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: expect.any(Date),
                    isActive: true
                }
            ]);
        });

        it('should handle Firebase errors', async () => {
            const firebaseError = new Error('Get participants failed');
            (getDocs as Mock).mockRejectedValue(firebaseError);

            await expect(getParticipantsByRetrospective(mockRetrospectiveId))
                .rejects.toThrow('Failed to get participants');

            expect(console.error).toHaveBeenCalledWith('Error getting participants:', firebaseError);
        });
    });

    describe('subscribeToParticipants', () => {
        const createMockTimestamp = (dateString: string) => ({
            toDate: () => new Date(dateString)
        });

        const createMockParticipantData = (overrides: any = {}) => ({
            name: 'Test Participant',
            userId: 'test-user',
            retrospectiveId: mockRetrospectiveId,
            joinedAt: createMockTimestamp('2024-01-01'),
            isActive: true,
            ...overrides
        });

        it('should subscribe to participants and handle data correctly', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            const mockSnapshot = {
                docs: [
                    {
                        id: 'participant-1',
                        data: () => createMockParticipantData({
                            name: 'Participant One',
                            userId: 'user-1'
                        })
                    }
                ]
            };

            (onSnapshot as Mock).mockImplementation((query, successCallback) => {
                successCallback(mockSnapshot);
                return mockUnsubscribe;
            });

            const unsubscribe = subscribeToParticipants(mockRetrospectiveId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith([
                {
                    id: 'participant-1',
                    name: 'Participant One',
                    userId: 'user-1',
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: new Date('2024-01-01'),
                    isActive: true
                }
            ]);

            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should handle subscription errors', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();
            const subscriptionError = new Error('Subscription failed');

            (onSnapshot as Mock).mockImplementation((query, successCallback, errorCallback) => {
                errorCallback(subscriptionError);
                return mockUnsubscribe;
            });

            subscribeToParticipants(mockRetrospectiveId, mockCallback);

            expect(console.error).toHaveBeenCalledWith('Error subscribing to participants:', subscriptionError);
        });
    });

    describe('setParticipantInactive', () => {
        it('should set participant as inactive', async () => {
            (updateDoc as Mock).mockResolvedValue(undefined);

            await setParticipantInactive(mockParticipantId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                { isActive: false }
            );
        });

        it('should handle errors during inactivation', async () => {
            const firebaseError = new Error('Inactivation failed');
            (updateDoc as Mock).mockRejectedValue(firebaseError);

            await expect(setParticipantInactive(mockParticipantId))
                .rejects.toThrow('Failed to set participant inactive');

            // Check that the error was logged from updateParticipant function
            expect(console.error).toHaveBeenCalledWith('Error updating participant:', firebaseError);
        });
    });

    describe('Database initialization check', () => {
        it('should work correctly with initialized database', async () => {
            // Test that methods work correctly when database is initialized
            const mockSnapshot = {
                empty: false,
                docs: [{
                    id: mockParticipantId,
                    data: () => ({
                        name: 'Test Participant',
                        userId: mockUserId,
                        retrospectiveId: mockRetrospectiveId,
                        joinedAt: { toDate: () => new Date() },
                        isActive: true
                    })
                }]
            };

            (getDocs as Mock).mockResolvedValue(mockSnapshot);

            // Test all methods work correctly when db is initialized
            const result = await getActiveParticipantByUser(mockRetrospectiveId, mockUserId);
            expect(result?.id).toBe(mockParticipantId);

            const mockDocRef = { id: 'new-participant-id' };
            (addDoc as Mock).mockResolvedValue(mockDocRef);

            // Clear the previous mocks and simulate no existing participant for the new user
            (getDocs as Mock).mockClear();
            (getDocs as Mock).mockResolvedValue({ empty: true, docs: [] });

            const newParticipant = await addParticipant({
                name: 'New Participant',
                userId: 'new-user',
                retrospectiveId: mockRetrospectiveId
            });
            expect(newParticipant.id).toBe('new-participant-id');
        });
    });
});
