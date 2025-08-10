import { describe, it, expect } from 'vitest';
import {
    AuthProvider,
    AuthProviderType,
    AuthState,
    User,
    UserBoardHistory,
    UserProfile
} from '../../types/user';

describe('User Types', () => {
    describe('AuthProviderType', () => {
        it('should include all expected provider types', () => {
            const providers: AuthProviderType[] = ['google', 'github', 'apple'];

            providers.forEach(provider => {
                const testProvider: AuthProviderType = provider;
                expect(typeof testProvider).toBe('string');
                expect(providers).toContain(testProvider);
            });

            expect(providers).toHaveLength(3);
        });

        it('should be valid for provider configurations', () => {
            const googleProvider: AuthProviderType = 'google';
            const githubProvider: AuthProviderType = 'github';
            const appleProvider: AuthProviderType = 'apple';

            expect([googleProvider, githubProvider, appleProvider]).toEqual(['google', 'github', 'apple']);
        });
    });

    describe('User interface', () => {
        it('should have correct structure with required properties', () => {
            const user: User = {
                uid: 'user123',
                email: 'test@example.com',
                displayName: 'Test User',
                photoURL: 'https://example.com/photo.jpg',
                providers: ['google'],
                primaryProvider: 'google',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(typeof user.uid).toBe('string');
            expect(typeof user.email).toBe('string');
            expect(typeof user.displayName).toBe('string');
            expect(typeof user.photoURL).toBe('string');
            expect(Array.isArray(user.providers)).toBe(true);
            expect(typeof user.primaryProvider).toBe('string');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);

            // Required properties
            expect(user).toHaveProperty('uid');
            expect(user).toHaveProperty('email');
            expect(user).toHaveProperty('displayName');
            expect(user).toHaveProperty('photoURL');
            expect(user).toHaveProperty('providers');
            expect(user).toHaveProperty('primaryProvider');
            expect(user).toHaveProperty('createdAt');
            expect(user).toHaveProperty('updatedAt');
        });

        it('should handle null values for optional properties', () => {
            const userWithNulls: User = {
                uid: 'user456',
                email: null,
                displayName: null,
                photoURL: null,
                providers: ['github'],
                primaryProvider: 'github',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(userWithNulls.email).toBeNull();
            expect(userWithNulls.displayName).toBeNull();
            expect(userWithNulls.photoURL).toBeNull();
            expect(userWithNulls.providers).toEqual(['github']);
            expect(userWithNulls.primaryProvider).toBe('github');
        });

        it('should handle multiple providers', () => {
            const multiProviderUser: User = {
                uid: 'user789',
                email: 'multi@example.com',
                displayName: 'Multi Provider User',
                photoURL: 'https://example.com/multi.jpg',
                providers: ['google', 'github', 'apple'],
                primaryProvider: 'google',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(multiProviderUser.providers).toHaveLength(3);
            expect(multiProviderUser.providers).toContain('google');
            expect(multiProviderUser.providers).toContain('github');
            expect(multiProviderUser.providers).toContain('apple');
            expect(multiProviderUser.primaryProvider).toBe('google');
        });

        it('should validate date properties', () => {
            const now = new Date();
            const user: User = {
                uid: 'test',
                email: 'test@example.com',
                displayName: 'Test',
                photoURL: null,
                providers: ['google'],
                primaryProvider: 'google',
                createdAt: now,
                updatedAt: now
            };

            expect(user.createdAt.getTime()).toBe(now.getTime());
            expect(user.updatedAt.getTime()).toBe(now.getTime());
            expect(user.updatedAt.getTime()).toBeGreaterThanOrEqual(user.createdAt.getTime());
        });
    });

    describe('UserProfile interface', () => {
        it('should have correct structure', () => {
            const userProfile: UserProfile = {
                uid: 'profile123',
                email: 'profile@example.com',
                displayName: 'Profile User',
                photoURL: 'https://example.com/profile.jpg',
                providers: ['google', 'github'],
                primaryProvider: 'google',
                joinedBoards: ['board1', 'board2', 'board3'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(typeof userProfile.uid).toBe('string');
            expect(typeof userProfile.email).toBe('string');
            expect(typeof userProfile.displayName).toBe('string');
            expect(typeof userProfile.photoURL).toBe('string');
            expect(Array.isArray(userProfile.providers)).toBe(true);
            expect(typeof userProfile.primaryProvider).toBe('string');
            expect(Array.isArray(userProfile.joinedBoards)).toBe(true);
            expect(userProfile.createdAt).toBeInstanceOf(Date);
            expect(userProfile.updatedAt).toBeInstanceOf(Date);
        });

        it('should handle empty joined boards', () => {
            const newUserProfile: UserProfile = {
                uid: 'newuser123',
                email: 'new@example.com',
                displayName: 'New User',
                photoURL: null,
                providers: ['apple'],
                primaryProvider: 'apple',
                joinedBoards: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(newUserProfile.joinedBoards).toHaveLength(0);
            expect(Array.isArray(newUserProfile.joinedBoards)).toBe(true);
        });

        it('should handle multiple joined boards', () => {
            const activeUserProfile: UserProfile = {
                uid: 'activeuser123',
                email: 'active@example.com',
                displayName: 'Active User',
                photoURL: 'https://example.com/active.jpg',
                providers: ['google'],
                primaryProvider: 'google',
                joinedBoards: ['board1', 'board2', 'board3', 'board4', 'board5'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            expect(activeUserProfile.joinedBoards).toHaveLength(5);
            expect(activeUserProfile.joinedBoards).toContain('board1');
            expect(activeUserProfile.joinedBoards).toContain('board5');
        });
    });

    describe('AuthState interface', () => {
        it('should have correct structure', () => {
            const authState: AuthState = {
                user: null,
                userProfile: null,
                loading: false,
                error: null,
                isAuthenticated: false
            };

            expect(authState.user).toBeNull();
            expect(authState.userProfile).toBeNull();
            expect(typeof authState.loading).toBe('boolean');
            expect(authState.error).toBeNull();
            expect(typeof authState.isAuthenticated).toBe('boolean');

            // Required properties
            expect(authState).toHaveProperty('user');
            expect(authState).toHaveProperty('userProfile');
            expect(authState).toHaveProperty('loading');
            expect(authState).toHaveProperty('error');
            expect(authState).toHaveProperty('isAuthenticated');
        });

        it('should handle authenticated state', () => {
            const user: User = {
                uid: 'auth123',
                email: 'auth@example.com',
                displayName: 'Auth User',
                photoURL: null,
                providers: ['google'],
                primaryProvider: 'google',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const userProfile: UserProfile = {
                uid: 'auth123',
                email: 'auth@example.com',
                displayName: 'Auth User',
                photoURL: null,
                providers: ['google'],
                primaryProvider: 'google',
                joinedBoards: ['board1'],
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const authenticatedState: AuthState = {
                user,
                userProfile,
                loading: false,
                error: null,
                isAuthenticated: true
            };

            expect(authenticatedState.user).toBe(user);
            expect(authenticatedState.userProfile).toBe(userProfile);
            expect(authenticatedState.isAuthenticated).toBe(true);
            expect(authenticatedState.loading).toBe(false);
            expect(authenticatedState.error).toBeNull();
        });

        it('should handle loading state', () => {
            const loadingState: AuthState = {
                user: null,
                userProfile: null,
                loading: true,
                error: null,
                isAuthenticated: false
            };

            expect(loadingState.loading).toBe(true);
            expect(loadingState.user).toBeNull();
            expect(loadingState.isAuthenticated).toBe(false);
        });

        it('should handle error state', () => {
            const errorState: AuthState = {
                user: null,
                userProfile: null,
                loading: false,
                error: 'Authentication failed',
                isAuthenticated: false
            };

            expect(errorState.error).toBe('Authentication failed');
            expect(errorState.loading).toBe(false);
            expect(errorState.isAuthenticated).toBe(false);
        });
    });

    describe('UserBoardHistory interface', () => {
        it('should have correct structure', () => {
            const boardHistory: UserBoardHistory = {
                id: 'history123',
                userId: 'user456',
                boardId: 'board789',
                boardTitle: 'Sprint Retrospective',
                lastAccessed: new Date(),
                accessCount: 5
            };

            expect(typeof boardHistory.id).toBe('string');
            expect(typeof boardHistory.userId).toBe('string');
            expect(typeof boardHistory.boardId).toBe('string');
            expect(typeof boardHistory.boardTitle).toBe('string');
            expect(boardHistory.lastAccessed).toBeInstanceOf(Date);
            expect(typeof boardHistory.accessCount).toBe('number');

            // Required properties
            expect(boardHistory).toHaveProperty('id');
            expect(boardHistory).toHaveProperty('userId');
            expect(boardHistory).toHaveProperty('boardId');
            expect(boardHistory).toHaveProperty('boardTitle');
            expect(boardHistory).toHaveProperty('lastAccessed');
            expect(boardHistory).toHaveProperty('accessCount');
        });

        it('should handle different access counts', () => {
            const firstVisit: UserBoardHistory = {
                id: 'history1',
                userId: 'user1',
                boardId: 'board1',
                boardTitle: 'First Board',
                lastAccessed: new Date(),
                accessCount: 1
            };

            const frequentlyAccessed: UserBoardHistory = {
                id: 'history2',
                userId: 'user1',
                boardId: 'board2',
                boardTitle: 'Frequent Board',
                lastAccessed: new Date(),
                accessCount: 25
            };

            expect(firstVisit.accessCount).toBe(1);
            expect(frequentlyAccessed.accessCount).toBe(25);
            expect(frequentlyAccessed.accessCount).toBeGreaterThan(firstVisit.accessCount);
        });

        it('should handle date tracking', () => {
            const recentAccess = new Date();
            const oldAccess = new Date('2023-01-01');

            const recentHistory: UserBoardHistory = {
                id: 'recent',
                userId: 'user',
                boardId: 'board',
                boardTitle: 'Recent Board',
                lastAccessed: recentAccess,
                accessCount: 3
            };

            const oldHistory: UserBoardHistory = {
                id: 'old',
                userId: 'user',
                boardId: 'board2',
                boardTitle: 'Old Board',
                lastAccessed: oldAccess,
                accessCount: 10
            };

            expect(recentHistory.lastAccessed.getTime()).toBeGreaterThan(oldHistory.lastAccessed.getTime());
            expect(oldHistory.lastAccessed.getFullYear()).toBe(2023);
        });
    });

    describe('AuthProvider interface', () => {
        it('should have correct structure', () => {
            const authProvider: AuthProvider = {
                id: 'google',
                name: 'Google',
                icon: 'google-icon',
                available: true
            };

            expect(typeof authProvider.id).toBe('string');
            expect(typeof authProvider.name).toBe('string');
            expect(typeof authProvider.icon).toBe('string');
            expect(typeof authProvider.available).toBe('boolean');

            // Required properties
            expect(authProvider).toHaveProperty('id');
            expect(authProvider).toHaveProperty('name');
            expect(authProvider).toHaveProperty('icon');
            expect(authProvider).toHaveProperty('available');
        });

        it('should handle available and unavailable providers', () => {
            const availableProvider: AuthProvider = {
                id: 'google',
                name: 'Google',
                icon: 'google-icon',
                available: true
            };

            const unavailableProvider: AuthProvider = {
                id: 'apple',
                name: 'Apple',
                icon: 'apple-icon',
                available: false,
                comingSoon: true
            };

            expect(availableProvider.available).toBe(true);
            expect(availableProvider.comingSoon).toBeUndefined();

            expect(unavailableProvider.available).toBe(false);
            expect(unavailableProvider.comingSoon).toBe(true);
        });

        it('should handle optional comingSoon property', () => {
            const withComingSoon: AuthProvider = {
                id: 'apple',
                name: 'Apple',
                icon: 'apple-icon',
                available: false,
                comingSoon: true
            };

            const withoutComingSoon: AuthProvider = {
                id: 'github',
                name: 'GitHub',
                icon: 'github-icon',
                available: true
            };

            expect(withComingSoon.comingSoon).toBe(true);
            expect(withoutComingSoon.comingSoon).toBeUndefined();
        });
    });

    describe('Type Compatibility and Utilities', () => {
        it('should work with type guards', () => {
            const isUserAuthenticated = (authState: AuthState): boolean => {
                return authState.isAuthenticated && authState.user !== null;
            };

            const authenticatedState: AuthState = {
                user: {
                    uid: 'test',
                    email: 'test@example.com',
                    displayName: 'Test User',
                    photoURL: null,
                    providers: ['google'],
                    primaryProvider: 'google',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                userProfile: null,
                loading: false,
                error: null,
                isAuthenticated: true
            };

            const unauthenticatedState: AuthState = {
                user: null,
                userProfile: null,
                loading: false,
                error: null,
                isAuthenticated: false
            };

            expect(isUserAuthenticated(authenticatedState)).toBe(true);
            expect(isUserAuthenticated(unauthenticatedState)).toBe(false);
        });

        it('should work with provider filtering', () => {
            const providers: AuthProvider[] = [
                { id: 'google', name: 'Google', icon: 'google', available: true },
                { id: 'github', name: 'GitHub', icon: 'github', available: true },
                { id: 'apple', name: 'Apple', icon: 'apple', available: false, comingSoon: true }
            ];

            const availableProviders = providers.filter(p => p.available);
            const comingSoonProviders = providers.filter(p => p.comingSoon);

            expect(availableProviders).toHaveLength(2);
            expect(availableProviders.map(p => p.id)).toEqual(['google', 'github']);

            expect(comingSoonProviders).toHaveLength(1);
            expect(comingSoonProviders[0].id).toBe('apple');
        });

        it('should handle user profile updates', () => {
            const user: User = {
                uid: 'user123',
                email: 'user@example.com',
                displayName: 'Original Name',
                photoURL: null,
                providers: ['google'],
                primaryProvider: 'google',
                createdAt: new Date('2024-01-01'),
                updatedAt: new Date('2024-01-01')
            };

            // Simulate profile update
            const updatedUser: User = {
                ...user,
                displayName: 'Updated Name',
                photoURL: 'https://example.com/new-photo.jpg',
                updatedAt: new Date()
            };

            expect(updatedUser.displayName).toBe('Updated Name');
            expect(updatedUser.photoURL).toBe('https://example.com/new-photo.jpg');
            expect(updatedUser.uid).toBe(user.uid);
            expect(updatedUser.createdAt).toBe(user.createdAt);
            expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
        });

        it('should handle board history operations', () => {
            const histories: UserBoardHistory[] = [
                {
                    id: 'h1',
                    userId: 'user1',
                    boardId: 'board1',
                    boardTitle: 'Old Board',
                    lastAccessed: new Date('2024-01-01'),
                    accessCount: 5
                },
                {
                    id: 'h2',
                    userId: 'user1',
                    boardId: 'board2',
                    boardTitle: 'Recent Board',
                    lastAccessed: new Date('2024-06-01'),
                    accessCount: 3
                }
            ];

            // Sort by last accessed (most recent first)
            const sortedByRecent = [...histories].sort((a, b) =>
                b.lastAccessed.getTime() - a.lastAccessed.getTime()
            );

            // Sort by access count (most accessed first)
            const sortedByCount = [...histories].sort((a, b) =>
                b.accessCount - a.accessCount
            );

            expect(sortedByRecent[0].boardTitle).toBe('Recent Board');
            expect(sortedByCount[0].boardTitle).toBe('Old Board');
        });
    });
});
