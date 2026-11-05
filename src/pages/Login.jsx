import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { 
  Mail, Loader2, UserPlus, User, CheckCircle2, Sparkles, 
  Clock, ArrowLeft, RefreshCw, ExternalLink, Heart, ClipboardPaste, KeyRound, Check 
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

  // 8-digit OTP verification state
  const [otpCode, setOtpCode] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pastedSuccess, setPastedSuccess] = useState(false);
  const otpInputRef = useRef(null);

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
        ...supaUser.user_metadata,
        display_name: existing?.[0]?.display_name || displayName,
      };
      authStorage.saveUser(userObj);
      try {
        localStorage.setItem('romety_registered_username', displayName);
      } catch (e) {}

      // Clean up pending verification state
      sessionStorage.removeItem('romety_pending_verification');

      // Bestaande gebruiker met afgeronde onboarding gaat direct naar Home, anders naar taalkeuze
      const destination = existing?.[0]?.onboarding_complete ? '/' : '/Language';
      setTimeout(() => {
        window.location.replace(destination);
      }, 2200);
    } catch (e) {
      console.error('Error in handleAuthSuccess:', e);
      setTimeout(() => {
        window.location.replace('/Language');
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
          setIsRegister(pending.mode !== 'login');
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

  const handleVerifyOtp = async (codeOverride) => {
    const code = (codeOverride || otpCode).replace(/\D/g, '').trim();
    if (code.length < 6) {
      setMessage({
        type: 'error',
        text: lang === 'nl' ? 'Vul de verificatiecode in.' : 'Please enter the verification code.'
      });
      return;
    }
    setVerifyingOtp(true);
    setMessage({ type: '', text: '' });
    try {
      const emailLower = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: emailLower,
        token: code,
        type: 'email'
      });
      if (error) throw error;
      if (data?.user) {
        const pendingRaw = sessionStorage.getItem('romety_pending_verification');
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        handleAuthSuccess(data.user, pending?.username);
      }
    } catch (err) {
      console.warn('verifyOtp error:', err);
      setMessage({
        type: 'error',
        text: err.message || (lang === 'nl' ? 'De verificatiecode is onjuist of verlopen.' : 'The verification code is incorrect or expired.')
      });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleOtpChange = (val) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 8);
    setOtpCode(digitsOnly);
    if (digitsOnly.length === 8) {
      handleVerifyOtp(digitsOnly);
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleanDigits = (text || '').replace(/\D/g, '').slice(0, 8);
      if (cleanDigits.length >= 6) {
        setOtpCode(cleanDigits);
        setPastedSuccess(true);
        setTimeout(() => setPastedSuccess(false), 2000);
        handleVerifyOtp(cleanDigits);
      } else if (cleanDigits.length > 0) {
        setOtpCode(cleanDigits);
        otpInputRef.current?.focus();
      } else {
        setMessage({
          type: 'error',
          text: lang === 'nl' ? 'Geen code gevonden op het klembord. Kopieer eerst de code uit je e-mail.' : 'No code found on the clipboard. Copy the code from your email first.'
        });
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
      otpInputRef.current?.focus();
    }
  };

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
        text: lang === 'nl' ? 'Nieuwe verificatiecode verstuurd naar je e-mail!' : 'New verification code sent to your email!' 
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

      // Check of er al een account is via een beveiligde databasefunctie
      // (de profieltabel zelf is niet leesbaar zonder login).
      const { data: hasAccount, error: checkError } = await supabase.rpc('account_exists', { p_email: emailLower });

      if (checkError) throw checkError;

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

        // Bestaande gebruikers loggen ook in via Supabase: een code/link per e-mail.
        // Zo krijgt de gebruiker een echte sessie en werkt de database-beveiliging (RLS).
        const { error } = await supabase.auth.signInWithOtp({
          email: emailLower,
          options: {
            emailRedirectTo: `${window.location.origin}/Login?verified=true`,
            data: { display_name: usernameTrim }
          },
        });
        if (error) throw error;

        sessionStorage.setItem('romety_pending_verification', JSON.stringify({
          email: emailLower,
          username: usernameTrim,
          mode: 'login',
          timestamp: Date.now()
        }));

        setResendCooldown(30);
        setWaitingForVerification(true);
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
        >          {waitingForVerification ? (
            /* ── WAITING FOR EMAIL VERIFICATION STATE (CALM, 8-DIGIT, ZERO-LAG) ── */
            <div>
              <div className="w-13 h-13 rounded-2xl mx-auto mb-3 bg-gradient-to-tr from-pink-500/20 to-purple-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500">
                <Mail className="w-6 h-6" />
              </div>

              <h2 className={`text-xl font-black text-center mb-1 ${textMain}`}>
                {lang === 'nl' ? 'Check je e-mail' : 'Check your email'}
              </h2>
              <p className={`text-xs text-center mb-6 leading-relaxed ${textSub}`}>
                {lang === 'nl' ? 'Code gestuurd naar' : 'Code sent to'} <span className="font-bold text-pink-500 break-all">{email}</span>
              </p>

              {/* ── 8-DIGIT OTP FIELD (ONE NATIVE INPUT = ZERO STUTTER) ── */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                    {lang === 'nl' ? '8-cijferige code' : '8-digit code'}
                  </span>
                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer ${
                      pastedSuccess
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-500 dark:text-emerald-400'
                        : isDark
                          ? 'bg-pink-500/10 border-pink-500/30 text-pink-400 hover:bg-pink-500/20'
                          : 'bg-pink-50 border-pink-200 text-pink-600 hover:bg-pink-100'
                    }`}
                  >
                    {pastedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{lang === 'nl' ? 'Geplakt!' : 'Pasted!'}</span>
                      </>
                    ) : (
                      <>
                        <ClipboardPaste className="w-3.5 h-3.5" />
                        <span>{lang === 'nl' ? 'Plakken' : 'Paste'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Visual 8 slots */}
                <div 
                  className="relative w-full cursor-text"
                  onClick={() => otpInputRef.current?.focus()}
                >
                  <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
                    {Array.from({ length: 8 }, (_, idx) => {
                      const char = otpCode[idx] || '';
                      const isCurrent = otpCode.length === idx;
                      return (
                        <div
                          key={idx}
                          className={`h-12 sm:h-13 rounded-xl border flex items-center justify-center text-lg sm:text-xl font-black transition-all ${
                            char
                              ? 'border-pink-500 bg-pink-500/10 text-pink-500 shadow-xs'
                              : isCurrent
                                ? 'border-pink-500 bg-pink-500/5 ring-2 ring-pink-500/25'
                                : isDark
                                  ? 'border-white/10 bg-white/5 text-white'
                                  : 'border-gray-200 bg-gray-50 text-gray-900'
                          }`}
                        >
                          {char || (isCurrent ? <span className="w-0.5 h-5 bg-pink-500 animate-pulse rounded-full" /> : '')}
                        </div>
                      );
                    })}
                  </div>

                  {/* Real hidden input covering entire area: smooth native typing on iOS */}
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    autoComplete="one-time-code"
                    value={otpCode}
                    onChange={e => handleOtpChange(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-text w-full h-full text-transparent selection:bg-transparent"
                    autoFocus
                  />
                </div>
              </div>

              {/* Verify Button */}
              <button
                type="button"
                disabled={verifyingOtp || otpCode.length < 6}
                onClick={() => handleVerifyOtp()}
                className="w-full mb-3 py-3.5 px-4 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-[#FF4B72] to-[#EA3FD3] shadow-md hover:opacity-90 active:scale-98 transition-all disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
              >
                {verifyingOtp ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'nl' ? 'Verifiëren...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>{lang === 'nl' ? 'Code bevestigen' : 'Confirm code'}</span>
                  </>
                )}
              </button>

              {/* Alert message if any */}
              {message.text && (
                <div
                  className={`p-3 rounded-2xl text-xs font-medium border mb-3 text-center ${
                    message.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {message.text}
                </div>
              )}

              {/* Clean secondary links (no heavy extra buttons) */}
              <div className="pt-2 flex flex-col items-center gap-2.5 text-xs">
                <button
                  type="button"
                  disabled={loading || resendCooldown > 0}
                  onClick={handleResendEmail}
                  className={`font-semibold transition-colors cursor-pointer ${textSub} hover:text-pink-500 disabled:opacity-40 flex items-center gap-1.5`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>
                    {resendCooldown > 0 
                      ? (lang === 'nl' ? `Nieuwe code over ${resendCooldown}s` : `New code in ${resendCooldown}s`) 
                      : (lang === 'nl' ? 'Geen code ontvangen? Opnieuw versturen' : 'No code received? Send again')
                    }
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWaitingForVerification(false);
                    setOtpCode('');
                    sessionStorage.removeItem('romety_pending_verification');
                    setMessage({ type: '', text: '' });
                  }}
                  className={`text-[11px] font-semibold transition-colors cursor-pointer opacity-60 hover:opacity-100 ${textSub} hover:text-pink-500 flex items-center gap-1`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'nl' ? 'Ander e-mailadres gebruiken' : 'Use a different email address'}</span>
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
                {lang === 'nl' ? 'Authenticatie voltooid! 🎉' : 'Authentication complete! 🎉'}
              </motion.h2>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm font-bold mb-1 opacity-95"
              >
                {lang === 'nl' ? 'Welkom bij Romety' : 'Welcome to Romety'}{username ? `, ${username}` : ''}!
              </motion.p>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xs leading-relaxed opacity-65 mb-6 px-2"
              >
                {lang === 'nl' ? 'Je e-mailadres is succesvol geverifieerd. We richten nu je account in...' : 'Your email address has been verified. We are now setting up your account...'}
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
                <span>{lang === 'nl' ? 'Doorsturen naar taalkeuze...' : 'Redirecting to language selection...'}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
