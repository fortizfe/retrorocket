import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

/**
 * Migration script to update existing user documents from single provider to providers array
 * This should be run once to migrate existing data
 */
export async function migrateUserProviders(): Promise<void> {
    if (!db) {
        throw new Error('Firestore is not initialized');
    }

    console.log('Starting user providers migration...');

    try {
        // Get all users collection
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Check if user still has old provider structure
            if (userData.provider && !userData.providers) {
                console.log(`Migrating user ${userId} with provider: ${userData.provider}`);

                // Update document to use new structure
                await updateDoc(doc(db, 'users', userId), {
                    providers: [userData.provider], // Convert single provider to array
                    primaryProvider: userData.provider, // Set as primary provider
                    // Remove old provider field - Firestore doesn't have a direct way to delete fields in updateDoc
                    // We'll handle this manually or in a separate cleanup step
                });

                migratedCount++;
            } else if (userData.providers) {
                console.log(`User ${userId} already migrated, skipping...`);
                skippedCount++;
            } else {
                console.log(`User ${userId} has no provider data, skipping...`);
                skippedCount++;
            }
        }

        console.log(`Migration completed! Migrated: ${migratedCount}, Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('Error during migration:', error);
        throw error;
    }
}

/**
 * Cleanup script to remove old 'provider' field from migrated users
 * Run this after verifying the migration was successful
 */
export async function cleanupOldProviderField(): Promise<void> {
    if (!db) {
        throw new Error('Firestore is not initialized');
    }

    console.log('Starting cleanup of old provider fields...');

    try {
        // Get all users collection
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        let cleanedCount = 0;

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Check if user has both old and new structure
            if (userData.provider && userData.providers) {
                console.log(`Cleaning up old provider field for user ${userId}`);

                // Create new data object without the old provider field
                const cleanedData = { ...userData };
                delete cleanedData.provider;

                // Note: Firestore updateDoc doesn't directly delete fields
                // We would need to use the Firebase Admin SDK for this or set the field to null
                await updateDoc(doc(db, 'users', userId), {
                    provider: null // This effectively removes the field
                });

                cleanedCount++;
            }
        }

        console.log(`Cleanup completed! Cleaned: ${cleanedCount} users`);

    } catch (error) {
        console.error('Error during cleanup:', error);
        throw error;
    }
}

/**
 * Utility function to verify the migration was successful
 */
export async function verifyMigration(): Promise<{ migrated: number; needsMigration: number; errors: string[] }> {
    if (!db) {
        throw new Error('Firestore is not initialized');
    }

    console.log('Verifying migration...');

    try {
        const usersCollection = collection(db, 'users');
        const usersSnapshot = await getDocs(usersCollection);

        let migratedCount = 0;
        let needsMigrationCount = 0;
        const errors: string[] = [];

        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            const userId = userDoc.id;

            try {
                if (userData.providers && userData.primaryProvider) {
                    // Check if the data is valid
                    if (Array.isArray(userData.providers) && userData.providers.length > 0) {
                        migratedCount++;
                    } else {
                        errors.push(`User ${userId} has invalid providers data`);
                    }
                } else if (userData.provider) {
                    needsMigrationCount++;
                } else {
                    errors.push(`User ${userId} has no provider data`);
                }
            } catch (error) {
                errors.push(`Error checking user ${userId}: ${error}`);
            }
        }

        console.log(`Verification completed! Migrated: ${migratedCount}, Needs migration: ${needsMigrationCount}, Errors: ${errors.length}`);

        return {
            migrated: migratedCount,
            needsMigration: needsMigrationCount,
            errors
        };

    } catch (error) {
        console.error('Error during verification:', error);
        throw error;
    }
}
