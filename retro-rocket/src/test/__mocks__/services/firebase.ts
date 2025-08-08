// Mock for src/services/firebase.ts

// Mock collection reference
const mockCollectionRef = {
    type: 'collection',
    id: 'cards'
};

// Mock document reference  
const mockDocRef = {
    type: 'document',
    id: 'mock-doc-ref'
};

// Mock query object
const mockQuery = 'mock-query';

export const auth = {
    currentUser: {
        uid: 'test-user-id',
        email: 'test@example.com',
        displayName: 'Test User'
    },
    onAuthStateChanged: jest.fn((callback) => {
        callback({
            uid: 'test-user-id',
            email: 'test@example.com'
        });
        return jest.fn();
    }),
    signOut: jest.fn().mockResolvedValue(undefined),
    signInWithPopup: jest.fn().mockResolvedValue({
        user: {
            uid: 'test-user-id',
            email: 'test@example.com'
        }
    }),
};

export const db = mockCollectionRef;

// Firebase functions that need to be mocked at module level
export const collection = jest.fn().mockReturnValue(mockCollectionRef);

export const doc = jest.fn().mockReturnValue(mockDocRef);

export const addDoc = jest.fn().mockResolvedValue({ id: 'mock-doc-id' });

export const updateDoc = jest.fn().mockResolvedValue(undefined);

export const deleteDoc = jest.fn().mockResolvedValue(undefined);

export const getDocs = jest.fn().mockResolvedValue({
    docs: [{
        id: 'mock-card-id',
        data: () => ({
            content: 'Test card',
            column: 'helped',
            votes: 0,
            likes: [],
            reactions: [],
            order: 1234567890,
            retrospectiveId: 'test-retro-id',
            createdBy: 'test-user-id',
            createdAt: {
                toDate: () => new Date('2023-01-01')
            },
            updatedAt: {
                toDate: () => new Date('2023-01-01')
            }
        })
    }],
    empty: false
});

export const getDoc = jest.fn().mockResolvedValue({
    id: 'mock-card-id',
    exists: () => true,
    data: () => ({
        content: 'Test card',
        column: 'helped',
        votes: 5,
        likes: [],
        reactions: [],
        order: 1234567890,
        retrospectiveId: 'test-retro-id',
        createdBy: 'test-user-id',
        createdAt: {
            toDate: () => new Date('2023-01-01')
        },
        updatedAt: {
            toDate: () => new Date('2023-01-01')
        }
    })
});

export const setDoc = jest.fn().mockResolvedValue(undefined);

export const query = jest.fn().mockReturnValue(mockQuery);

export const where = jest.fn().mockReturnValue(mockQuery);

export const orderBy = jest.fn().mockReturnValue(mockQuery);

export const onSnapshot = jest.fn((queryObj, callback, errorCallback) => {
    // Simulate snapshot callback
    setTimeout(() => {
        callback({
            docs: [{
                id: 'mock-card-id',
                data: () => ({
                    content: 'Test card',
                    column: 'helped',
                    votes: 0,
                    likes: [],
                    reactions: [],
                    order: 1234567890,
                    retrospectiveId: 'test-retro-id',
                    createdBy: 'test-user-id',
                    createdAt: {
                        toDate: () => new Date('2023-01-01')
                    },
                    updatedAt: {
                        toDate: () => new Date('2023-01-01')
                    }
                })
            }]
        });
    }, 0);

    // Return unsubscribe function
    return jest.fn();
});

export const serverTimestamp = jest.fn(() => ({
    seconds: 1234567890,
    nanoseconds: 0
}));

export const Timestamp = {
    fromDate: (date: Date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => date
    }),
    now: () => ({
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date()
    }),
};

export const firebaseConfig = {
    apiKey: 'demo-api-key',
    authDomain: 'demo-project.firebaseapp.com',
    projectId: 'demo-project',
    storageBucket: 'demo-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef'
};

export const isDevMode = true;
