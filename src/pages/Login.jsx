import React, { useState } from 'react';
import { supabase } from '@/api/supabaseClient';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { Mail, Loader2, UserPlus, User } from 'lucide-react';
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
