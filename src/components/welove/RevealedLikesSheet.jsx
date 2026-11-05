import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, Heart, MoreVertical, AlertTriangle, Ban, ChevronDown, ChevronUp, Check } from 'lucide-react';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';
import MatchAnimation from './MatchAnimation';
import { base44 } from '@/api/base44Client';
import { addLocalReportedEmail } from '@/lib/reportUtils';
import { trNow } from '@/lib/LanguageContext';
import BlockUserDialog from './BlockUserDialog';
import { dt } from '@/lib/displayText';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', get label() { return trNow('Ongepaste foto', 'Inappropriate photo'); }, emoji: '🖼️' },
  { id: 'fraude_scam', get label() { return trNow('Fraude of scam', 'Fraud or scam'); }, emoji: '⚠️' },
  { id: 'ai_foto', get label() { return trNow('AI foto', 'AI photo'); }, emoji: '🤖' },
  { id: 'bot_account', get label() { return trNow('Een Bot account', 'A bot account'); }, emoji: '👾' },
  { id: 'stalking', get label() { return trNow('Stalking', 'Stalking'); }, emoji: '🚫' },
];

export default function RevealedLikesSheet({
  profiles = [],
  currentUser,
  myProfile,
  isDark = true,
  onClose,
  onRefresh,
  onSendHint,
}) {
  const [matchAnim, setMatchAnim] = useState(null);
  const [openMenuProfileId, setOpenMenuProfileId] = useState(null);
  const [expandedBioId, setExpandedBioId] = useState(null);
  const [likedEmails, setLikedEmails] = useState(new Set());
  const [reportedEmails, setReportedEmails] = useState(new Set());
  const [blockTarget, setBlockTarget] = useState(null);
  const [reportState, setReportState] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [doubleTapAnims, setDoubleTapAnims] = useState([]);
  const [pendingLikedEmails, setPendingLikedEmails] = useState(new Set());
  const likingEmailRef = useRef(new Set());

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';

  const activeProfiles = profiles.filter((p) => !likedEmails.has(p.user_email) && !reportedEmails.has(p.user_email));

  const handleDoubleTapAtCoord = (x, y, profile) => {
    if (openMenuProfileId) {
      setOpenMenuProfileId(null);
      return;
    }

    // Altijd direct de hart-animatie tonen op de exacte tikpositie
    const animId = Date.now() + Math.random();
    setDoubleTapAnims((prev) => [...prev, { id: animId, profileId: profile.id, x, y }]);
    setTimeout(() => {
      setDoubleTapAnims((prev) => prev.filter((a) => a.id !== animId));
    }, 1200);

    // Like en match triggeren als dit profiel nog niet in verwerking is
    if (!likedEmails.has(profile.user_email) && !likingEmailRef.current.has(profile.user_email)) {
      handleLikeBack(profile);
    }
  };

  const handleLikeBack = async (profile) => {
    if (!profile || !currentUser) return;
    if (likedEmails.has(profile.user_email) || likingEmailRef.current.has(profile.user_email)) return;

    likingEmailRef.current.add(profile.user_email);
    setPendingLikedEmails((prev) => new Set(prev).add(profile.user_email));

    // Voer de like en notificaties asynchroon uit in de database
    (async () => {
      try {
        await base44.entities.Like.create({
          from_email: currentUser.email,
          to_email: profile.user_email,
        });

        await Promise.all([
          base44.entities.Notification.create({
            to_email: profile.user_email,
            from_email: currentUser.email,
            type: 'match',
            from_name: myProfile?.display_name || 'Iemand',
          }).catch(() => {}),
          base44.entities.Notification.create({
            to_email: currentUser.email,
            from_email: profile.user_email,
            type: 'match',
            from_name: profile.display_name || 'Een Match',
          }).catch(() => {}),
        ]);
      } catch (err) {
        console.error('Error liking revealed profile:', err);
      }
    })();

    // 1. Na 0,5 seconde opent het matchscherm direct
    setTimeout(() => {
      setMatchAnim({ myProfile, matchedProfile: profile });
    }, 500);

    // 2. De foto van dat profiel blijft achter het matchscherm staan voor nog 1 seconde (totaal 1,5s),
    // zodat de foto niet verspringt voordat je naar het matchscherm gaat
    setTimeout(() => {
      setLikedEmails((prev) => new Set(prev).add(profile.user_email));
      likingEmailRef.current.delete(profile.user_email);
      if (onRefresh) onRefresh();
    }, 1500);
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason || !currentUser) return;
    setReportLoading(true);
    try {
      addLocalReportedEmail(reportState.profile.user_email);
      setReportedEmails((prev) => new Set(prev).add(reportState.profile.user_email));
      await base44.entities.Report.create({
        reporter_email: currentUser.email,
        reporter_name: myProfile?.display_name || '',
        reported_email: reportState.profile.user_email,
        reported_name: reportState.profile.display_name || '',
        reason: reportState.reason,
        details: reportState.details || '',
        created_date: new Date().toISOString(),
      });
      setReportState((prev) => ({ ...prev, step: 'done' }));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error reporting profile:', err);
    } finally {
      setReportLoading(false);
    }
  };

  if (!profiles || profiles.length === 0 || activeProfiles.length === 0) {
    return createPortal(
      <div 
        className="fixed inset-0 z-[250] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm select-none"
        onClick={onClose}
      >
        <div 
          className="relative z-10 flex flex-col items-center gap-4 px-6 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-5xl">💖</span>
          <p className="text-white font-black text-xl">{trNow('Nog geen ontvangen likes', 'No likes received yet')}</p>
          <p className="text-white/60 text-sm max-w-xs">{trNow('Zodra iemand jou leuk vindt, zie je hun like hier verschijnen!', 'As soon as someone likes you, their like will appear here!')}</p>
          <button 
            onClick={onClose} 
            className="mt-4 px-6 py-2.5 rounded-full font-bold text-white text-sm active:scale-95 transition-transform cursor-pointer" 
            style={{ background: GRAD, boxShadow: '0 8px 24px rgba(255, 75, 114, 0.35)' }}
          >
            {trNow('Sluiten', 'Close')}
          </button>
        </div>
      </div>,
      document.body
    );
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="fixed inset-0 z-[250] max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: bg,
          touchAction: 'pan-y',
        }}
      >
        <style>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Backdrop om menu te sluiten als er ergens anders op de pagina wordt geklikt */}
        {openMenuProfileId && (
          <div
            className="fixed inset-0 z-35 bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuProfileId(null);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setOpenMenuProfileId(null);
            }}
          />
        )}

        {/* Profile Swiper Area (Full screen snap-scrolling feed like Matches page) */}
        <div className="absolute inset-0 z-0">
          <div
            className="w-full h-full overflow-y-auto snap-y snap-mandatory scroll-smooth flex flex-col no-scrollbar"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {activeProfiles.map((profile) => {
              const isMenuOpen = openMenuProfileId === profile.id;
              const isBioExpanded = expandedBioId === profile.id;
              const activeAnims = doubleTapAnims.filter(a => a.profileId === profile.id);

              return (
                <div 
                  key={profile.id} 
                  className="w-full h-full flex-shrink-0 snap-start snap-always relative select-none"
                  onDoubleClick={(e) => {
                    if (e.target.closest('button') || e.target.closest('.profile-options-menu-container')) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    handleDoubleTapAtCoord(x, y, profile);
                  }}
                >
                  {/* Photo Background Carousel with Swipe & Indicator Dots */}
                  <ProfilePhotoCarousel
                    profile={profile}
                    isDark={isDark}
                    onDoubleTap={(x, y, p) => handleDoubleTapAtCoord(x, y, p)}
                    dotsClassName="top-[102px] left-4 z-30"
                  />

                  {/* ── Top-Level Double Tap Hearts Animation (Pops over entire card with glow) ── */}
                  <AnimatePresence>
                    {activeAnims.map(anim => (
                      <motion.div
                        key={anim.id}
                        initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
                        animate={{ 
                          scale: [0, 1.35, 1.15], 
                          opacity: [0, 1, 1, 0],
                          y: ['-50%', '-65%', '-80%']
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ 
                          duration: 1.2, 
                          times: [0, 0.25, 0.7, 1],
                          ease: 'easeOut'
                        }}
                        className="absolute pointer-events-none z-50 flex items-center justify-center"
                        style={{ left: anim.x, top: anim.y }}
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-28 h-28 rounded-full bg-pink-500/35 blur-xl animate-pulse" />
                          <Heart 
                            className="w-28 h-28 drop-shadow-[0_8px_30px_rgba(255,75,114,0.85)]" 
                            fill="#FF4B72" 
                            color="#FF4B72" 
                            strokeWidth={0} 
                          />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* ── Three-dots options button (top right) ── */}
                  <div
                    className="profile-options-menu-container absolute right-4 z-40 pointer-events-auto"
                    style={{ top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 58px)' }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuProfileId(prev => prev === profile.id ? null : profile.id);
                      }}
                      className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                      title={trNow('Opties', 'Options')}
                    >
                      <MoreVertical className="w-4 h-4 text-white" />
                    </button>

                    {/* Dropdown menu */}
                    <AnimatePresence>
                      {isMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                          className="absolute top-11 right-0 min-w-[192px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 z-40"
                          style={{ background: '#12121C' }}
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
                            {trNow('Bio zien van profiel', 'View profile bio')}
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
                            {trNow('Rapporteren', 'Report')}
                          </button>

                          <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.1)' }} />

                          {/* Blokkeren */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuProfileId(null);
                              setBlockTarget({ email: profile.user_email, name: profile.display_name });
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 active:bg-white/15 transition-colors text-left"
                            style={{ color: '#FF6B6B' }}
                          >
                            <Ban className="w-4 h-4 flex-shrink-0" />
                            {trNow('Blokkeren', 'Block')}
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
                      {/* Name / Age / Height */}
                      <h2 className="text-[28px] sm:text-[30px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide text-left">
                        {profile.age} {trNow('jaar', 'yrs')} {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
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
                                {profile.bio || trNow('Geen bio beschikbaar.', 'No bio available.')}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Tags (Avatar, Interests, Traits) */}
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

                      {/* Action Button: Like Terug */}
                      <button
                        onClick={() => handleLikeBack(profile, 1500)}
                        disabled={pendingLikedEmails.has(profile.user_email)}
                        className={`w-full py-3.5 px-4 rounded-2xl flex items-center justify-center gap-2.5 font-black text-sm sm:text-base text-white transition-all shadow-xl ${
                          pendingLikedEmails.has(profile.user_email) ? 'opacity-90' : 'active:scale-95'
                        }`}
                        style={{
                          background: GRAD,
                          boxShadow: '0 8px 24px rgba(255, 75, 114, 0.45)',
                        }}
                      >
                        <Heart className={`w-5 h-5 fill-white text-white ${pendingLikedEmails.has(profile.user_email) ? 'animate-bounce' : 'animate-pulse'}`} />
                        <span>{pendingLikedEmails.has(profile.user_email) ? trNow('Geliked! 💖', 'Liked! 💖') : trNow('Like terug & match direct!', 'Like back & match instantly!')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Top Header */}
        <div
          className="absolute top-0 left-0 w-full z-20 flex items-center justify-between px-4 pb-3.5 backdrop-blur-xl"
          style={{
            paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
            background: isDark ? 'rgba(13,14,21,0.85)' : 'rgba(255,255,255,0.85)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto transition-transform active:scale-90 border border-white/15"
              style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }}
              title={trNow('Terug', 'Back')}
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
                💖 {trNow('Ontvangen Likes', 'Received Likes')}
              </h2>
              <p className="text-[11px] font-medium" style={{ color: textSub }}>
                {activeProfiles.length} {activeProfiles.length === 1 ? trNow('persoon heeft jou geliked', 'person liked you') : trNow('mensen hebben jou geliked', 'people liked you')}
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
        <BlockUserDialog
          target={blockTarget}
          isDark={isDark}
          onClose={() => setBlockTarget(null)}
          onBlocked={(t) => {
            setReportedEmails((prev) => new Set(prev).add(t.email));
            setReportState(null);
          }}
        />
        {reportState && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-[24px] p-5 shadow-2xl border" style={{ background: isDark ? '#141521' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
              {reportState.step === 'choose' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>{trNow('Rapporteer profiel', 'Report profile')}</h3>
                    <button onClick={() => setReportState(null)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs mb-3 font-medium" style={{ color: textSub }}>{trNow('Kies de reden waarom je dit profiel wilt rapporteren:', 'Choose why you want to report this profile:')}</p>
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
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>{trNow('Rapporteer profiel', 'Report profile')}</h3>
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
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: textSub }}>{trNow('Gekozen reden', 'Chosen reason')}</span>
                      <span className="text-xs font-bold truncate" style={{ color: isDark ? '#fff' : '#111' }}>{reportState.reason}</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#111' }}>{trNow('Toelichting (optioneel)', 'Explanation (optional)')}</h4>
                  <textarea
                    value={reportState.details}
                    onChange={(e) => setReportState((prev) => ({ ...prev, details: e.target.value }))}
                    placeholder={trNow('Beschrijf waarom je dit profiel rapporteert...', 'Describe why you are reporting this profile...')}
                    className="w-full h-24 p-3 rounded-xl text-xs border resize-none mb-4 outline-none focus:border-pink-500"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#fff' : '#111',
                    }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setReportState((prev) => ({ ...prev, step: 'choose' }))} className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-500/20 text-gray-300 active:scale-95 transition-all">
                      {trNow('Terug', 'Back')}
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={reportLoading}
                      className="flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all bg-red-600 hover:bg-red-700"
                      style={{ background: '#EF4444' }}
                    >
                      {reportLoading ? trNow('Rapporteren...', 'Reporting...') : trNow('Rapporteren', 'Report')}
                    </button>
                  </div>
                </div>
              )}

              {reportState.step === 'done' && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-green-500/20 text-green-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-base mb-1" style={{ color: isDark ? '#fff' : '#111' }}>{trNow('Bedankt voor je melding', 'Thanks for your report')}</h3>
                  <p className="text-xs mb-4" style={{ color: textSub }}>{trNow('We zullen dit profiel zo snel mogelijk beoordelen.', 'We will review this profile as soon as possible.')}</p>
                  <button
                    onClick={() => setBlockTarget({ email: reportState.profile.user_email, name: reportState.profile.display_name })}
                    className="w-full py-2.5 mb-2 rounded-xl font-black text-xs text-red-500 active:scale-95 transition-all"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    {trNow('Ook blokkeren', 'Block as well')}
                  </button>
                  <button onClick={() => setReportState(null)} className="w-full py-2.5 rounded-xl font-black text-xs text-white" style={{ background: GRAD }}>
                    {trNow('Sluiten', 'Close')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Match Animation Overlay */}
        {matchAnim && (
          <MatchAnimation
            myProfile={matchAnim.myProfile}
            matchedProfile={matchAnim.matchedProfile}
            onDone={() => {
              setMatchAnim(null);
              onClose?.();
            }}
            onClose={() => setMatchAnim(null)}
            onSendHint={(profile) => {
              setMatchAnim(null);
              if (onSendHint) {
                onClose?.();
                onSendHint(profile);
              }
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
