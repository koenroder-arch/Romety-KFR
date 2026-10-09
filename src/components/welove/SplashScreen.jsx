import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function SplashScreen({ onDone }) {
  const { setLang } = useLang();
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
    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    const originalMetaColor = metaTheme ? metaTheme.getAttribute('content') : null;
    if (metaTheme) {
      metaTheme.setAttribute('content', '#000000');
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
    if (phase !== 'logo') return;
    const timer = setTimeout(() => {
      finishSplash();
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    setLang(code);
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => onDone(), 300);
    }, 350);
  };

  return (
    <div
      onClick={phase === 'logo' ? finishSplash : undefined}
      className={`fixed inset-0 w-full h-[100dvh] flex items-center justify-center bg-black select-none transition-opacity duration-300 ${isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      style={{
        zIndex: 2147483647,
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#000000',
      }}
    >
      {/* Logo Phase - Only the logo image, centered, static & zero-lag with the iconic glow */}
      {phase === 'logo' && (
        <div className="flex items-center justify-center cursor-pointer select-none">
          <img
            src="/icon-192.png"
            alt="Romety"
            className="w-28 h-28 object-cover rounded-[28px]"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(234, 63, 211, 0.65)) drop-shadow(0 0 40px rgba(255, 75, 114, 0.4))',
            }}
            draggable={false}
          />
        </div>
      )}

      {/* Language Selection Phase */}
      {phase === 'language' && (
        <div className="w-full max-w-sm px-6 text-center">
          <div className="flex flex-col items-center mb-7">
            <img
              src="/icon-192.png"
              alt="Romety"
              className="w-16 h-16 object-cover rounded-2xl mb-3 border border-white/10"
              style={{
                boxShadow: '0 10px 30px rgba(255, 75, 114, 0.3)',
              }}
              draggable={false}
            />
            <h1
              className="text-xl font-black"
              style={{
                background: GRAD,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Romety
            </h1>
          </div>
          <h2 className="text-white text-2xl font-black mb-1">Kies jouw taal</h2>
          <p className="text-gray-400 text-sm mb-7">Select your language</p>

          <div className="space-y-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLangSelect(l.code);
                }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-full transition-all active:scale-95"
                style={
                  selectedLang === l.code
                    ? { background: GRAD, boxShadow: '0 8px 24px rgba(255,75,114,0.4)' }
                    : { background: '#141521', border: '1.5px solid #FF4B72', boxShadow: '0 0 12px rgba(255,75,114,0.2)' }
                }
              >
                <span className="text-2xl">{l.flag}</span>
                <span className="text-white font-bold text-base">{l.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}