import { initializeApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, signOut, onAuthStateChanged, Auth } from "firebase/auth";

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
  USERS: 'users',
  COUNTDOWN_TIMERS: 'countdown_timers'
} as const;

export { db, auth, onAuthStateChanged, isDevMode };