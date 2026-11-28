import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import MatchAnimation from './MatchAnimation';
import { Heart, MessageCircle, MoreVertical, AlertTriangle, Ban, X, ChevronDown, ChevronUp, Check, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfilePhotoCarousel, { getProfilePhotos } from './ProfilePhotoCarousel';
import { addLocalReportedEmail } from '@/lib/reportUtils';
import { trNow } from '@/lib/LanguageContext';
import BlockUserDialog from './BlockUserDialog';
import { createLikeOnce } from '@/lib/likeUtils';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', get label() { return trNow('Ongepaste foto', 'Inappropriate photo'); }, emoji: '🖼️' },
  { id: 'fraude_scam', get label() { return trNow('Fraude of scam', 'Fraud or scam'); }, emoji: '⚠️' },
  { id: 'ai_foto', get label() { return trNow('AI foto', 'AI photo'); }, emoji: '🤖' },
  { id: 'bot_account', get label() { return trNow('Een Bot account', 'A bot account'); }, emoji: '👾' },
  { id: 'stalking', get label() { return trNow('Stalking', 'Stalking'); }, emoji: '🚫' },
];

export default function MatchesSwiper({ profiles, initialLikedIds = [], likedMeEmails = [], isPremium, currentUserEmail, onShowPremium, isMutual = false, isDark = true, onSendHint, hasSentToday }) {
  // Wie jou heeft geliked (kleine letters); samen met jouw like = supermatch
  const [likedMe, setLikedMe] = useState(() => new Set(likedMeEmails));
  React.useEffect(() => { setLikedMe(new Set(likedMeEmails)); }, [likedMeEmails]);
  const markLikedMe = (email) => setLikedMe((prev) => new Set(prev).add((email || '').toLowerCase().trim()));
  const navigate = useNavigate();
  const [matchAnim, setMatchAnim] = useState(null);
  const [myProfileCache, setMyProfileCache] = useState(null);
  const [likedProfiles, setLikedProfiles] = useState(new Set(initialLikedIds));
  const [doubleTapAnims, setDoubleTapAnims] = useState([]);
  const [reportedEmails, setReportedEmails] = useState(new Set());
  
  // Three-dots menu state
  const [openMenuProfileId, setOpenMenuProfileId] = useState(null);

  // Bio expanded state (profileId -> bool)
  const [expandedBioId, setExpandedBioId] = useState(null);

  // Report modal state
  const [blockTarget, setBlockTarget] = useState(null);
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

    await createLikeOnce(currentUserEmail, profile.user_email);

    const existingLikes = await base44.entities.Like.filter({ from_email: profile.user_email, to_email: currentUserEmail });
    if (existingLikes.length > 0) {
      await Promise.all([
        base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'match', from_name: myName }),
        base44.entities.Notification.create({ to_email: currentUserEmail, from_email: profile.user_email, type: 'match', from_name: 'Een Match' }),
      ]);
      markLikedMe(profile.user_email);
      setMatchAnim({ myProfile: myProf, matchedProfile: profile });
    }
  };

  const handleDoubleTapAtCoord = (x, y, profile) => {
    const animId = Date.now() + Math.random();
    setDoubleTapAnims(prev => [...prev, { id: animId, profileId: profile.id, x, y }]);
    
    // Double tap only likes (it does not unlike) - optimistic instant update
    if (!likedProfiles.has(profile.id)) {
      setLikedProfiles(prev => new Set(prev).add(profile.id));

      (async () => {
        try {
          let myProf = myProfileCache;
          if (!myProf) {
            const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
            myProf = myProfs[0] || null;
            setMyProfileCache(myProf);
          }
          const myName = myProf?.display_name || 'Iemand';

          await createLikeOnce(currentUserEmail, profile.user_email);

          const existingLikes = await base44.entities.Like.filter({ from_email: profile.user_email, to_email: currentUserEmail });
          if (existingLikes.length > 0) {
            await Promise.all([
              base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'match', from_name: myName }),
              base44.entities.Notification.create({ to_email: currentUserEmail, from_email: profile.user_email, type: 'match', from_name: 'Een Match' }),
            ]);
            markLikedMe(profile.user_email);
            setMatchAnim({ myProfile: myProf, matchedProfile: profile });
          }
        } catch (err) {
          console.error("Error creating like on double tap:", err);
        }
      })();
    }
    
    setTimeout(() => {
      setDoubleTapAnims(prev => prev.filter(a => a.id !== animId));
    }, 950);
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
    // Geen matches: kaart in dezelfde stijl als de rest van de app
    <div className="h-full flex flex-col items-center justify-center px-5 pb-24" style={{ background: bg }}>
      <div
        className="w-full max-w-sm rounded-[28px] p-[1.5px]"
        style={{
          background: 'linear-gradient(135deg, rgba(255,75,114,0.7) 0%, rgba(234,63,211,0.3) 100%)',
          boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.45)' : '0 12px 30px rgba(17,24,39,0.1)',
        }}
      >
        <div
          className="rounded-[26.5px] px-6 pt-8 pb-6 text-center"
          style={{
            background: isDark
              ? 'linear-gradient(160deg, rgba(255,75,114,0.14), rgba(234,63,211,0.05) 55%, transparent 100%), #15151F'
              : 'linear-gradient(160deg, rgba(255,75,114,0.08), rgba(234,63,211,0.03) 55%, transparent 100%), #FFFFFF',
          }}
        >
          {/* Hartje in het Romety-verloop met een zacht ademende ring */}
          <div className="relative w-20 h-20 mx-auto mb-5">
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(255,75,114,0.35) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.7, 0.25, 0.7] }}
              transition={{ duration: 3, ease: 'easeInOut', repeat: Infinity }}
            />
            <div
              className="relative w-20 h-20 rounded-full flex items-center justify-center"
              style={{ background: GRAD, boxShadow: '0 10px 26px rgba(255,75,114,0.45), inset 0 1px 0 rgba(255,255,255,0.25)' }}
            >
              <Heart className="w-9 h-9 text-white" strokeWidth={2.2} />
            </div>
          </div>

          <p className={`text-[20px] font-black leading-tight mb-2 ${textMain}`}>
            {trNow('Nog geen', 'No')} {isMutual ? 'super matches' : 'matches'}{trNow('', ' yet')}
          </p>
          <p className="text-[13px] leading-relaxed mb-6 mx-auto max-w-[260px]" style={{ color: textSub }}>
            {trNow('Er is op dit moment niemand nieuw op jouw locatie die aan je voorkeuren voldoet.', 'There is currently no one new at your location who matches your preferences.')}
          </p>

          <button
            onClick={() => navigate('/Pinpoint')}
            className="w-full py-3.5 rounded-full font-bold text-[15px] text-white flex items-center justify-center gap-2 active:scale-95 transition-transform"
            style={{ background: GRAD, boxShadow: '0 10px 24px rgba(255,75,114,0.4)' }}
          >
            <MapPin className="w-[18px] h-[18px]" />
            {trNow('Bekijk andere clubs', 'View other clubs')}
          </button>
        </div>
      </div>
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
    <div className="h-full overflow-y-auto snap-y snap-mandatory scroll-smooth flex flex-col relative" style={{ background: bg }}>

      {visibleProfiles.map((profile, index) => {
        const isLiked = likedProfiles.has(profile.id);
        const activeAnims = doubleTapAnims.filter(a => a.profileId === profile.id);
        const isMenuOpen = openMenuProfileId === profile.id;
        const isBioExpanded = expandedBioId === profile.id;
        // Supermatch: jullie hebben elkaar allebei geliked
        const isSuperMatch = isLiked && likedMe.has((profile.user_email || '').toLowerCase().trim());
        const hasPhotoDots = getProfilePhotos(profile).length >= 2;

        return (
          <div key={profile.id} className="w-full h-full flex-shrink-0 snap-start snap-always relative select-none">

            {/* Photo Background Carousel with Swipe & Indicator Dots */}
            <ProfilePhotoCarousel
              profile={profile}
              isDark={isDark}
              onDoubleTap={(x, y, p) => handleDoubleTapAtCoord(x, y, p)}
              dotsClassName="top-4 left-4 z-30"
            />

            {/* "Supermatch!" linksboven (onder de fotobolletjes), schuin in zacht goud;
                groeit soepel van klein naar groot zodra het profiel in beeld komt */}
            <AnimatePresence>
              {isSuperMatch && (
                <motion.div
                  key="supermatch"
                  className="absolute left-4 z-30 pointer-events-none select-none origin-left"
                  style={{ top: hasPhotoDots ? 48 : 16 }}
                  initial={{ opacity: 0, scale: 0.3, rotate: -8 }}
                  whileInView={{ opacity: 1, scale: 1, rotate: -8 }}
                  exit={{ opacity: 0, scale: 0.6, rotate: -8 }}
                  viewport={{ amount: 0.6 }}
                  transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 0.8 }}
                >
                  <span
                    className="block text-[26px] font-black italic tracking-tight leading-none pr-2 py-0.5"
                    style={{
                      // Zachter goud: minder fel, met een lichte schaduw voor leesbaarheid
                      background: 'linear-gradient(135deg, #FBEBC0 0%, #EFCB7A 45%, #D9A94E 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))',
                    }}
                  >
                    Supermatch!
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

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
                    duration: 0.85, 
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

            {/* ── Three-dots button (top right) ── */}
            <div className="profile-options-menu-container absolute top-4 right-3 z-50 pointer-events-auto">
              {isMenuOpen && (
                <div
                  className="fixed inset-0 z-40 bg-transparent select-none cursor-default"
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

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuProfileId(prev => prev === profile.id ? null : profile.id);
                }}
                className="relative z-50 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center active:scale-90 transition-transform shadow-lg cursor-pointer"
                aria-label={trNow('Opties', 'Options')}
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
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-12 right-0 min-w-[192px] rounded-2xl overflow-hidden shadow-2xl border border-white/15 pointer-events-auto z-50"
                    style={{ background: '#12121C', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}
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
                      {trNow('Bio zien van profiel', 'View profile bio')}
                    </button>

                    <div className="h-px mx-3" style={{ background: 'rgba(255,255,255,0.1)' }} />

                    {/* Report option */}
                    <button
                      onClick={(e) => handleOpenReport(e, profile)}
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
                        setBlockTarget({ email: profile.user_email, name: profile.avatar });
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
            <div className="relative z-10 flex flex-col h-full px-4 pt-6 pb-[100px] pointer-events-none">

              <div className="mt-auto flex flex-col pointer-events-none">
                {/* Name/Age/Height */}
                <h2 className="text-[22px] font-black text-white drop-shadow-md leading-none mb-2.5 tracking-wide pointer-events-none select-none">
                  {profile.age} {trNow('jaar', 'yrs')} {profile.height_cm ? `• ${profile.height_cm} cm` : ''}
                </h2>

                {/* Bio expandable section */}
                <AnimatePresence>
                  {isBioExpanded && profile.bio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden pointer-events-none"
                    >
                      <div
                        className="rounded-2xl px-4 py-3 border border-white/20 pointer-events-none select-none"
                        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)' }}
                      >
                        <p className="text-sm text-white/90 font-medium leading-relaxed pointer-events-none">
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
                      className="overflow-hidden pointer-events-none"
                    >
                      <div
                        className="rounded-2xl px-4 py-3 border border-white/15 pointer-events-none select-none"
                        style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}
                      >
                        <p className="text-sm text-white/50 font-medium italic pointer-events-none">
                          {trNow('Geen bio beschikbaar', 'No bio available')}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tags (Avatar first, then interests/traits) */}
                <div className="flex flex-wrap gap-1.5 mb-3.5 items-center pointer-events-none">
                  {profile.avatar && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white bg-black/45 backdrop-blur-md border border-pink-500/50 shadow-sm flex items-center gap-1.5 pointer-events-none select-none">
                      <span className="text-xs">{profile.avatar.split(' ')[0]}</span>
                      <span className="text-pink-100">{profile.avatar.split(' ').slice(1).join(' ')}</span>
                    </span>
                  )}
                  {[...(profile.interests || []).slice(0, 2), ...(profile.traits || []).slice(0, 1)].map((tag) => (
                    <span key={tag} className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white bg-black/40 backdrop-blur-[2px] shadow-sm border border-white/20 pointer-events-none select-none">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pointer-events-auto">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
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
                      e.stopPropagation();
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

      {/* ── Report Modal ── */}
      <BlockUserDialog
          target={blockTarget}
          isDark={isDark}
          onClose={() => setBlockTarget(null)}
          onBlocked={(t) => {
            setReportedEmails((prev) => new Set(prev).add(t.email));
            setReportState(null);
          }}
        />
        <AnimatePresence>
        {/* Report Modal */}
        {reportState && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}>
            <div className="w-full max-w-sm rounded-[24px] p-5 shadow-2xl border" style={{ background: isDark ? '#0A0A0F' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}>
              {reportState.step === 'choose' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>{trNow('Rapporteer profiel', 'Report profile')}</h3>
                    <button onClick={() => setReportState(null)} className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400 active:scale-90 transition-transform">
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
                  <p className="text-xs mb-4 font-medium" style={{ color: textSub }}>{trNow('We zullen dit profiel zo snel mogelijk beoordelen.', 'We will review this profile as soon as possible.')}</p>
                  <button
                    onClick={() => setBlockTarget({ email: reportState.profile.user_email, name: reportState.profile.avatar })}
                    className="w-full py-2.5 mb-2 rounded-xl font-black text-xs text-red-500 active:scale-95 transition-all"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    {trNow('Ook blokkeren', 'Block as well')}
                  </button>
                  <button onClick={() => setReportState(null)} className="w-full py-2.5 rounded-xl font-black text-xs text-white active:scale-95 transition-all" style={{ background: GRAD }}>
                    {trNow('Sluiten', 'Close')}
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