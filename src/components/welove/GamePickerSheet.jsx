import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

export default function GamePickerSheet({ profile, currentUser, myProfile, isDark, onClose, onInviteSent }) {
  const [loading, setLoading] = useState(false);

  const bg = isDark ? '#0F1019' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

  const handlePickGame = async (gameType) => {
    setLoading(true);
    try {
      // Check if there's already an active/pending session between these two
      const existing = await base44.entities.GameSession.filter({ player1_email: currentUser.email });
      const existingAsP2 = await base44.entities.GameSession.filter({ player2_email: currentUser.email });
      const allSessions = [...existing, ...existingAsP2];
      const duplicate = allSessions.find(s =>
        s.game_type === gameType &&
        s.status !== 'finished' && s.status !== 'declined' &&
        (
          (s.player1_email === currentUser.email && s.player2_email === profile.user_email) ||
          (s.player2_email === currentUser.email && s.player1_email === profile.user_email)
        )
      );

      if (duplicate) {
        toast.error('Er loopt al een uitnodiging of spel voor dit spel!');
        setLoading(false);
        return;
      }

      // Create game session
      const session = await base44.entities.GameSession.create({
        game_type: gameType,
        player1_email: currentUser.email,
        player2_email: profile.user_email,
        status: 'pending',
        invited_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
      });

      // Send notification
      await base44.entities.Notification.create({
        to_email: profile.user_email,
        from_email: currentUser.email,
        type: 'game_invite',
        from_name: myProfile?.avatar?.split(' ').slice(1).join(' ') || 'Je supermatch',
        game_type: gameType,
        session_id: session.id,
      });

      toast.success(`Uitnodiging verstuurd! 🎮`);
      onInviteSent?.(session);
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Er ging iets mis, probeer opnieuw');
    }
    setLoading(false);
  };

  const GAMES = [
    {
      key: 'cards',
      emoji: '🃏',
      title: 'Kaarten Spel',
      desc: '6 rondes vraagkaarten — kies een vraag, de ander antwoordt ja of nee.',
      color: '#FF4B72',
      bg: isDark ? 'rgba(255,75,114,0.12)' : 'rgba(255,75,114,0.06)',
      border: 'rgba(255,75,114,0.35)',
    },
    {
      key: 'number',
      emoji: '🔢',
      title: 'Nummer Spel',
      desc: 'Raad het telefoonnummer van de ander — lingo-stijl, om en om.',
      color: '#8B5CF6',
      bg: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)',
      border: 'rgba(139,92,246,0.35)',
    },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          onClick={onClose}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-md rounded-t-[28px] pb-10"
          style={{ background: bg }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)' }} />
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <X className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }} />
          </button>

          <div className="px-6 pt-2 pb-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}
              >
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{profile.avatar?.split(' ')[0] || '👤'}</span>
                )}
              </div>
              <div>
                <p className={`font-black text-base ${textMain}`}>Speel een spel!</p>
                <p className="text-sm" style={{ color: textSub }}>
                  Stuur een uitnodiging naar {profile.avatar?.split(' ').slice(1).join(' ') || 'je supermatch'}
                </p>
              </div>
            </div>

            {/* Game options */}
            <div className="space-y-3">
              {GAMES.map(game => (
                <button
                  key={game.key}
                  onClick={() => !loading && handlePickGame(game.key)}
                  disabled={loading}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all active:scale-[0.98]"
                  style={{
                    background: game.bg,
                    border: `1.5px solid ${game.border}`,
                  }}
                >
                  <span className="text-3xl flex-shrink-0">{game.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm" style={{ color: game.color }}>{game.title}</p>
                    <p className="text-xs mt-0.5 leading-snug" style={{ color: textSub }}>{game.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: game.color }} />
                </button>
              ))}
            </div>

            <p className="text-center text-xs mt-5" style={{ color: textSub }}>
              Er wordt een uitnodiging verzonden · je supermatch moet accepteren
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
