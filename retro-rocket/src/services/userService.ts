import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, orderBy, limit, Firestore } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserBoardHistory, AuthProviderType } from '../types/user';

export class UserService {
    private static instance: UserService;

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    private isFirestoreInstance(db: any): db is Firestore {
        return db && typeof db.collection === 'function' && db.type === 'firestore-lite' || db.app;
    }

    async createUserProfile(uid: string, userData: {
        email: string;
        displayName: string;
        photoURL?: string | null;
        provider: AuthProviderType;
    }): Promise<UserProfile> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        const now = new Date();
        const userProfile: UserProfile = {
            uid,
            email: userData.email,
            displayName: userData.displayName,
            photoURL: userData.photoURL || null,
            providers: [userData.provider], // Initialize with single provider
            primaryProvider: userData.provider, // Set as primary
            joinedBoards: [],
            createdAt: now,
            updatedAt: now,
        };

        if (this.isFirestoreInstance(db)) {
            await setDoc(doc(db, 'users', uid), userProfile);
        } else {
            // Mock implementation - just return the profile
            console.log('Mock: Created user profile for', uid);
        }

        return userProfile;
    }

    async getUserProfile(uid: string): Promise<UserProfile | null> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (this.isFirestoreInstance(db)) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                return {
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() ?? new Date(),
                } as UserProfile;
            }
            return null;
        } else {
            // Mock implementation
            console.log('Mock: Getting user profile for', uid);
            return null;
        }
    }

    async updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        const updateData = {
            ...updates,
            updatedAt: new Date(),
        };

        if (this.isFirestoreInstance(db)) {
            await updateDoc(doc(db, 'users', uid), updateData);
        } else {
            // Mock implementation
            console.log('Mock: Updated user profile for', uid, updateData);
        }
    }

    async addBoardToUserHistory(userId: string, boardId: string, boardTitle: string): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Added board to user history', userId, boardId);
            return;
        }

        // Check if the history entry already exists
        const historyQuery = query(
            collection(db, 'userBoardHistory'),
            where('userId', '==', userId),
            where('boardId', '==', boardId)
        );

        const historySnapshot = await getDocs(historyQuery);

        if (historySnapshot.empty) {
            // Create new history entry
            const historyData: Omit<UserBoardHistory, 'id'> = {
                userId,
                boardId,
                boardTitle,
                lastAccessed: new Date(),
                accessCount: 1,
            };

            await addDoc(collection(db, 'userBoardHistory'), historyData);
        } else {
            // Update existing history entry
            const existingDoc = historySnapshot.docs[0];
            const currentData = existingDoc.data() as UserBoardHistory;

            await updateDoc(existingDoc.ref, {
                lastAccessed: new Date(),
                accessCount: (currentData.accessCount || 0) + 1,
                boardTitle, // Update title in case it changed
            });
        }
    }

    async getUserBoardHistory(userId: string): Promise<UserBoardHistory[]> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Getting user board history for', userId);
            return [];
        }

        const historyQuery = query(
            collection(db, 'userBoardHistory'),
            where('userId', '==', userId),
            orderBy('lastAccessed', 'desc'),
            limit(20)
        );

        const historySnapshot = await getDocs(historyQuery);
        return historySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastAccessed: doc.data().lastAccessed?.toDate() ?? new Date(),
        })) as UserBoardHistory[];
    }

    async getUserBoards(userId: string): Promise<any[]> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Getting user boards for', userId);
            return [];
        }

        // Get user profile to access joinedBoards
        const userProfile = await this.getUserProfile(userId);
        const joinedBoardIds = userProfile?.joinedBoards || [];

        // Get boards created by user
        const createdBoardsQuery = query(
            collection(db, 'retrospectives'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const createdBoardsSnapshot = await getDocs(createdBoardsQuery);
        const createdBoards = createdBoardsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() ?? new Date(),
            updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
            isCreator: true
        }));

        // Get joined boards (excluding ones created by user)
        const joinedBoards: any[] = [];
        if (joinedBoardIds.length > 0) {
            // Firestore 'in' queries have a limit of 10 items
            const chunks = [];
            for (let i = 0; i < joinedBoardIds.length; i += 10) {
                chunks.push(joinedBoardIds.slice(i, i + 10));
            }

            for (const chunk of chunks) {
                const joinedBoardsQuery = query(
                    collection(db, 'retrospectives'),
                    where('__name__', 'in', chunk),
                    orderBy('updatedAt', 'desc')
                );

                const joinedBoardsSnapshot = await getDocs(joinedBoardsQuery);
                const chunkBoards = joinedBoardsSnapshot.docs
                    .filter(doc => doc.data().createdBy !== userId) // Exclude boards created by user
                    .map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
                        updatedAt: doc.data().updatedAt?.toDate() ?? new Date(),
                        isCreator: false
                    }));

                joinedBoards.push(...chunkBoards);
            }
        }

        // Combine and sort all boards by updated date
        const allBoards = [...createdBoards, ...joinedBoards];
        return allBoards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }

    async addProviderToUser(uid: string, newProvider: AuthProviderType): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Added provider to user', uid, newProvider);
            return;
        }

        // Get current user profile
        const userProfile = await this.getUserProfile(uid);
        if (!userProfile) {
            throw new Error('User profile not found');
        }

        // Check if provider is already linked
        if (userProfile.providers.includes(newProvider)) {
            console.log(`Provider ${newProvider} is already linked to user ${uid}, skipping`);
            return; // Don't throw error, just skip silently
        }

        // Add the new provider to the list
        const updatedProviders = [...userProfile.providers, newProvider];

        await updateDoc(doc(db, 'users', uid), {
            providers: updatedProviders,
            updatedAt: new Date(),
        });

        console.log(`Successfully added provider ${newProvider} to user ${uid}. Providers now: [${updatedProviders.join(', ')}]`);
    }

    async removeProviderFromUser(uid: string, providerToRemove: AuthProviderType): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Removed provider from user', uid, providerToRemove);
            return;
        }

        // Get current user profile
        const userProfile = await this.getUserProfile(uid);
        if (!userProfile) {
            throw new Error('User profile not found');
        }

        // Check if user has multiple providers
        if (userProfile.providers.length <= 1) {
            throw new Error('Cannot remove the only authentication provider');
        }

        // Remove the provider from the list
        const updatedProviders = userProfile.providers.filter(p => p !== providerToRemove);

        // Update primary provider if needed
        let newPrimaryProvider = userProfile.primaryProvider;
        if (userProfile.primaryProvider === providerToRemove) {
            newPrimaryProvider = updatedProviders[0]; // Use the first remaining provider
        }

        await updateDoc(doc(db, 'users', uid), {
            providers: updatedProviders,
            primaryProvider: newPrimaryProvider,
            updatedAt: new Date(),
        });
    }

    async addJoinedBoard(uid: string, boardId: string): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Added joined board to user', uid, boardId);
            return;
        }

        // Get current user profile
        const userProfile = await this.getUserProfile(uid);
        if (!userProfile) {
            throw new Error('User profile not found');
        }

        // Check if board is already in joined boards
        if (userProfile.joinedBoards && userProfile.joinedBoards.includes(boardId)) {
            console.log(`Board ${boardId} is already in user's joined boards, skipping`);
            return; // Don't throw error, just skip silently
        }

        // Add the board to the joinedBoards array
        const updatedJoinedBoards = [...(userProfile.joinedBoards || []), boardId];

        await updateDoc(doc(db, 'users', uid), {
            joinedBoards: updatedJoinedBoards,
            updatedAt: new Date(),
        });

        console.log(`Successfully added board ${boardId} to user's joined boards`);
    }

    async removeJoinedBoard(uid: string, boardId: string): Promise<void> {
        if (!db) {
            throw new Error('Firestore is not initialized');
        }

        if (!this.isFirestoreInstance(db)) {
            console.log('Mock: Removed joined board from user', uid, boardId);
            return;
        }

        // Get current user profile
        const userProfile = await this.getUserProfile(uid);
        if (!userProfile) {
            throw new Error('User profile not found');
        }

        // Remove the board from joinedBoards array
        const updatedJoinedBoards = (userProfile.joinedBoards || []).filter(id => id !== boardId);

        await updateDoc(doc(db, 'users', uid), {
            joinedBoards: updatedJoinedBoards,
            updatedAt: new Date(),
        });

        console.log(`Successfully removed board ${boardId} from user's joined boards`);
    }
}

export const userService = UserService.getInstance();
