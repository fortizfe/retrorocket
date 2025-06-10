import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

    console.log('Firebase initialized successfully');
    return db;
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    return createMockFirestore();
  }
};

const db = initializeFirebase();

export { db };