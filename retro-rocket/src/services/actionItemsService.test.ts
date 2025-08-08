import { ActionItemsService } from './actionItemsService';
import {
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    collection,
    query,
    where,
    orderBy,
    doc
} from 'firebase/firestore';

// Mock Firebase
jest.mock('./firebase', () => ({
    db: {
        collection: jest.fn(),
        doc: jest.fn(),
    }
}));

jest.mock('firebase/firestore', () => ({
    addDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    onSnapshot: jest.fn(),
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    doc: jest.fn(),
    serverTimestamp: jest.fn(() => new Date()),
}));

describe('ActionItemsService', () => {
    const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>;
    const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
    const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>;
    const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>;
    const mockCollection = collection as jest.MockedFunction<typeof collection>;
    const mockQuery = query as jest.MockedFunction<typeof query>;
    const mockWhere = where as jest.MockedFunction<typeof where>;
    const mockOrderBy = orderBy as jest.MockedFunction<typeof orderBy>;
    const mockDoc = doc as jest.MockedFunction<typeof doc>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createActionItem', () => {
        it('should create action item successfully', async () => {
            const mockDocRef = { id: 'new-action-item-id' };
            mockAddDoc.mockResolvedValue(mockDocRef as any);

            const actionItemInput = {
                content: 'Test action item',
                assignedTo: 'user-id',
                assignedToName: 'Test User',
                status: 'pending' as const,
                createdBy: 'creator-id',
                retrospectiveId: 'retro-id',
            };

            const result = await ActionItemsService.createActionItem(actionItemInput);

            expect(result).toBe('new-action-item-id');
            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    content: 'Test action item',
                    assignedTo: 'user-id',
                    assignedToName: 'Test User',
                    status: 'pending',
                    createdBy: 'creator-id',
                    retrospectiveId: 'retro-id',
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                    order: expect.any(Number),
                })
            );
        });

        it('should throw error when database is not initialized', async () => {
            // Override the db mock to be null
            jest.doMock('./firebase', () => ({ db: null }));

            const actionItemInput = {
                content: 'Test action item',
                assignedTo: 'user-id',
                assignedToName: 'Test User',
                status: 'pending' as const,
                createdBy: 'creator-id',
                retrospectiveId: 'retro-id',
            };

            // Re-import to get the new mock
            const { ActionItemsService: ServiceWithNullDb } = await import('./actionItemsService');

            await expect(ServiceWithNullDb.createActionItem(actionItemInput))
                .rejects
                .toThrow('Firebase is not initialized');
        });

        it('should handle addDoc errors', async () => {
            mockAddDoc.mockRejectedValue(new Error('Firestore error'));

            const actionItemInput = {
                content: 'Test action item',
                assignedTo: 'user-id',
                assignedToName: 'Test User',
                status: 'pending' as const,
                createdBy: 'creator-id',
                retrospectiveId: 'retro-id',
            };

            await expect(ActionItemsService.createActionItem(actionItemInput))
                .rejects
                .toThrow('Failed to create action item');
        });
    });

    describe('updateActionItem', () => {
        it('should update action item successfully', async () => {
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const updates = {
                content: 'Updated content',
                status: 'completed' as const,
            };

            await ActionItemsService.updateActionItem('action-item-id', updates);

            expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'actionItems', 'action-item-id');
            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    content: 'Updated content',
                    status: 'completed',
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should handle update errors', async () => {
            mockUpdateDoc.mockRejectedValue(new Error('Update failed'));
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const updates = { content: 'Updated content' };

            await expect(ActionItemsService.updateActionItem('action-item-id', updates))
                .rejects
                .toThrow('Failed to update action item');
        });
    });

    describe('deleteActionItem', () => {
        it('should delete action item successfully', async () => {
            mockDeleteDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await ActionItemsService.deleteActionItem('action-item-id');

            expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'actionItems', 'action-item-id');
            expect(mockDeleteDoc).toHaveBeenCalledWith('mock-doc-ref');
        });

        it('should handle delete errors', async () => {
            mockDeleteDoc.mockRejectedValue(new Error('Delete failed'));
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await expect(ActionItemsService.deleteActionItem('action-item-id'))
                .rejects
                .toThrow('Failed to delete action item');
        });
    });

    describe('subscribeToActionItems', () => {
        it('should set up subscription correctly', () => {
            const mockUnsubscribe = jest.fn();
            mockOnSnapshot.mockReturnValue(mockUnsubscribe);
            mockCollection.mockReturnValue('mock-collection' as any);
            mockQuery.mockReturnValue('mock-query' as any);
            mockWhere.mockReturnValue('mock-where' as any);
            mockOrderBy.mockReturnValue('mock-order' as any);

            const callback = jest.fn();
            const unsubscribe = ActionItemsService.subscribeToActionItems('retro-id', callback);

            expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'actionItems');
            expect(mockQuery).toHaveBeenCalledWith(
                'mock-collection',
                'mock-where',
                'mock-order'
            );
            expect(mockWhere).toHaveBeenCalledWith('retrospectiveId', '==', 'retro-id');
            expect(mockOrderBy).toHaveBeenCalledWith('order', 'asc');
            expect(mockOnSnapshot).toHaveBeenCalledWith('mock-query', callback);
            expect(unsubscribe).toBe(mockUnsubscribe);
        });
    });

    describe('convertCardToActionItem', () => {
        it('should convert card to action item successfully', async () => {
            const mockDocRef = { id: 'new-action-item-id' };
            mockAddDoc.mockResolvedValue(mockDocRef as any);

            const result = await ActionItemsService.convertCardToActionItem(
                'card content',
                'retro-id',
                'creator-id',
                'assignee-id',
                'Assignee Name'
            );

            expect(result).toBe('new-action-item-id');
            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    content: 'card content',
                    retrospectiveId: 'retro-id',
                    createdBy: 'creator-id',
                    assignedTo: 'assignee-id',
                    assignedToName: 'Assignee Name',
                    status: 'pending',
                    createdAt: expect.any(Date),
                    updatedAt: expect.any(Date),
                    order: expect.any(Number),
                })
            );
        });

        it('should handle optional assignee', async () => {
            const mockDocRef = { id: 'new-action-item-id' };
            mockAddDoc.mockResolvedValue(mockDocRef as any);

            await ActionItemsService.convertCardToActionItem(
                'card content',
                'retro-id',
                'creator-id'
            );

            expect(mockAddDoc).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({
                    content: 'card content',
                    retrospectiveId: 'retro-id',
                    createdBy: 'creator-id',
                    assignedTo: null,
                    assignedToName: null,
                    status: 'pending',
                })
            );
        });
    });
});
