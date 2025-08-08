import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock UserContext directly
const mockUserContext = {
    user: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
    },
    userProfile: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: null,
        providers: ['google'] as ('google' | 'github')[],
        primaryProvider: 'google' as 'google' | 'github',
        joinedBoards: [],
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    isAuthenticated: true,
    loading: false,
    error: null,
    signOut: jest.fn().mockResolvedValue(undefined),
    signInWithGoogle: jest.fn().mockResolvedValue(undefined),
    signInWithGithub: jest.fn().mockResolvedValue(undefined),
    updateDisplayName: jest.fn().mockResolvedValue(undefined),
    refreshUserProfile: jest.fn().mockResolvedValue(undefined),
};

// Mock the UserContext module
jest.mock('../../contexts/UserContext', () => ({
    UserProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="mock-user-provider">{children}</div>
    ),
    useUser: () => mockUserContext,
}));

// All the providers wrapper
const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <BrowserRouter>
            <div data-testid="test-providers">
                {children}
            </div>
        </BrowserRouter>
    );
};

// Custom render function
const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Export mock context for tests that need to modify it
export { mockUserContext };

// Helper functions for creating test data
export const createMockCard = (overrides: any = {}) => ({
    id: 'test-card-1',
    content: 'Test card content',
    column: 'helped' as const,
    votes: 0,
    likes: [],
    reactions: [],
    createdBy: 'test-user-id',
    retrospectiveId: 'test-retro-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 1,
    ...overrides,
});

export const createMockRetrospective = (overrides: any = {}) => ({
    id: 'test-retro-id',
    title: 'Test Retrospective',
    description: 'Test description',
    createdBy: 'test-user-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    participantCount: 1,
    isActive: true,
    allowAnonymous: false,
    ...overrides,
});

export const createMockActionItem = (overrides: any = {}) => ({
    id: 'test-action-item-1',
    content: 'Test action item content',
    assignedTo: 'test-user-id',
    assignedToName: 'Test User',
    status: 'pending' as const,
    createdBy: 'test-user-id',
    retrospectiveId: 'test-retro-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    order: 1,
    ...overrides,
});

export const createMockParticipant = (overrides: any = {}) => ({
    id: 'test-participant-1',
    name: 'Test User',
    userId: 'test-user-id',
    username: 'Test User',
    email: 'test@example.com',
    retrospectiveId: 'test-retro-id',
    joinedAt: new Date(),
    isActive: true,
    role: 'participant' as const,
    ...overrides,
});

// Mock Firebase document snapshot
export const createMockDocSnapshot = (data: any, id = 'test-id') => ({
    id,
    data: () => data,
    exists: () => true,
    ref: { id },
});

// Mock Firebase query snapshot
export const createMockQuerySnapshot = (docs: any[]) => ({
    docs: docs.map((doc: any) => createMockDocSnapshot(doc.data, doc.id)),
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: any) => void) => docs.forEach(callback),
});

// Wait for async operations
export const waitForLoadingToFinish = () => new Promise(resolve => setTimeout(resolve, 0));
