import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { Mail, Loader2, Sparkles, LogIn, UserPlus, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { authStorage } from '@/lib/authStorage';

export default function Login() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const t = {
    nl: {
      title: 'Welkom bij Romety',
      subtitle: 'Vind je perfecte match vanavond',
      email: 'E-mailadres',
      username: 'Gebruikersnaam / Naam',
      loginBtn: 'Log in',
      signUpBtn: 'Stuur registratielink',
      loginTitle: 'Inloggen',
      signUpTitle: 'Account aanmaken*',
      noAccount: 'Nog geen account?',
      hasAccount: 'Heb je al een account?',
      registerNow: 'Meld je aan',
      loginNow: 'Log nu in',
      or: 'of',
      emailRequired: 'Vul je e-mailadres in',
      usernameRequired: 'Vul je gebruikersnaam in',
      usernamePh: 'Jouw naam',
      successLogin: 'E-mail verzonden! Check je inbox voor de inloglink.',
      successRegister: 'E-mail verzonden! Check je inbox voor de registratielink.',
      errorTitle: 'Inloggen mislukt'
    },
    en: {
      title: 'Welcome to Romety',
      subtitle: 'Find your perfect match tonight',
      email: 'Email address',
      username: 'Username / Name',
      loginBtn: 'Send login link',
      signUpBtn: 'Send registration link',
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
      successRegister: 'E-mail has been sent! Check your inbox for the registration link.',
      errorTitle: 'Authentication failed'
    }
  }[lang] || {
    nl: {
      title: 'Welkom bij Romety',
      subtitle: 'Vind je perfecte match vanavond',
      email: 'E-mailadres',
      username: 'Gebruikersnaam / Naam',
      loginBtn: 'Log in',
      signUpBtn: 'Stuur registratielink',
      loginTitle: 'Inloggen',
      signUpTitle: 'Account aanmaken*',
      noAccount: 'Nog geen account?',
      hasAccount: 'Heb je al een account?',
      registerNow: 'Meld je aan',
      loginNow: 'Log nu in',
      or: 'of',
      emailRequired: 'Vul je e-mailadres in',
      usernameRequired: 'Vul je gebruikersnaam in',
      usernamePh: 'Jouw naam',
      successLogin: 'E-mail verzonden! Check je inbox voor de inloglink.',
      successRegister: 'E-mail verzonden! Check je inbox voor de registratielink.',
      errorTitle: 'Inloggen mislukt'
    }
  }.nl;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-white/60' : 'text-gray-500';

  const getRedirectUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirectTo') || '/';
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

        // Send OTP magic link — profile will be created AFTER the user clicks the link
        // The display_name is saved in the OTP metadata so AuthContext can use it post-verification
        const { error } = await supabase.auth.signInWithOtp({
          email: emailLower,
          options: {
            emailRedirectTo: window.location.origin + getRedirectUrl(),
            data: {
              display_name: usernameTrim
            }
          },
        });
        if (error) throw error;

        // Do NOT create profile here — only after email verification!
        setMessage({ type: 'success', text: t.successRegister });

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
          window.location.replace(getRedirectUrl());
        }, 800);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t.errorTitle });
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + getRedirectUrl(),
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage({ type: 'error', text: err.message || t.errorTitle });
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-center items-center px-4 py-12"
      style={{ background: bg, fontFamily: "'Inter', sans-serif" }}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Brand/Logo Header */}
        <div className="text-center">
          <div className="flex flex-col items-center gap-2 mb-6">
            <h1
              className="font-black tracking-tight leading-none"
              style={{
                fontSize: '3rem',
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              ROMETY
            </h1>
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
          className="rounded-[30px] p-8 shadow-2xl border transition-all duration-300"
          style={{
            background: cardBg,
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          }}
        >
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
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-bold rounded-2xl text-white bg-gradient-to-r from-[#FF4B72] to-[#EA3FD3] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
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

          {/* Divider */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>
            </div>
            <span className={`relative px-4 text-xs font-semibold uppercase tracking-wider ${isDark ? 'bg-[#141521]' : 'bg-white'}`} style={{ color: textSub }}>
              {t.or || 'of'}
            </span>
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 border rounded-2xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 ${
                isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 2.69-1.3 3.47v2.88h2.09c1.23-1.13 2.17-2.8 2.17-5.2z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.87-3c-1.08.72-2.45 1.16-4.09 1.16-3.15 0-5.81-2.13-6.76-5.01H1.27v3.1C3.25 21.27 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.24 14.24a7.16 7.16 0 0 1 0-4.48v-3.1H1.27a11.94 11.94 0 0 0 0 10.68l3.97-3.1z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.73 1.27 6.66l3.97 3.1c.95-2.88 3.61-5.01 6.76-5.01z"/>
              </svg>
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading}
              className={`flex items-center justify-center gap-2.5 py-3.5 px-4 border rounded-2xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 ${
                isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-gray-100'
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill={isDark ? '#FFFFFF' : '#000000'}>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.62.72-1.16 1.87-1.01 2.97 1.11.09 2.27-.57 2.96-1.41z"/>
              </svg>
              Apple
            </button>
          </div>

          {/* Toggle Login / Register */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="text-xs font-medium flex gap-1.5 mt-1">
              <span className={textSub}>
                {isRegister ? t.hasAccount : t.noAccount}
              </span>
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setMessage({ type: '', text: '' });
                }}
                className="font-bold text-[#EA3FD3] hover:text-[#ea3fd3]/80 transition-colors"
              >
                {isRegister ? t.loginNow : t.registerNow}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
