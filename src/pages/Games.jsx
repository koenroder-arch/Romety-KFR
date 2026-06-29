import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { useTheme } from '@/lib/ThemeContext';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Swords, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const GAME_LABELS = {
  cards: { 
    emoji: '🃏', 
    name: 'Kaarten Spel', 
    icon: (
      <svg className="w-6 h-6 text-[#FBE3CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="12" height="15" rx="2" transform="rotate(-10 8 13.5)" fill="currentColor" fillOpacity="0.2"/>
        <rect x="8" y="4" width="12" height="15" rx="2" transform="rotate(10 14 11.5)" fill="currentColor" fillOpacity="0.3"/>
        <path d="M14 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" fill="currentColor"/>
      </svg>
    )
  },
  number: { 
    emoji: '🔢', 
    name: 'Nummer Spel', 
    icon: (
      <svg className="w-6 h-6 text-[#FBE3CC]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3"/>
        <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3"/>
        <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3"/>
        <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.3"/>
      </svg>
    )
  },
};

const STATUS_LABELS = {
  pending: { label: 'Uitnodiging', icon: Clock, color: '#F59E0B', darkBg: 'bg-black/50 border-[#F59E0B]/30 text-[#FCD34D]', lightBg: 'bg-amber-100/80 border-amber-300 text-amber-900 font-black' },
  active: { label: 'Actief', icon: Swords, color: '#10B981', darkBg: 'bg-black/50 border-[#10B981]/30 text-[#6EE7B7]', lightBg: 'bg-emerald-100/80 border-emerald-300 text-emerald-900 font-black' },
  finished: { label: 'Afgerond', icon: CheckCircle2, color: '#9CA3AF', darkBg: 'bg-black/50 border-white/20 text-gray-300', lightBg: 'bg-gray-100 border-gray-300 text-gray-800 font-black' },
  declined: { label: 'Geweigerd', icon: XCircle, color: '#EF4444', darkBg: 'bg-black/50 border-[#EF4444]/30 text-[#FCA5A5]', lightBg: 'bg-rose-100/80 border-rose-300 text-rose-900 font-black' },
};

export default function Games() {
  const user = useUser();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [sessions, setSessions] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);

  useEffect(() => {
    if (user !== undefined) {
      loadData();
      const interval = setInterval(() => {
        loadData(true);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    if (!user) { setLoading(false); return; }

    const [asP1, asP2] = await Promise.all([
      base44.entities.GameSession.filter({ player1_email: user.email }),
      base44.entities.GameSession.filter({ player2_email: user.email }),
    ]);

    const allSessions = [...asP1, ...asP2];
    const seen = new Set();
    const unique = allSessions.filter(s => { if (seen.has(s.id)) return false; seen.add(s.id); return true; });
    unique.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    setSessions(unique);

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

    if (!silent) setLoading(false);
  };

  const handleAccept = async (session) => {
    try {
      await base44.entities.GameSession.update(session.id, {
        status: 'active',
        last_activity: new Date().toISOString(),
      });

      const partnerEmail = session.player1_email === user.email ? session.player2_email : session.player1_email;
      await base44.entities.Notification.create({
        to_email: partnerEmail,
        from_email: user.email,
        type: 'game_accepted',
        from_name: 'Je supermatch',
      });

      toast.success('Spel geaccepteerd! 🎮');
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
    const game = GAME_LABELS[session.game_type] || GAME_LABELS.cards;
    const status = STATUS_LABELS[session.status] || STATUS_LABELS.active;
    const StatusIcon = status.icon;
    const iAmPlayer1 = session.player1_email === user?.email;
    const iAmInviter = iAmPlayer1;
    const isPending = session.status === 'pending';
    const isMyInvite = isPending && !iAmInviter;

    const partnerName = partner?.avatar?.split(' ').slice(1).join(' ') || partner?.full_name || 'je supermatch';

    return (
      <div className="relative mb-2.5">
        {/* Stacked Card Underlayer / Shadow line */}
        <div className={`absolute inset-0 translate-y-1 rounded-[22px] ${isDark ? 'bg-black/60 border border-pink-500/20' : 'bg-pink-100/60 border border-pink-200'} pointer-events-none`} />

        {/* Main Romety Gradient Card */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          className={`relative z-10 rounded-[20px] p-3.5 sm:p-4 cursor-pointer overflow-hidden border ${
            isDark 
              ? 'border-pink-500/35 shadow-[0_8px_25px_rgba(255,75,114,0.18)]' 
              : 'border-pink-300/60 shadow-[0_4px_20px_rgba(255,75,114,0.1)]'
          }`}
          style={{ 
            background: isDark 
              ? 'linear-gradient(90deg, #2A0817 0%, #66123A 40%, #CF2765 85%, #E83ED3 100%)' 
              : 'linear-gradient(90deg, #FFFFFF 0%, #FFF5F8 50%, #FFEBF3 100%)',
          }}
          onClick={() => !showActions && session.status !== 'pending' && navigateToGame(session)}
        >
          <div className="flex items-center justify-between gap-3.5">
            
            {/* Left Section: Partner Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-400 shadow-[0_0_12px_rgba(255,75,114,0.4)]">
                <div className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  {partner?.photo_url ? (
                    <img src={partner.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl">{partner?.avatar?.split(' ')[0] || '👤'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Middle Section: Icon, Title & Subtitle */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl flex-shrink-0">{game.emoji}</span>
                <h3 className={`font-black text-base sm:text-lg truncate tracking-tight drop-shadow-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {game.name}
                </h3>
              </div>

              <p className={`text-xs font-bold truncate pl-0.5 ${isDark ? 'text-pink-100/90' : 'text-gray-600'}`}>
                Met {partnerName}
              </p>

              {/* Status Badge */}
              <div className="mt-1.5 flex items-center">
                <div className={`px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${isDark ? status.darkBg : status.lightBg} shadow-inner`}>
                  <StatusIcon className="w-3 h-3" />
                  <span className="text-[10px] font-extrabold tracking-wide uppercase">{status.label}</span>
                </div>
              </div>
            </div>

            {/* Right Arrow if Active */}
            {session.status === 'active' && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            )}
          </div>

          {/* Invite Actions if Pending */}
          {isMyInvite && (
            <div className={`flex gap-2 mt-3 pt-2.5 border-t ${isDark ? 'border-white/15' : 'border-gray-200'}`}>
              <button
                onClick={(e) => { e.stopPropagation(); handleDecline(session); }}
                className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-all active:scale-95 ${isDark ? 'text-rose-200 bg-black/40 border border-rose-500/30 hover:bg-black/60' : 'text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100'}`}
              >
                Weigeren
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleAccept(session); }}
                className="flex-1 py-1.5 rounded-lg font-bold text-[11px] text-white bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md hover:brightness-105 transition-all active:scale-95"
              >
                Accepteren 🎮
              </button>
            </div>
          )}
        </motion.div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#0D0E15]' : 'bg-[#F8F9FB]'}`}>
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden flex flex-col select-none ${isDark ? 'bg-[#0D0E15] text-white' : 'bg-[#F8F9FB] text-gray-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Ambient Background Glows */}
      {isDark && (
        <>
          <div className="absolute top-[-5%] left-[-10%] w-[320px] h-[320px] rounded-full bg-gradient-to-br from-rose-600/15 via-orange-500/10 to-transparent blur-3xl pointer-events-none" />
          <div className="absolute top-[20%] right-[-10%] w-[320px] h-[320px] rounded-full bg-gradient-to-bl from-amber-600/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none" />
        </>
      )}

      {/* Header */}
      <div className={`relative z-10 pt-12 sm:pt-14 px-5 pb-4 flex items-center gap-3 flex-shrink-0 border-b ${isDark ? 'border-white/10' : 'border-gray-200 bg-white/80 backdrop-blur-md'}`}>
        <button
          onClick={() => window.history.back()}
          className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-black text-2xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600">
            🎮 Spellen
          </h1>
          <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Jouw games met supermatches</p>
        </div>
      </div>

      {/* List Container */}
      <div className="relative z-10 flex-1 max-w-md mx-auto w-full px-4 mt-4 space-y-6 overflow-y-auto pb-32">

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div>
            <p className={`text-xs font-black uppercase tracking-widest mb-3 px-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
              ⏳ Uitnodigingen ({pendingInvites.length})
            </p>
            <div className="space-y-4">
              {pendingInvites.map(s => <GameCard key={s.id} session={s} showActions />)}
            </div>
          </div>
        )}

        {/* Active games */}
        {activeGames.length > 0 && (
          <div>
            <p className={`text-xs font-black uppercase tracking-widest mb-3 px-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              ⚔️ Actieve Spellen ({activeGames.length})
            </p>
            <div className="space-y-4">
              {activeGames.map(s => <GameCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Finished games */}
        {finishedGames.length > 0 && (
          <div>
            <p className={`text-xs font-black uppercase tracking-widest mb-3 px-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ✅ Afgerond ({finishedGames.length})
            </p>
            <div className="space-y-4">
              {finishedGames.map(s => <GameCard key={s.id} session={s} />)}
            </div>
          </div>
        )}

        {/* Empty state */}
        {sessions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-5xl shadow-inner ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
              🎮
            </div>
            <h2 className={`font-black text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>Nog geen spellen</h2>
            <p className={`text-xs max-w-xs leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Ga naar je supermatches via de homepage en stuur een uitnodiging om een spel te starten!
            </p>
            <button
              onClick={() => window.location.href = createPageUrl('Home')}
              className="mt-2 px-7 py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 shadow-lg hover:brightness-105 transition-all active:scale-95"
            >
              Naar de homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
