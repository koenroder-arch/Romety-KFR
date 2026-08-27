import React, { useState, useRef } from 'react';
import { useLang } from '@/lib/LanguageContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function SplashScreen({ onDone }) {
  const { setLang } = useLang();
  // phase: 'video' → 'language'
  const [phase, setPhase] = useState('video');
  const [selectedLang, setSelectedLang] = useState(null);
  const videoRef = useRef(null);

  const handleVideoEnded = () => {
    const hasLang = localStorage.getItem('welove_lang');
    if (hasLang) {
      onDone();
    } else {
      setPhase('language');
    }
  };

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    setLang(code);
    setTimeout(() => onDone(), 500);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black"
      style={{ zIndex: 2147483647, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lang-fadein { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>

      {/* Video Phase */}
      {phase === 'video' && (
        <div 
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black cursor-pointer"
          onClick={handleVideoEnded}
        >
          <video
            ref={videoRef}
            src="/romety_splashscreen.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Language selection phase */}
      {phase === 'language' && (
        <div className="lang-fadein w-full max-w-sm px-6 text-center">
          <div className="mb-8">
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
              <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>Connect &amp; Meet</span>
              <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>
          <h2 className="text-white text-2xl font-black mb-1">Kies jouw taal</h2>
          <p className="text-gray-400 text-sm mb-8">Select your language</p>

          <div className="space-y-3">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => handleLangSelect(l.code)}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-full transition-all"
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