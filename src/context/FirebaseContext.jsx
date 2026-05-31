import { createContext, useContext, useEffect, useState } from 'react';
import { auth, ensureAuthenticated } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const FirebaseContext = createContext();

export function FirebaseProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure the user is signed in anonymously on mount
    ensureAuthenticated().catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <FirebaseContext.Provider value={{ currentUser, loading }}>
      {!loading && children}
    </FirebaseContext.Provider>
  );
}

export function useAuth() {
  return useContext(FirebaseContext);
}
