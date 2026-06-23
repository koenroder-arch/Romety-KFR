import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gamepad2, Clock } from 'lucide-react';
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
        className="fixed inset-0 z-40 max-w-md mx-auto flex flex-col overflow-hidden"
        style={{ background: bg }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
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
                  <div className="relative z-10 flex flex-col h-full p-6 pb-28 justify-end pointer-events-none">
                    {/* Top Right Avatar Badge - sits below the glassmorphic header */}
                    <div className="absolute top-14 right-6 pointer-events-auto">
                      {profile.avatar && (
                        <div className="px-3.5 py-1.5 rounded-full text-white font-black text-[14px] flex items-center gap-1 shadow-md tracking-wide" style={{ background: '#FF6B4A' }}>
                          <span>{profile.avatar.split(' ')[0]}</span>
                          <span>{profile.avatar.split(' ').slice(1).join(' ')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto pointer-events-auto flex flex-col">
                      {/* Name/Age/Height */}
                      <h2 className="text-[28px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                        {profile.age} jaar {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                      </h2>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {[...(profile.interests || []), ...(profile.traits || [])].slice(0, 5).map((tag) => (
                          <span key={tag} className="px-3.5 py-1 rounded-full text-[12px] font-semibold text-white bg-black/45 backdrop-blur-[2px] shadow-sm">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Action Button */}
                      <div className="flex flex-col gap-2">
                        {isPending ? (
                          <div
                            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-sm text-[#F59E0B] border"
                            style={{
                              background: 'rgba(245,158,11,0.15)',
                              borderColor: 'rgba(245,158,11,0.4)',
                            }}
                          >
                            <Clock className="w-4.5 h-4.5 text-[#F59E0B] animate-pulse" />
                            Uitnodiging gestuurd!
                          </div>
                        ) : isActive ? (
                          <button
                            onClick={() => {
                              window.location.href = `/Games`;
                            }}
                            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-black text-white text-base transition-all active:scale-[0.97]"
                            style={{
                              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                              boxShadow: '0 8px 24px rgba(16,185,129,0.3)',
                            }}
                          >
                            <Gamepad2 className="w-5 h-5" />
                            Speel actief spel
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedProfileForGame(profile);
                              setShowGamePicker(true);
                            }}
                            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2.5 font-black text-white text-base transition-all active:scale-[0.97]"
                            style={{
                              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                              boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
                            }}
                          >
                            <Gamepad2 className="w-5 h-5" />
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

        {/* Floating Header with Glassmorphism */}
        <div
          className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-5 pt-3.5 pb-2 backdrop-blur-md"
          style={{ 
            background: isDark ? 'rgba(8,9,14,0.45)' : 'rgba(248,249,251,0.45)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' 
          }}
        >
          <div>
            <h2
              className="font-black text-sm"
              style={{
                background: GRAD,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              💜 Supermatches
            </h2>
            <p className="text-[10px]" style={{ color: textSub }}>
              {profiles.length} {profiles.length === 1 ? 'supermatch' : 'supermatches'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center pointer-events-auto"
            style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
          >
            <X className="w-4 h-4" style={{ color: isDark ? 'white' : '#111' }} />
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
