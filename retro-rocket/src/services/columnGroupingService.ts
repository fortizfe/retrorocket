import { db } from './firebase';
import { ColumnGroupingStatesStore } from '../types/columnGrouping';

/**
 * Service to manage column grouping state persistence in Firebase
 */

// Save column grouping state to Firebase
export const saveColumnGroupingState = async (
    retrospectiveId: string,
    columnGroupingStates: ColumnGroupingStatesStore
): Promise<void> => {
    try {
        const docRef = (db as any).collection('retrospectives').doc(retrospectiveId);
        await docRef.update({
            columnGroupingStates,
            updatedAt: new Date()
        });
    } catch (error) {
        console.error('Error saving column grouping state:', error);
        throw new Error('Could not save column grouping state');
    }
};

// Load column grouping state from Firebase
export const loadColumnGroupingState = async (
    retrospectiveId: string
): Promise<ColumnGroupingStatesStore> => {
    try {
        const docRef = (db as any).collection('retrospectives').doc(retrospectiveId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            const data = docSnap.data();
            return data?.columnGroupingStates ?? {};
        }

        return {};
    } catch (error) {
        console.error('Error loading column grouping state:', error);
        return {};
    }
};

// Initialize column grouping state for a new retrospective
export const initializeColumnGroupingState = async (
    retrospectiveId: string
): Promise<void> => {
    try {
        const docRef = (db as any).collection('retrospectives').doc(retrospectiveId);
        await docRef.set({
            columnGroupingStates: {}
        }, { merge: true });
    } catch (error) {
        console.error('Error initializing column grouping state:', error);
        throw new Error('Could not initialize column grouping state');
    }
};
