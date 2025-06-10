import { useState, useEffect } from 'react';
import { User, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { auth } from '../services/firebase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAnonymouslyIfNeeded = async () => {
    if (!auth) {
      setError('Authentication not available');
      return null;
    }

    if (user) {
      return user;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
      console.error('Anonymous sign in failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const isAuthenticated = !!user;

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signInAnonymouslyIfNeeded
  };
};
