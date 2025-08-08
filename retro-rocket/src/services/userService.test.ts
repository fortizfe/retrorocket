import { UserService } from './userService';
import { setDoc, getDoc, updateDoc, doc } from 'firebase/firestore';

// Mock Firebase
jest.mock('./firebase', () => ({
    db: {
        collection: jest.fn(),
        doc: jest.fn(),
    }
}));

jest.mock('firebase/firestore', () => ({
    setDoc: jest.fn(),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    doc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    collection: jest.fn(),
    addDoc: jest.fn(),
    limit: jest.fn(),
}));

describe('UserService', () => {
    let userService: UserService;
    const mockSetDoc = setDoc as jest.MockedFunction<typeof setDoc>;
    const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
    const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>;
    const mockDoc = doc as jest.MockedFunction<typeof doc>;

    beforeEach(() => {
        userService = UserService.getInstance();
        jest.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = UserService.getInstance();
            const instance2 = UserService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('createUserProfile', () => {
        it('should create user profile successfully', async () => {
            mockSetDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const userData = {
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: 'https://example.com/photo.jpg',
                provider: 'google' as const,
            };

            const result = await userService.createUserProfile('user-id', userData);

            expect(result).toEqual(expect.objectContaining({
                uid: 'user-id',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: 'https://example.com/photo.jpg',
                providers: ['google'],
                primaryProvider: 'google',
                joinedBoards: [],
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            }));

            expect(mockSetDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    uid: 'user-id',
                    email: 'test@example.com',
                    displayName: 'Test User',
                    photoURL: 'https://example.com/photo.jpg',
                    providers: ['google'],
                    primaryProvider: 'google',
                })
            );
        });

        it('should handle null photoURL', async () => {
            mockSetDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const userData = {
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: null,
                provider: 'github' as const,
            };

            const result = await userService.createUserProfile('user-id', userData);

            expect(result.photoURL).toBeNull();
            expect(result.providers).toEqual(['github']);
            expect(result.primaryProvider).toBe('github');
        });

        it('should throw error when database not initialized', async () => {
            // Override db mock to be null
            jest.doMock('./firebase', () => ({ db: null }));

            const userData = {
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: null,
                provider: 'google' as const,
            };

            await expect(userService.createUserProfile('user-id', userData))
                .rejects
                .toThrow('Firestore is not initialized');
        });
    });

    describe('getUserProfile', () => {
        it('should return user profile when exists', async () => {
            const mockUserData = {
                uid: 'user-id',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: null,
                providers: ['google'],
                primaryProvider: 'google',
                joinedBoards: [],
                createdAt: { toDate: () => new Date('2023-01-01') },
                updatedAt: { toDate: () => new Date('2023-01-02') },
            };

            mockGetDoc.mockResolvedValue({
                exists: () => true,
                data: () => mockUserData,
            } as any);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const result = await userService.getUserProfile('user-id');

            expect(result).toEqual(expect.objectContaining({
                uid: 'user-id',
                email: 'test@example.com',
                displayName: 'Test User',
                providers: ['google'],
                primaryProvider: 'google',
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            }));

            expect(mockGetDoc).toHaveBeenCalledWith('mock-doc-ref');
        });

        it('should return null when user does not exist', async () => {
            mockGetDoc.mockResolvedValue({
                exists: () => false,
            } as any);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const result = await userService.getUserProfile('user-id');

            expect(result).toBeNull();
        });

        it('should throw error when database not initialized', async () => {
            // Override db mock to be null  
            jest.doMock('./firebase', () => ({ db: null }));

            await expect(userService.getUserProfile('user-id'))
                .rejects
                .toThrow('Firestore is not initialized');
        });
    });

    describe('updateUserProfile', () => {
        it('should update user profile successfully', async () => {
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            const updates = {
                displayName: 'Updated Name',
                photoURL: 'https://example.com/new-photo.jpg',
            };

            await userService.updateUserProfile('user-id', updates);

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    displayName: 'Updated Name',
                    photoURL: 'https://example.com/new-photo.jpg',
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should throw error when database not initialized', async () => {
            // Override db mock to be null
            jest.doMock('./firebase', () => ({ db: null }));

            const updates = { displayName: 'Updated Name' };

            await expect(userService.updateUserProfile('user-id', updates))
                .rejects
                .toThrow('Firestore is not initialized');
        });
    });

    describe('addProviderToUser', () => {
        it('should add new provider successfully', async () => {
            const mockUserProfile = {
                providers: ['google'],
                primaryProvider: 'google',
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.addProviderToUser('user-id', 'github');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    providers: ['google', 'github'],
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should not add provider if already exists', async () => {
            const mockUserProfile = {
                providers: ['google', 'github'],
                primaryProvider: 'google',
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);

            await userService.addProviderToUser('user-id', 'github');

            expect(mockUpdateDoc).not.toHaveBeenCalled();
        });

        it('should throw error when user profile not found', async () => {
            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(userService.addProviderToUser('user-id', 'github'))
                .rejects
                .toThrow('User profile not found');
        });
    });

    describe('removeProviderFromUser', () => {
        it('should remove provider successfully', async () => {
            const mockUserProfile = {
                providers: ['google', 'github'],
                primaryProvider: 'google',
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.removeProviderFromUser('user-id', 'github');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    providers: ['google'],
                    primaryProvider: 'google',
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should update primary provider when removing current primary', async () => {
            const mockUserProfile = {
                providers: ['google', 'github'],
                primaryProvider: 'google',
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.removeProviderFromUser('user-id', 'google');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    providers: ['github'],
                    primaryProvider: 'github',
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should throw error when trying to remove only provider', async () => {
            const mockUserProfile = {
                providers: ['google'],
                primaryProvider: 'google',
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);

            await expect(userService.removeProviderFromUser('user-id', 'google'))
                .rejects
                .toThrow('Cannot remove the only authentication provider');
        });

        it('should throw error when user profile not found', async () => {
            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(null);

            await expect(userService.removeProviderFromUser('user-id', 'google'))
                .rejects
                .toThrow('User profile not found');
        });
    });

    describe('addJoinedBoard', () => {
        it('should add board to joined boards', async () => {
            const mockUserProfile = {
                joinedBoards: ['board1', 'board2'],
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.addJoinedBoard('user-id', 'board3');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    joinedBoards: ['board1', 'board2', 'board3'],
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should not add board if already joined', async () => {
            const mockUserProfile = {
                joinedBoards: ['board1', 'board2'],
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);

            await userService.addJoinedBoard('user-id', 'board1');

            expect(mockUpdateDoc).not.toHaveBeenCalled();
        });

        it('should handle empty joinedBoards array', async () => {
            const mockUserProfile = {
                joinedBoards: undefined,
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.addJoinedBoard('user-id', 'board1');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    joinedBoards: ['board1'],
                    updatedAt: expect.any(Date),
                })
            );
        });
    });

    describe('removeJoinedBoard', () => {
        it('should remove board from joined boards', async () => {
            const mockUserProfile = {
                joinedBoards: ['board1', 'board2', 'board3'],
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.removeJoinedBoard('user-id', 'board2');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    joinedBoards: ['board1', 'board3'],
                    updatedAt: expect.any(Date),
                })
            );
        });

        it('should handle removing non-existent board', async () => {
            const mockUserProfile = {
                joinedBoards: ['board1', 'board2'],
            };

            jest.spyOn(userService, 'getUserProfile').mockResolvedValue(mockUserProfile as any);
            mockUpdateDoc.mockResolvedValue(undefined);
            mockDoc.mockReturnValue('mock-doc-ref' as any);

            await userService.removeJoinedBoard('user-id', 'board3');

            expect(mockUpdateDoc).toHaveBeenCalledWith(
                'mock-doc-ref',
                expect.objectContaining({
                    joinedBoards: ['board1', 'board2'],
                    updatedAt: expect.any(Date),
                })
            );
        });
    });
});
