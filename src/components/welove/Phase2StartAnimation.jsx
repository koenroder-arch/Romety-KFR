import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { MessageCircle, X } from 'lucide-react';
import { trNow } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

/**
 * Popup "Fase 2 begint!": een kaart in het midden van het scherm (geen volledig scherm),
 * met de twee foto's die jullie in fase 2 hebben gestuurd en de quote van een match.
 * Verschijnt zodra allebei een foto hebben gestuurd.
 */
export default function Phase2StartAnimation({ myPhoto, theirPhoto, myAvatar, theirAvatar, onClose }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => {
      setVisible(true);
      fireConfetti();
    }, 30);
    return () => clearTimeout(show);
  }, []);

  const close = (e) => {
    e?.stopPropagation();
    if (closing) return;
    setClosing(true);
    setTimeout(() => onClose?.(), 220);
  };

  const shown = visible && !closing;
  const emoji = (avatar) => (avatar ? avatar.split(' ')[0] : '👤');

  const Bubble = ({ photo, avatar, tilt, grad }) => (
    <div
      className="w-[88px] h-[88px] rounded-full overflow-hidden flex items-center justify-center text-4xl"
      style={{
        transform: `rotate(${tilt}deg)`,
        border: `3px solid ${isDark ? '#1A1A2B' : '#FFFFFF'}`,
        boxShadow: '0 8px 24px rgba(255,75,114,0.35)',
        background: grad,
      }}
    >
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" draggable={false} /> : emoji(avatar)}
    </div>
  );

  const content = (
    <div
      onClick={close}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        opacity: shown ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[320px] rounded-[28px] px-6 pt-7 pb-6 text-center"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, #23152E 0%, #14141F 100%)'
            : 'linear-gradient(180deg, #FFF0F6 0%, #FFFFFF 100%)',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,75,114,0.15)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45), 0 0 40px rgba(234,63,211,0.18)',
          transform: shown ? 'scale(1) translateY(0)' : 'scale(0.85) translateY(12px)',
          opacity: shown ? 1 : 0,
          transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
        }}
      >
        <button
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
          aria-label={trNow('Sluiten', 'Close')}
        >
          <X className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }} />
        </button>

        {/* Jullie twee foto's, licht overlappend met een hartje ertussen */}
        <div className="relative flex items-center justify-center mb-5 mt-1">
          <div className="-mr-3 z-10"><Bubble photo={myPhoto} avatar={myAvatar} tilt={-6} grad="linear-gradient(135deg,#8E54E9,#FF4B72)" /></div>
          <div className="-ml-3"><Bubble photo={theirPhoto} avatar={theirAvatar} tilt={6} grad="linear-gradient(135deg,#FF4B72,#EA3FD3)" /></div>
          <div
            className="absolute z-20 w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{
              bottom: -6,
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              border: `3px solid ${isDark ? '#1A1A2B' : '#FFFFFF'}`,
              boxShadow: '0 4px 12px rgba(255,75,114,0.5)',
            }}
          >
            💕
          </div>
        </div>

        <h2
          className="text-[26px] font-black leading-tight"
          style={{
            background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          {trNow('Fase 2 begint!', 'Phase 2 begins!')}
        </h2>

        {/* Zelfde quote als bij een (super)match */}
        <p
          className="text-[26px] mt-1 mb-2"
          style={{
            color: '#F5B700',
            fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive",
            transform: 'rotate(-3deg)',
          }}
        >
          Let the good times roll
        </p>

        <p className="text-[13px] leading-relaxed mb-5" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(17,24,39,0.6)' }}>
          {trNow("Jullie foto's zijn nu zichtbaar en jullie kunnen weer verder chatten.", 'Your photos are now visible and you can keep chatting.')}
        </p>

        <button
          onClick={close}
          className="w-full py-3 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white active:scale-95 transition-transform"
          style={{
            background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
            boxShadow: '0 8px 22px rgba(255,75,114,0.45)',
          }}
        >
          {trNow('Verder chatten', 'Keep chatting')}
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

// Kort feestelijk confettiwolkje vanuit het midden
function fireConfetti() {
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '10000', pointerEvents: 'none' });
  document.body.appendChild(canvas);
  const shoot = confetti.create(canvas, { resize: true, useWorker: true });
  shoot({
    particleCount: 70,
    spread: 75,
    startVelocity: 32,
    origin: { x: 0.5, y: 0.42 },
    colors: ['#FF4B72', '#EA3FD3', '#8E54E9', '#FFB84D'],
    shapes: ['circle'],
    scalar: 0.9,
    ticks: 120,
    disableForReducedMotion: true,
  });
  setTimeout(() => canvas.remove(), 2500);
}
