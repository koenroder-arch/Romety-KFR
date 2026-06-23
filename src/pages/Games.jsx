import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { useTheme } from '@/lib/ThemeContext';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Swords, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const GAME_LABELS = {
  cards: { emoji: '🃏', name: 'Kaarten Spel', color: '#FF4B72', bg: 'rgba(255,75,114,0.12)', border: 'rgba(255,75,114,0.35)' },
  number: { emoji: '🔢', name: 'Nummer Spel', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.35)' },
};

const STATUS_LABELS = {
  pending: { label: 'Uitnodiging', icon: Clock, color: '#F59E0B' },
  active: { label: 'Actief', icon: Swords, color: '#10B981' },
  finished: { label: 'Afgerond', icon: CheckCircle2, color: '#6B7280' },
  declined: { label: 'Geweigerd', icon: XCircle, color: '#EF4444' },
};

export default function Games() {
  const user = useUser();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';

  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);

  useEffect(() => { if (user !== undefined) loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    if (!user) { setLoading(false); return; }

    const [asP1, asP2] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.GameSession.filter({ player2_email: user.email }),
    ]);

    const allSessions = [...asP1, ...asP2];
    // Deduplicate by id
    const seen = new Set();
    const unique = allSessions.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
    unique.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setSessions(unique);

    // Fetch all unique partner profiles
    const emails = new Set();
    unique.forEach(s => {
      if (s.player1_email !== user.email) emails.add(s.player1_email);
      if (s.player2_email !== user.email) emails.add(s.player2_email);
    });
    const profileMap = {};
    await Promise.all([...emails].map(async (email) => {
      try {
        const p = await base44.entities.UserProfile.filter({ user_email: email });
        if (p[0]) profileMap[email] = p[0];
      } catch(e) {}
    }));
    setProfiles(profileMap);

    setPendingInvites(unique.filter(s => s.status === 'pending'));
    setActiveGames(unique.filter(s => s.status === 'active'));
    setFinishedGames(unique.filter(s => s.status === 'finished' || s.status === 'declined'));

    setLoading(false);
  };

  const handleAccept = async (session) => {
    try {
      await base44.entities.GameSession.update(session.id, {
        status: 'active',
        last_activity: new Date().toISOString(),
      });

      // Notify inviter
      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game_accepted',
        from_name: 'Je supermatch',
      });

      toast.success('Spel geaccepteerd! 🎮');
      // Navigate to game
      navigateToGame(session);
    } catch (e) {
      toast.error('Er ging iets mis');
    }
  };

  const handleDecline = async (session) => {
    try {
      await base44.entities.GameSession.update(session.id, { status: 'declined' });
      toast.success('Uitnodiging geweigerd');
      loadData();
    } catch (e) {
      toast.error('Er ging iets mis');
    }
  };

  const navigateToGame = (session) => {
    if (session.game_type === 'cards') {
      window.location.href = createPageUrl('CardGame') + `?session=${session.id}`;
    } else {
      window.location.href = createPageUrl('NumberGame') + `?session=${session.id}`;
    }
  };

  const getPartnerEmail = (session) =>
    session.player1_email === user?.email ? session.player2_email : session.player1_email;

  const getPartnerProfile = (session) => profiles[getPartnerEmail(session)];

  const GameCard = ({ session, showActions = false }) => {
    const partner = getPartnerProfile(session);
    const game = GAME_LABELS[session.game_type];
    const status = STATUS_LABELS[session.status];
    const StatusIcon = status.icon;
    const iAmPlayer1 = session.player1_email === user?.email;
    const iAmInviter = iAmPlayer1;
    const isPending = session.status === 'pending';
    const isMyInvite = isPending && !iAmInviter; // I received it

    return (
      <motion.div
        whileTap={{ scale: 0.98 }}
        className="rounded-2xl overflow-hidden cursor-pointer"
        style={{ background: cardBg, border: `1.5px solid ${game.border}` }}
        onClick={() => !showActions && session.status !== 'pending' && navigateToGame(session)}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Game emoji */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: game.bg }}
          >
            {game.emoji}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-sm" style={{ color: game.color }}>{game.name}</span>
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: `${status.color}20` }}
              >
                <StatusIcon className="w-3 h-3" style={{ color: status.color }} />
                <span className="text-[10px] font-bold" style={{ color: status.color }}>{status.label}</span>
              </div>
            </div>
            <p className="text-sm font-semibold truncate" style={{ color: textSub }}>
              {partner
                ? `Met ${partner.avatar?.split(' ').slice(1).join(' ') || 'je supermatch'}`
                : 'Met je supermatch'}
            </p>
            {isPending && (
              <p className="text-xs mt-0.5" style={{ color: textSub }}>
                {iAmInviter ? 'Wacht op acceptatie…' : 'Jij hebt een uitnodiging ontvangen!'}
              </p>
            )}
          </div>

          {/* Partner avatar */}
          {partner && (
            <div
              className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-lg"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6' }}
            >
              {partner.photo_url ? (
                <img src={partner.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{partner.avatar?.split(' ')[0] || '👤'}</span>
              )}
            </div>
          )}

          {session.status === 'active' && (
            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: textSub }} />
          )}
        </div>

        {/* Invite actions */}
        {isMyInvite && (
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={(e) => { e.stopPropagation(); handleDecline(session); }}
              className="flex-1 py-2 rounded-xl font-bold text-sm transition-all active:scale-95"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }}
            >
              Weigeren
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleAccept(session); }}
              className="flex-1 py-2 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
              style={{ background: game.color }}
            >
              Accepteren 🎮
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="absolute inset-y-0 left-0 w-full flex flex-col" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="pt-4 px-5 pb-4 flex items-center gap-3 flex-shrink-0" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={() => window.history.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: isDark ? 'white' : '#333' }} />
        </button>
        <div>
          <h1
            className="font-black text-xl"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            🎮 Spellen
          </h1>
          <p className="text-xs" style={{ color: textSub }}>Jouw games met supermatches</p>
        </div>
      </div>

      <div className="flex-1 px-5 mt-4 space-y-6 overflow-y-auto pb-32">

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#F59E0B' }}>
              ⏳ Uitnodigingen ({pendingInvites.length})
            </p>
            <div className="space-y-3">
              {pendingInvites.map(s => <GameCard key={s.id} session={s} showActions />)}
            </div>
          </div>
        )}

        {/* Active games */}
        {activeGames.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: '#10B981' }}>
              ⚔️ Actieve Spellen ({activeGames.length})
            </p>
            <div className="space-y-3">
              {activeGames.map(s => <GameCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Finished games */}
        {finishedGames.length > 0 && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: textSub }}>
              ✅ Afgerond ({finishedGames.length})
            </p>
            <div className="space-y-3">
              {finishedGames.map(s => <GameCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-6xl mb-4">🎮</span>
            <p className={`font-black text-lg mb-2 ${textMain}`}>Nog geen spellen</p>
            <p className="text-sm" style={{ color: textSub }}>
              Ga naar je supermatches via de homepage en stuur een uitnodiging!
            </p>
            <button
              onClick={() => window.location.href = createPageUrl('Home')}
              className="mt-6 px-6 py-3 rounded-2xl font-black text-white text-sm transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)', boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}
            >
              Naar de homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
