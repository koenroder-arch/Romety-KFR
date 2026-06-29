import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { authStorage } from '@/lib/authStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Synchronously initialize state from persistent store if available
  const initialUser = authStorage.getUserSync();
  const [user, setUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    let cancelled = false;

    // Wrap in a global unhandledrejection suppressor for auth errors
    const handleUnhandledRejection = (event) => {
      if (event.reason?.message?.includes('Authentication required')) {
        event.preventDefault(); // suppress the console error
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('[AuthContext] Initializing persistent check...');

    // Async check via authStorage (includes IndexedDB fallback)
    authStorage.getUserAsync().then((storedUser) => {
      if (!cancelled && storedUser) {
        setUser(storedUser);
        setIsLoading(false);
      }
    });

    // Initial check via base44
    base44.auth.me()
      .then((u) => {
        console.log('[AuthContext] base44.auth.me() resolved:', u);
        if (!cancelled) {
          if (u) {
            setUser(u);
            authStorage.saveUser(u);
          } else {
            const currentStored = authStorage.getUserSync();
            if (!currentStored) {
              setUser(null);
            }
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('[AuthContext] base44.auth.me() rejected:', err);
        if (!cancelled) {
          const currentStored = authStorage.getUserSync();
          if (!currentStored) {
            setUser(null);
          }
          setIsLoading(false);
        }
      });

    // Supabase auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange event=${event} session=${session ? 'present' : 'null'}`);
      if (cancelled) return;

      // Yield to persistent user if present
      const activeStored = authStorage.getUserSync();
      if (activeStored) {
        setUser(activeStored);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        const supaUser = session.user;
        const userObj = {
          id: supaUser.id,
          email: supaUser.email,
          user_email: supaUser.email,
          ...supaUser.user_metadata
        };
        setUser(userObj);
        authStorage.saveUser(userObj);

        // On first verified sign-in (SIGNED_IN event), create profile if it doesn't exist yet
        if (event === 'SIGNED_IN') {
          try {
            const existing = await base44.entities.UserProfile.filter({ user_email: supaUser.email });
            if (!existing || existing.length === 0) {
              const displayName = supaUser.user_metadata?.display_name || supaUser.email.split('@')[0];
              await base44.entities.UserProfile.create({
                user_email: supaUser.email,
                display_name: displayName,
                onboarding_complete: false
              });
              console.log('[AuthContext] Created new UserProfile for verified user:', supaUser.email);
            }
          } catch (err) {
            console.error('[AuthContext] Error ensuring UserProfile:', err);
          }
        }
      } else {
        const currentStored = authStorage.getUserSync();
        if (!currentStored) {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const logout = () => {
    authStorage.clearUser();
    setUser(null);
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