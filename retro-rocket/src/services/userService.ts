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
            provider: userData.provider,
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
                    updatedAt: data.updatedAt?.toDate() || new Date(),
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
            lastAccessed: doc.data().lastAccessed?.toDate() || new Date(),
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

        const boardsQuery = query(
            collection(db, 'retrospectives'),
            where('createdBy', '==', userId),
            orderBy('createdAt', 'desc')
        );

        const boardsSnapshot = await getDocs(boardsQuery);
        return boardsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        }));
    }
}

export const userService = UserService.getInstance();
