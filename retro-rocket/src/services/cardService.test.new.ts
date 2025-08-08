// Mock the Firebase functions before importing anything
const mockCollection = jest.fn().mockReturnValue('mock-collection-ref');
const mockAddDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });
const mockUpdateDoc = jest.fn().mockResolvedValue(undefined);
const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);
const mockDoc = jest.fn().mockReturnValue('mock-doc-ref');
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockQuery = jest.fn().mockReturnValue('mock-query');
const mockWhere = jest.fn().mockReturnValue('mock-query');
const mockOrderBy = jest.fn().mockReturnValue('mock-query');
const mockOnSnapshot = jest.fn();
const mockServerTimestamp = jest.fn().mockReturnValue({
    seconds: 1234567890,
    nanoseconds: 0
});

jest.mock('firebase/firestore', () => ({
    collection: mockCollection,
    addDoc: mockAddDoc,
    updateDoc: mockUpdateDoc,
    deleteDoc: mockDeleteDoc,
    doc: mockDoc,
    getDocs: mockGetDocs,
    getDoc: mockGetDoc,
    query: mockQuery,
    where: mockWhere,
    orderBy: mockOrderBy,
    onSnapshot: mockOnSnapshot,
    serverTimestamp: mockServerTimestamp,
    Timestamp: {
        fromDate: jest.fn(),
        now: jest.fn()
    }
}));

jest.mock('./firebase', () => ({
    db: 'mock-db'
}));

jest.mock('../utils/constants', () => ({
    FIRESTORE_COLLECTIONS: {
        CARDS: 'cards'
    }
}));

// Now import the service and types
import {
    createCard,
    updateCard,
    deleteCard,
    getCardsByRetrospective,
    subscribeToCards,
    voteCard
} from './cardService';
import { Card, CreateCardInput } from '../types/card';

// Helper function to create mock card input
const createMockCreateCardInput = (): CreateCardInput => ({
    content: 'Test card content',
    column: 'helped',
    retrospectiveId: 'test-retro-id',
    createdBy: 'test-user-id'
});

// Helper function to create mock card data
const createMockCard = (overrides: Partial<Card> = {}): Card => ({
    id: 'test-card-1',
    content: 'Test card content',
    column: 'helped',
    votes: 0,
    likes: [],
    reactions: [],
    createdBy: 'test-user-id',
    retrospectiveId: 'test-retro-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 1234567890,
    ...overrides
});

describe('CardService', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Configure default mock behaviors
        mockCollection.mockReturnValue('mock-collection-ref');
        mockDoc.mockReturnValue('mock-doc-ref');
        mockServerTimestamp.mockReturnValue({
            seconds: 1234567890,
            nanoseconds: 0
        });

        // Configure getDocs mock with proper toDate functions
        mockGetDocs.mockResolvedValue({
            docs: [{
                id: 'mock-card-id',
                data: () => ({
                    content: 'Test card',
                    column: 'helped',
                    votes: 0,
                    likes: [],
                    reactions: [],
                    order: 1234567890,
                    retrospectiveId: 'test-retro-id',
                    createdBy: 'test-user-id',
                    createdAt: {
                        toDate: () => new Date('2023-01-01')
                    },
                    updatedAt: {
                        toDate: () => new Date('2023-01-01')
                    }
                })
            }],
            empty: false
        });

        // Configure query mock
        mockQuery.mockReturnValue('mock-query');
        mockWhere.mockReturnValue('mock-query');
        mockOrderBy.mockReturnValue('mock-query');

        // Configure getDoc mock
        mockGetDoc.mockResolvedValue({
            exists: () => true,
            data: () => ({
                votes: 5,
                content: 'Test card'
            })
        });

        // Configure onSnapshot mock
        mockOnSnapshot.mockImplementation((query, callback, errorCallback) => {
            // Simulate snapshot callback
            setTimeout(() => {
                callback({
                    docs: [{
                        id: 'mock-card-id',
                        data: () => ({
                            content: 'Test card',
                            column: 'helped',
                            votes: 0,
                            likes: [],
                            reactions: [],
                            order: 1234567890,
                            retrospectiveId: 'test-retro-id',
                            createdBy: 'test-user-id',
                            createdAt: {
                                toDate: () => new Date('2023-01-01')
                            },
                            updatedAt: {
                                toDate: () => new Date('2023-01-01')
                            }
                        })
                    }]
                });
            }, 0);

            // Return unsubscribe function
            return jest.fn();
        });
    });

    describe('createCard', () => {
        it('should create a new card with correct data structure', async () => {
            const mockDocRef = { id: 'new-card-id' };
            mockAddDoc.mockResolvedValue(mockDocRef);

            const cardInput = createMockCreateCardInput();
            const result = await createCard(cardInput);

            expect(mockAddDoc).toHaveBeenCalledWith(
                'mock-collection-ref', // collection reference
                {
                    ...cardInput,
                    createdAt: expect.anything(),
                    updatedAt: expect.anything(),
                    votes: 0,
                    likes: [],
                    reactions: [],
                    order: expect.any(Number)
                }
            );
            expect(result).toBe('new-card-id');
        });

        it('should handle creation errors gracefully', async () => {
            const error = new Error('Firebase error');
            mockAddDoc.mockRejectedValue(error);

            const cardInput = createMockCreateCardInput();

            await expect(createCard(cardInput)).rejects.toThrow('Failed to create card');
        });

        it('should include server timestamp for creation', async () => {
            const mockDocRef = { id: 'new-card-id' };
            mockAddDoc.mockResolvedValue(mockDocRef);
            mockServerTimestamp.mockReturnValue({ _seconds: 1234567890 });

            const cardInput = createMockCreateCardInput();
            await createCard(cardInput);

            expect(mockServerTimestamp).toHaveBeenCalledTimes(2); // createdAt and updatedAt
        });
    });

    describe('getCardsByRetrospective', () => {
        it('should retrieve cards for a retrospective', async () => {
            const mockCards = [
                createMockCard({ id: 'card-1', content: 'Card 1' }),
                createMockCard({ id: 'card-2', content: 'Card 2' })
            ];

            mockGetDocs.mockResolvedValue({
                docs: [
                    {
                        id: 'card-1',
                        data: () => ({ ...mockCards[0], createdAt: { toDate: () => mockCards[0].createdAt } }),
                    },
                    {
                        id: 'card-2',
                        data: () => ({ ...mockCards[1], createdAt: { toDate: () => mockCards[1].createdAt } }),
                    }
                ]
            });

            const result = await getCardsByRetrospective('test-retro-id');

            expect(mockQuery).toHaveBeenCalled();
            expect(mockWhere).toHaveBeenCalledWith('retrospectiveId', '==', 'test-retro-id');
            expect(result).toHaveLength(2);
            expect(result[0]).toEqual(
                expect.objectContaining({
                    id: 'card-1',
                    content: 'Card 1',
                    column: 'helped'
                })
            );
        });

        it('should return empty array when no cards found', async () => {
            mockGetDocs.mockResolvedValue({
                docs: []
            });

            const result = await getCardsByRetrospective('non-existent-retro');

            expect(result).toEqual([]);
        });
    });

    describe('updateCard', () => {
        it('should update card with new data and timestamp', async () => {
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref');

            const updateData = { content: 'Updated content', votes: 5 };
            await updateCard('card-id', updateData);

            expect(mockDoc).toHaveBeenCalledWith('mock-db', 'cards', 'card-id');
            expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                ...updateData,
                updatedAt: expect.anything()
            });
        });

        it('should handle update errors', async () => {
            const error = new Error('Update failed');
            mockUpdateDoc.mockRejectedValue(error);

            await expect(updateCard('card-id', { content: 'New content' }))
                .rejects.toThrow('Failed to update card');
        });
    });

    describe('deleteCard', () => {
        it('should delete card by id', async () => {
            mockDeleteDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref');

            await deleteCard('card-id');

            expect(mockDoc).toHaveBeenCalledWith('mock-db', 'cards', 'card-id');
            expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
        });

        it('should handle deletion errors', async () => {
            const error = new Error('Deletion failed');
            mockDeleteDoc.mockRejectedValue(error);

            await expect(deleteCard('card-id')).rejects.toThrow('Failed to delete card');
        });
    });

    describe('subscribeToCards', () => {
        it('should set up real-time subscription', () => {
            const mockCallback = jest.fn();
            const mockUnsubscribe = jest.fn();
            mockOnSnapshot.mockReturnValue(mockUnsubscribe);

            const unsubscribe = subscribeToCards('retro-id', mockCallback);

            expect(mockOnSnapshot).toHaveBeenCalledWith(
                'mock-query', // query
                expect.any(Function), // callback
                expect.any(Function) // error callback
            );
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should process snapshot data correctly in subscription', () => {
            const mockCallback = jest.fn();
            let snapshotCallback: Function | undefined;

            mockOnSnapshot.mockImplementation((query, callback, errorCallback) => {
                snapshotCallback = callback;
                return jest.fn();
            });

            subscribeToCards('retro-id', mockCallback);

            // Simulate snapshot data
            const mockSnapshot = {
                docs: [{
                    id: 'card-1',
                    data: () => ({
                        content: 'Test card',
                        column: 'helped',
                        votes: 0,
                        createdAt: { toDate: () => new Date('2023-01-01') }
                    })
                }]
            };

            if (snapshotCallback) {
                snapshotCallback(mockSnapshot);
            }

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'card-1',
                    content: 'Test card',
                    column: 'helped'
                })
            ]);
        });
    });

    describe('voteCard', () => {
        it('should increment card votes', async () => {
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref');
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ votes: 5 })
            });

            await voteCard('card-id', true);

            expect(mockDoc).toHaveBeenCalledWith('mock-db', 'cards', 'card-id');
            expect(mockGetDoc).toHaveBeenCalledWith('mock-doc-ref');
            expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                votes: 6,
                updatedAt: expect.anything()
            });
        });

        it('should decrement card votes', async () => {
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref');
            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => ({ votes: 5 })
            });

            await voteCard('card-id', false);

            expect(mockDoc).toHaveBeenCalledWith('mock-db', 'cards', 'card-id');
            expect(mockGetDoc).toHaveBeenCalledWith('mock-doc-ref');
            expect(mockUpdateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                votes: 4,
                updatedAt: expect.anything()
            });
        });

        it('should handle voting errors', async () => {
            const error = new Error('Vote failed');
            mockUpdateDoc.mockRejectedValue(error);

            await expect(voteCard('card-id', true)).rejects.toThrow('Failed to vote card');
        });
    });
});
