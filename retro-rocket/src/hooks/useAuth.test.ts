import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';
import { useUser } from '../contexts/UserContext';
import { mockUserContext } from '../test/utils/test-utils';

// Mock dependencies
jest.mock('../contexts/UserContext');

describe('useAuth', () => {
    const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return user context data', () => {
        mockUseUser.mockReturnValue(mockUserContext);

        const { result } = renderHook(() => useAuth());

        expect(result.current).toBe(mockUserContext);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.uid).toBe('test-user-id');
        expect(result.current.userProfile?.displayName).toBe('Test User');
    });

    it('should return loading state', () => {
        const loadingContext = {
            ...mockUserContext,
            loading: true,
            isAuthenticated: false,
            user: null,
            userProfile: null,
        };

        mockUseUser.mockReturnValue(loadingContext);

        const { result } = renderHook(() => useAuth());

        expect(result.current.loading).toBe(true);
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return error state', () => {
        const errorContext = {
            ...mockUserContext,
            loading: false,
            error: 'Authentication failed',
            isAuthenticated: false,
            user: null,
            userProfile: null,
        };

        mockUseUser.mockReturnValue(errorContext);

        const { result } = renderHook(() => useAuth());

        expect(result.current.error).toBe('Authentication failed');
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('should expose auth methods', () => {
        mockUseUser.mockReturnValue(mockUserContext);

        const { result } = renderHook(() => useAuth());

        expect(typeof result.current.signOut).toBe('function');
        expect(typeof result.current.signInWithGoogle).toBe('function');
        expect(typeof result.current.signInWithGithub).toBe('function');
        expect(typeof result.current.updateDisplayName).toBe('function');
        expect(typeof result.current.refreshUserProfile).toBe('function');
    });
});
