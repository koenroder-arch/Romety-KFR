import React, { useState, useRef, useEffect } from 'react';
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

  // Synchronize document background & theme-color to pure pitch black (#000000) during splashscreen
  useEffect(() => {
    const origHtmlBg = document.documentElement.style.backgroundColor;
    const origBodyBg = document.body.style.backgroundColor;
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const origThemeColor = themeMeta ? themeMeta.getAttribute('content') : '#08090E';

    document.documentElement.style.backgroundColor = '#000000';
    document.body.style.backgroundColor = '#000000';
    if (themeMeta) {
      themeMeta.setAttribute('content', '#000000');
    }

    return () => {
      document.documentElement.style.backgroundColor = origHtmlBg;
      document.body.style.backgroundColor = origBodyBg;
      if (themeMeta) {
        themeMeta.setAttribute('content', origThemeColor || '#08090E');
      }
    };
  }, []);

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
      className="fixed -inset-10 flex items-center justify-center bg-black overflow-hidden select-none"
      style={{
        zIndex: 2147483647,
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#000000',
        width: 'calc(100vw + 80px)',
        height: 'calc(100dvh + 80px)',
        minHeight: '-webkit-fill-available'
      }}
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
          className="absolute inset-0 w-full h-full flex items-center justify-center bg-black cursor-pointer select-none"
          style={{ backgroundColor: '#000000' }}
          onClick={handleVideoEnded}
        >
          <video
            ref={videoRef}
            src="/romety_splashscreen.mp4"
            autoPlay
            muted
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain bg-black"
            style={{ backgroundColor: '#000000' }}
          />
        </div>
      )}

      {/* Language selection phase */}
      {phase === 'language' && (
        <div className="lang-fadein w-full max-w-sm px-6 text-center">
          <div className="flex flex-col items-center mb-8">
            <img 
              src="/romety-logo-transparent.png?v=3" 
              alt="Romety" 
              className="h-20 w-auto object-contain select-none mb-2" 
              style={{
                mixBlendMode: 'screen',
                filter: 'drop-shadow(0 0 20px rgba(234, 63, 211, 0.6)) drop-shadow(0 0 40px rgba(255, 75, 114, 0.35))'
              }}
            />
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
              <span className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>Connect &amp; Meet</span>
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