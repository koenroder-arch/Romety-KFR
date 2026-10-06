import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '@/lib/LanguageContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const LANGUAGES = [
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export default function Language() {
  const { setLang } = useLang();
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState(null);

  const handleLangSelect = (code) => {
    setSelectedLang(code);
    setLang(code);
    localStorage.setItem('welove_lang', code);
    sessionStorage.setItem('romety_splash_shown', 'true');
    setTimeout(() => {
      navigate('/Onboarding');
    }, 350);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black overflow-hidden select-none"
      style={{
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
        backgroundColor: '#000000',
      }}
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .lang-fadein { animation: fadeInUp 0.5s ease-out forwards; }
      `}</style>

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
    </div>
  );
}
