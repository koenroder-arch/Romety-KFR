import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Users, Heart, User, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, useMotionValue, useTransform, animate, useDragControls } from 'framer-motion';

const MAX_CHARS = 15;

const SHEET_H = () => Math.round(window.innerHeight * 0.85);
const PEEK_VISIBLE = () => Math.round(window.innerHeight * 0.70);
const FULL_Y = 0;
const getPeekY = () => SHEET_H() - PEEK_VISIBLE();
const getHiddenY = () => SHEET_H() + 40;

export default function SendHintSheet({ user, myProfile, myCheckIn, matches, mutualMatches, onClose, onSent, isDark, initialProfile = null }) {
  const [step, setStep] = useState(initialProfile ? 'compose' : 'choose');
  const [targetType, setTargetType] = useState(initialProfile ? 'single' : null);
  const [selectedProfile, setSelectedProfile] = useState(initialProfile);
  const [previewProfile, setPreviewProfile] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [snapState, setSnapState] = useState('open');

  const [allCheckIns, setAllCheckIns] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(true);

  const dragControls = useDragControls();

  // Freeze background body scroll while the sheet is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalHeight = document.body.style.height;
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.height = originalHeight;
    };
  }, []);

  const HIDDEN_Y = getHiddenY();
  const sheetHeight = SHEET_H();

  const y = useMotionValue(HIDDEN_Y);
  const bgOpacity = useTransform(y, [FULL_Y, HIDDEN_Y], [0.6, 0]);

  // Load locations on mount
  useEffect(() => {
    let active = true;
    const loadLocations = async () => {
      try {
        const [checkIns, dests] = await Promise.all([
          base44.entities.VenueCheckIn.list(),
          base44.entities.UserDestination.list(),
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

  // Animate in on mount and state changes
  useEffect(() => {
    const target = snapState === 'open' ? FULL_Y : HIDDEN_Y;
    animate(y, target, { type: 'spring', stiffness: 400, damping: 38 });
  }, [snapState]);

  const handleDragEnd = (_, info) => {
    const velocity = info.velocity.y;
    const currentY = y.get();

    // If dragged down or high velocity down, close it
    if (velocity > 300 || currentY > sheetHeight * 0.4) {
      onClose();
    } else {
      // Snap back to open state
      setSnapState('open');
      animate(y, FULL_Y, { type: 'spring', stiffness: 400, damping: 38 });
    }
  };

  const bg = isDark ? 'rgba(14,14,28,1)' : 'rgba(255,255,255,1)';
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

  // Filter matches and mutualMatches by current user's active check-in or destination
  const filteredMatches = myCheckIn
    ? matches.filter(m => {
        const email = m.user_email || m.profile?.user_email;
        return isAtSameVenue(email);
      })
    : matches;

  const filteredMutualMatches = myCheckIn
    ? mutualMatches.filter(p => isAtSameVenue(p.user_email))
    : mutualMatches;

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
    if (targetType === 'supermatch') return mutualMatches.map(p => p.user_email);
    if (targetType === 'matches') return filteredMatches.map(m => m.user_email || m.profile?.user_email);
    if (targetType === 'single' && selectedProfile) {
      return [selectedProfile.user_email || selectedProfile.profile?.user_email];
    }
    return [];
  };

  // All matchable profiles for single pick
  const allMatchProfiles = [
    ...filteredMutualMatches,
    ...filteredMatches.filter(m => !filteredMutualMatches.find(mm => mm.user_email === (m.user_email || m.profile?.user_email)))
  ];

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    const toEmails = getRecipients().filter(Boolean);

    await base44.entities.Hint.create({
      from_email: user.email,
      from_name: myProfile?.display_name || user.full_name || 'Onbekend',
      from_photo_url: myProfile?.photo_url || null,
      from_avatar: myProfile?.avatar || null,
      from_age: myProfile?.age || null,
      from_traits: (myProfile?.traits || []).slice(0, 3),
      venue_name: myCheckIn?.venue_name || '',
      message: message.trim().slice(0, MAX_CHARS),
      target_type: targetType,
      to_emails: toEmails,
    });

    await Promise.all(toEmails.map(email =>
      base44.entities.Notification.create({
        to_email: email,
        from_email: user.email,
        from_name: myProfile?.display_name || user.full_name || 'Onbekend',
        type: 'hint',
        venue_name: myCheckIn?.venue_name || '',
      }).catch(() => {})
    ));

    setSending(false);
    onSent();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0"
        style={{ zIndex: 100, background: 'rgba(0,0,0,1)', opacity: bgOpacity, pointerEvents: 'none' }}
      />

      {/* Tap backdrop to close */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 101 }}
        onClick={onClose}
      />

      <motion.div
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: FULL_Y, bottom: HIDDEN_Y }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        style={{
          y,
          position: 'fixed',
          bottom: 0,
          left: '50%',
          translateX: '-50%',
          width: '100%',
          maxWidth: 448,
          zIndex: 102,
          touchAction: 'pan-y',
        }}
      >
        <div
          className="flex flex-col overflow-hidden"
          style={{
            background: bg,
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '28px 28px 0 0',
            boxShadow: isDark ? '0 -8px 40px rgba(255,107,74,0.2), 0 -2px 20px rgba(0,0,0,0.5)' : '0 -4px 30px rgba(0,0,0,0.1)',
            height: sheetHeight,
          }}
        >
          {/* Drag handle */}
          <div
            className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            onPointerDown={(e) => dragControls.start(e)}
            style={{ touchAction: 'none' }}
          >
            <div className="w-10 h-1 rounded-full mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />

            {/* Header */}
            <div className="w-full px-5 pb-2 flex items-center justify-between" style={{ borderBottom: `1px solid ${divider}` }}>
              <div>
                {(step === 'compose' || step === 'pick') ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); step === 'compose' && targetType === 'single' ? setStep('pick') : setStep('choose'); }}
                    className="text-sm font-semibold"
                    style={{ color: '#FF6B4A' }}
                  >
                    ← Terug
                  </button>
                ) : (
                  <p className="font-black text-base" style={{ color: textMain }}>
                    Stuur je matches een hint
                  </p>
                )}
                {step === 'pick' && (
                  <p className="font-black text-base mt-0.5" style={{ color: textMain }}>
                    Kies een match 💙
                  </p>
                )}
                {step === 'compose' && (
                  <p className="font-black text-base mt-0.5" style={{ color: textMain }}>
                    Schrijf je hint ✨
                  </p>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)' }}
              >
                <X className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#555555' }} />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {loadingLocations ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-8 h-8 rounded-full border-4 border-orange-200 border-t-[#FF6B4A] animate-spin mb-3" />
                <p className="text-xs font-semibold" style={{ color: textSub }}>Matches filteren op locatie...</p>
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
                                className="w-full h-full flex items-center justify-center text-xl"
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
                      {sending ? 'Versturen...' : 'Verstuur hint ✨'}
                    </button>
                  </div>
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
                  {photo ? (
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div 
                      className="w-full h-full flex flex-col items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                    >
                      <div className="text-7xl animate-bounce select-none pointer-events-none drop-shadow-md">
                        {emoji}
                      </div>
                      {avatarStr && (
                        <div className="text-white font-bold text-xs mt-3 bg-black/30 px-3 py-1 rounded-full">
                          {avatarStr.split(' ').slice(1).join(' ')}
                        </div>
                      )}
                    </div>
                  )}
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