import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Gamepad2, Clock } from 'lucide-react';
import GamePickerSheet from './GamePickerSheet';
import { base44 } from '@/api/base44Client';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

export default function SuperMatchesSheet({ profiles, currentUser, myProfile, isDark, onClose }) {
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [selectedProfileForGame, setSelectedProfileForGame] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  useEffect(() => {
    if (currentUser) {
      loadGameSessions();
    }
  }, [currentUser]);

  const loadGameSessions = async () => {
    try {
      const [asP1, asP2] = await Promise.all([
        base44.entities.GameSession.filter({ player1_email: currentUser.email }),
        base44.entities.GameSession.filter({ player2_email: currentUser.email }),
      ]);
      const allSessions = [...asP1, ...asP2];
      // Deduplicate by ID
      const seen = new Set();
      const unique = allSessions.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
      setActiveSessions(unique);
    } catch (e) {
      console.error('Error loading game sessions:', e);
    }
  };

  const getSessionForProfile = (email) => {
    return activeSessions.find(s =>
      s.status !== 'declined' &&
      (
        (s.player1_email === currentUser.email && s.player2_email === email) ||
        (s.player2_email === currentUser.email && s.player1_email === email)
      )
    );
  };

  if (!profiles || profiles.length === 0) {
    return createPortal(
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose} />
          <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
            <span className="text-5xl">💜</span>
            <p className="text-white font-black text-xl">Nog geen supermatches</p>
            <p className="text-white/60 text-sm">Like iemand terug en ze worden je supermatch!</p>
            <button onClick={onClose} className="mt-4 px-6 py-2.5 rounded-full font-bold text-white text-sm" style={{ background: GRAD }}>
              Sluiten
            </button>
          </div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0, right: 0.8 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 80 || info.velocity.x > 400) {
            onClose();
          }
        }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed inset-0 z-50 max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl"
        style={{ 
          background: bg, 
          touchAction: 'pan-y' 
        }}
      >
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Profile Swiper Area (Full screen scrolling snap feed) */}
        <div className="absolute inset-0 z-0">
          <div 
            className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth flex flex-col no-scrollbar" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {profiles.map((profile) => {
              const session = getSessionForProfile(profile.user_email);
              const isPending = session?.status === 'pending';
              const isActive = session?.status === 'active';

              return (
                <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
                  {/* Photo Background */}
                  <div className="absolute inset-0 z-0 bg-gray-900">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center relative"
                        style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                      >
                        <span className="text-[120px] select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                          {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                        </span>
                      </div>
                    )}
                    {/* Gradient overlay to make text readable */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />
                  </div>

                  {/* Foreground Content */}
                  <div 
                    className="relative z-10 flex flex-col h-full p-6 justify-end pointer-events-none"
                    style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
                  >

                    <div className="mt-auto pointer-events-auto flex flex-col">
                      {/* Name/Age/Height */}
                      <h2 className="text-[26px] sm:text-[28px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                        {profile.age} jaar {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                      </h2>

                      {/* Tags (Avatar first, then interests/traits) */}
                      <div className="flex flex-wrap gap-1.5 mb-5 items-center">
                        {profile.avatar && (
                          <span className="px-3.5 py-1 rounded-full text-[12px] font-bold text-white bg-black/45 backdrop-blur-md border border-pink-500/40 shadow-sm flex items-center gap-1.5">
                            <span className="text-sm">{profile.avatar.split(' ')[0]}</span>
                            <span className="text-pink-100">{profile.avatar.split(' ').slice(1).join(' ')}</span>
                          </span>
                        )}
                        {[...(profile.interests || []).slice(0, 2), ...(profile.traits || []).slice(0, 1)].map((tag) => (
                          <span key={tag} className="px-3.5 py-1 rounded-full text-[12px] font-semibold text-white bg-black/35 backdrop-blur-[2px] shadow-sm border border-white/15">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Play Game Button / Pending Status */}
                      <div className="flex flex-col gap-2">
                        {isActive ? (
                          <div className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-green-400 bg-green-500/10 border border-green-500/30 backdrop-blur-md shadow-lg">
                            <Gamepad2 className="w-5 h-5 text-green-400" />
                            <span>Game actief! Ga naar Spellen</span>
                          </div>
                        ) : isPending ? (
                          <div className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md shadow-lg">
                            <Clock className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
                            <span>Uitnodiging verstuurd...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedProfileForGame(profile);
                              setShowGamePicker(true);
                            }}
                            className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-transform active:scale-95 shadow-lg"
                            style={{ background: GRAD, boxShadow: '0 6px 20px rgba(234, 63, 211, 0.4)' }}
                          >
                            <Gamepad2 className="w-5 h-5 text-white" />
                            Speel een spel
                          </button>
                        )}
                        <p className="text-center text-[10px] font-bold text-[#EA3FD3] mt-1 drop-shadow-sm">
                          💜 Jullie hebben elkaar geliked!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating WhatsApp-Style Header */}
        <div
          className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-4 pb-3.5 backdrop-blur-xl"
          style={{ 
            paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
            background: isDark ? 'rgba(13,14,21,0.85)' : 'rgba(255,255,255,0.85)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto transition-transform active:scale-90 border border-white/15"
              style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}
              title="Terug"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h2
                className="font-black text-base tracking-wide"
                style={{
                  background: GRAD,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                💜 Supermatches
              </h2>
              <p className="text-[11px] font-medium" style={{ color: textSub }}>
                {profiles.length} {profiles.length === 1 ? 'supermatch' : 'supermatches'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center pointer-events-auto transition-transform active:scale-90 border border-white/15"
            style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </motion.div>

      {/* Game Picker Sheet */}
      {showGamePicker && selectedProfileForGame && (
        <GamePickerSheet
          profile={selectedProfileForGame}
          currentUser={currentUser}
          myProfile={myProfile}
          isDark={isDark}
          onClose={() => {
            setShowGamePicker(false);
            setSelectedProfileForGame(null);
          }}
          onInviteSent={() => {
            loadGameSessions();
          }}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
