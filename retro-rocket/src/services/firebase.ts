import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ?? "demo-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ?? "retro-rocket.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ?? "retro-rocket",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ?? "retro-rocket.appspot.com",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ?? "123456789",
  appId: process.env.REACT_APP_FIREBASE_APP_ID ?? "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

// Connect to Firestore emulator in development
if (process.env.NODE_ENV === 'development' && !(globalThis as any).FIRESTORE_EMULATOR_CONNECTED) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    (globalThis as any).FIRESTORE_EMULATOR_CONNECTED = true;
  } catch (error) {
    console.log('Firestore emulator connection failed or already connected');
  }
}

export { db };