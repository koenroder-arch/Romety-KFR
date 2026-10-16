import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { 
  Mail, Loader2, UserPlus, User, CheckCircle2, Sparkles, 
  Clock, ArrowLeft, RefreshCw, ExternalLink, Heart 
} from 'lucide-react';
import { authStorage } from '@/lib/authStorage';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // State for email verification waiting and grand celebration
  const [waitingForVerification, setWaitingForVerification] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const t = {
    nl: {
      title: 'Welkom bij Romety',
      subtitle: 'Vind je perfecte match vanavond',
      email: 'E-mailadres',
      username: 'Gebruikersnaam / Naam',
      loginBtn: 'Log in',
      signUpBtn: 'Account aanmaken',
      loginTitle: 'Inloggen',
      signUpTitle: 'Account aanmaken',
      noAccount: 'Nog geen account?',
      hasAccount: 'Heb je al een account?',
      registerNow: 'Meld je aan',
      loginNow: 'Log nu in',
      or: 'of',
      emailRequired: 'Vul je e-mailadres in',
      usernameRequired: 'Vul je gebruikersnaam in',
      usernamePh: 'Jouw naam',
      successLogin: 'E-mail verzonden! Check je inbox voor de inloglink.',
      successRegister: 'Verificatielink verzonden! Check je inbox.',
      errorTitle: 'Inloggen mislukt'
    },
    en: {
      title: 'Welcome to Romety',
      subtitle: 'Find your perfect match tonight',
      email: 'Email address',
      username: 'Username / Name',
      loginBtn: 'Log in',
      signUpBtn: 'Create Account',
      loginTitle: 'Log In',
      signUpTitle: 'Create Account',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      registerNow: 'Sign up',
      loginNow: 'Log in now',
      or: 'or',
      emailRequired: 'Please enter your email',
      usernameRequired: 'Please enter your username',
      usernamePh: 'Your name',
      successLogin: 'E-mail has been sent! Check your inbox for the login link.',
      successRegister: 'Verification link sent! Check your inbox.',
      errorTitle: 'Authentication failed'
    }
  }[lang] || {
    nl: {
      title: 'Welkom bij Romety',
      subtitle: 'Vind je perfecte match vanavond',
      email: 'E-mailadres',
      username: 'Gebruikersnaam / Naam',
      loginBtn: 'Log in',
      signUpBtn: 'Account aanmaken',
      loginTitle: 'Inloggen',
      signUpTitle: 'Account aanmaken',
      noAccount: 'Nog geen account?',
      hasAccount: 'Heb je al een account?',
      registerNow: 'Meld je aan',
      loginNow: 'Log nu in',
      or: 'of',
      emailRequired: 'Vul je e-mailadres in',
      usernameRequired: 'Vul je gebruikersnaam in',
      usernamePh: 'Jouw naam',
      successLogin: 'E-mail verzonden! Check je inbox voor de inloglink.',
      successRegister: 'Verificatielink verzonden! Check je inbox.',
      errorTitle: 'Inloggen mislukt'
    }
  }.nl;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/60' : 'text-gray-500';

  const getRedirectUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirectTo') || '/Onboarding';
  };

  // Handles successful authentication, displays grand celebration, and redirects to Onboarding
  const handleAuthSuccess = async (supaUser, targetUsername) => {
    if (authSuccess) return;
    setAuthSuccess(true);
    setWaitingForVerification(false);

    try {
      const emailLower = (supaUser.email || email).toLowerCase().trim();
      const displayName = (targetUsername || username || supaUser.user_metadata?.display_name || emailLower.split('@')[0]).trim();

      // Ensure UserProfile exists in Supabase
      const existing = await base44.entities.UserProfile.filter({ user_email: emailLower }).catch(() => []);
      if (!existing || existing.length === 0) {
        await base44.entities.UserProfile.create({
          user_email: emailLower,
          display_name: displayName,
          onboarding_complete: false
        }).catch(err => console.warn('Could not create UserProfile:', err));
      } else if (!existing[0].display_name && displayName) {
        await base44.entities.UserProfile.update(existing[0].id, { display_name: displayName }).catch(() => {});
      }

      // Save user to authStorage
      const userObj = {
        id: supaUser.id,
        email: emailLower,
        user_email: emailLower,
        display_name: displayName,
        ...supaUser.user_metadata
      };
      authStorage.saveUser(userObj);
      try {
        localStorage.setItem('romety_registered_username', displayName);
      } catch (e) {}

      // Clean up pending verification state
      sessionStorage.removeItem('romety_pending_verification');

      // Wait 2.2 seconds so user clearly sees the grand celebration before redirecting to Onboarding
      setTimeout(() => {
        window.location.replace('/Onboarding');
      }, 2200);
    } catch (e) {
      console.error('Error in handleAuthSuccess:', e);
      setTimeout(() => {
        window.location.replace('/Onboarding');
      }, 2200);
    }
  };

  // Restore pending verification state from sessionStorage if user returns or refreshes
  useEffect(() => {
    const pendingRaw = sessionStorage.getItem('romety_pending_verification');
    if (pendingRaw) {
      try {
        const pending = JSON.parse(pendingRaw);
        if (pending?.email) {
          setEmail(pending.email);
          if (pending.username) setUsername(pending.username);
          setWaitingForVerification(true);
          setIsRegister(true);
        }
      } catch (e) {}
    }
  }, []);

  // Cooldown countdown for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Active listener for Supabase authentication completion
  useEffect(() => {
    // 1. Initial check (in case user opened email link in this tab or browser)
    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const pendingRaw = sessionStorage.getItem('romety_pending_verification');
          const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
          
          const hasHash = window.location.hash.includes('access_token') || window.location.hash.includes('type=');
          const isVerifiedParam = window.location.search.includes('verified=true');
          
          if (hasHash || isVerifiedParam || pending || waitingForVerification) {
            handleAuthSuccess(session.user, pending?.username);
          }
        }
      } catch (e) {}
    };
    checkCurrentSession();

    // 2. onAuthStateChange from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) {
        const pendingRaw = sessionStorage.getItem('romety_pending_verification');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        handleAuthSuccess(session.user, pending?.username);
      }
    });

    // 3. Periodic polling while waiting for email verification
    const pollInterval = setInterval(async () => {
      if (!waitingForVerification && !sessionStorage.getItem('romety_pending_verification')) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const pendingRaw = sessionStorage.getItem('romety_pending_verification');
          const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
          handleAuthSuccess(session.user, pending?.username);
        }
      } catch (e) {}
    }, 1500);

    // 4. Focus & visibility change (triggers when user switches back from email app to the browser/app)
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const pendingRaw = sessionStorage.getItem('romety_pending_verification');
            const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
            handleAuthSuccess(session.user, pending?.username);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    // 5. Cross-tab storage listener (if user clicked email in another tab on the device)
    const handleStorage = async (e) => {
      if (e.key && (e.key.includes('sb-') || e.key.includes('auth-token') || e.key.includes('romety_user'))) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const pendingRaw = sessionStorage.getItem('romety_pending_verification');
            const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
            handleAuthSuccess(session.user, pending?.username);
          }
        } catch (e) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      subscription.unsubscribe();
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [waitingForVerification]);

  const handleResendEmail = async () => {
    if (resendCooldown > 0 || !email) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const emailLower = email.trim().toLowerCase();
      const usernameTrim = username.trim();
      const { error } = await supabase.auth.signInWithOtp({
        email: emailLower,
        options: {
          emailRedirectTo: `${window.location.origin}/Login?verified=true`,
          data: {
            display_name: usernameTrim
          }
        },
      });
      if (error) throw error;
      setResendCooldown(30);
      setMessage({ 
        type: 'success', 
        text: lang === 'nl' ? 'Nieuwe verificatielink verstuurd naar je e-mail!' : 'New verification link sent to your email!' 
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t.errorTitle });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (!email) {
      setMessage({ type: 'error', text: t.emailRequired });
      setLoading(false);
      return;
    }
    if (!username) {
      setMessage({ type: 'error', text: t.usernameRequired });
      setLoading(false);
      return;
    }

    try {
      const emailLower = email.trim().toLowerCase();
      const usernameTrim = username.trim();

      // Check if profile exists case-insensitively
      const { data: existing, error: checkError } = await supabase
        .from('UserProfile')
        .select('*')
        .ilike('user_email', emailLower);

      if (checkError) throw checkError;
      const hasAccount = existing && existing.length > 0;

      if (isRegister) {
        if (hasAccount) {
          setMessage({
            type: 'error',
            text: lang === 'nl' ? 'Dit e-mailadres is al in gebruik. Log in.' : 'This email address is already in use. Please log in.'
          });
          setLoading(false);
          return;
        }

        // Send OTP magic link with redirectTo pointing back to Login?verified=true
        const { error } = await supabase.auth.signInWithOtp({
          email: emailLower,
          options: {
            emailRedirectTo: `${window.location.origin}/Login?verified=true`,
            data: {
              display_name: usernameTrim
            }
          },
        });
        if (error) throw error;

        // Save pending verification info in sessionStorage and localStorage
        sessionStorage.setItem('romety_pending_verification', JSON.stringify({
          email: emailLower,
          username: usernameTrim,
          timestamp: Date.now()
        }));
        try {
          localStorage.setItem('romety_registered_username', usernameTrim);
        } catch (e) {}

        setResendCooldown(30);
        setWaitingForVerification(true);

      } else {
        if (!hasAccount) {
          setMessage({
            type: 'error',
            text: lang === 'nl' ? 'Dit e-mailadres is nog niet geregistreerd. Creëer een account.' : 'This email address is not registered yet. Create an account.'
          });
          setLoading(false);
          return;
        }

        const profile = existing[0];
        const matchName = (profile.display_name || '').trim().toLowerCase() === usernameTrim.toLowerCase();

        if (!matchName) {
          setMessage({
            type: 'error',
            text: lang === 'nl' ? 'Gebruikersnaam is onjuist.' : 'Username is incorrect.'
          });
          setLoading(false);
          return;
        }

        // Bypass verification email for existing users
        const mockUser = {
          id: profile.id,
          email: (profile.user_email || '').toLowerCase().trim(),
          user_email: (profile.user_email || '').toLowerCase().trim(),
          display_name: profile.display_name,
          avatar: profile.avatar,
          is_mock: true
        };
        authStorage.saveUser(mockUser);

        setMessage({
          type: 'success',
          text: lang === 'nl' ? 'Inloggen succesvol! Je wordt doorgestuurd...' : 'Login successful! Redirecting...'
        });

        setTimeout(() => {
          const destination = profile.onboarding_complete ? '/' : '/Onboarding';
          window.location.replace(destination);
        }, 800);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t.errorTitle });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full max-w-lg mx-auto relative shadow-2xl flex flex-col justify-center items-center px-4 py-10"
      style={{ background: bg, fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full space-y-6">
        {/* Brand/Logo Header */}
        <div className="text-center flex flex-col items-center">
          <div className="flex flex-col items-center mb-3">
            <img 
              src="/romety-logo-transparent.png?v=3" 
              alt="Romety" 
              className="h-16 w-auto object-contain select-none mb-1" 
              style={{
                mixBlendMode: isDark ? 'screen' : 'normal',
                filter: isDark ? 'drop-shadow(0 0 16px rgba(234, 63, 211, 0.5))' : 'drop-shadow(0 4px 12px rgba(255, 75, 114, 0.3))'
              }}
            />
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-8" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>Connect &amp; Meet</span>
              <div className="h-px w-8" style={{ background: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </div>
          </div>
          <p className={`text-sm ${textSub}`}>{t.subtitle}</p>
        </div>

        {/* Auth Card */}
        <div
          className="rounded-[28px] p-6 shadow-2xl border transition-all duration-300 w-full"
          style={{
            background: cardBg,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          }}
        >
          {waitingForVerification ? (
            /* ── WAITING FOR EMAIL VERIFICATION STATE ── */
            <div>
              {/* Animated Envelope Icon with radar ping */}
              <div className="relative mx-auto w-20 h-20 mb-5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 opacity-20 animate-ping" />
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500/20 to-rose-500/10 border border-pink-500/30 flex items-center justify-center backdrop-blur-sm">
                  <Mail className="w-9 h-9 text-pink-500" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-md border-2 border-white dark:border-[#141521]">
                  <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              </div>

              <h2 className={`text-xl font-black text-center mb-1.5 ${textMain}`}>
                Check je e-mail
              </h2>
              <p className={`text-xs text-center mb-5 leading-relaxed ${textSub}`}>
                We hebben een verificatielink gestuurd naar{' '}
                <span className="font-bold text-pink-500 break-all">{email}</span>.
                Klik op de link in je mail om je account te activeren.
              </p>

              {/* Waiting status pill */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5 flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 absolute inset-0 animate-ping" />
                </div>
                <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-300 leading-snug">
                  {lang === 'nl' ? 'Check je mail om je account te activeren!' : 'Check your email to activate your account!'}
                </p>
              </div>

              {/* Alert message if any */}
              {message.text && (
                <div
                  className={`p-3.5 rounded-2xl text-xs font-medium border mb-4 ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <a
                  href="mailto:"
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent text-xs font-bold rounded-2xl text-white bg-gradient-to-r from-[#FF4B72] to-[#EA3FD3] hover:opacity-90 active:scale-98 transition-all shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open e-mail app
                </a>

                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendEmail}
                  className={`w-full py-3 px-4 rounded-2xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer ${
                    isDark 
                      ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10 disabled:opacity-40' 
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 disabled:opacity-40'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  {resendCooldown > 0 
                    ? `Opnieuw versturen over ${resendCooldown}s` 
                    : 'Geen mail ontvangen? Opnieuw versturen'
                  }
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWaitingForVerification(false);
                    sessionStorage.removeItem('romety_pending_verification');
                    setMessage({ type: '', text: '' });
                  }}
                  className={`w-full py-2.5 text-[11px] font-semibold text-center transition-colors cursor-pointer ${textSub} hover:text-pink-500 flex items-center justify-center gap-1`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Ander e-mailadres gebruiken
                </button>
              </div>
            </div>
          ) : (
            /* ── REGULAR FORM (LOGIN / REGISTER) ── */
            <>
              <h2 className={`text-2xl font-black mb-6 ${textMain}`}>
                {isRegister ? t.signUpTitle : t.loginTitle}
              </h2>

              <form onSubmit={handleAuth} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${textSub}`}>
                    {t.email}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-pink-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`block w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all ${
                        isDark ? 'bg-black/30 border-white/10 text-white placeholder-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Username Field */}
                <div>
                  <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${textSub}`}>
                    {t.username}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-pink-400" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t.usernamePh}
                      className={`block w-full pl-11 pr-4 py-3.5 border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent transition-all ${
                        isDark ? 'bg-black/30 border-white/10 text-white placeholder-white/30' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                      }`}
                      required
                    />
                  </div>
                </div>

                {/* Alert Message */}
                {message.text && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-medium border ${
                      message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-[#FF4B72] to-[#EA3FD3] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRegister ? (
                    <>
                      <UserPlus className="w-5 h-5" />
                      {t.signUpBtn}
                    </>
                  ) : (
                    t.loginBtn
                  )}
                </button>
              </form>

              {/* Toggle Login / Register */}
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="text-xs font-medium flex gap-1.5 mt-1">
                  <span className={textSub}>
                    {isRegister ? t.hasAccount : t.noAccount}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(!isRegister);
                      setMessage({ type: '', text: '' });
                    }}
                    className="font-bold text-[#EA3FD3] hover:text-[#ea3fd3]/80 transition-colors cursor-pointer"
                  >
                    {isRegister ? t.loginNow : t.registerNow}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── GRAND CELEBRATION OVERLAY (AUTHENTICATIE VOLTOOID) ── */}
      <AnimatePresence>
        {authSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className={`w-full max-w-sm rounded-[32px] p-7 text-center relative overflow-hidden shadow-2xl border ${
                isDark 
                  ? 'bg-gradient-to-b from-[#18192A] to-[#0F101B] border-pink-500/30 text-white' 
                  : 'bg-white border-pink-200 text-gray-900'
              }`}
              style={{
                boxShadow: '0 0 50px rgba(255, 75, 114, 0.3)'
              }}
            >
              {/* Background ambient glow */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

              {/* Glowing animated checkmark badge */}
              <div className="relative mx-auto w-24 h-24 mb-5 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/30 via-pink-500/20 to-rose-500/30 blur-md"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 15, stiffness: 260, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40 relative z-10"
                >
                  <CheckCircle2 className="w-10 h-10 stroke-[2.8]" />
                </motion.div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-pink-500 flex items-center justify-center text-white shadow-md z-20">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
              </div>

              {/* Title & Subtitle */}
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-black mb-1.5 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-500"
              >
                Authenticatie voltooid! 🎉
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-bold mb-1 opacity-95"
              >
                Welkom bij Romety{username ? `, ${username}` : ''}!
              </motion.p>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs leading-relaxed opacity-65 mb-6 px-2"
              >
                Je e-mailadres is succesvol geverifieerd. We richten nu je account in...
              </motion.p>

              {/* Progress bar to Onboarding */}
              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 2.1, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-full"
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-pink-500 dark:text-pink-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Doorsturen naar Onboarding...</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
