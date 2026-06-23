import React, { useEffect, useState } from 'react';

export default function FinishAnimation({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const duration = 4000;
    const start = Date.now();
    let animFrame;
    let completed = false;

    const update = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        animFrame = requestAnimationFrame(update);
      } else if (!completed) {
        completed = true;
        setTimeout(onComplete, 200);
      }
    };

    animFrame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(animFrame);
      completed = true;
    };
  }, [onComplete]);

  const offset = circumference * (1 - progress);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}>
      <div className="text-center">
        <div className="relative w-44 h-44 mx-auto mb-6">
          <svg className="w-44 h-44" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
            <circle
              cx="70" cy="70" r={radius} fill="none"
              stroke="white" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-white text-2xl font-black">Welove</span>
            <span className="text-white/70 text-sm font-semibold mt-1">{Math.round(progress * 100)}%</span>
          </div>
        </div>
        <p className="text-white font-semibold text-base mb-1">Account wordt geconfigureerd</p>
        <p className="text-white/60 text-sm">Even geduld...</p>
      </div>
    </div>
  );
}