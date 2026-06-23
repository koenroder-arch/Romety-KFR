import React, { useState, useEffect } from 'react';
import { useLang } from '@/lib/LanguageContext';


const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function SplashScreen({ onDone }) {
  const { setLang } = useLang();
  // phase: 'logo' → 'zoom' → 'language'
  const [phase, setPhase] = useState('logo');
  const [selectedLang, setSelectedLang] = useState(null);

  useEffect(() => {
    const hasLang = localStorage.getItem('welove_lang');
    const t1 = setTimeout(() => setPhase('zoom'), 1500);
    const t2 = setTimeout(() => {
      if (hasLang) {
        onDone();
      } else {
        setPhase('language');
      }
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    setLang(code);
    setTimeout(() => onDone(), 500);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ background: '#08090E', zIndex: 2147483647, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @keyframes zoomIn {
          from { transform: scale(1); opacity: 1; }
          to   { transform: scale(30); opacity: 0; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .splash-zoom { animation: zoomIn 0.7s ease-in forwards; }
        .lang-fadein { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>

      {/* Logo phase */}
       {phase !== 'language' && phase !== 'theme' && (
         <div className={`flex flex-col items-center gap-2 ${phase === 'zoom' ? 'splash-zoom' : ''}`}>
           <h1
             className="font-black tracking-tight leading-none"
             style={{
               fontSize: '3.5rem',
               background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               letterSpacing: '-0.02em',
             }}
           >
             ROMETY
           </h1>
           <div className="flex items-center gap-2">
             <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
             <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'rgba(255,255,255,0.45)' }}>Connect &amp; Meet</span>
             <div className="h-px w-8" style={{ background: 'rgba(255,255,255,0.25)' }} />
           </div>
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