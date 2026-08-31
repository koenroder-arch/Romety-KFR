import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Users, Heart, User, Info, MessageCircle, Lock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import HintCard from '@/components/welove/HintCard';
import ProfilePhotoCarousel from '@/components/welove/ProfilePhotoCarousel';
import { authStorage } from '@/lib/authStorage';
import { toast } from 'sonner';

const MAX_CHARS = 25;

export default function SendHintSheet({ 
  user, myProfile, myCheckIn, matches, mutualMatches, onClose, onSent, isDark, initialProfile = null,
  myTodayHint = null, timeLeft = '', superMatchHints = [], hints = [], loadData = () => {}
}) {
  const [currentInitialProfile, setCurrentInitialProfile] = useState(initialProfile);
  const [activeTab, setActiveTab] = useState(initialProfile ? 'compose' : 'hints');
  const [step, setStep] = useState(initialProfile ? 'compose' : 'choose');
  const [targetType, setTargetType] = useState(initialProfile ? 'single' : null);
  const [selectedProfile, setSelectedProfile] = useState(initialProfile);
  const [previewProfile, setPreviewProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const [superHintsCollapsed, setSuperHintsCollapsed] = useState(false);
  const [regularHintsCollapsed, setRegularHintsCollapsed] = useState(false);

  const venueGroups = hints.reduce((acc, h) => {
    const key = h.venue_name || 'Onbekend';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  const [allCheckIns, setAllCheckIns] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  useEffect(() => {
    if (initialProfile) {
      setCurrentInitialProfile(initialProfile);
      setActiveTab('compose');
      setStep('compose');
      setTargetType('single');
      setSelectedProfile(initialProfile);
    }
  }, [initialProfile]);

  // Swipe logic for tabs
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (initialProfile) return;
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeTab === 'hints') {
      setActiveTab('compose');
    }
    if (isRightSwipe && activeTab === 'compose') {
      setActiveTab('hints');
    }
  };

  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      try {
        const [checkIns = [], dests = []] = await Promise.all([
          base44.entities.VenueCheckIn.list().catch(() => []),
          base44.entities.UserDestination.list().catch(() => []),
        ]);
        if (active) {
          setAllCheckIns(checkIns);
          setAllDestinations(dests);
          setLoadingLocations(false);
        }
      } catch (err) {
        console.error("Failed to load locations in SendHintSheet:", err);
        if (active) setLoadingLocations(false);
      }
    };
    loadLocations();
    return () => { active = false; };
  }, []);

  const bg = isDark ? '#0E0E1C' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';

  const isAtSameVenue = (otherEmail) => {
    if (!myCheckIn) return false;
    const now = new Date().toISOString();
    const myVenueId = myCheckIn?.venue_id;
    const myVenueName = myCheckIn?.venue_name;
    const vName = (myVenueName || '').toLowerCase();

    const matchVenueStr = (dbName) => {
      if (!vName || !dbName) return false;
      const lowerDb = dbName.toLowerCase();
      return lowerDb.includes(vName) || vName.includes(lowerDb);
    };

    const theirCheckIn = allCheckIns.find(
      (c) =>
        c.user_email === otherEmail &&
        (!c.expires_at || c.expires_at > now) &&
        (myVenueId ? c.venue_id === myVenueId : matchVenueStr(c.venue_name))
    );
    if (theirCheckIn) return true;

    const theirDest = allDestinations.find(
      (d) =>
        d.user_email === otherEmail &&
        d.status === 'active' &&
        (!d.expires_at || d.expires_at > now) &&
        (myVenueId ? d.venue_id === myVenueId : matchVenueStr(d.venue_name))
    );
    return !!theirDest;
  };

  const filteredMatches = myCheckIn ? matches.filter(m => isAtSameVenue(m.user_email || m.profile?.user_email)) : matches;
  const filteredMutualMatches = myCheckIn ? mutualMatches.filter(p => isAtSameVenue(p.user_email)) : mutualMatches;

  const options = [
    { type: 'supermatch', icon: Heart, label: 'Stuur een hint naar je supermatch', color: '#EA3FD3', count: mutualMatches.length },
    { type: 'matches', icon: Users, label: 'Stuur een hint naar je matches', color: '#FF6B4A', count: filteredMatches.length },
    { type: 'single', icon: User, label: 'Stuur een hint naar een match', color: '#60A5FA', count: null },
  ];

  const handleChoose = (type) => {
    setTargetType(type);
    if (type === 'single') {
      setStep('pick');
    } else {
      setStep('compose');
    }
  };

  const getRecipients = () => {
    if (initialProfile?.user_email) return [initialProfile.user_email];
    if (targetType === 'single' && selectedProfile?.user_email) return [selectedProfile.user_email];
    if (targetType === 'supermatch') return mutualMatches.map(p => p.user_email || p.profile?.user_email).filter(Boolean);
    if (targetType === 'matches') return filteredMatches.map(m => m.user_email || m.profile?.user_email).filter(Boolean);
    return [];
  };

  const allMatchProfiles = [
    ...filteredMutualMatches,
    ...filteredMatches.filter(m => !filteredMutualMatches.find(mm => mm.user_email === (m.user_email || m.profile?.user_email)))
  ];

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);

    try {
      const senderEmail = user?.email || myProfile?.user_email || authStorage.getUserEmail();
      if (!senderEmail) {
        toast.error('Je moet ingelogd zijn om een hint te sturen.');
        setSending(false);
        return;
      }

      const recipients = getRecipients();
      const venueName = myCheckIn?.venue_name || 'Geen locatie';
      const senderAvatar = myProfile?.avatar || '🦁 Leeuw';
      const senderName = myProfile?.display_name || user?.full_name || 'Iemand';
      const senderAge = myProfile?.age || null;
      const senderTraits = myProfile?.traits || [];
      const senderPhotoUrl = myProfile?.photo_url || (myProfile?.photos && myProfile?.photos[0]) || null;
      const targetTypeVal = targetType || (initialProfile ? 'single' : 'matches');

      // Create hint record in Supabase
      await base44.entities.Hint.create({
        from_email: senderEmail,
        from_name: senderName,
        from_avatar: senderAvatar,
        from_age: senderAge,
        from_traits: senderTraits,
        from_photo_url: senderPhotoUrl,
        venue_name: venueName,
        message: message.trim(),
        target_type: targetTypeVal,
        to_emails: recipients,
        heart_reactions: []
      });

      // Send in-app notification to recipients if any
      if (recipients.length > 0) {
        await Promise.all(recipients.map(to_email =>
          base44.entities.Notification.create({
            to_email,
            from_email: senderEmail,
            type: 'hint',
            from_name: senderName,
            venue_name: venueName
          }).catch(() => {})
        ));
      }

      toast.success('Hint succesvol verstuurd!');
      setMessage('');
      setCurrentInitialProfile(null);
      setSelectedProfile(null);
      setTargetType(null);
      setStep('choose');
      setActiveTab('hints');
      if (onSent) onSent();
      if (loadData) loadData();
    } catch (err) {
      console.error("Failed to send hint:", err);
      toast.error('Er is iets misgegaan bij het versturen van je hint.');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

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
        className="fixed inset-0 z-[102] max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl"
        style={{
          background: bg,
          touchAction: 'pan-y',
        }}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div 
            className="w-full px-4 pb-3 flex items-center justify-between flex-shrink-0" 
            style={{ 
              paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
              borderBottom: `1px solid ${divider}` 
            }}
          >
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                title="Sluiten"
              >
                <ChevronLeft className="w-6 h-6" style={{ color: textMain }} />
              </button>
              {currentInitialProfile ? (
                <div className="ml-1">
                  <h2 className="text-base font-black text-[#FF4B72]">
                    Hints sturen
                  </h2>
                </div>
              ) : (
                <div className="flex gap-4 ml-1">
                  <button
                    onClick={() => setActiveTab('hints')}
                    className={`pb-1 text-base font-black transition-colors border-b-[3px] ${activeTab === 'hints' ? 'text-[#FF4B72] border-[#FF4B72]' : 'text-gray-400 border-transparent'}`}
                  >
                    Hints
                  </button>
                  <button
                    onClick={() => setActiveTab('compose')}
                    className={`pb-1 text-base font-black transition-colors border-b-[3px] ${activeTab === 'compose' ? 'text-[#FF4B72] border-[#FF4B72]' : 'text-gray-400 border-transparent'}`}
                  >
                    Hints sturen
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
            >
              <X className="w-4 h-4" style={{ color: textMain }} />
            </button>
          </div>

          {activeTab === 'compose' && !currentInitialProfile && !myTodayHint && (step === 'compose' || step === 'pick') && (
            <div className="w-full px-5 py-3 text-left flex-shrink-0" style={{ borderBottom: `1px solid ${divider}` }}>
              <button
                onClick={(e) => { e.stopPropagation(); step === 'compose' && targetType === 'single' ? setStep('pick') : setStep('choose'); }}
                className="text-sm font-semibold"
                style={{ color: '#FF6B4A' }}
              >
                ← Terug
              </button>
            </div>
          )}

          {/* Scrollable content */}
          <div 
            className="flex-1 overflow-y-auto overflow-x-hidden px-5 pt-4"
            style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEndHandler}
          >
            {loadingLocations ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-[#FF6B4A] animate-spin mb-3" />
                <p className="text-xs font-semibold" style={{ color: textSub }}>Matches filteren op locatie...</p>
              </div>
            ) : (
              <>
                {activeTab === 'hints' && (
                  <div className="space-y-4">
                    {/* Mijn hint van vandaag */}
                    {myTodayHint && (
                      <div>
                        <p className="text-xs font-bold mb-2 text-left" style={{ color: textSub }}>JOUW HINT VAN VANDAAG</p>
                        <div
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl"
                          style={{
                            background: isDark ? 'rgba(255,75,114,0.12)' : 'rgba(255,75,114,0.08)',
                            border: '1.5px solid rgba(255,75,114,0.35)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,75,114,0.2)' }}>
                              <MessageCircle className="w-4 h-4" style={{ color: '#FF4B72' }} />
                            </div>
                            <div>
                              <p className={`text-sm font-black text-left ${textMain}`}>"{myTodayHint.message}"</p>
                              <p className="text-[10px] text-left mt-0.5 font-semibold" style={{ color: textSub }}>
                                {myTodayHint.venue_name} · verloopt over {timeLeft}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,75,110,0.15)', border: '1px solid rgba(255,75,110,0.3)' }}>
                            <Heart className="w-3.5 h-3.5" fill="#FF4B6E" style={{ color: '#FF4B6E' }} />
                            <span className="text-xs font-black" style={{ color: '#FF4B6E' }}>
                              {(myTodayHint.heart_reactions || []).length}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Supermatch hints */}
                    {superMatchHints.length > 0 && (
                      <div>
                        <button
                          onClick={() => setSuperHintsCollapsed(!superHintsCollapsed)}
                          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left focus:outline-none transition-all active:scale-[0.98]"
                          style={{
                            background: isDark ? 'rgba(234,63,211,0.07)' : 'rgba(234,63,211,0.04)',
                            border: isDark ? '1.5px solid rgba(234,63,211,0.35)' : '1.5px solid rgba(234,63,211,0.2)',
                          }}
                        >
                          <span className="text-xs font-black tracking-wide flex items-center gap-1.5" style={{ color: '#EA3FD3' }}>
                            💜 HINTS VAN JE SUPERMATCHES ({superMatchHints.length})
                          </span>
                          {superHintsCollapsed ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#EA3FD3' }} /> : <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#EA3FD3' }} />}
                        </button>
                        {!superHintsCollapsed && (
                          <div className="space-y-2 mt-3">
                            {superMatchHints.map(hint => (
                              <HintCard key={hint.id} hint={hint} isDark={isDark} onReacted={() => loadData()} isSuperMatch={true} />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Lock or Hints lists */}
                    {!myCheckIn ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,75,114,0.12)' }}>
                          <Lock className="w-7 h-7" style={{ color: '#FF4B72' }} />
                        </div>
                        <p className={`font-black text-sm mb-1 ${textMain}`}>Geen bestemming ingesteld</p>
                        <p className="text-xs mb-3 font-semibold text-pink-500">Je kunt geen hints van anderen zien zonder actieve bestemming</p>
                        <p className="text-xs" style={{ color: textSub }}>
                          Ga naar Pinpoint en stel je bestemming in om hints te zien en te sturen
                        </p>
                      </div>
                    ) : (
                      <>
                        {Object.keys(venueGroups).length > 0 && (
                          <div>
                            <button
                              onClick={() => setRegularHintsCollapsed(!regularHintsCollapsed)}
                              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-left focus:outline-none transition-all active:scale-[0.98]"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                                border: `1px solid ${divider}`,
                              }}
                            >
                              <span className="text-xs font-black tracking-wide" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                                📍 HINTS IN JOUW OMGEVING ({hints.length})
                              </span>
                              {regularHintsCollapsed ? <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: textSub }} /> : <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: textSub }} />}
                            </button>
                            {!regularHintsCollapsed && (
                              <div className="mt-3">
                                {Object.entries(venueGroups).map(([venue, venueHints]) => (
                                  <div key={venue} className="mb-5">
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                                      <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>{venue}</span>
                                      <span className="text-xs" style={{ color: textSub }}>({venueHints.length})</span>
                                    </div>
                                    <div className="space-y-2">
                                      {venueHints.map(hint => (
                                        <HintCard key={hint.id} hint={hint} isDark={isDark} onReacted={() => loadData()} />
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {Object.keys(venueGroups).length === 0 && !myTodayHint && superMatchHints.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,75,114,0.1)' }}>
                              <MessageCircle className="w-7 h-7" style={{ color: '#FF4B72' }} />
                            </div>
                            <p className={`font-black text-sm mb-1 ${textMain}`}>Nog geen hints</p>
                            <p className="text-xs" style={{ color: textSub }}>Wees de eerste die een hint stuurt!</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'compose' && (
                  <>
                    {myTodayHint ? (
                      <div 
                        className="p-6 rounded-[28px] text-center my-2" 
                        style={{ 
                          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', 
                          border: `1px solid ${divider}` 
                        }}
                      >
                        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-pink-500/15 text-pink-500 shadow-inner">
                          <MessageCircle className="w-8 h-8" />
                        </div>
                        <h3 className={`text-lg font-black mb-1.5 ${textMain}`}>Je hint is actief!</h3>
                        <p className="text-xs mb-5 leading-relaxed font-medium" style={{ color: textSub }}>
                          Je kunt 1 hint per ronde (9 uur) versturen. Zodra je huidige hint verloopt, kun je weer een nieuwe sturen.
                        </p>
                        
                        {/* Current hint summary card */}
                        <div 
                          className="p-4 rounded-2xl mb-6 text-left" 
                          style={{ 
                            background: isDark ? 'rgba(255,75,114,0.12)' : 'rgba(255,75,114,0.06)', 
                            border: '1.5px solid rgba(255,75,114,0.35)' 
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest">JOUW ACTIEVE HINT</p>
                            <span className="text-[10px] font-bold text-pink-400">⏳ {timeLeft || '9u'}</span>
                          </div>
                          <p className={`text-sm font-black ${textMain}`}>"{myTodayHint.message}"</p>
                          <p className="text-[11px] mt-1.5 font-semibold" style={{ color: textSub }}>
                            📍 {myTodayHint.venue_name}
                          </p>
                        </div>

                        <button
                          onClick={() => setActiveTab('hints')}
                          className="w-full py-4 rounded-2xl text-white font-black text-sm active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                        >
                          <span>Bekijk hints overzicht</span>
                          <span>→</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {step === 'choose' && (
                          <div className="space-y-3">
                            {options.map(({ type, icon: Icon, label, color, count }) => (
                              <button
                                key={type}
                                onClick={() => handleChoose(type)}
                                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left"
                                style={{
                                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                }}
                              >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: color + '22' }}>
                                  <Icon className="w-5 h-5" style={{ color }} />
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold" style={{ color: textMain }}>{label}</p>
                                  {count !== null && (
                                    <p className="text-xs mt-0.5" style={{ color: textSub }}>{count} {type === 'supermatch' ? 'supermatches' : 'matches'}</p>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4" style={{ color: textSub }} />
                              </button>
                            ))}
                          </div>
                        )}

                        {step === 'pick' && (
                          <div className="space-y-3">
                            <p className="text-xs mb-3 text-center" style={{ color: textSub }}>
                              Kies een profiel bij <span style={{ color: '#FF6B4A', fontWeight: 700 }}>{myCheckIn?.venue_name}</span>
                            </p>
                            {allMatchProfiles.length === 0 && (
                              <p className="text-sm text-center py-6" style={{ color: textSub }}>Geen matches gevonden bij deze venue</p>
                            )}
                            {allMatchProfiles.map((profile, idx) => {
                              const email = profile.user_email || profile.profile?.user_email;
                              const photo = profile.photo_url || profile.profile?.photo_url;
                              const age = profile.age || profile.profile?.age;
                              const selectedEmail = selectedProfile?.user_email || selectedProfile?.profile?.user_email;
                              const isSelected = selectedEmail === email;
                              const avatarStr = profile.avatar || profile.profile?.avatar;
                              const emoji = avatarStr ? (avatarStr.includes(' ') ? avatarStr.split(' ')[0] : avatarStr) : '👤';
                              return (
                                <div
                                  key={email}
                                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
                                  style={{
                                    background: isSelected
                                      ? 'linear-gradient(135deg, rgba(255,75,114,0.2), rgba(234,63,211,0.15))'
                                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                                    border: `1.5px solid ${isSelected ? 'rgba(255,75,114,0.6)' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                  }}
                                >
                                  {/* Avatar — click to select */}
                                  <button
                                    onClick={() => setSelectedProfile(profile)}
                                    className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                                    style={{ background: 'rgba(255,75,114,0.15)' }}
                                  >
                                    {photo ? (
                                      <img src={photo} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                      <div
                                        className="w-full h-full flex items-center justify-center text-lg"
                                        style={avatarStr ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : {}}
                                      >
                                        {emoji}
                                      </div>
                                    )}
                                  </button>

                                  {/* Anonymous label */}
                                  <button
                                    onClick={() => setSelectedProfile(profile)}
                                    className="flex-1 min-w-0 text-left"
                                  >
                                    <p className="text-sm font-black" style={{ color: textSub }}>
                                      Match #{idx + 1} {avatarStr ? `(${avatarStr})` : ''}
                                    </p>
                                    {age && <p className="text-xs" style={{ color: textSub }}>{age} jaar</p>}
                                  </button>

                                  {/* Info button */}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setPreviewProfile(profile); }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-1"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                                  >
                                    <Info className="w-4 h-4" style={{ color: textSub }} />
                                  </button>

                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#FF6B4A' }}>
                                      <span className="text-white text-[10px] font-black">✓</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <button
                              onClick={() => selectedProfile && setStep('compose')}
                              disabled={!selectedProfile}
                              className="w-full py-3.5 rounded-2xl text-white font-black text-sm mt-2 disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                            >
                              Stuur een hint →
                            </button>
                          </div>
                        )}

                        {step === 'compose' && (
                          <div>
                            <p className="text-xs mb-4 text-center" style={{ color: textSub }}>
                              Max {MAX_CHARS} tekens • 1x per dag • Wordt verstuurd naar{' '}
                              <span style={{ color: '#FF4B72', fontWeight: 700 }}>
                                {targetType === 'supermatch' ? 'je supermatches' : targetType === 'matches' ? 'je matches' : 'je match'}
                              </span>{' '}
                              bij <span style={{ color: '#FF4B72', fontWeight: 700 }}>{myCheckIn?.venue_name}</span>
                            </p>

                            <div className="relative mb-4">
                              <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                                placeholder="Schrijf je hint..."
                                className="w-full rounded-2xl px-4 py-3 text-sm resize-none outline-none"
                                style={{
                                  background: inputBg,
                                  color: textMain,
                                  border: `1.5px solid ${message.length === MAX_CHARS ? '#EA3FD3' : 'rgba(255,75,114,0.3)'}`,
                                  minHeight: '80px',
                                }}
                                rows={3}
                              />
                              <span
                                className="absolute bottom-3 right-3 text-xs font-bold"
                                style={{ color: message.length === MAX_CHARS ? '#EA3FD3' : textSub }}
                              >
                                {message.length}/{MAX_CHARS}
                              </span>
                            </div>

                            <button
                              onClick={handleSend}
                              disabled={!message.trim() || sending}
                              className="w-full py-3.5 rounded-2xl text-white font-black text-sm disabled:opacity-50"
                              style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                            >
                              {sending ? 'Versturen...' : 'Verstuur hint'}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Profile preview popup */}
      {previewProfile && (() => {
        const p = previewProfile;
        const photo = p.photo_url || p.profile?.photo_url;
        const age = p.age || p.profile?.age;
        const bio = p.bio || p.profile?.bio;
        const traits = p.traits || p.profile?.traits || [];
        const interests = p.interests || p.profile?.interests || [];
        const goal = p.relationship_goal || p.profile?.relationship_goal;
        const height = p.height_cm || p.profile?.height_cm;
        const avatarStr = p.avatar || p.profile?.avatar;
        const emoji = avatarStr ? (avatarStr.includes(' ') ? avatarStr.split(' ')[0] : avatarStr) : '👤';
        return (
          <div
            className="fixed inset-0 flex items-center justify-center px-5"
            style={{ zIndex: 110, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setPreviewProfile(null)}
          >
            <div
              className="w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl"
              style={{
                background: isDark ? '#1A1A2E' : '#FFFFFF',
                border: isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid rgba(0,0,0,0.08)',
                maxHeight: '80vh',
                overflowY: 'auto',
                boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.7)' : '0 24px 64px rgba(0,0,0,0.18)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button */}
              <div className="flex justify-end p-4 pb-0">
                <button
                  onClick={() => setPreviewProfile(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }}
                >
                  <X className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#555' }} />
                </button>
              </div>

              {/* Photo */}
              <div className="px-5 pb-4">
                <div className="w-full rounded-2xl overflow-hidden mb-4 relative" style={{ height: 220, background: 'rgba(255,75,114,0.1)' }}>
                  <ProfilePhotoCarousel
                    profile={previewProfile}
                    isDark={isDark}
                    dotsClassName="bottom-2"
                  />
                </div>

                {/* Age + height */}
                <div className="flex flex-wrap gap-2 mb-3">
                   {avatarStr && (
                     <span className="text-sm font-black px-3 py-1 rounded-full bg-pink-500 text-white flex items-center gap-1">
                       <span>{emoji}</span>
                       <span>{avatarStr.split(' ').slice(1).join(' ')}</span>
                     </span>
                   )}
                   {age && (
                    <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}>
                      {age} jaar
                    </span>
                  )}
                  {height && (
                    <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: textSub }}>
                      {height} cm
                    </span>
                  )}
                  {goal && (
                    <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: textSub }}>
                      {goal}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {bio && (
                  <p className="text-sm mb-3 leading-relaxed" style={{ color: textSub }}>{bio}</p>
                )}

                {/* Traits */}
                {traits.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {traits.map(t => (
                      <span key={t} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,75,114,0.12)', color: '#FF4B72' }}>{t}</span>
                    ))}
                  </div>
                )}

                {/* Interests */}
                {interests.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {interests.map(i => (
                      <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textSub }}>{i}</span>
                    ))}
                  </div>
                )}

                {/* Select button */}
                <button
                  onClick={() => { setSelectedProfile(previewProfile); setPreviewProfile(null); }}
                  className="w-full py-3 rounded-2xl text-white font-black text-sm"
                  style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                >
                  Kies dit profiel
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}