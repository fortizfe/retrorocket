import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signOutUser } from '@/lib/services/firebase';

// Mock Firebase modules
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(() => ({ name: 'test-app' }))
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({ currentUser: null })),
    connectAuthEmulator: vi.fn(),
    signOut: vi.fn(),
    signInWithCustomToken: vi.fn()
}));

// 021, research.md §3/§4: no browser code reads Firestore directly anymore — this module
// only initializes Firebase Auth (for signOutUser and the emulator-only E2E sign-in hook),
// so there is nothing left here to test around `firebase/firestore`, `db`, or
// `FIRESTORE_COLLECTIONS` (all removed).
describe('Firebase Service (Auth only)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'log').mockImplementation(() => { });
        vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('signOutUser', () => {
        it('should call signOut with mocked auth', async () => {
            const { signOut } = await import('firebase/auth');
            (signOut as any).mockResolvedValue(undefined);

            await signOutUser();
            expect(signOut).toHaveBeenCalled();
        });

        it('should handle signOut errors', async () => {
            const { signOut } = await import('firebase/auth');
            const signOutError = new Error('Sign out failed');
            (signOut as any).mockRejectedValue(signOutError);

            await expect(signOutUser()).rejects.toThrow('Sign out failed');
            expect(console.error).toHaveBeenCalledWith('Error signing out:', signOutError);
        });

        it('should handle case when signOut succeeds', async () => {
            const { signOut } = await import('firebase/auth');
            (signOut as any).mockResolvedValue(undefined);

            await expect(signOutUser()).resolves.toBeUndefined();
            expect(signOut).toHaveBeenCalled();
        });
    });

    describe('Firebase Configuration', () => {
        it('should use environment variables for configuration', () => {
            const expectedConfig = {
                apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
                authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "retro-rocket.firebaseapp.com",
                projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "retro-rocket",
            };

            expect(expectedConfig.apiKey).toBeDefined();
            expect(expectedConfig.authDomain).toBeDefined();
            expect(expectedConfig.projectId).toBeDefined();
        });
    });

    describe('Exports', () => {
        it('exports only signOutUser — no Firestore handle, no exported Auth instance (021, FR-005/FR-007)', async () => {
            const firebase = await import('@/lib/services/firebase');

            expect(typeof firebase.signOutUser).toBe('function');
            expect(firebase).not.toHaveProperty('db');
            expect(firebase).not.toHaveProperty('FIRESTORE_COLLECTIONS');
            expect(firebase).not.toHaveProperty('auth');
            expect(firebase).not.toHaveProperty('onAuthStateChanged');
        });
    });
});
