import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getAuth, connectAuthEmulator, signOut, signInWithCustomToken, onAuthStateChanged, Auth } from "firebase/auth";

// Set by playwright.config.ts / e2e global-setup so the real app connects to the local
// Firebase Emulator Suite instead of a production project. Never set outside E2E runs.
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "retro-rocket.firebaseapp.com",
  projectId: useEmulator ? "demo-retrorocket" : (import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "retro-rocket"),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "retro-rocket.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:123456789:web:abcdef"
};

// Check if we're in development mode without Firebase config
const isDevMode = !import.meta.env.VITE_FIREBASE_API_KEY && !useEmulator;

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

    if (useEmulator) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('Firebase connected to local Emulator Suite');
    } else {
      console.log('Firebase initialized successfully');
    }

    return { db, auth };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return { db: null, auth: null };
  }
};

const { db, auth } = initializeFirebase();

// E2E-only sign-in hook: lets Playwright specs that aren't testing the login flow
// itself establish an authenticated session via a pre-minted custom token instead of
// driving the real OAuth popup UI. Never attached outside emulator-backed E2E runs.
if (useEmulator && auth) {
  (window as unknown as { __e2eSignIn?: (token: string) => Promise<unknown> }).__e2eSignIn =
    (token: string) => signInWithCustomToken(auth, token);
}

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