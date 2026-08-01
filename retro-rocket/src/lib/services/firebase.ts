import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signOut, signInWithCustomToken, Auth } from "firebase/auth";

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

// 021, research.md §3/§4: no browser code reads Firestore directly anymore (the board-
// columns listener and the participant-photo cache were the last two, both removed), so
// this module now only ever initializes Firebase Auth — kept solely for signOutUser below
// and the emulator-only E2E sign-in hook, neither of which is a Firestore read/write.
const initializeFirebaseAuth = (): Auth | null => {
  if (isDevMode) {
    console.log('Firebase not configured, running in mock mode');
    return null;
  }

  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    if (useEmulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('Firebase Auth connected to local Emulator Suite');
    } else {
      console.log('Firebase Auth initialized successfully');
    }

    return auth;
  } catch (error) {
    console.error('Firebase Auth initialization failed:', error);
    return null;
  }
};

const auth = initializeFirebaseAuth();

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