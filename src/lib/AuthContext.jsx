import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { authStorage } from '@/lib/authStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Synchronously initialize state from persistent store if available
  const initialUser = authStorage.getUserSync();
  const [user, setUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let initialCheckCompleted = false;

    // Wrap in a global unhandledrejection suppressor for auth errors
    const handleUnhandledRejection = (event) => {
      if (event.reason?.message?.includes('Authentication required')) {
        event.preventDefault(); // suppress the console error
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    console.log('[AuthContext] Initializing persistent check...');

    // Supabase auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange event=${event} session=${session ? 'present' : 'null'}`);
      if (cancelled) return;

      // Yield to persistent user if present
      const activeStored = authStorage.getUserSync();
      if (activeStored) {
        setUser(activeStored);
        if (initialCheckCompleted) {
          setIsLoading(false);
        }
        return;
      }

      if (session?.user) {
        const supaUser = session.user;
        const userObj = {
          id: supaUser.id,
          email: (supaUser.email || '').toLowerCase().trim(),
          user_email: (supaUser.email || '').toLowerCase().trim(),
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
        setUser(prev => prev || authStorage.getUserSync());
      }

      if (initialCheckCompleted) {
        setIsLoading(false);
      }
    });

    // Run the main async recovery check (checks base44.auth.me + IndexedDB fallbacks)
    (async () => {
      try {
        const u = await base44.auth.me();
        console.log('[AuthContext] base44.auth.me() resolved:', u);
        if (!cancelled) {
          if (u) {
            const cleaned = {
              ...u,
              email: (u.email || '').toLowerCase().trim(),
              user_email: (u.user_email || u.email || '').toLowerCase().trim()
            };
            setUser(cleaned);
            authStorage.saveUser(cleaned);
          } else {
            const asyncUser = await authStorage.getUserAsync();
            if (asyncUser) {
              setUser(asyncUser);
            } else {
              setUser(null);
            }
          }
        }
      } catch (err) {
        console.error('[AuthContext] Recovery check error:', err);
        if (!cancelled) {
          const asyncUser = await authStorage.getUserAsync();
          if (asyncUser) {
            setUser(asyncUser);
          } else {
            setUser(null);
          }
        }
      } finally {
        if (!cancelled) {
          initialCheckCompleted = true;
          setIsLoading(false);
        }
      }
    })();

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