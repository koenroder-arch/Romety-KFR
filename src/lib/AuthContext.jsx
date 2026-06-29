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

    // Helper for persistent user lookup
    const getPersistentUser = () => {
      try {
        const local = localStorage.getItem('romety_user_session') || localStorage.getItem('romety_mock_user');
        if (local) return JSON.parse(local);
      } catch (e) {}
      try {
        const match = document.cookie.match(/(?:^|; )(?:romety_user_session|romety_mock_user)=([^;]*)/);
        if (match) return JSON.parse(decodeURIComponent(match[1]));
      } catch (e) {}
      return null;
    };

    const savePersistentUser = (userObj) => {
      if (!userObj) return;
      const str = JSON.stringify(userObj);
      try { localStorage.setItem('romety_user_session', str); } catch(e) {}
      try { localStorage.setItem('romety_mock_user', str); } catch(e) {}
      try { document.cookie = `romety_user_session=${encodeURIComponent(str)}; path=/; max-age=31536000; SameSite=Lax`; } catch(e) {}
      try { document.cookie = `romety_mock_user=${encodeURIComponent(str)}; path=/; max-age=31536000; SameSite=Lax`; } catch(e) {}
    };

    // Fast check for persistent user in localStorage or cookies
    const pUser = getPersistentUser();
    if (pUser) {
      setUser(pUser);
      setIsLoading(false);
    }

    // Initial check (non-blocking)
    base44.auth.me()
      .then((u) => {
        console.log('[AuthContext] base44.auth.me() resolved:', u);
        if (!cancelled) {
          if (u) {
            setUser(u);
            savePersistentUser(u);
          } else if (!getPersistentUser()) {
            setUser(null);
          }
        }
      })
      .catch((err) => {
        console.error('[AuthContext] base44.auth.me() rejected:', err);
        if (!cancelled && !getPersistentUser()) {
          setUser(null);
        }
      });

    // Supabase auth change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthContext] onAuthStateChange event=${event} session=${session ? 'present' : 'null'}`);
      if (cancelled) return;

      // Yield to persistent user if present
      const activePUser = getPersistentUser();
      if (activePUser) {
        setUser(activePUser);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        const supaUser = session.user;
        const userObj = {
          id: supaUser.id,
          email: supaUser.email,
          ...supaUser.user_metadata
        };
        setUser(userObj);
        savePersistentUser(userObj);

        // On first verified sign-in (SIGNED_IN event), create profile if it doesn't exist yet
        if (event === 'SIGNED_IN') {
          try {
            const existing = await base44.entities.UserProfile.filter({ user_email: supaUser.email });
            if (!existing || existing.length === 0) {
              // New verified user — create their initial profile using OTP metadata
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
        if (!getPersistentUser()) {
          setUser(null);
        }
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
    try { localStorage.removeItem('romety_user_session'); } catch(e) {}
    try { localStorage.removeItem('romety_mock_user'); } catch(e) {}
    try { document.cookie = `romety_user_session=; path=/; max-age=0; SameSite=Lax`; } catch(e) {}
    try { document.cookie = `romety_mock_user=; path=/; max-age=0; SameSite=Lax`; } catch(e) {}
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