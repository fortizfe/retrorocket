import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "retro-rocket.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "retro-rocket",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "retro-rocket.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:123456789:web:abcdef"
};

// Create mock Firebase functions
const createMockFirestore = () => {
  const mockDoc = {
    get: () => Promise.resolve({ exists: false, data: () => null }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    onSnapshot: () => () => { },
  };

  const mockCollection = {
    doc: () => mockDoc,
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => ({ onSnapshot: () => () => { } }),
  };

  return {
    collection: () => mockCollection,
  };
};

// Initialize Firebase safely
const initializeFirebase = () => {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    console.log('Firebase initialized successfully');
    return { db, auth };
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return { db: createMockFirestore(), auth: null };
  }
};

const { db, auth } = initializeFirebase();

// Auto-login with anonymous authentication
const initializeAuth = async () => {
  if (auth) {
    try {
      // Check if user is already signed in
      return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          if (user) {
            console.log('User already authenticated:', user.uid);
            resolve(user);
          } else {
            // Sign in anonymously if no user
            signInAnonymously(auth)
              .then((result) => {
                console.log('Anonymous authentication successful:', result.user.uid);
                resolve(result.user);
              })
              .catch((error) => {
                console.error('Anonymous authentication failed:', error);
                resolve(null);
              });
          }
        });
      });
    } catch (error) {
      console.error('Authentication initialization failed:', error);
      return null;
    }
  }
  return null;
};

// Initialize authentication when module loads
initializeAuth();

export { db, auth };