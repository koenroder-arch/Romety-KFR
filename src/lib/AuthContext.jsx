import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Wrap in a global unhandledrejection suppressor for auth errors
    const handleUnhandledRejection = (event) => {
      if (event.reason?.message?.includes('Authentication required')) {
        event.preventDefault(); // suppress the console error
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('[AuthContext] Initializing check...');

    // Fast check for mock user in localStorage
    const mockUserStr = localStorage.getItem('romety_mock_user');
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setUser(mockUser);
        setIsLoading(false);
        // We still keep the unhandled rejection handler active
      } catch (e) {
        localStorage.removeItem('romety_mock_user');
      }
    }

    // Initial check (non-blocking)
    base44.auth.me()
      .then((u) => {
        console.log('[AuthContext] base44.auth.me() resolved:', u);
        if (!cancelled) {
          if (!u) {
            setUser(null);
            console.log('[AuthContext] No user found on server, signing out locally...');
            supabase.auth.signOut();
          } else {
            setUser(u);
          }
        }
      })
      .catch((err) => {
        console.error('[AuthContext] base44.auth.me() rejected:', err);
        if (!cancelled) {
          setUser(null);
          supabase.auth.signOut();
        }
      });

    // Supabase auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[AuthContext] onAuthStateChange event=${event} session=${session ? 'present' : 'null'}`);
      if (cancelled) return;

      // Yield to local mock user if present
      if (localStorage.getItem('romety_mock_user')) {
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          ...session.user.user_metadata
        });
      } else {
        setUser(null);
      }
      setIsLoading(false);
      console.log('[AuthContext] isLoading set to false');
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const logout = () => {
    localStorage.removeItem('romety_mock_user');
    return base44.auth.logout();
  };
  const navigateToLogin = () => base44.auth.redirectToLogin(window.location.href);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoadingAuth: isLoading,
      isLoadingPublicSettings: false,
      authError: null,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};