import { createContext, useContext, useEffect, useState } from 'react';
import { dataClient, type Session } from '@/src/infrastructure/local-api/client';
import React from 'react';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  setIsGuest: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  isGuest: false,
  setIsGuest: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Get initial session
    async function getInitialSession() {
      try {
        const { data: { session: initialSession }, error } = await dataClient.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.error('Error getting initial session:', error);
            setSession(null);
            setIsGuest(true);
          } else {
            setSession(initialSession);
            setIsGuest(!initialSession);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error);
        if (mounted) {
          setSession(null);
          setIsGuest(true);
          setLoading(false);
        }
      }
    }

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = dataClient.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        setIsGuest(!session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, isGuest, setIsGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
