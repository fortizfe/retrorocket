import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    onSnapshot
} from 'firebase/firestore';
import { FacilitatorNotesService } from '@/features/boards/facilitator/services/facilitatorNotesService';

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

        static now() {
            return new MockTimestamp(new Date());
        }

        static fromDate(date: Date) {
            return new MockTimestamp(date);
        }
    }

    return {
        collection: vi.fn(),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        doc: vi.fn(),
        query: vi.fn(),
        where: vi.fn(),
        orderBy: vi.fn(),
        onSnapshot: vi.fn(),
        Timestamp: MockTimestamp
    };
});

vi.mock('@/lib/services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('FacilitatorNotesService', () => {
    const mockRetrospectiveId = 'test-retro-id';
    const mockFacilitatorId = 'test-facilitator-id';
    const mockNoteId = 'test-note-id';
    const mockContent = 'Test facilitator note content';



    // Helper functions
    const createMockDocRef = (id = mockNoteId) => ({
        _type: 'mockDocRef',
        id
    });

    const createMockDoc = (id: string, data: any) => ({
        id,
        data: () => data
    });

    const createMockSnapshot = (docs: any[]) => ({
        docs
    });

    const createMockTimestamp = (date = new Date()) => ({
        toDate: () => date
    });

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup basic mocks
        (doc as any).mockReturnValue(createMockDocRef());
        (collection as any).mockReturnValue({ _type: 'mockCollection' });
        (query as any).mockReturnValue({ _type: 'mockQuery' });
        (where as any).mockReturnValue({ _type: 'mockWhere' });
        (orderBy as any).mockReturnValue({ _type: 'mockOrderBy' });
        (addDoc as any).mockResolvedValue(createMockDocRef());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('createNote', () => {
        it('should create note successfully', async () => {
            const result = await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockContent
            );

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    content: mockContent,
                    retrospectiveId: mockRetrospectiveId,
                    facilitatorId: mockFacilitatorId,
                    timestamp: expect.any(Object),
                    createdAt: expect.any(Object),
                    updatedAt: expect.any(Object)
                })
            );
            expect(result).toBe(mockNoteId);
        });

        it('should create note with empty content', async () => {
            const emptyContent = '';

            const result = await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                emptyContent
            );

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    content: emptyContent
                })
            );
            expect(result).toBe(mockNoteId);
        });

        it('should create note with very long content', async () => {
            const longContent = 'a'.repeat(10000);

            const result = await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                longContent
            );

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    content: longContent
                })
            );
            expect(result).toBe(mockNoteId);
        });

        it('should handle creation errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (addDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(
                FacilitatorNotesService.createNote(
                    mockRetrospectiveId,
                    mockFacilitatorId,
                    mockContent
                )
            ).rejects.toThrow('Error al crear la nota');

            expect(consoleSpy).toHaveBeenCalledWith('Error creating facilitator note:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should use correct collection name', async () => {
            await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockContent
            );

            expect(collection).toHaveBeenCalledWith({ _type: 'mockDb' }, 'facilitatorNotes');
        });

        it('should set all timestamp fields correctly', async () => {
            await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockContent
            );

            const addDocCall = (addDoc as any).mock.calls[0][1];
            expect(addDocCall).toHaveProperty('timestamp');
            expect(addDocCall).toHaveProperty('createdAt');
            expect(addDocCall).toHaveProperty('updatedAt');
        });
    });

    describe('updateNote', () => {
        it('should update note successfully', async () => {
            const updatedContent = 'Updated note content';

            await FacilitatorNotesService.updateNote(mockNoteId, updatedContent);

            expect(updateDoc).toHaveBeenCalledWith(
                createMockDocRef(),
                expect.objectContaining({
                    content: updatedContent,
                    updatedAt: expect.any(Object)
                })
            );
        });

        it('should update note with empty content', async () => {
            const emptyContent = '';

            await FacilitatorNotesService.updateNote(mockNoteId, emptyContent);

            expect(updateDoc).toHaveBeenCalledWith(
                createMockDocRef(),
                expect.objectContaining({
                    content: emptyContent
                })
            );
        });

        it('should handle update errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (updateDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(
                FacilitatorNotesService.updateNote(mockNoteId, 'updated content')
            ).rejects.toThrow('Error al actualizar la nota');

            expect(consoleSpy).toHaveBeenCalledWith('Error updating facilitator note:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should call doc with correct parameters', async () => {
            await FacilitatorNotesService.updateNote(mockNoteId, 'updated content');

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'facilitatorNotes',
                mockNoteId
            );
        });

        it('should only update content and updatedAt fields', async () => {
            await FacilitatorNotesService.updateNote(mockNoteId, 'updated content');

            expect(updateDoc).toHaveBeenCalledWith(
                createMockDocRef(),
                {
                    content: 'updated content',
                    updatedAt: expect.any(Object)
                }
            );
        });
    });

    describe('deleteNote', () => {
        it('should delete note successfully', async () => {
            await FacilitatorNotesService.deleteNote(mockNoteId);

            expect(deleteDoc).toHaveBeenCalledWith(createMockDocRef());
            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'facilitatorNotes',
                mockNoteId
            );
        });

        it('should handle deletion errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (deleteDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(
                FacilitatorNotesService.deleteNote(mockNoteId)
            ).rejects.toThrow('Error al eliminar la nota');

            expect(consoleSpy).toHaveBeenCalledWith('Error deleting facilitator note:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should handle different note IDs', async () => {
            const alternativeNoteId = 'alternative-note-id';

            await FacilitatorNotesService.deleteNote(alternativeNoteId);

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'facilitatorNotes',
                alternativeNoteId
            );
        });
    });

    describe('subscribeToNotes', () => {
        it('should subscribe to notes successfully', () => {
            const mockCallback = vi.fn();
            const mockUnsubscribe = vi.fn();

            (onSnapshot as any).mockReturnValue(mockUnsubscribe);

            const unsubscribe = FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            expect(query).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                { _type: 'mockWhere' },
                { _type: 'mockWhere' },
                { _type: 'mockOrderBy' }
            );
            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('facilitatorId', '==', mockFacilitatorId);
            expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
            expect(onSnapshot).toHaveBeenCalled();
            expect(unsubscribe).toBe(mockUnsubscribe);
        });

        it('should process notes correctly in subscription', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            const mockTimestamp = createMockTimestamp(new Date('2023-01-01T10:00:00Z'));

            const mockDoc = createMockDoc(mockNoteId, {
                content: mockContent,
                retrospectiveId: mockRetrospectiveId,
                facilitatorId: mockFacilitatorId,
                timestamp: mockTimestamp
            });

            const mockSnapshot = createMockSnapshot([mockDoc]);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: mockNoteId,
                    content: mockContent,
                    retrospectiveId: mockRetrospectiveId,
                    facilitatorId: mockFacilitatorId,
                    timestamp: expect.any(Date)
                })
            ]);
        });

        it('should handle multiple notes in subscription', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            const mockTimestamp1 = createMockTimestamp(new Date('2023-01-01T10:00:00Z'));
            const mockTimestamp2 = createMockTimestamp(new Date('2023-01-01T11:00:00Z'));

            const mockDoc1 = createMockDoc('note-1', {
                content: 'First note',
                retrospectiveId: mockRetrospectiveId,
                facilitatorId: mockFacilitatorId,
                timestamp: mockTimestamp1
            });

            const mockDoc2 = createMockDoc('note-2', {
                content: 'Second note',
                retrospectiveId: mockRetrospectiveId,
                facilitatorId: mockFacilitatorId,
                timestamp: mockTimestamp2
            });

            const mockSnapshot = createMockSnapshot([mockDoc1, mockDoc2]);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([
                expect.objectContaining({
                    id: 'note-1',
                    content: 'First note'
                }),
                expect.objectContaining({
                    id: 'note-2',
                    content: 'Second note'
                })
            ]);
        });

        it('should handle subscription errors', () => {
            const mockCallback = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            (onSnapshot as any).mockImplementation((q: any, callback: any, errorCb: any) => {
                // Simulate error
                const mockError = new Error('Subscription error');
                errorCb(mockError);
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            expect(consoleSpy).toHaveBeenCalledWith('Error subscribing to facilitator notes:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        it('should handle empty notes array', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            const mockSnapshot = createMockSnapshot([]);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith([]);
        });

        it('should filter by both retrospectiveId and facilitatorId', () => {
            const mockCallback = vi.fn();

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            // Verify both where clauses are called
            expect(where).toHaveBeenCalledWith('retrospectiveId', '==', mockRetrospectiveId);
            expect(where).toHaveBeenCalledWith('facilitatorId', '==', mockFacilitatorId);
            expect(where).toHaveBeenCalledTimes(2);
        });

        it('should order notes by timestamp descending', () => {
            const mockCallback = vi.fn();

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            expect(orderBy).toHaveBeenCalledWith('timestamp', 'desc');
        });
    });

    describe('error handling and edge cases', () => {
        it('should handle notes with malformed timestamp in subscription', () => {
            const mockCallback = vi.fn();
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            const mockDoc = createMockDoc(mockNoteId, {
                content: mockContent,
                retrospectiveId: mockRetrospectiveId,
                facilitatorId: mockFacilitatorId,
                timestamp: null // Malformed timestamp
            });

            const mockSnapshot = createMockSnapshot([mockDoc]);

            // Should handle the error gracefully without crashing
            expect(() => snapshotCallback(mockSnapshot)).toThrow('Cannot read properties of null');

            consoleSpy.mockRestore();
        });

        it('should handle very large number of notes', () => {
            const mockCallback = vi.fn();
            let snapshotCallback: any;

            (onSnapshot as any).mockImplementation((q: any, callback: any) => {
                snapshotCallback = callback;
                return vi.fn();
            });

            FacilitatorNotesService.subscribeToNotes(
                mockRetrospectiveId,
                mockFacilitatorId,
                mockCallback
            );

            // Create 1000 mock notes
            const mockDocs = Array.from({ length: 1000 }, (_, i) =>
                createMockDoc(`note-${i}`, {
                    content: `Note content ${i}`,
                    retrospectiveId: mockRetrospectiveId,
                    facilitatorId: mockFacilitatorId,
                    timestamp: createMockTimestamp(new Date())
                })
            );

            const mockSnapshot = createMockSnapshot(mockDocs);

            snapshotCallback(mockSnapshot);

            expect(mockCallback).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({ id: 'note-0' }),
                    expect.objectContaining({ id: 'note-999' })
                ])
            );
            expect(mockCallback.mock.calls[0][0]).toHaveLength(1000);
        });

        it('should handle special characters in note content', async () => {
            const specialContent = '!@#$%^&*()_+{}[]|\\:";\'<>?,./\n\t🎉🚀';

            await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                specialContent
            );

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    content: specialContent
                })
            );
        });

        it('should handle unicode content in notes', async () => {
            const unicodeContent = '这是中文测试 مرحبا هذا اختبار عربي 🌟✨🎨';

            await FacilitatorNotesService.createNote(
                mockRetrospectiveId,
                mockFacilitatorId,
                unicodeContent
            );

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    content: unicodeContent
                })
            );
        });
    });
});
