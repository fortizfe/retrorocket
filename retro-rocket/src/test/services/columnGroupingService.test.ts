import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    doc,
    getDoc,
    updateDoc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import {
    saveColumnGroupingState,
    loadColumnGroupingState,
    initializeColumnGroupingState
} from '../../services/columnGroupingService';
import { ColumnGroupingStatesStore } from '../../types/columnGrouping';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' }))
}));

vi.mock('../../services/firebase', () => ({
    db: { _type: 'mockDb' }
}));

describe('ColumnGroupingService', () => {
    const mockRetrospectiveId = 'test-retro-id';
    const mockDocRef = { _type: 'mockDocRef', id: mockRetrospectiveId };

    const mockColumnGroupingStates: ColumnGroupingStatesStore = {
        'helped': {
            criteria: 'suggestions',
            activeGroups: ['group-1', 'group-2']
        },
        'hindered': {
            criteria: 'user',
            activeGroups: []
        }
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (doc as any).mockReturnValue(mockDocRef);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('saveColumnGroupingState', () => {
        it('should save column grouping state successfully', async () => {
            (updateDoc as any).mockResolvedValue(undefined);

            await saveColumnGroupingState(mockRetrospectiveId, mockColumnGroupingStates);

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'retrospectives',
                mockRetrospectiveId
            );
            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                {
                    columnGroupingStates: mockColumnGroupingStates,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should save empty column grouping state', async () => {
            const emptyState: ColumnGroupingStatesStore = {};
            (updateDoc as any).mockResolvedValue(undefined);

            await saveColumnGroupingState(mockRetrospectiveId, emptyState);

            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                {
                    columnGroupingStates: emptyState,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });

        it('should handle save errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (updateDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(
                saveColumnGroupingState(mockRetrospectiveId, mockColumnGroupingStates)
            ).rejects.toThrow('Could not save column grouping state');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error saving column grouping state:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('should use serverTimestamp for updatedAt field', async () => {
            (updateDoc as any).mockResolvedValue(undefined);

            await saveColumnGroupingState(mockRetrospectiveId, mockColumnGroupingStates);

            expect(serverTimestamp).toHaveBeenCalled();
            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                expect.objectContaining({
                    updatedAt: { _methodName: 'serverTimestamp' }
                })
            );
        });

        it('should handle complex column grouping states', async () => {
            const complexState: ColumnGroupingStatesStore = {
                'helped': {
                    criteria: 'suggestions',
                    activeGroups: ['group-1', 'group-2', 'group-3']
                },
                'hindered': {
                    criteria: 'user',
                    activeGroups: ['group-4', 'group-5']
                },
                'actions': {
                    criteria: 'none',
                    activeGroups: []
                }
            };

            (updateDoc as any).mockResolvedValue(undefined);

            await saveColumnGroupingState(mockRetrospectiveId, complexState);

            expect(updateDoc).toHaveBeenCalledWith(
                mockDocRef,
                {
                    columnGroupingStates: complexState,
                    updatedAt: { _methodName: 'serverTimestamp' }
                }
            );
        });
    });

    describe('loadColumnGroupingState', () => {
        it('should load column grouping state successfully', async () => {
            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: mockColumnGroupingStates
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'retrospectives',
                mockRetrospectiveId
            );
            expect(getDoc).toHaveBeenCalledWith(mockDocRef);
            expect(result).toEqual(mockColumnGroupingStates);
        });

        it('should return empty object when document does not exist', async () => {
            const mockDocSnap = {
                exists: () => false
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual({});
        });

        it('should return empty object when columnGroupingStates is undefined', async () => {
            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    // No columnGroupingStates field
                    otherField: 'value'
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual({});
        });

        it('should return columnGroupingStates when it exists but is empty', async () => {
            const emptyStates: ColumnGroupingStatesStore = {};
            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: emptyStates
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual(emptyStates);
        });

        it('should handle load errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (getDoc as any).mockRejectedValue(new Error('Firestore error'));

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual({});
            expect(consoleSpy).toHaveBeenCalledWith(
                'Error loading column grouping state:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('should handle complex column grouping states loading', async () => {
            const complexState: ColumnGroupingStatesStore = {
                'helped': {
                    criteria: 'suggestions',
                    activeGroups: ['group-1', 'group-2', 'group-3', 'group-4']
                },
                'hindered': {
                    criteria: 'user',
                    activeGroups: []
                }
            };

            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: complexState,
                    otherFields: 'should be ignored'
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual(complexState);
        });
    });

    describe('initializeColumnGroupingState', () => {
        it('should initialize column grouping state successfully', async () => {
            (setDoc as any).mockResolvedValue(undefined);

            await initializeColumnGroupingState(mockRetrospectiveId);

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'retrospectives',
                mockRetrospectiveId
            );
            expect(setDoc).toHaveBeenCalledWith(
                mockDocRef,
                {
                    columnGroupingStates: {}
                },
                { merge: true }
            );
        });

        it('should handle initialization errors gracefully', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            (setDoc as any).mockRejectedValue(new Error('Firestore error'));

            await expect(
                initializeColumnGroupingState(mockRetrospectiveId)
            ).rejects.toThrow('Could not initialize column grouping state');

            expect(consoleSpy).toHaveBeenCalledWith(
                'Error initializing column grouping state:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('should use merge option to avoid overwriting existing data', async () => {
            (setDoc as any).mockResolvedValue(undefined);

            await initializeColumnGroupingState(mockRetrospectiveId);

            expect(setDoc).toHaveBeenCalledWith(
                mockDocRef,
                {
                    columnGroupingStates: {}
                },
                { merge: true }
            );
        });

        it('should handle different retrospective IDs', async () => {
            const alternativeRetroId = 'alternative-retro-id';
            const alternativeDocRef = { _type: 'mockDocRef', id: alternativeRetroId };
            (doc as any).mockReturnValue(alternativeDocRef);
            (setDoc as any).mockResolvedValue(undefined);

            await initializeColumnGroupingState(alternativeRetroId);

            expect(doc).toHaveBeenCalledWith(
                { _type: 'mockDb' },
                'retrospectives',
                alternativeRetroId
            );
            expect(setDoc).toHaveBeenCalledWith(
                alternativeDocRef,
                {
                    columnGroupingStates: {}
                },
                { merge: true }
            );
        });
    });

    describe('integration scenarios', () => {
        it('should handle save and load cycle correctly', async () => {
            // First save
            (updateDoc as any).mockResolvedValue(undefined);
            await saveColumnGroupingState(mockRetrospectiveId, mockColumnGroupingStates);

            // Then load
            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: mockColumnGroupingStates
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual(mockColumnGroupingStates);
        });

        it('should handle initialization followed by load', async () => {
            // First initialize
            (setDoc as any).mockResolvedValue(undefined);
            await initializeColumnGroupingState(mockRetrospectiveId);

            // Then load
            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: {}
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);

            expect(result).toEqual({});
        });

        it('should handle partial column states', async () => {
            const partialState: ColumnGroupingStatesStore = {
                'helped': {
                    criteria: 'suggestions',
                    activeGroups: ['only-group']
                }
                // Only 'helped' column has state, 'hindered' and 'actions' don't
            };

            (updateDoc as any).mockResolvedValue(undefined);
            await saveColumnGroupingState(mockRetrospectiveId, partialState);

            const mockDocSnap = {
                exists: () => true,
                data: () => ({
                    columnGroupingStates: partialState
                })
            };
            (getDoc as any).mockResolvedValue(mockDocSnap);

            const result = await loadColumnGroupingState(mockRetrospectiveId);
            expect(result).toEqual(partialState);
        });
    });
});
