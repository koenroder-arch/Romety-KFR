import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { Heart, MessageCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MatchAnimation({ myProfile, matchedProfile, onDone, onSendHint }) {
  const [visible, setVisible] = useState(false);
  const [hasSentToday, setHasSentToday] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [myTodayHint, setMyTodayHint] = useState(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  useEffect(() => {
    if (!myProfile?.user_email) return;
    
    const fetchRecentHint = async () => {
      try {
        const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
        const hints = await base44.entities.Hint.filter({ from_email: myProfile.user_email });
        const recentHints = hints.filter(h => h.created_date >= nineHoursAgo);
        if (recentHints.length > 0) {
          setHasSentToday(true);
          recentHints.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          setMyTodayHint(recentHints[0]);
        } else {
          setHasSentToday(false);
          setMyTodayHint(null);
        }
      } catch (e) {
        console.error("Error checking hint limit in MatchAnimation:", e);
      }
    };

    fetchRecentHint();
  }, [myProfile?.user_email]);

  useEffect(() => {
    if (!hasSentToday || !myTodayHint) return;
    const calcTime = () => {
      const now = new Date();
      const created = new Date(myTodayHint.created_date);
      const expiry = new Date(created.getTime() + 9 * 60 * 60 * 1000);
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft('Nu beschikbaar');
        setHasSentToday(false);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}u ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    };
    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [hasSentToday, myTodayHint]);

  useEffect(() => {
    const show = setTimeout(() => {
      setVisible(true);
      fireConfetti();
    }, 30);
    return () => clearTimeout(show);
  }, []);

  const fireConfetti = () => {
    const duration = 1500;
    const end = Date.now() + duration;

    const myCanvas = document.createElement('canvas');
    myCanvas.style.position = 'fixed';
    myCanvas.style.inset = '0';
    myCanvas.style.width = '100vw';
    myCanvas.style.height = '100vh';
    myCanvas.style.zIndex = '10000';
    myCanvas.style.pointerEvents = 'none';
    document.body.appendChild(myCanvas);

    const myConfetti = confetti.create(myCanvas, {
      resize: true,
      useWorker: true
    });

    (function frame() {
      myConfetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: -0.05, y: 0.75 },
        colors: ['#FF4B72', '#EA3FD3', '#8E54E9', '#FFB84D'],
        shapes: ['circle'],
        disableForReducedMotion: true,
        scalar: 1.0,
        gravity: 1.0,
        ticks: 80,
        startVelocity: 28
      });
      myConfetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1.05, y: 0.75 },
        colors: ['#FF4B72', '#EA3FD3', '#8E54E9', '#FFB84D'],
        shapes: ['circle'],
        disableForReducedMotion: true,
        scalar: 1.0,
        gravity: 1.0,
        ticks: 80,
        startVelocity: 28
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      } else {
        setTimeout(() => {
          if (myCanvas.parentNode) {
            myCanvas.parentNode.removeChild(myCanvas);
          }
        }, 1000);
      }
    }());
  };

  const myPhoto = myProfile?.photo_url;
  const theirPhoto = matchedProfile?.photo_url;

  const content = (
    <div
      onClick={onDone}
      className="fixed inset-0 flex flex-col items-center justify-center z-[9999] cursor-pointer"
      style={{
        background: 'radial-gradient(circle at center, #2C1635 0%, #0A0A10 80%)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlow {
          0%, 100% { filter: drop-shadow(0 0 20px rgba(234,63,211,0.6)); }
          50% { filter: drop-shadow(0 0 40px rgba(255,75,114,1)); }
        }
        @keyframes floatRays {
          0% { transform: rotate(0deg); opacity: 0.2; }
          50% { opacity: 0.5; }
          100% { transform: rotate(360deg); opacity: 0.2; }
        }
        .anim-pop { animation: popIn 0.8s cubic-bezier(0.22,1,0.36,1) forwards; }
        .heart-glow { animation: pulseGlow 2s ease-in-out infinite; }
      `}</style>

      {/* Background Rays */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div 
          className="absolute w-[200vw] h-[200vw]"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,75,114,0.15) 15deg, transparent 30deg, rgba(234,63,211,0.15) 45deg, transparent 60deg, rgba(255,75,114,0.15) 75deg, transparent 90deg, rgba(234,63,211,0.15) 105deg, transparent 120deg, rgba(255,75,114,0.15) 135deg, transparent 150deg, rgba(234,63,211,0.15) 165deg, transparent 180deg, rgba(255,75,114,0.15) 195deg, transparent 210deg, rgba(234,63,211,0.15) 225deg, transparent 240deg, rgba(255,75,114,0.15) 255deg, transparent 270deg, rgba(234,63,211,0.15) 285deg, transparent 300deg, rgba(255,75,114,0.15) 315deg, transparent 330deg, rgba(234,63,211,0.15) 345deg, transparent 360deg)',
            animation: 'floatRays 90s linear infinite'
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full px-6 anim-pop">
        {/* Top Heart Icon */}
        <Heart className="w-10 h-10 text-white mb-6" strokeWidth={1.5} style={{ filter: 'drop-shadow(0 0 12px rgba(255,255,255,0.8))' }} />
        
        {/* Title */}
        <h1 className="text-[44px] font-black text-white text-center leading-none tracking-tight mb-8" style={{ textShadow: '0 4px 20px rgba(255,75,114,0.6)' }}>
          It's a Match!
        </h1>

        {/* Center Split Heart */}
        <div className="relative mb-8 heart-glow" style={{ width: 280, height: 280 }}>
          <svg width="280" height="280" viewBox="0 0 240 240">
            <defs>
              <clipPath id="heartClipLeft">
                <path d="M120 210 C60 170 20 130 20 80 C20 50 45 30 70 30 C90 30 108 42 120 58 L120 210Z" />
              </clipPath>
              <clipPath id="heartClipRight">
                <path d="M120 210 L120 58 C132 42 150 30 170 30 C195 30 220 50 220 80 C220 130 180 170 120 210Z" />
              </clipPath>
              <linearGradient id="gradLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8E54E9" />
                <stop offset="100%" stopColor="#FF4B72" />
              </linearGradient>
            </defs>

            {/* Left Photo/Avatar */}
            <g clipPath="url(#heartClipLeft)">
              {myPhoto ? (
                <image
                  href={myPhoto}
                  x="20"
                  y="30"
                  width="100"
                  height="180"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g>
                  <rect x="20" y="30" width="100" height="180" fill="url(#gradLeft)" />
                  <text
                    x="70"
                    y="120"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFF"
                    fontSize="40"
                  >
                    {myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}
                  </text>
                </g>
              )}
            </g>

            {/* Right Photo/Avatar */}
            <g clipPath="url(#heartClipRight)">
              {theirPhoto ? (
                <image
                  href={theirPhoto}
                  x="120"
                  y="30"
                  width="100"
                  height="180"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <g>
                  <rect x="120" y="30" width="100" height="180" fill="#F03E8F" />
                  <text
                    x="170"
                    y="120"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#FFF"
                    fontSize="40"
                  >
                    {matchedProfile?.avatar ? matchedProfile.avatar.split(' ')[0] : '👤'}
                  </text>
                </g>
              )}
            </g>

            {/* Outer Glowing Stroke */}
            <path
              d="M120 210 C60 170 20 130 20 80 C20 50 45 30 70 30 C90 30 108 42 120 58 C132 42 150 30 170 30 C195 30 220 50 220 80 C220 130 180 170 120 210Z"
              fill="none"
              stroke="#FFF"
              strokeWidth="3.5"
              style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.9))' }}
            />
            {/* Center Split Line */}
            <line x1="120" y1="58" x2="120" y2="210" stroke="#FFF" strokeWidth="2" strokeOpacity="0.9" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))' }} />
          </svg>
        </div>

        {/* Cursive Text */}
        <p 
          className="text-[#FFD700] text-[34px] mb-8" 
          style={{ 
            fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive", 
            textShadow: '0 2px 10px rgba(255,75,114,0.8)',
            transform: 'rotate(-4deg)'
          }}
        >
          Let the good times roll
        </p>

        {/* Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasSentToday) {
              setShowLimitPopup(true);
            } else if (onSendHint) {
              onSendHint(matchedProfile);
            } else {
              onDone();
            }
          }}
          className="w-full max-w-[300px] py-4 rounded-full flex items-center justify-center gap-3 active:scale-95 transition-transform relative overflow-hidden"
          style={{
            background: 'linear-gradient(90deg, #FF4B72 0%, #FFB84D 100%)',
            boxShadow: '0 8px 30px rgba(255,75,114,0.6)'
          }}
        >
          <div className="absolute inset-0 bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
          <span className="text-white font-bold text-[18px]">Stuur een hint</span>
          <MessageCircle className="w-6 h-6 text-white" fill="white" strokeWidth={1} />
        </button>

        {/* Skip text */}
        <div 
          className="mt-6 text-white/60 text-[15px] font-semibold tracking-wide py-2 px-4"
        >
          Tik om door te gaan
        </div>

      </div>

      {/* Daily limit modal popup overlay */}
      {showLimitPopup && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 cursor-default animate-fade-in"
          onClick={(e) => {
            e.stopPropagation(); // Prevent closing MatchAnimation when clicking the overlay background
          }}
        >
          <div 
            className="w-full max-w-sm rounded-[28px] p-6 text-center border border-white/10 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(30, 20, 40, 0.95)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            {/* Visual element / Locked message icon */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 75, 114, 0.2) 0%, rgba(234, 63, 211, 0.2) 100%)',
                border: '1.5px solid rgba(255, 75, 114, 0.4)'
              }}
            >
              <MessageCircle className="w-8 h-8 text-pink-500" strokeWidth={1.5} />
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#1E1428]">
                ⏱️
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Hint limiet bereikt</h3>
            
            <p className="text-[15px] leading-relaxed text-white/80 mb-6">
              Je hebt al eerder een hint gestuurd vandaag, na <span className="font-extrabold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">{timeLeft || '...'}</span> kan je weer een hint sturen.
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLimitPopup(false);
              }}
              className="w-full py-3.5 rounded-full font-bold text-[16px] text-white active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(90deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 4px 15px rgba(255, 75, 114, 0.4)'
              }}
            >
              Oke
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}