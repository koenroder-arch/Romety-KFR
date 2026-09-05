import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, MessageCircle, Clock, MoreVertical, AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';
import { base44 } from '@/api/base44Client';
import { addLocalReportedEmail } from '@/lib/reportUtils';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', label: 'Ongepaste foto', emoji: '🖼️' },
  { id: 'fraude_scam', label: 'Fraude of scam', emoji: '⚠️' },
  { id: 'ai_foto', label: 'AI foto', emoji: '🤖' },
  { id: 'bot_account', label: 'Een Bot account', emoji: '👾' },
  { id: 'stalking', label: 'Stalking', emoji: '🚫' },
];

export default function SuperMatchesSheet({ profiles, currentUser, myProfile, isDark, onClose }) {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);
  const [startingChatFor, setStartingChatFor] = useState(null);
  
  // 3-dots menu & bio & report states
  const [openMenuProfileId, setOpenMenuProfileId] = useState(null);
  const [expandedBioId, setExpandedBioId] = useState(null);
  const [reportState, setReportState] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportedEmails, setReportedEmails] = useState(new Set());

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  useEffect(() => {
    if (currentUser) loadChatRooms();
  }, [currentUser]);

  const loadChatRooms = async () => {
    try {
      const [roomsA, roomsB] = await Promise.all([
        base44.entities.ChatRoom.filter({ user_a_email: currentUser.email }),
        base44.entities.ChatRoom.filter({ user_b_email: currentUser.email }),
      ]);
      const allRooms = [...(roomsA || []), ...(roomsB || [])].filter(r => r.status !== 'deleted' && !r.deleted_at);
      const seen = new Set();
      const unique = allRooms.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
      setChatRooms(unique);
    } catch (e) {
      console.error('Error loading chat rooms:', e);
    }
  };

  const getRoomForProfile = (email) => {
    return chatRooms.find(r =>
      (r.user_a_email === currentUser.email && r.user_b_email === email) ||
      (r.user_b_email === currentUser.email && r.user_a_email === email)
    );
  };

  const handleStartChat = async (profile) => {
    if (startingChatFor) return;
    setStartingChatFor(profile.user_email);
    try {
      // Check for existing room
      const existing = getRoomForProfile(profile.user_email);
      if (existing) {
        onClose();
        navigate(createPageUrl('Chat'));
        return;
      }
      const newRoom = await base44.entities.ChatRoom.create({
        user_a_email: currentUser.email,
        user_b_email: profile.user_email,
        status: 'pending',
        phase: 1,
        extension_accepted_a: false,
        extension_accepted_b: false,
        photo_sent_a: false,
        photo_sent_b: false,
      });

      // Optimistically update local state
      if (newRoom) {
        setChatRooms(prev => [...prev, newRoom]);
      }

      // Notify the other user
      try {
        await base44.entities.Notification.create({
          user_email: profile.user_email,
          type: 'chat_invite',
          message: `${myProfile?.display_name || 'Iemand'} wil met je chatten! Ga naar Chats om te accepteren. 💜`,
          read: false,
          created_date: new Date().toISOString(),
        });
      } catch (errNotif) {
        console.warn('Could not create notification:', errNotif);
      }

      toast.success('Chat-uitnodiging verstuurd! 💬');
      await loadChatRooms();
    } catch (e) {
      console.error('Error starting chat:', e);
      toast.error('Kon geen chat starten. Controleer of de ChatRoom tabel bestaat in Supabase.');
    } finally {
      setStartingChatFor(null);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason || !currentUser) return;
    setReportLoading(true);
    try {
      addLocalReportedEmail(reportState.profile.user_email);
      setReportedEmails(prev => new Set(prev).add(reportState.profile.user_email));
      await base44.entities.Report.create({
        reporter_email: currentUser.email,
        reporter_name: myProfile?.display_name || '',
        reported_email: reportState.profile.user_email,
        reported_name: reportState.profile.display_name || '',
        reason: reportState.reason,
        details: reportState.details || '',
        created_date: new Date().toISOString(),
      });
      setReportState(prev => ({ ...prev, step: 'done' }));
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const activeProfiles = (profiles || []).filter((p) => !reportedEmails.has(p.user_email));

  if (!profiles || profiles.length === 0 || activeProfiles.length === 0) {
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
            {activeProfiles.map((profile) => {
              const isMenuOpen = openMenuProfileId === profile.id;
              const isBioExpanded = expandedBioId === profile.id;

              return (
                <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
                  {/* Photo Background Carousel with Swipe & Indicator Dots */}
                  <ProfilePhotoCarousel
                    profile={profile}
                    isDark={isDark}
                    dotsClassName="top-[74px] left-4 z-30"
                  />

                  {/* ── Three-dots options button (top right) ── */}
                  <div 
                    className="absolute right-4 z-30 pointer-events-auto"
                    style={{ top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 58px)' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuProfileId(prev => prev === profile.id ? null : profile.id);
                      }}
                      className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                      title="Opties"
                    >
                      <MoreVertical className="w-4.5 h-4.5 text-white" />
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.85, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.85, y: -8 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                          className="absolute top-11 right-0 min-w-[192px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 z-40"
                          style={{ background: 'rgba(18,18,28,0.95)', backdropFilter: 'blur(20px)' }}
                        >
                          {/* Bio option */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProfileId(null);
                              setExpandedBioId(prev => prev === profile.id ? null : profile.id);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-white text-sm font-semibold hover:bg-white/10 active:bg-white/15 transition-colors text-left"
                          >
                            {isBioExpanded
                              ? <ChevronUp className="w-4 h-4 text-pink-400 flex-shrink-0" />
                              : <ChevronDown className="w-4 h-4 text-pink-400 flex-shrink-0" />
                            }
                            Bio zien van profiel
                          </button>

                          <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.1)' }} />

                          {/* Report option */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProfileId(null);
                              setReportState({ profile, step: 'choose', reason: null, details: '' });
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 active:bg-white/15 transition-colors text-left"
                            style={{ color: '#FF6B6B' }}
                          >
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            Rapporteren
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Foreground Content */}
                  <div 
                    className="relative z-10 flex flex-col h-full p-6 justify-end pointer-events-none"
                    style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
                  >
                    <div className="mt-auto pointer-events-auto flex flex-col">
                      {/* Name/Age/Height */}
                      <h2 className="text-[26px] sm:text-[28px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide text-left">
                        {profile.age} jaar {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                      </h2>

                      {/* Expandable Bio Section */}
                      <AnimatePresence>
                        {isBioExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden text-left"
                          >
                            <div className="rounded-2xl px-4 py-3 border border-white/20 bg-black/65 backdrop-blur-md">
                              <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed">
                                {profile.bio || 'Geen bio beschikbaar.'}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

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

                      {/* Chat / Status Button */}
                      {(() => {
                        const room = getRoomForProfile(profile.user_email);
                        if (room?.status === 'active') {
                          return (
                            <button
                              onClick={() => { onClose(); navigate(createPageUrl('Chat')); }}
                              className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-green-400 bg-green-500/15 border border-green-500/40 backdrop-blur-md shadow-lg active:scale-95 transition-transform"
                            >
                              <MessageCircle className="w-5 h-5" />
                              <span>Chat actief! Ga naar Chats →</span>
                            </button>
                          );
                        }
                        if (room?.status === 'pending') {
                          if (room.user_a_email === currentUser.email) {
                            return (
                              <div className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-sm text-amber-300 bg-amber-500/20 border border-amber-500/40 backdrop-blur-md shadow-lg">
                                <Clock className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '3s' }} />
                                <span>Uitnodiging verstuurd</span>
                              </div>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => { onClose(); navigate(createPageUrl('Chat')); }}
                                className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-pink-300 bg-pink-500/20 border border-pink-500/40 backdrop-blur-md shadow-lg active:scale-95 transition-transform"
                              >
                                <MessageCircle className="w-5 h-5" />
                                <span>Uitnodiging ontvangen! Ga naar Chats →</span>
                              </button>
                            );
                          }
                        }
                        return (
                          <button
                            onClick={() => handleStartChat(profile)}
                            disabled={startingChatFor === profile.user_email}
                            className="w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-transform active:scale-95 shadow-lg disabled:opacity-60"
                            style={{ background: GRAD, boxShadow: '0 6px 20px rgba(234, 63, 211, 0.4)' }}
                          >
                            <MessageCircle className="w-5 h-5 text-white" />
                            {startingChatFor === profile.user_email ? 'Bezig...' : 'Chat ontgrendelen'}
                          </button>
                        );
                      })()}
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
                {profiles.length} {profiles.length === 1 ? 'supermatch' : 'supermatches'} • Jullie hebben elkaar geliked!
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

        {/* Report Modal */}
        {reportState && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-[24px] p-5 shadow-2xl border" style={{ background: isDark ? '#141521' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
              {reportState.step === 'choose' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>Rapporteer profiel</h3>
                    <button onClick={() => setReportState(null)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs mb-3 font-medium" style={{ color: textSub }}>Kies de reden waarom je dit profiel wilt rapporteren:</p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setReportState((prev) => ({ ...prev, step: 'detail', reason: r.label, emoji: r.emoji }))}
                        className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between border active:scale-[0.98] transition-all"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                          color: isDark ? '#fff' : '#111',
                        }}
                      >
                        <span className="flex items-center gap-2"><span>{r.emoji}</span><span>{r.label}</span></span>
                        <span>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reportState.step === 'detail' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>Rapporteer profiel</h3>
                    <button onClick={() => setReportState(null)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400 active:scale-90 transition-transform">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Gekozen reden weergave */}
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-3.5 border"
                    style={{
                      background: isDark ? 'rgba(255, 75, 114, 0.12)' : 'rgba(255, 75, 114, 0.08)',
                      borderColor: isDark ? 'rgba(255, 75, 114, 0.3)' : 'rgba(255, 75, 114, 0.2)',
                    }}
                  >
                    <span className="text-base">{reportState.emoji || '⚠️'}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: textSub }}>Gekozen reden</span>
                      <span className="text-xs font-bold truncate" style={{ color: isDark ? '#fff' : '#111' }}>{reportState.reason}</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#111' }}>Toelichting (optioneel)</h4>
                  <textarea
                    value={reportState.details}
                    onChange={(e) => setReportState((prev) => ({ ...prev, details: e.target.value }))}
                    placeholder="Beschrijf waarom je dit profiel rapporteert..."
                    className="w-full h-24 p-3 rounded-xl text-xs border resize-none mb-4 outline-none focus:border-pink-500"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#fff' : '#111',
                    }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setReportState((prev) => ({ ...prev, step: 'choose' }))} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-500/20 text-gray-300 active:scale-95 transition-all">
                      Terug
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={reportLoading}
                      className="flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all"
                      style={{ background: GRAD }}
                    >
                      {reportLoading ? 'Versturen...' : 'Verstuur'}
                    </button>
                  </div>
                </div>
              )}

              {reportState.step === 'done' && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-green-500/20 text-green-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-base mb-1" style={{ color: isDark ? '#fff' : '#111' }}>Bedankt voor je melding</h3>
                  <p className="text-xs mb-4" style={{ color: textSub }}>We zullen dit profiel zo snel mogelijk beoordelen.</p>
                  <button onClick={() => setReportState(null)} className="w-full py-2.5 rounded-xl font-black text-xs text-white" style={{ background: GRAD }}>
                    Sluiten
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

    </AnimatePresence>,
    document.body
  );
}

