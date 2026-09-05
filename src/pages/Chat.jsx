import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Clock, ChevronRight, ChevronLeft, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import ChatRoomView from '@/components/welove/ChatRoomView';
import { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';
import NotificationBell from '@/components/welove/NotificationBell';
import { createPageUrl } from '@/utils';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const PHASE_DURATIONS = {
  1: 24 * 60 * 60 * 1000,
  2: 48 * 60 * 60 * 1000,
  3: 24 * 60 * 60 * 1000,
  4: null,
};

const PHASE_LABELS = {
  1: { label: 'Fase 1 · 24u chat', color: '#FF4B72' },
  2: { label: 'Fase 2 · 48u chat', color: '#FF4B72' },
  3: { label: 'Fase 3 · Laatste 24u', color: '#8B5CF6' },
  4: { label: 'Fase 4 · Contact uitwisselen', color: '#10B981' },
};

function formatTimeLeft(expiresAt) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt) - new Date();
  if (ms <= 0) return 'Verlopen';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}u ${m}m`;
  return `${m}m`;
}

function RoomCard({ room, otherProfile, currentUserEmail, isDark, messageCount = 0, onClick }) {
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';
  const photos = getProfilePhotos(otherProfile);
  const avatar = photos[0] || null;
  const phase = room.phase || 1;
  const isUserB = currentUserEmail === room.user_b_email;
  const isUserA = currentUserEmail === room.user_a_email;
  const isPending = room.status === 'pending';
  const isSentPending = isPending && isUserA;
  const myExtAccepted = isUserA ? room.extension_accepted_a : room.extension_accepted_b;
  const isWaitingExt = room.status === 'active' && myExtAccepted && phase < 4;
  const myPhotoSent = isUserA ? room.photo_sent_a : room.photo_sent_b;
  const isPhase2NeedPhoto = phase === 2 && !myPhotoSent && room.status === 'active';

  const phaseInfo = isPhase2NeedPhoto
    ? { label: 'Stuur een foto', color: '#EA3FD3' }
    : (PHASE_LABELS[phase] || PHASE_LABELS[1]);

  const timeLeft = room.status === 'active' && room.phase_expires_at ? formatTimeLeft(room.phase_expires_at) : null;

  const displayTitle = otherProfile?.age ? `${otherProfile.age} jaar` : 'Supermatch';

  const handleClick = () => {
    if (isSentPending) {
      toast.info(`Uitnodiging verstuurd. Wachten op acceptatie...`);
      return;
    }
    onClick?.();
  };

  return (
    <motion.button
      whileTap={isSentPending ? { scale: 0.99 } : { scale: 0.97 }}
      onClick={handleClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all ${isSentPending ? 'opacity-90' : 'active:opacity-80'}`}
      style={{
        background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
        border: isSentPending 
          ? (isDark ? '1.5px solid rgba(245, 158, 11, 0.35)' : '1.5px solid rgba(245, 158, 11, 0.3)')
          : isWaitingExt
          ? (isDark ? '1.5px solid rgba(234, 63, 211, 0.35)' : '1.5px solid rgba(234, 63, 211, 0.3)')
          : isPhase2NeedPhoto
          ? (isDark ? '1.5px solid rgba(234, 63, 211, 0.35)' : '1.5px solid rgba(234, 63, 211, 0.3)')
          : (isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)'),
        boxShadow: isDark ? 'none' : '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full overflow-hidden border-2" style={{ borderColor: isSentPending ? '#F59E0B' : isWaitingExt ? '#EA3FD3' : phaseInfo.color }}>
          {avatar
            ? <img src={avatar} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: GRAD }}>{otherProfile?.avatar?.split(' ')[0] || '💜'}</div>
          }
        </div>
        {isPending && isUserB && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-pink-500 border-2" style={{ borderColor: isDark ? '#08090E' : '#F8F9FB' }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="font-bold text-sm truncate" style={{ color: textMain }}>
            {displayTitle}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {isSentPending ? (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                Verstuurd
              </span>
            ) : isWaitingExt ? (
              <span className="text-[10px] font-bold text-pink-400 bg-pink-500/15 border border-pink-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3 animate-spin" style={{ animationDuration: '4s' }} />
                Wachten
              </span>
            ) : timeLeft ? (
              <span className="text-[10px] font-bold" style={{ color: phaseInfo.color }}>
                ⏱ {timeLeft}
              </span>
            ) : null}
          </div>
        </div>
        <p className="text-[11px] font-semibold truncate" style={{ color: isSentPending ? '#F59E0B' : isWaitingExt ? '#EA3FD3' : phaseInfo.color }}>
          {isSentPending
            ? 'Uitnodiging verstuurd • Wachten op antwoord...'
            : isWaitingExt
            ? '⏳ Wachten op de ander...'
            : isPending && isUserB
            ? '💬 Uitnodiging — Accepteer of weiger'
            : room.status === 'archived'
            ? '📁 Gearchiveerd'
            : phaseInfo.label}
        </p>
      </div>

      {/* Right side: Badge + Chevron Arrow */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {messageCount > 0 && (
          <span 
            className="min-w-[24px] h-[24px] rounded-full text-white text-xs font-black flex items-center justify-center px-1.5 shadow-md leading-none"
            style={{ 
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', 
              boxShadow: '0 2px 8px rgba(255, 75, 114, 0.45)' 
            }}
          >
            {messageCount > 99 ? '99+' : messageCount}
          </span>
        )}
        {!isSentPending && <ChevronRight className="w-4 h-4" style={{ color: textSub }} />}
      </div>
    </motion.button>
  );
}

export default function Chat() {
  const navigate = useNavigate();
  const user = useUser();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const [rooms, setRooms] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [messageCounts, setMessageCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState(null);
  const [acceptingRoom, setAcceptingRoom] = useState(null);
  const [confirmDeclineRoom, setConfirmDeclineRoom] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const [roomsA, roomsB] = await Promise.all([
        base44.entities.ChatRoom.filter({ user_a_email: user.email }).catch(() => []),
        base44.entities.ChatRoom.filter({ user_b_email: user.email }).catch(() => []),
      ]);
      const allRooms = [...(roomsA || []), ...(roomsB || [])];
      // Deduplicate
      const seen = new Set();
      const unique = allRooms.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });

      // Prune truly deleted (deleted_at has passed)
      const now = new Date();
      const visible = unique.filter(r => !r.deleted_at || new Date(r.deleted_at) > now);

      // Mark all visible room IDs as seen in localStorage
      const visibleIds = visible.map(r => r.id);
      const existingSeen = JSON.parse(localStorage.getItem('seen_chat_room_ids') || '[]');
      const mergedSeen = Array.from(new Set([...existingSeen, ...visibleIds]));
      localStorage.setItem('seen_chat_room_ids', JSON.stringify(mergedSeen));

      // Load other profiles
      const otherEmails = [...new Set(visible.map(r => r.user_a_email === user.email ? r.user_b_email : r.user_a_email))];
      let profMap = {};
      if (otherEmails.length > 0) {
        const allProfs = await base44.entities.UserProfile.list('-created_date', 500).catch(() => []);
        for (const p of allProfs) {
          if (otherEmails.includes(p.user_email)) profMap[p.user_email] = p;
        }
      }

      // Load message counts & latest message timestamp for active rooms
      const counts = {};
      const latestActivity = {};
      await Promise.all(
        visible.map(async (r) => {
          try {
            const msgs = await base44.entities.ChatMessage.filter({ room_id: r.id });
            const partnerMsgs = (msgs || []).filter(m => !m.is_system && m.sender_email !== user.email);
            const readCount = parseInt(localStorage.getItem(`chat_read_count_${r.id}`) || '0', 10);
            const unreadInRoom = Math.max(0, partnerMsgs.length - readCount);
            counts[r.id] = unreadInRoom;

            // Determine latest message time
            if (msgs && msgs.length > 0) {
              const sortedMsgs = [...msgs].sort((a, b) => new Date(b.created_at || b.created_date || 0) - new Date(a.created_at || a.created_date || 0));
              latestActivity[r.id] = new Date(sortedMsgs[0].created_at || sortedMsgs[0].created_date).getTime();
            } else {
              latestActivity[r.id] = new Date(r.created_at || 0).getTime();
            }
          } catch (e) {
            counts[r.id] = 0;
            latestActivity[r.id] = new Date(r.created_at || 0).getTime();
          }
        })
      );

      // Sort: pending first, then by latest message activity descending with stable ID tiebreaker
      visible.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (b.status === 'pending' && a.status !== 'pending') return 1;
        const timeA = latestActivity[a.id] || new Date(a.created_at || 0).getTime();
        const timeB = latestActivity[b.id] || new Date(b.created_at || 0).getTime();
        if (timeB !== timeA) return timeB - timeA;
        return (b.id || '').localeCompare(a.id || '');
      });

      if (Object.keys(profMap).length > 0) {
        setProfiles(prev => ({ ...prev, ...profMap }));
      }
      setRooms([...visible]);
      setMessageCounts(counts);
    } catch (e) {}
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user !== undefined) loadData();
  }, [user, loadData]);

  // Polling every 6 seconds to automatically re-sort and receive incoming messages
  useEffect(() => {
    if (!user || activeRoom) return;
    const interval = setInterval(() => {
      loadData();
    }, 6000);
    return () => clearInterval(interval);
  }, [user, activeRoom, loadData]);

  // Save email to localStorage for Layout badge polling
  useEffect(() => {
    if (user?.email) localStorage.setItem('romety_user_email', user.email);
  }, [user]);

  const handleAcceptRoom = async (room) => {
    setAcceptingRoom(room.id);
    try {
      const now = new Date();
      const expires = new Date(now.getTime() + PHASE_DURATIONS[1]);
      await base44.entities.ChatRoom.update(room.id, {
        status: 'active',
        phase: 1,
        phase_expires_at: expires.toISOString(),
      });

      // System message (best-effort)
      try {
        await base44.entities.ChatMessage.create({
          room_id: room.id,
          sender_email: 'system',
          content: '💬 Chat gestart! Jullie hebben 24 uur om te chatten.',
          type: 'system',
        });
      } catch (msgErr) {
        console.warn('System message failed:', msgErr);
      }

      // Create notification for user A (best-effort)
      try {
        await base44.entities.Notification.create({
          user_email: room.user_a_email,
          type: 'chat_accepted',
          message: 'Je chat-uitnodiging is geaccepteerd! 🎉 Jullie hebben 24u.',
          read: false,
          created_date: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('Notification failed:', notifErr);
      }

      toast.success('Chat geaccepteerd! 🎉');
      await loadData();
    } catch (e) {
      console.error('Accept room error:', e);
      toast.error('Kon niet accepteren, probeer opnieuw');
    } finally {
      setAcceptingRoom(null);
    }
  };

  const handleDeclineRoom = async (room) => {
    try {
      await base44.entities.ChatRoom.update(room.id, {
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      });
      toast.info('Uitnodiging geweigerd');
      await loadData();
    } catch (e) {
      console.error('Decline error:', e);
      toast.error('Er ging iets mis');
    }
  };

  const handleOpenRoom = (room) => {
    setMessageCounts(prev => ({ ...prev, [room.id]: 0 }));
    setActiveRoom(room);
  };

  if (activeRoom) {
    const otherEmail = activeRoom.user_a_email === user?.email ? activeRoom.user_b_email : activeRoom.user_a_email;
    const otherProfile = profiles[otherEmail] || null;
    return (
      <ChatRoomView
        room={activeRoom}
        currentUserEmail={user?.email}
        otherProfile={otherProfile}
        onBack={() => { setActiveRoom(null); loadData(); }}
        onRoomUpdate={(updated) => setActiveRoom(updated)}
      />
    );
  }

  const pendingInvites = rooms.filter(r => r.status === 'pending' && r.user_b_email === user?.email);
  const sentInvites = rooms.filter(r => r.status === 'pending' && r.user_a_email === user?.email);
  const activeRooms = rooms.filter(r => r.status === 'active');
  const archivedRooms = rooms.filter(r => r.status === 'archived' && r.deleted_at && new Date(r.deleted_at) > new Date());

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col" style={{ background: bg }}>
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pb-4 backdrop-blur-xl"
        style={{
          paddingTop: 'max(52px, env(safe-area-inset-top, 52px))',
          background: isDark ? 'rgba(8,9,14,0.92)' : 'rgba(255,255,255,0.92)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate(createPageUrl('Home'))}
            className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto transition-transform active:scale-90 border flex-shrink-0"
            style={{ 
              background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
              borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
            }}
            title="Terug"
          >
            <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
          </button>
          <div>
            <h1 className="font-black text-lg tracking-wide" style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
              Chats
            </h1>
            <p className="text-[11px] font-medium mt-0.5" style={{ color: textSub }}>
              SuperMatch chats • Wederzijdse likes
            </p>
          </div>
        </div>
        <NotificationBell isDark={isDark} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: 80 }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner" style={{ background: isDark ? 'rgba(255,75,114,0.15)' : 'rgba(255,75,114,0.1)' }}>
              <MessageCircle className="w-9 h-9 text-[#FF4B72]" />
            </div>
            <h2 className="font-black text-lg mb-2" style={{ color: textMain }}>Nog geen chats</h2>
            <p className="text-sm leading-relaxed max-w-[280px]" style={{ color: textSub }}>
              Ga naar Supermatches op de Home pagina en klik op "Chat ontgrendelen" om een chat te starten met je match!
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-5">
            
            {/* Pending invites (user is B) */}
            {pendingInvites.length > 0 && (
              <section>
                <p className="text-xs font-black uppercase tracking-widest mb-3 px-1" style={{ color: '#FF4B72' }}>
                  📩 Uitnodigingen
                </p>
                <div className="space-y-2">
                  {pendingInvites.map(room => {
                    const otherEmail = room.user_a_email;
                    const profile = profiles[otherEmail];
                    const photos = getProfilePhotos(profile);
                    const avatar = photos[0] || null;
                    return (
                      <div
                        key={room.id}
                        className="rounded-2xl overflow-hidden"
                        style={{
                          background: isDark ? 'rgba(255,75,114,0.08)' : '#FFFFFF',
                          border: '1.5px solid rgba(255,75,114,0.4)',
                          boxShadow: '0 0 20px rgba(255,75,114,0.12)',
                        }}
                      >
                        {/* Profile info */}
                        <button onClick={() => setActiveRoom(room)} className="w-full flex items-center gap-3 px-4 pt-3.5 pb-2 text-left active:opacity-70">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-pink-500">
                            {avatar
                              ? <img src={avatar} alt="" className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-xl" style={{ background: GRAD }}>{profile?.avatar?.split(' ')[0] || '💜'}</div>
                            }
                          </div>
                          <div>
                            <p className="font-bold text-sm" style={{ color: textMain }}>
                              {profile?.age ? `${profile.age} jaar` : 'Supermatch'} wil chatten!
                            </p>
                            <p className="text-[11px]" style={{ color: textSub }}>
                              Jullie hebben elkaar beide geliked 💜
                            </p>
                          </div>
                        </button>
                        {/* Accept / Decline */}
                        <div className="flex gap-2 px-4 pb-3.5">
                          <button
                            onClick={() => setConfirmDeclineRoom(room)}
                            className="flex-1 py-2.5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                            style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textSub }}
                          >
                            ❌ Weigeren
                          </button>
                          <button
                            onClick={() => handleAcceptRoom(room)}
                            disabled={acceptingRoom === room.id}
                            className="flex-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white active:scale-95 transition-transform disabled:opacity-60"
                            style={{ background: GRAD, flex: 2 }}
                          >
                            {acceptingRoom === room.id ? 'Laden...' : '✅ Accepteren'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sent invites waiting */}
            {sentInvites.length > 0 && (
              <section>
                <p className="text-xs font-black uppercase tracking-widest mb-3 px-1" style={{ color: textSub }}>
                  ⏳ Verstuurd — Wachten op antwoord
                </p>
                <div className="space-y-2">
                  {sentInvites.map(room => {
                    const profile = profiles[room.user_b_email];
                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        otherProfile={profile}
                        currentUserEmail={user?.email}
                        messageCount={messageCounts[room.id] || 0}
                        isDark={isDark}
                        onClick={() => setActiveRoom(room)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Active chats */}
            {activeRooms.length > 0 && (
              <section>
                <p className="text-xs font-black uppercase tracking-widest mb-3 px-1" style={{ color: textMain }}>
                  💬 Actieve chats
                </p>
                <div className="space-y-2">
                  {activeRooms.map(room => {
                    const otherEmail = room.user_a_email === user?.email ? room.user_b_email : room.user_a_email;
                    const profile = profiles[otherEmail];
                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        otherProfile={profile}
                        currentUserEmail={user?.email}
                        messageCount={messageCounts[room.id] || 0}
                        isDark={isDark}
                        onClick={() => handleOpenRoom(room)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* Archived */}
            {archivedRooms.length > 0 && (
              <section>
                <p className="text-xs font-black uppercase tracking-widest mb-3 px-1 flex items-center gap-1.5" style={{ color: textSub }}>
                  <Archive className="w-3 h-3" /> Archief
                </p>
                <div className="space-y-2">
                  {archivedRooms.map(room => {
                    const otherEmail = room.user_a_email === user?.email ? room.user_b_email : room.user_a_email;
                    const profile = profiles[otherEmail];
                    return (
                      <RoomCard
                        key={room.id}
                        room={room}
                        otherProfile={profile}
                        currentUserEmail={user?.email}
                        isDark={isDark}
                        onClick={() => setActiveRoom(room)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        )}
      </div>

      {/* Decline confirmation modal */}
      <AnimatePresence>
        {confirmDeclineRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-xs rounded-3xl p-5 text-center shadow-2xl border"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-red-500/15 text-red-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base mb-1.5" style={{ color: textMain }}>
                Weet je het zeker?
              </h3>
              <p className="text-xs leading-relaxed mb-5" style={{ color: textSub }}>
                Weet je zeker dat je deze chat-uitnodiging wilt weigeren? De chat wordt dan definitief verwijderd.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDeclineRoom(null)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-transform border"
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', 
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    color: textMain 
                  }}
                >
                  Annuleren
                </button>
                <button
                  onClick={async () => {
                    const r = confirmDeclineRoom;
                    setConfirmDeclineRoom(null);
                    await handleDeclineRoom(r);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-red-500 active:scale-95 transition-transform shadow-md"
                >
                  Ja, weigeren
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
