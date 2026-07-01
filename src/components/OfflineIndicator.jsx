import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(() => !navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
          style={{ transform: 'translateX(-50%)' }}
        >
          <div 
            className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border bg-[#141521]/95 backdrop-blur-md shadow-2xl relative"
            style={{
              borderColor: 'rgba(239, 68, 68, 0.35)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(239, 68, 68, 0.15)',
            }}
          >
            {/* Pulsing indicator light */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-500/10 border border-red-500/20">
              <WifiOff className="w-4 h-4 text-red-500 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold tracking-widest text-red-500 uppercase">VERBINDING VERLOREN</p>
              <p className="text-sm font-black text-white mt-0.5">Geen internetverbinding</p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-tight">
                Controleer je verbinding om Romety te blijven gebruiken.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
