import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MatchAnimation from './MatchAnimation';
import StoriesViewer from './StoriesViewer';
import { Heart, MessageCircle, MoreVertical, AlertTriangle, X, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfilePhotoCarousel from './ProfilePhotoCarousel';
import { addLocalReportedEmail } from '@/lib/reportUtils';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', label: 'Ongepaste foto', emoji: '🖼️' },
  { id: 'fraude_scam', label: 'Fraude of scam', emoji: '⚠️' },
  { id: 'ai_foto', label: 'AI foto', emoji: '🤖' },
  { id: 'bot_account', label: 'Een Bot account', emoji: '👾' },
  { id: 'stalking', label: 'Stalking', emoji: '🚫' },
];

export default function MatchesSwiper({ profiles, initialLikedIds = [], isPremium, currentUserEmail, onShowPremium, isMutual = false, isDark = true, onSendHint, hasSentToday }) {
  const navigate = useNavigate();
  const [matchAnim, setMatchAnim] = useState(null);
  const [myProfileCache, setMyProfileCache] = useState(null);
  const [likedProfiles, setLikedProfiles] = useState(new Set(initialLikedIds));
  const [doubleTapAnims, setDoubleTapAnims] = useState([]);
  const [reportedEmails, setReportedEmails] = useState(new Set());
  
  // Story viewer state
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);

  // Three-dots menu state
  const [openMenuProfileId, setOpenMenuProfileId] = useState(null);

  // Bio expanded state (profileId -> bool)
  const [expandedBioId, setExpandedBioId] = useState(null);

  // Report modal state
  const [reportState, setReportState] = useState(null); // null | { profile, step: 'choose'|'detail'|'done', reason: null|string, details: '' }
  const [reportLoading, setReportLoading] = useState(false);

  React.useEffect(() => {
    setLikedProfiles(new Set(initialLikedIds));
  }, [initialLikedIds]);

  const bg = 'transparent';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)';

  const handleLike = async (profile) => {
    if (likedProfiles.has(profile.id)) {
      // Remove Like
      setLikedProfiles(prev => { const n = new Set(prev); n.delete(profile.id); return n; });
      const existing = await base44.entities.Like.filter({ from_email: currentUserEmail, to_email: profile.user_email });
      for (const l of existing) {
        await base44.entities.Like.delete(l.id);
      }
      return;
    }
    
    // Add Like
    setLikedProfiles(prev => new Set(prev).add(profile.id));

    let myProf = myProfileCache;
    if (!myProf) {
      const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
      myProf = myProfs[0] || null;
      setMyProfileCache(myProf);
    }
    const myName = myProf?.display_name || 'Iemand';

    await base44.entities.Like.create({ from_email: currentUserEmail, to_email: profile.user_email });

    const existingLikes = await base44.entities.Like.filter({ from_email: profile.user_email, to_email: currentUserEmail });
    if (existingLikes.length > 0) {
      await Promise.all([
        base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'match', from_name: myName }),
        base44.entities.Notification.create({ to_email: currentUserEmail, from_email: profile.user_email, type: 'match', from_name: 'Een Match' }),
      ]);
      setMatchAnim({ myProfile: myProf, matchedProfile: profile });
    }
  };

  const lastClickRef = useRef({});
  const singleClickTimeoutRef = useRef({});

  const handleDoubleTapAtCoord = (x, y, profile) => {
    const animId = Date.now() + Math.random();
    setDoubleTapAnims(prev => [...prev, { id: animId, profileId: profile.id, x, y }]);
    
    // Double tap only likes (it does not unlike)
    if (!likedProfiles.has(profile.id)) {
      handleLike(profile);
    }
    
    setTimeout(() => {
      setDoubleTapAnims(prev => prev.filter(a => a.id !== animId));
    }, 1000);
  };

  const handleCardClick = (e, profile, isMenuOpen) => {
    if (isMenuOpen) {
      setOpenMenuProfileId(null);
      return;
    }

    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    const lastClick = lastClickRef.current[profile.id] || 0;

    if (now - lastClick < DOUBLE_PRESS_DELAY) {
      // Double tap!
      if (singleClickTimeoutRef.current[profile.id]) {
        clearTimeout(singleClickTimeoutRef.current[profile.id]);
        singleClickTimeoutRef.current[profile.id] = null;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      handleDoubleTapAtCoord(x, y, profile);
      lastClickRef.current[profile.id] = 0;
    } else {
      lastClickRef.current[profile.id] = now;

      if (singleClickTimeoutRef.current[profile.id]) {
        clearTimeout(singleClickTimeoutRef.current[profile.id]);
      }
      singleClickTimeoutRef.current[profile.id] = setTimeout(() => {
        handleSingleClick(profile);
        singleClickTimeoutRef.current[profile.id] = null;
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const handleSingleClick = async (profile) => {
    try {
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
      const userStories = await base44.entities.Story.filter({ user_email: profile.user_email }, '-created_date', 50);
      const activeStories = userStories.filter(s => s.created_date >= nineHoursAgo);
      if (activeStories.length > 0) {
        setSelectedStoryGroup({
          user_email: profile.user_email,
          profile: profile,
          items: activeStories.reverse(),
        });
      }
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  const handleMenuToggle = (e, profileId) => {
    e.stopPropagation();
    setOpenMenuProfileId(prev => prev === profileId ? null : profileId);
  };

  const handleShowBio = (e, profileId) => {
    e.stopPropagation();
    setOpenMenuProfileId(null);
    setExpandedBioId(prev => prev === profileId ? null : profileId);
  };

  const handleOpenReport = (e, profile) => {
    e.stopPropagation();
    setOpenMenuProfileId(null);
    setReportState({ profile, step: 'choose', reason: null, details: '' });
  };

  const handleSelectReason = (reason) => {
    setReportState(prev => ({ ...prev, step: 'detail', reason }));
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason) return;
    setReportLoading(true);
    try {
      addLocalReportedEmail(reportState.profile.user_email);
      setReportedEmails(prev => new Set(prev).add(reportState.profile.user_email));
      let myProf = myProfileCache;
      if (!myProf) {
        const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
        myProf = myProfs[0] || null;
        setMyProfileCache(myProf);
      }
      await base44.entities.Report.create({
        reporter_email: currentUserEmail,
        reporter_name: myProf?.display_name || '',
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

  const visibleProfiles = profiles.filter((p) => !reportedEmails.has(p.user_email));

  if (visibleProfiles.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center py-10 px-6 text-center" style={{ background: bg }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,107,74,0.1)' : 'rgba(255,107,74,0.05)' }}>
        <p className="text-4xl">📭</p>
      </div>
      <p className={`text-lg font-black mb-2 ${textMain}`}>Nog geen {isMutual ? 'super matches' : 'matches'}</p>
      <p className="text-sm max-w-xs mb-6" style={{ color: textSub }}>
        Er is op dit moment niemand nieuw op jouw locatie die aan je voorkeuren voldoet.
      </p>
      <button
        onClick={() => navigate('/Pinpoint')}
        className="px-6 py-3 rounded-full font-black text-sm text-white shadow-lg active:scale-95 transition-transform"
        style={{ background: GRAD, boxShadow: '0 8px 24px rgba(255,107,74,0.3)' }}
      >
        🗺️ Bekijk andere clubs
      </button>
    </div>
  );

  if (matchAnim) return (
    <MatchAnimation 
      myProfile={matchAnim.myProfile} 
      matchedProfile={matchAnim.matchedProfile} 
      onDone={() => setMatchAnim(null)} 
      onSendHint={(profile) => {
        setMatchAnim(null);
        if (onSendHint) onSendHint(profile);
      }}
    />
  );

  return (
    <div className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth flex flex-col" style={{ background: bg }}>
      {visibleProfiles.map((profile, index) => {
        const isLiked = likedProfiles.has(profile.id);
        const activeAnims = doubleTapAnims.filter(a => a.profileId === profile.id);
        const isMenuOpen = openMenuProfileId === profile.id;
        const isBioExpanded = expandedBioId === profile.id;

        return (
          <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
            
            {/* Photo Background Carousel with Swipe & Indicator Dots */}
            <ProfilePhotoCarousel
              profile={profile}
              isDark={isDark}
              onDoubleTap={(x, y, p) => handleDoubleTapAtCoord(x, y, p)}
              onClick={() => handleSingleClick(profile)}
              dotsClassName="top-4 left-4 z-30"
            >
              {/* Double Tap Hearts Animation */}
              <AnimatePresence>
                {activeAnims.map(anim => (
                  <motion.div
                    key={anim.id}
                    initial={{ scale: 0, opacity: 1, x: '-50%', y: '-50%' }}
                    animate={{ scale: [0, 1.2, 1], opacity: [1, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, times: [0, 0.4, 1] }}
                    className="absolute pointer-events-none z-20"
                    style={{ left: anim.x, top: anim.y }}
                  >
                    <Heart className="w-24 h-24" fill="#FF6B4A" color="#FF6B4A" />
                  </motion.div>
                ))}
              </AnimatePresence>
            </ProfilePhotoCarousel>

            {/* ── Three-dots button (top right) ── */}
            <div className="absolute top-4 right-3 z-30 pointer-events-auto">
              <button
                onClick={(e) => handleMenuToggle(e, profile.id)}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition-transform shadow-lg"
                aria-label="Opties"
              >
                <MoreVertical className="w-4 h-4 text-white" />
              </button>

              {/* Dropdown menu */}
              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85, y: -8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    className="absolute top-12 right-0 min-w-[192px] rounded-2xl overflow-hidden shadow-2xl border border-white/15"
                    style={{ background: 'rgba(18,18,28,0.95)', backdropFilter: 'blur(20px)' }}
                  >
                    {/* Bio option */}
                    <button
                      onClick={(e) => handleShowBio(e, profile.id)}
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
                      onClick={(e) => handleOpenReport(e, profile)}
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
            <div className="relative z-10 flex flex-col h-full p-6 pb-[100px] pointer-events-none">

              <div className="mt-auto pointer-events-auto flex flex-col">
                {/* Name/Age/Height */}
                <h2 className="text-[32px] font-black text-white drop-shadow-md leading-none mb-4 tracking-wide">
                  {profile.age} jaar {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                </h2>

                {/* Bio expandable section */}
                <AnimatePresence>
                  {isBioExpanded && profile.bio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-2xl px-4 py-3 border border-white/20"
                        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}
                      >
                        <p className="text-sm text-white/90 font-medium leading-relaxed">
                          {profile.bio}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  {isBioExpanded && !profile.bio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div
                        className="rounded-2xl px-4 py-3 border border-white/15"
                        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}
                      >
                        <p className="text-sm text-white/50 font-medium italic">
                          Geen bio beschikbaar
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tags (Avatar first, then interests/traits) */}
                <div className="flex flex-wrap gap-2 mb-6 items-center">
                  {profile.avatar && (
                    <span className="px-4 py-1.5 rounded-full text-[14px] font-bold text-white bg-black/45 backdrop-blur-md border-2 border-pink-500/50 shadow-sm flex items-center gap-1.5">
                      <span className="text-base">{profile.avatar.split(' ')[0]}</span>
                      <span className="text-pink-100">{profile.avatar.split(' ').slice(1).join(' ')}</span>
                    </span>
                  )}
                  {[...(profile.interests || []).slice(0, 2), ...(profile.traits || []).slice(0, 1)].map((tag) => (
                    <span key={tag} className="px-4 py-1.5 rounded-full text-[14px] font-semibold text-white bg-black/40 backdrop-blur-[2px] shadow-sm border-2 border-white/20">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button 
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleLike(profile);
                    }} 
                    className={`flex-1 py-3.5 px-4 rounded-full border-2 backdrop-blur-md flex items-center justify-center gap-2.5 font-bold text-[16px] active:scale-95 transition-all shadow-lg ${
                      isLiked 
                        ? 'border-[#FF4B72] text-[#FF4B72] bg-[#FF4B72]/15 shadow-[#FF4B72]/20' 
                        : 'border-white/35 text-white bg-black/40'
                    }`}
                  >
                    <Heart className="w-5 h-5" color={isLiked ? '#FF4B72' : 'white'} fill={isLiked ? '#FF4B72' : 'transparent'} strokeWidth={2.4} />
                    Like
                  </button>
                  <button 
                    onClick={(e) => {
                      e.currentTarget.blur();
                      if (!hasSentToday && onSendHint) onSendHint(profile);
                    }} 
                    disabled={hasSentToday}
                    className="flex-1 py-3.5 px-4 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" color="white" strokeWidth={2.4} />
                    Hint
                  </button>
                </div>
              </div>
            </div>

          </div>
        );
      })}

      {/* Stories Viewer Overlay */}
      {selectedStoryGroup && (
        <StoriesViewer
          group={selectedStoryGroup}
          allGroups={null} // Only viewing one profile's stories
          onClose={() => setSelectedStoryGroup(null)}
          isDark={isDark}
          currentUserEmail={currentUserEmail}
          onStoryDeleted={(storyId) => {
            setSelectedStoryGroup((prev) => {
              if (!prev) return null;
              const updatedItems = prev.items.filter((item) => item.id !== storyId);
              if (updatedItems.length === 0) return null;
              return { ...prev, items: updatedItems };
            });
          }}
        />
      )}

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {/* Report Modal */}
        {reportState && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-[24px] p-5 shadow-2xl border" style={{ background: isDark ? '#141521' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
              {reportState.step === 'choose' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>Rapporteer profiel</h3>
                    <button onClick={() => setReportState(null)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400 active:scale-90 transition-transform">
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
                  <p className="text-xs mb-4 font-medium" style={{ color: textSub }}>We zullen dit profiel zo snel mogelijk beoordelen.</p>
                  <button onClick={() => setReportState(null)} className="w-full py-2.5 rounded-xl font-black text-xs text-white active:scale-95 transition-all" style={{ background: GRAD }}>
                    Sluiten
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}