// Mock the Firebase functions before importing the service
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(),
    Timestamp: {
        fromDate: jest.fn(),
        now: jest.fn()
    }
}));

jest.mock('@/lib/services/firebase', () => ({
    db: 'mock-db'
}));

import {
    createCard,
    updateCard,
    deleteCard,
    getCardsByRetrospective,
    subscribeToCards,
    voteCard
} from '@/features/boards/retrospective/services/cardService';
import { Card, CreateCardInput } from '@/features/boards/types/card';
import {
    addDoc,
    getDocs,
    getDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot,
    serverTimestamp,
    collection
} from 'firebase/firestore';

// Mock Firebase functions
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    doc: jest.fn(),
    getDocs: jest.fn(),
    getDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
    serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })),
    Timestamp: {
        fromDate: (date: Date) => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0, toDate: () => date }),
        now: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0, toDate: () => new Date() })
    }
}));

jest.mock('@/lib/services/firebase', () => ({
    db: {}
}));

jest.mock('@/lib/utils/constants', () => ({
    FIRESTORE_COLLECTIONS: {
        CARDS: 'cards'
    }
}));

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
    order: 1,
    ...overrides
});

const createMockCreateCardInput = (overrides: Partial<CreateCardInput> = {}): CreateCardInput => ({
    content: 'Test card content',
    column: 'helped',
    createdBy: 'test-user-id',
    retrospectiveId: 'test-retro-id',
    ...overrides
});

describe('CardService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Configure collection mock to return a collection reference
        (collection as jest.Mock).mockReturnValue('mock-collection-ref');
        
        // Configure doc mock
        (doc as jest.Mock).mockReturnValue('mock-doc-ref');
        
        // Configure serverTimestamp mock
        (serverTimestamp as jest.Mock).mockReturnValue({
            seconds: 1234567890,
            nanoseconds: 0
        });
        
        // Configure getDocs mock with proper toDate functions
        (getDocs as jest.Mock).mockResolvedValue({
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
        (query as jest.Mock).mockReturnValue('mock-query');
        (where as jest.Mock).mockReturnValue('mock-query');
        (orderBy as jest.Mock).mockReturnValue('mock-query');
    });

    describe('createCard', () => {
        it('should create a new card with correct data structure', async () => {
            const mockDocRef = { id: 'new-card-id' };
            (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

            const cardInput = createMockCreateCardInput();
            const result = await createCard(cardInput);

            expect(addDoc).toHaveBeenCalledWith(
                expect.anything(), // collection reference
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
            (addDoc as jest.Mock).mockRejectedValue(error);

            const cardInput = createMockCreateCardInput();

            await expect(createCard(cardInput)).rejects.toThrow('Failed to create card');
        });

        it('should include server timestamp for creation', async () => {
            const mockDocRef = { id: 'new-card-id' };
            (addDoc as jest.Mock).mockResolvedValue(mockDocRef);
            (serverTimestamp as jest.Mock).mockReturnValue({ _seconds: 1234567890 });

            const cardInput = createMockCreateCardInput();
            await createCard(cardInput);

            expect(serverTimestamp).toHaveBeenCalledTimes(2); // createdAt and updatedAt
        });
    });

    describe('getCardsByRetrospective', () => {
        it('should retrieve cards for a retrospective', async () => {
            const mockCards = [
                createMockCard({ id: 'card-1', content: 'Card 1' }),
                createMockCard({ id: 'card-2', content: 'Card 2' })
            ];

            const mockDoc1 = {
                id: 'card-1',
                data: () => ({ ...mockCards[0], createdAt: { toDate: () => mockCards[0].createdAt } }),
                exists: () => true
            };
            const mockDoc2 = {
                id: 'card-2',
                data: () => ({ ...mockCards[1], createdAt: { toDate: () => mockCards[1].createdAt } }),
                exists: () => true
            };

            const mockSnapshot = {
                docs: [mockDoc1, mockDoc2]
            };

            (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);
            (query as jest.Mock).mockReturnValue('mock-query');
            (where as jest.Mock).mockReturnValue('mock-where');
            (orderBy as jest.Mock).mockReturnValue('mock-orderBy');

            const result = await getCardsByRetrospective('test-retro-id');

            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', 'test-retro-id');
            expect(orderBy).toHaveBeenCalledWith('order', 'asc');
            expect(result).toHaveLength(2);
            expect(result[0].content).toBe('Card 1');
            expect(result[1].content).toBe('Card 2');
        });

        it('should return empty array when no cards found', async () => {
            const mockSnapshot = { docs: [] };
            (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

            const result = await getCardsByRetrospective('nonexistent-retro');

            expect(result).toEqual([]);
        });
    });

    describe('updateCard', () => {
        it('should update card with new data and timestamp', async () => {
            (updateDoc as jest.Mock).mockResolvedValue(undefined);
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');

            const updateData = { content: 'Updated content', votes: 5 };
            await updateCard('card-id', updateData);

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'cards', 'card-id');
            expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                ...updateData,
                updatedAt: expect.anything()
            });
        });

        it('should handle update errors', async () => {
            const error = new Error('Update failed');
            (updateDoc as jest.Mock).mockRejectedValue(error);

            await expect(updateCard('card-id', { content: 'New content' }))
                .rejects.toThrow('Failed to update card');
        });
    });

    describe('deleteCard', () => {
        it('should delete card by id', async () => {
            (deleteDoc as jest.Mock).mockResolvedValue(undefined);
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');

            await deleteCard('card-id');

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'cards', 'card-id');
            expect(deleteDoc).toHaveBeenCalledWith('mock-doc-ref');
        });

        it('should handle deletion errors', async () => {
            const error = new Error('Deletion failed');
            (deleteDoc as jest.Mock).mockRejectedValue(error);

            await expect(deleteCard('card-id')).rejects.toThrow('Failed to delete card');
        });
    });

    describe('subscribeToCards', () => {
        it('should set up real-time subscription', () => {
            const mockCallback = jest.fn();
            const mockUnsubscribe = jest.fn();
            (onSnapshot as jest.Mock).mockReturnValue(mockUnsubscribe);

            const unsubscribe = subscribeToCards('retro-id', mockCallback);

            expect(onSnapshot).toHaveBeenCalledWith(
                expect.anything(), // query
                expect.any(Function), // callback
                expect.any(Function) // error callback
            );
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should process snapshot data correctly in subscription', () => {
            const mockCallback = jest.fn();
            let snapshotCallback: Function | undefined;

            (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
                snapshotCallback = callback;
                return jest.fn();
            });

            subscribeToCards('retro-id', mockCallback);

            // Simulate snapshot callback
            const mockSnapshot = {
                docs: [
                    {
                        id: 'card-1',
                        data: () => ({
                            content: 'Card 1',
                            column: 'helped',
                            createdAt: { toDate: () => new Date('2023-01-01') }
                        })
                    }
                ]
            };

            if (snapshotCallback) {
                snapshotCallback(mockSnapshot);
            }

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'card-1',
                    content: 'Card 1',
                    column: 'helped'
                })
            ]);
        });
    });

    describe('voteCard', () => {
        it('should increment card votes', async () => {
            (updateDoc as jest.Mock).mockResolvedValue(undefined);
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (getDoc as jest.Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({ votes: 5 })
            });

            await voteCard('card-id', true);

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'cards', 'card-id');
            expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
            expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                votes: 6,
                updatedAt: expect.anything()
            });
        });

        it('should decrement card votes', async () => {
            (updateDoc as jest.Mock).mockResolvedValue(undefined);
            (doc as jest.Mock).mockReturnValue('mock-doc-ref');
            (getDoc as jest.Mock).mockResolvedValue({
                exists: () => true,
                data: () => ({ votes: 5 })
            });

            await voteCard('card-id', false);

            expect(doc).toHaveBeenCalledWith(expect.anything(), 'cards', 'card-id');
            expect(getDoc).toHaveBeenCalledWith('mock-doc-ref');
            expect(updateDoc).toHaveBeenCalledWith('mock-doc-ref', {
                votes: 4,
                updatedAt: expect.anything()
            });
        });

        it('should handle voting errors', async () => {
            const error = new Error('Vote failed');
            (updateDoc as jest.Mock).mockRejectedValue(error);

            await expect(voteCard('card-id', true)).rejects.toThrow('Failed to vote card');
        });
    });
});
