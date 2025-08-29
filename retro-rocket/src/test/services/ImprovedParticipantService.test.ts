import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    addParticipant,
    getParticipantByUser,
    getParticipantsByRetrospective,
    subscribeToParticipants,
    removeParticipant,
    updateParticipant,
    CreateParticipantInput
} from '../../../services/participantService';

// Mock Firebase
const mockFirestore = {
    collection: vi.fn(),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    onSnapshot: vi.fn(),
    serverTimestamp: vi.fn(() => ({ seconds: 1234567890, nanoseconds: 0 }))
};

vi.mock('firebase/firestore', () => ({
    collection: mockFirestore.collection,
    addDoc: mockFirestore.addDoc,
    updateDoc: mockFirestore.updateDoc,
    deleteDoc: mockFirestore.deleteDoc,
    doc: mockFirestore.doc,
    getDocs: mockFirestore.getDocs,
    query: mockFirestore.query,
    where: mockFirestore.where,
    onSnapshot: mockFirestore.onSnapshot,
    serverTimestamp: mockFirestore.serverTimestamp
}));

vi.mock('../../../services/firebase', () => ({
    db: mockFirestore,
    FIRESTORE_COLLECTIONS: {
        PARTICIPANTS: 'participants'
    }
}));

describe('ImprovedParticipantService', () => {
    const mockRetrospectiveId = 'retro-123';
    const mockUserId = 'user-456';
    const mockParticipantId = 'participant-789';

    const mockParticipantInput: CreateParticipantInput = {
        name: 'Test User',
        userId: mockUserId,
        retrospectiveId: mockRetrospectiveId
    };

    const mockParticipantData = {
        id: mockParticipantId,
        name: 'Test User',
        userId: mockUserId,
        retrospectiveId: mockRetrospectiveId,
        joinedAt: new Date('2024-01-01T12:00:00Z'),
        photoURL: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('addParticipant', () => {
        it('should add new participant successfully', async () => {
            // Mock empty query result (no existing participant)
            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: true,
                docs: []
            });

            mockFirestore.addDoc.mockResolvedValueOnce({ id: mockParticipantId });

            const result = await addParticipant(mockParticipantInput);

            expect(result).toEqual({ id: mockParticipantId, isNew: true });
            expect(mockFirestore.addDoc).toHaveBeenCalledWith(
                expect.anything(),
                {
                    ...mockParticipantInput,
                    joinedAt: expect.anything()
                }
            );
        });

        it('should return existing participant if already exists', async () => {
            // Mock existing participant
            const mockDoc = {
                id: mockParticipantId,
                data: () => ({
                    ...mockParticipantData,
                    joinedAt: { toDate: () => mockParticipantData.joinedAt }
                })
            };

            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [mockDoc]
            });

            const result = await addParticipant(mockParticipantInput);

            expect(result).toEqual({ id: mockParticipantId, isNew: false });
            expect(mockFirestore.addDoc).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockFirestore.getDocs.mockRejectedValueOnce(new Error('Database error'));

            await expect(addParticipant(mockParticipantInput)).rejects.toThrow('Failed to add participant');
        });
    });

    describe('getParticipantByUser', () => {
        it('should return participant when found', async () => {
            const mockDoc = {
                id: mockParticipantId,
                data: () => ({
                    ...mockParticipantData,
                    joinedAt: { toDate: () => mockParticipantData.joinedAt }
                })
            };

            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [mockDoc]
            });

            const result = await getParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toEqual(mockParticipantData);
            expect(mockFirestore.query).toHaveBeenCalled();
            expect(mockFirestore.where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(mockFirestore.where).toHaveBeenCalledWith('userId', '==', mockUserId);
        });

        it('should return null when participant not found', async () => {
            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: true,
                docs: []
            });

            const result = await getParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            mockFirestore.getDocs.mockRejectedValueOnce(new Error('Database error'));

            const result = await getParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeNull();
        });
    });

    describe('getParticipantsByRetrospective', () => {
        it('should return all participants for retrospective', async () => {
            const mockDocs = [
                {
                    id: 'participant-1',
                    data: () => ({
                        name: 'User 1',
                        userId: 'user-1',
                        retrospectiveId: mockRetrospectiveId,
                        joinedAt: { toDate: () => new Date('2024-01-01T10:00:00Z') }
                    })
                },
                {
                    id: 'participant-2',
                    data: () => ({
                        name: 'User 2',
                        userId: 'user-2',
                        retrospectiveId: mockRetrospectiveId,
                        joinedAt: { toDate: () => new Date('2024-01-01T11:00:00Z') }
                    })
                }
            ];

            mockFirestore.getDocs.mockResolvedValueOnce({
                docs: mockDocs
            });

            const result = await getParticipantsByRetrospective(mockRetrospectiveId);

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('User 1');
            expect(result[1].name).toBe('User 2');

            // Verify query doesn't filter by isActive (removed functionality)
            expect(mockFirestore.where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(mockFirestore.where).not.toHaveBeenCalledWith('isActive', '==', true);
        });

        it('should handle empty result', async () => {
            mockFirestore.getDocs.mockResolvedValueOnce({
                docs: []
            });

            const result = await getParticipantsByRetrospective(mockRetrospectiveId);

            expect(result).toEqual([]);
        });

        it('should handle errors gracefully', async () => {
            mockFirestore.getDocs.mockRejectedValueOnce(new Error('Database error'));

            await expect(getParticipantsByRetrospective(mockRetrospectiveId)).rejects.toThrow('Failed to get participants');
        });
    });

    describe('subscribeToParticipants', () => {
        it('should set up subscription without isActive filter', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            mockFirestore.onSnapshot.mockReturnValueOnce(mockUnsubscribe);

            const unsubscribe = subscribeToParticipants(mockRetrospectiveId, mockCallback);

            expect(mockFirestore.query).toHaveBeenCalled();
            expect(mockFirestore.where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            // Verify isActive filter is NOT used
            expect(mockFirestore.where).not.toHaveBeenCalledWith('isActive', '==', true);
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should process snapshot data correctly', () => {
            const mockCallback = vi.fn();
            const mockDocs = [
                {
                    id: 'participant-1',
                    data: () => ({
                        name: 'User 1',
                        userId: 'user-1',
                        retrospectiveId: mockRetrospectiveId,
                        joinedAt: { toDate: () => new Date('2024-01-01T10:00:00Z') }
                    })
                }
            ];

            mockFirestore.onSnapshot.mockImplementation((query, successCallback) => {
                successCallback({ docs: mockDocs });
                return vi.fn(); // mock unsubscribe
            });

            subscribeToParticipants(mockRetrospectiveId, mockCallback);

            expect(mockCallback).toHaveBeenCalledWith([
                {
                    id: 'participant-1',
                    name: 'User 1',
                    userId: 'user-1',
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: expect.any(Date)
                }
            ]);
        });

        it('should handle subscription errors', () => {
            const mockCallback = vi.fn();
            const subscriptionError = new Error('Subscription failed');
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            mockFirestore.onSnapshot.mockImplementation((query, successCallback, errorCallback) => {
                errorCallback(subscriptionError);
                return vi.fn();
            });

            subscribeToParticipants(mockRetrospectiveId, mockCallback);

            expect(consoleSpy).toHaveBeenCalledWith('Error subscribing to participants:', subscriptionError);
            consoleSpy.mockRestore();
        });
    });

    describe('updateParticipant', () => {
        it('should update participant successfully', async () => {
            const mockDocRef = { _type: 'mockDocRef' };
            mockFirestore.doc.mockReturnValueOnce(mockDocRef);
            mockFirestore.updateDoc.mockResolvedValueOnce(undefined);

            const updates = { name: 'Updated Name' };
            await updateParticipant(mockParticipantId, updates);

            expect(mockFirestore.doc).toHaveBeenCalledWith(
                expect.anything(),
                'participants',
                mockParticipantId
            );
            expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockDocRef, updates);
        });

        it('should handle update errors gracefully', async () => {
            mockFirestore.doc.mockReturnValueOnce({ _type: 'mockDocRef' });
            mockFirestore.updateDoc.mockRejectedValueOnce(new Error('Update failed'));

            await expect(updateParticipant(mockParticipantId, { name: 'New Name' }))
                .rejects.toThrow('Failed to update participant');
        });
    });

    describe('removeParticipant', () => {
        it('should remove participant successfully', async () => {
            const mockDocRef = { _type: 'mockDocRef' };
            mockFirestore.doc.mockReturnValueOnce(mockDocRef);
            mockFirestore.deleteDoc.mockResolvedValueOnce(undefined);

            await removeParticipant(mockParticipantId);

            expect(mockFirestore.doc).toHaveBeenCalledWith(
                expect.anything(),
                'participants',
                mockParticipantId
            );
            expect(mockFirestore.deleteDoc).toHaveBeenCalledWith(mockDocRef);
        });

        it('should handle removal errors gracefully', async () => {
            mockFirestore.doc.mockReturnValueOnce({ _type: 'mockDocRef' });
            mockFirestore.deleteDoc.mockRejectedValueOnce(new Error('Delete failed'));

            await expect(removeParticipant(mockParticipantId))
                .rejects.toThrow('Failed to remove participant');
        });
    });

    describe('Legacy Function Removal', () => {
        it('should not have setParticipantInactive function', () => {
            // This test ensures the deprecated function was properly removed
            const participantService = require('../../../services/participantService');
            expect(participantService.setParticipantInactive).toBeUndefined();
        });
    });

    describe('Data Integrity', () => {
        it('should handle participants without joinedAt timestamp', async () => {
            const mockDoc = {
                id: mockParticipantId,
                data: () => ({
                    name: 'Test User',
                    userId: mockUserId,
                    retrospectiveId: mockRetrospectiveId
                    // Missing joinedAt
                })
            };

            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [mockDoc]
            });

            const result = await getParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeTruthy();
            expect(result?.joinedAt).toBeInstanceOf(Date);
        });

        it('should handle invalid timestamp data', async () => {
            const mockDoc = {
                id: mockParticipantId,
                data: () => ({
                    name: 'Test User',
                    userId: mockUserId,
                    retrospectiveId: mockRetrospectiveId,
                    joinedAt: null // Invalid timestamp
                })
            };

            mockFirestore.getDocs.mockResolvedValueOnce({
                empty: false,
                docs: [mockDoc]
            });

            const result = await getParticipantByUser(mockRetrospectiveId, mockUserId);

            expect(result).toBeTruthy();
            expect(result?.joinedAt).toBeInstanceOf(Date);
        });
    });
});
