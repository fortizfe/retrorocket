import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, Auth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "retro-rocket.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "retro-rocket",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "retro-rocket.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:123456789:web:abcdef"
};

// Check if we're in development mode without Firebase config
const isDevMode = !import.meta.env.VITE_FIREBASE_API_KEY;

// Initialize Firebase safely
const initializeFirebase = (): { db: Firestore | null; auth: Auth | null } => {
  if (isDevMode) {
    console.log('Firebase not configured, running in mock mode');
    return { db: null, auth: null };
  }

  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    console.log('Firebase initialized successfully');
    return { db, auth };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return { db: null, auth: null };
  }
};

const { db, auth } = initializeFirebase();

// Configure Google Auth Provider only if auth is available
const googleProvider = auth ? new GoogleAuthProvider() : null;
if (googleProvider) {
  googleProvider.addScope('profile');
  googleProvider.addScope('email');
}

// Auth helper functions
export const signInWithGoogle = async () => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth is not initialized');
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signOutUser = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized');
  }

  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Export firestore constants
export const FIRESTORE_COLLECTIONS = {
  RETROSPECTIVES: 'retrospectives',
  CARDS: 'cards',
  PARTICIPANTS: 'participants',
  USERS: 'users'
} as const;

export { db, auth, onAuthStateChanged, isDevMode };