import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    orderBy,
    limit
} from 'firebase/firestore';
import { UserService, userService } from '../../services/userService';
import { AuthProviderType } from '../../types/user';

// Mock Firebase
vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn()
}));

vi.mock('../../services/firebase', () => ({
    db: {
        _type: 'mockDb',
        app: {},
        type: 'firestore-lite',
        collection: vi.fn()
    }
}));

describe('UserService', () => {
    const mockUserId = 'test-user-id';
    const mockBoardId = 'test-board-id';
    const mockBoardTitle = 'Test Board';

    const mockUserData = {
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
        provider: 'google' as AuthProviderType
    };

    const mockUserProfile = {
        uid: mockUserId,
        email: mockUserData.email,
        displayName: mockUserData.displayName,
        photoURL: mockUserData.photoURL,
        providers: [mockUserData.provider],
        primaryProvider: mockUserData.provider,
        joinedBoards: [mockBoardId],
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup basic mocks
        (doc as any).mockReturnValue({ _type: 'mockDocRef' });
        (collection as any).mockReturnValue({ _type: 'mockCollection' });
        (query as any).mockReturnValue({ _type: 'mockQuery' });
        (where as any).mockReturnValue({ _type: 'mockWhere' });
        (orderBy as any).mockReturnValue({ _type: 'mockOrderBy' });
        (limit as any).mockReturnValue({ _type: 'mockLimit' });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = UserService.getInstance();
            const instance2 = UserService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should return the same instance as userService export', () => {
            const instance = UserService.getInstance();
            expect(instance).toBe(userService);
        });
    });

    describe('createUserProfile', () => {
        it('should create user profile successfully', async () => {
            const result = await userService.createUserProfile(mockUserId, mockUserData);

            expect(setDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    uid: mockUserId,
                    email: mockUserData.email,
                    displayName: mockUserData.displayName,
                    photoURL: mockUserData.photoURL,
                    providers: [mockUserData.provider],
                    primaryProvider: mockUserData.provider,
                    joinedBoards: []
                })
            );
            expect(result.uid).toBe(mockUserId);
            expect(result.providers).toEqual([mockUserData.provider]);
        });

        it('should handle null photoURL', async () => {
            const userDataWithoutPhoto = { ...mockUserData, photoURL: null };

            const result = await userService.createUserProfile(mockUserId, userDataWithoutPhoto);

            expect(result.photoURL).toBeNull();
        });
    });

    describe('getUserProfile', () => {
        it('should get user profile successfully', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    ...mockUserProfile,
                    createdAt: { toDate: () => mockUserProfile.createdAt },
                    updatedAt: { toDate: () => mockUserProfile.updatedAt }
                })
            });

            const result = await userService.getUserProfile(mockUserId);

            expect(getDoc).toHaveBeenCalledWith({ _type: 'mockDocRef' });
            expect(result).toEqual(mockUserProfile);
        });

        it('should return null when user not found', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => false
            });

            const result = await userService.getUserProfile(mockUserId);

            expect(result).toBeNull();
        });

        it('should handle missing timestamps', async () => {
            (getDoc as any).mockResolvedValue({
                exists: () => true,
                data: () => ({
                    ...mockUserProfile,
                    createdAt: null,
                    updatedAt: null
                })
            });

            const result = await userService.getUserProfile(mockUserId);

            expect(result?.createdAt).toBeInstanceOf(Date);
            expect(result?.updatedAt).toBeInstanceOf(Date);
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile successfully', async () => {
            const updates = { displayName: 'Updated Name' };

            await userService.updateUserProfile(mockUserId, updates);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    ...updates,
                    updatedAt: expect.any(Date)
                })
            );
        });
    });

    describe('addBoardToUserHistory', () => {
        it('should create new history entry when none exists', async () => {
            (getDocs as any).mockResolvedValue({
                empty: true,
                docs: []
            });

            await userService.addBoardToUserHistory(mockUserId, mockBoardId, mockBoardTitle);

            expect(addDoc).toHaveBeenCalledWith(
                { _type: 'mockCollection' },
                expect.objectContaining({
                    userId: mockUserId,
                    boardId: mockBoardId,
                    boardTitle: mockBoardTitle,
                    accessCount: 1
                })
            );
        });

        it('should update existing history entry', async () => {
            const mockExistingDoc = {
                ref: { _type: 'mockDocRef' },
                data: () => ({ accessCount: 2 })
            };

            (getDocs as any).mockResolvedValue({
                empty: false,
                docs: [mockExistingDoc]
            });

            await userService.addBoardToUserHistory(mockUserId, mockBoardId, mockBoardTitle);

            expect(updateDoc).toHaveBeenCalledWith(
                mockExistingDoc.ref,
                expect.objectContaining({
                    accessCount: 3,
                    boardTitle: mockBoardTitle
                })
            );
        });
    });

    describe('getUserBoardHistory', () => {
        it('should get user board history successfully', async () => {
            const mockHistory = [
                {
                    id: 'history-1',
                    userId: mockUserId,
                    boardId: mockBoardId,
                    boardTitle: mockBoardTitle,
                    lastAccessed: { toDate: () => new Date() },
                    accessCount: 1
                }
            ];

            (getDocs as any).mockResolvedValue({
                docs: mockHistory.map(item => ({
                    id: item.id,
                    data: () => item
                }))
            });

            const result = await userService.getUserBoardHistory(mockUserId);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('history-1');
            expect(result[0].boardId).toBe(mockBoardId);
        });
    });

    describe('getUserBoards', () => {
        it('should get user boards successfully', async () => {
            // Mock getUserProfile call
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            const mockCreatedBoard = {
                id: 'created-board-1',
                title: 'Created Board',
                createdBy: mockUserId,
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            };

            const mockJoinedBoard = {
                id: mockBoardId,
                title: 'Joined Board',
                createdBy: 'other-user',
                createdAt: { toDate: () => new Date() },
                updatedAt: { toDate: () => new Date() }
            };

            // Mock created boards query
            (getDocs as any)
                .mockResolvedValueOnce({
                    docs: [{
                        id: mockCreatedBoard.id,
                        data: () => mockCreatedBoard
                    }]
                })
                .mockResolvedValueOnce({
                    docs: [{
                        id: mockJoinedBoard.id,
                        data: () => mockJoinedBoard
                    }]
                });

            const result = await userService.getUserBoards(mockUserId);

            expect(result).toHaveLength(2);
            expect(result.find(b => b.isCreator)).toBeTruthy();
            expect(result.find(b => !b.isCreator)).toBeTruthy();
        });
    });

    describe('addProviderToUser', () => {
        it('should add new provider successfully', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            const newProvider: AuthProviderType = 'github';
            await userService.addProviderToUser(mockUserId, newProvider);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    providers: [mockUserData.provider, newProvider]
                })
            );
        });

        it('should skip when provider already exists', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            await userService.addProviderToUser(mockUserId, mockUserData.provider);

            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should throw error when user not found', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(
                userService.addProviderToUser(mockUserId, 'github')
            ).rejects.toThrow('User profile not found');
        });
    });

    describe('removeProviderFromUser', () => {
        it('should remove provider successfully', async () => {
            const userWithMultipleProviders = {
                ...mockUserProfile,
                providers: ['google', 'github'] as AuthProviderType[],
                primaryProvider: 'google' as AuthProviderType
            };

            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(userWithMultipleProviders);

            await userService.removeProviderFromUser(mockUserId, 'github');

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    providers: ['google']
                })
            );
        });

        it('should update primary provider when removing current primary', async () => {
            const userWithMultipleProviders = {
                ...mockUserProfile,
                providers: ['google', 'github'] as AuthProviderType[],
                primaryProvider: 'google' as AuthProviderType
            };

            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(userWithMultipleProviders);

            await userService.removeProviderFromUser(mockUserId, 'google');

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    providers: ['github'],
                    primaryProvider: 'github'
                })
            );
        });

        it('should throw error when trying to remove only provider', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            await expect(
                userService.removeProviderFromUser(mockUserId, mockUserData.provider)
            ).rejects.toThrow('Cannot remove the only authentication provider');
        });

        it('should throw error when user not found', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(
                userService.removeProviderFromUser(mockUserId, 'google')
            ).rejects.toThrow('User profile not found');
        });
    });

    describe('addJoinedBoard', () => {
        it('should add joined board successfully', async () => {
            const userWithoutBoard = { ...mockUserProfile, joinedBoards: [] };
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(userWithoutBoard);

            await userService.addJoinedBoard(mockUserId, mockBoardId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    joinedBoards: [mockBoardId]
                })
            );
        });

        it('should skip when board already joined', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            await userService.addJoinedBoard(mockUserId, mockBoardId);

            expect(updateDoc).not.toHaveBeenCalled();
        });

        it('should throw error when user not found', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(
                userService.addJoinedBoard(mockUserId, mockBoardId)
            ).rejects.toThrow('User profile not found');
        });
    });

    describe('removeJoinedBoard', () => {
        it('should remove joined board successfully', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile);

            await userService.removeJoinedBoard(mockUserId, mockBoardId);

            expect(updateDoc).toHaveBeenCalledWith(
                { _type: 'mockDocRef' },
                expect.objectContaining({
                    joinedBoards: []
                })
            );
        });

        it('should throw error when user not found', async () => {
            vi.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(
                userService.removeJoinedBoard(mockUserId, mockBoardId)
            ).rejects.toThrow('User profile not found');
        });
    });
});
