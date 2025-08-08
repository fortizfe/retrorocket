// Complete Firebase mock that replaces the entire firebase.ts module

// Mock Firebase Auth
export const auth = {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined),
    signInWithPopup: jest.fn(),
};

export const onAuthStateChanged = jest.fn();
export const signOut = jest.fn().mockResolvedValue(undefined);
export const signInWithPopup = jest.fn();
export const GoogleAuthProvider = jest.fn();
export const GithubAuthProvider = jest.fn();
export const linkWithPopup = jest.fn();
export const linkWithCredential = jest.fn();
export const fetchSignInMethodsForEmail = jest.fn();
export const signOutUser = jest.fn().mockResolvedValue(undefined);

// Mock Firestore
export const db = {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    addDoc: jest.fn(),
    getDocs: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    onSnapshot: jest.fn(),
};

export const collection = jest.fn();
export const doc = jest.fn();
export const getDoc = jest.fn();
export const setDoc = jest.fn();
export const updateDoc = jest.fn();
export const deleteDoc = jest.fn();
export const addDoc = jest.fn();
export const getDocs = jest.fn();
export const query = jest.fn();
export const where = jest.fn();
export const orderBy = jest.fn();
export const onSnapshot = jest.fn();
export const serverTimestamp = jest.fn(() => ({
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toDate: () => new Date()
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

// Mock configuration
export const firebaseConfig = {
    apiKey: 'demo-api-key',
    authDomain: 'demo-project.firebaseapp.com',
    projectId: 'demo-project',
    storageBucket: 'demo-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef'
};

export const isDevMode = true;

// Mock initialization functions
export const initializeFirebase = jest.fn(() => ({ db, auth }));

// Mock Firebase app initialization
export const initializeApp = jest.fn();
export const getFirestore = jest.fn(() => db);
export const getAuth = jest.fn(() => auth);

// Default export (if needed)
export default {
    auth,
    db,
    onAuthStateChanged,
    signOut,
    signOutUser,
    serverTimestamp,
    Timestamp,
    isDevMode,
    firebaseConfig
};
