import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MatchAnimation from './MatchAnimation';
import StoriesViewer from './StoriesViewer';
import { Heart, MessageCircle, MoreVertical, AlertTriangle, X, ChevronDown, ChevronUp, Send, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

  const bg = isDark ? 'transparent' : 'transparent';
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

  const handleDoubleTap = (e, profile) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const animId = Date.now() + Math.random();
    setDoubleTapAnims(prev => [...prev, { id: animId, profileId: profile.id, x, y }]);
    
    handleLike(profile);
    
    setTimeout(() => {
      setDoubleTapAnims(prev => prev.filter(a => a.id !== animId));
    }, 1000);
  };

  const handleSingleClick = async (profile) => {
    // Fetch stories for this user
    try {
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
      const userStories = await base44.entities.Story.filter({ user_email: profile.user_email }, '-created_date', 50);
      const activeStories = userStories.filter(s => s.created_date >= nineHoursAgo);
      
      if (activeStories.length > 0) {
        setSelectedStoryGroup({
          user_email: profile.user_email,
          profile: profile,
          items: activeStories.reverse() // show oldest to newest
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

  if (profiles.length === 0) return (
    <div className="h-full flex flex-col items-center justify-center py-10 px-6 text-center" style={{ background: bg }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(255,107,74,0.1)' : 'rgba(255,107,74,0.05)' }}>
        <p className="text-4xl">📭</p>
      </div>
      <p className={`text-lg font-black mb-2 ${textMain}`}>Nog geen {isMutual ? 'super matches' : 'matches'}</p>
      <p className="text-sm max-w-xs mb-6" style={{ color: textSub }}>
        Er is op dit moment niemand nieuw op jouw locatie die aan je voorkeuren voldoet.
      </p>
      <button
        onClick={() => window.location.href = '/pinpoint'}
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
      {profiles.map((profile, index) => {
        const isLiked = likedProfiles.has(profile.id);
        const activeAnims = doubleTapAnims.filter(a => a.profileId === profile.id);
        const isMenuOpen = openMenuProfileId === profile.id;
        const isBioExpanded = expandedBioId === profile.id;

        return (
          <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative">
            
            {/* Photo Background */}
            <div 
              className="absolute inset-0 z-0 bg-gray-900 cursor-pointer"
              onClick={(e) => {
                // Close menu on background click
                if (isMenuOpen) { setOpenMenuProfileId(null); return; }
                // Prevent single click firing when double clicking
                if (e.detail === 1) {
                  setTimeout(() => {
                    // Only open story if not double-tapped recently
                    handleSingleClick(profile);
                  }, 250);
                }
              }}
              onDoubleClick={(e) => handleDoubleTap(e, profile)}
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                    {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                  </div>
                  {profile.avatar && (
                    <div className="absolute bottom-32 text-center text-white/50 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                      {profile.avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}
              {/* Gradient overlay to make text readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
              
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
            </div>

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
                    onClick={() => handleLike(profile)} 
                    className="flex-1 py-3.5 px-4 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform shadow-lg"
                  >
                    <Heart className="w-5 h-5" color={isLiked ? '#FF5A43' : 'white'} fill={isLiked ? '#FF5A43' : 'transparent'} strokeWidth={2.4} />
                    Like
                  </button>
                  <button 
                    onClick={() => !hasSentToday && onSendHint && onSendHint(profile)} 
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
        {reportState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:p-4"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
            onClick={() => setReportState(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden mb-16 sm:mb-0"
              style={{ background: 'rgba(14,14,22,0.98)', backdropFilter: 'blur(20px)', maxHeight: '80vh' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  {reportState.step !== 'done' && (
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-black text-base">
                      {reportState.step === 'done' ? '✅ Melding verstuurd' : 'Profiel rapporteren'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setReportState(null)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* ── Step: choose reason ── */}
              {reportState.step === 'choose' && (
                <div className="px-5 pt-3 pb-8 overflow-y-auto" style={{ maxHeight: '65vh' }}>
                  <p className="text-white/60 text-sm mb-3">Kies een reden voor je melding:</p>
                  <div className="flex flex-col gap-2">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => handleSelectReason(r.label)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/12 active:scale-[0.98] transition-all text-left"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        <span className="text-white font-semibold text-sm">{r.label}</span>
                        <span className="ml-auto text-white/30 text-lg">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step: add detail message ── */}
              {reportState.step === 'detail' && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setReportState(prev => ({ ...prev, step: 'choose', reason: null }))}
                      className="text-white/50 text-sm hover:text-white/80 transition-colors"
                    >
                      ← Terug
                    </button>
                  </div>
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4 border border-white/10"
                    style={{ background: 'rgba(255,107,74,0.12)' }}
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-orange-300 font-semibold text-sm">{reportState.reason}</span>
                  </div>
                  <p className="text-white/60 text-sm mb-3">Voeg eventueel een bericht toe (optioneel):</p>
                  <textarea
                    value={reportState.details}
                    onChange={e => setReportState(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Beschrijf wat er aan de hand is..."
                    rows={4}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 border border-white/15 resize-none outline-none focus:border-pink-500/60 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={reportLoading}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 shadow-lg"
                    style={{ background: reportLoading ? 'rgba(255,107,74,0.5)' : 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', boxShadow: '0 6px 20px rgba(255,75,114,0.35)' }}
                  >
                    {reportLoading ? (
                      <>⏳ Versturen...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Melding versturen</>
                    )}
                  </button>
                </div>
              )}

              {/* ── Step: done ── */}
              {reportState.step === 'done' && (
                <div className="px-5 py-8 flex flex-col items-center text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                    style={{ background: 'rgba(52,199,89,0.15)' }}
                  >
                    <Check className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-white font-black text-lg mb-2">Bedankt voor je melding</p>
                  <p className="text-white/50 text-sm max-w-xs leading-relaxed">
                    We nemen je melding serieus en zullen dit profiel beoordelen.
                  </p>
                  <button
                    onClick={() => setReportState(null)}
                    className="mt-6 px-8 py-3 rounded-full font-bold text-white text-sm active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)' }}
                  >
                    Sluiten
                  </button>
                </div>
              )}

              {/* Bottom safe area */}
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}