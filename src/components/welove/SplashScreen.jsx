import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import LaunchScreen, { LAUNCH_BG } from './LaunchScreen';
import RometyLogo from './RometyLogo';

// Zo lang blijft de R minimaal in beeld, ook als de app al klaar is
const MIN_SPLASH_MS = 1100;

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function SplashScreen({ onDone }) {
  const { setLang } = useLang();
  // De splash blijft staan tot de inlogcontrole klaar is; het laadrad laat zien dat de app bezig is
  const { isLoadingAuth } = useAuth();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [phase, setPhase] = useState('logo');
  const [selectedLang, setSelectedLang] = useState(null);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const finishSplash = () => {
    const hasLang = localStorage.getItem('welove_lang');
    if (hasLang) {
      setIsFadingOut(true);
      setTimeout(() => onDone(), 300);
    } else {
      setPhase('language');
    }
  };

  useEffect(() => {
    // Zorg ervoor dat het hele scherm (statusbalk, viewport en overscroll) echt pikzwart (#000000) is tijdens splash
    const originalBg = document.documentElement.style.backgroundColor;
    const originalBodyBg = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = LAUNCH_BG;
    document.body.style.backgroundColor = LAUNCH_BG;

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const originalMetaColor = metaTheme ? metaTheme.getAttribute('content') : null;
    if (metaTheme) {
      metaTheme.setAttribute('content', LAUNCH_BG);
    }

    return () => {
      document.documentElement.style.backgroundColor = originalBg;
      document.body.style.backgroundColor = originalBodyBg;
      if (metaTheme && originalMetaColor) {
        metaTheme.setAttribute('content', originalMetaColor);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (phase === 'logo' && minTimePassed && !isLoadingAuth) finishSplash();
  }, [phase, minTimePassed, isLoadingAuth]);

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    setLang(code);
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => onDone(), 300);
    }, 350);
  };

  if (phase === 'logo') {
    return <LaunchScreen animateIn fadingOut={isFadingOut} />;
  }

  return (
    <div
      className={`fixed inset-0 w-full h-[100dvh] flex items-center justify-center bg-black select-none transition-opacity duration-300 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        zIndex: 2147483647,
        fontFamily: "'Inter', sans-serif",
        backgroundColor: LAUNCH_BG,
      }}
    >
      {/* Language Selection Phase */}
      {phase === 'language' && (
        <div className="w-full max-w-sm px-6 text-center">
          <div className="flex flex-col items-center mb-7">
            <h1 className="m-0">
              <RometyLogo mode="dark" className="h-16 w-auto select-none" />
            </h1>
          </div>
          <h2 className="text-white text-2xl font-black mb-1">{selectedLang === 'en' ? 'Choose your language' : 'Kies jouw taal'}</h2>
          <p className="text-gray-400 text-sm mb-7">Select your language</p>

          <div className="space-y-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLangSelect(l.code);
                }}
                className="w-full flex items-center justify-center px-5 py-4 rounded-full transition-all active:scale-95"
                style={
                  selectedLang === l.code
                    ? { background: GRAD, boxShadow: '0 8px 24px rgba(255,75,114,0.4)' }
                    : { background: '#141521', border: '1.5px solid #FF4B72', boxShadow: '0 0 12px rgba(255,75,114,0.2)' }
                }
              >
                <span className="text-white font-bold text-base">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}