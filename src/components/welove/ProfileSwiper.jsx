import React, { useState, useRef, useEffect } from 'react';
import { Heart, X, Crown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MatchAnimation from './MatchAnimation';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
const FREE_LIMIT = 2;

export default function ProfileSwiper({ profiles, isPremium, currentUserEmail, allDestinations = [], onShowPremium, onVenueClick, onSendHint }) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [viewed, setViewed] = useState(new Set());
  const [done, setDone] = useState(false);
  const [matchAnim, setMatchAnim] = useState(null); // { myProfile, matchedProfile }
  const [myProfileCache, setMyProfileCache] = useState(null);
  const startX = useRef(null);
  const cardRef = useRef(null);

  const visibleProfiles = isPremium ? profiles : profiles.slice(0, FREE_LIMIT);
  const current = visibleProfiles[index];

  // Find the destination for the current profile
  const currentDest = current
    ? allDestinations.find((d) => d.user_email === current.user_email && d.status !== 'expired')
    : null;

  // Track profile view when index changes
  useEffect(() => {
    if (!current || viewed.has(current.user_email)) return;
    setViewed(prev => new Set([...prev, current.user_email]));
  }, [index, current]);

  const handleLike = async () => {
    if (!current) return;

    // Get current user's profile for name
    let myProf = myProfileCache;
    if (!myProf) {
      const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
      myProf = myProfs[0] || null;
      setMyProfileCache(myProf);
    }
    const myName = myProf?.display_name || 'Iemand';

    // Save like
    await base44.entities.Like.create({
      from_email: currentUserEmail,
      to_email: current.user_email,
      venue_name: currentDest?.venue_name,
    });

    // Check for mutual like (match)
    const existingLikes = await base44.entities.Like.filter({ from_email: current.user_email, to_email: currentUserEmail });
    const isMutualMatch = existingLikes.length > 0;

    if (isMutualMatch) {
      // Notify both users of a match
      await Promise.all([
        base44.entities.Notification.create({ to_email: current.user_email, from_email: currentUserEmail, type: 'match', venue_name: currentDest?.venue_name, from_name: myName }),
        base44.entities.Notification.create({ to_email: currentUserEmail, from_email: current.user_email, type: 'match', venue_name: currentDest?.venue_name, from_name: current.display_name || 'Iemand' }),
      ]);
      // Show match animation instead of toast
      setMatchAnim({ myProfile: myProf, matchedProfile: current });
    } else {
      // Notify the liked user (no toast for the liker)
      await base44.entities.Notification.create({
        to_email: current.user_email,
        from_email: currentUserEmail,
        type: 'like',
        venue_name: currentDest?.venue_name,
        from_name: myName,
      });
    }

    next();
  };

  const handleSkip = () => next();

  const next = () => {
    if (index + 1 >= visibleProfiles.length) {
      setDone(true);
    } else {
      setIndex(i => i + 1);
    }
    setDrag(0);
  };

  // Touch handlers
  const onTouchStart = (e) => { startX.current = e.touches[0].clientX; setDragging(true); };
  const onTouchMove = (e) => {
    if (startX.current === null) return;
    setDrag(e.touches[0].clientX - startX.current);
  };
  const onTouchEnd = () => {
    setDragging(false);
    if (drag > 80) handleLike();
    else if (drag < -80) handleSkip();
    else setDrag(0);
    startX.current = null;
  };

  // Mouse handlers (desktop)
  const onMouseDown = (e) => { startX.current = e.clientX; setDragging(true); };
  const onMouseMove = (e) => {
    if (!dragging || startX.current === null) return;
    setDrag(e.clientX - startX.current);
  };
  const onMouseUp = () => {
    setDragging(false);
    if (drag > 80) handleLike();
    else if (drag < -80) handleSkip();
    else setDrag(0);
    startX.current = null;
  };

  if (profiles.length === 0) return null;

  if (matchAnim) {
    return (
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
  }

  const likeOpacity = Math.min(1, Math.max(0, drag / 80));
  const skipOpacity = Math.min(1, Math.max(0, -drag / 80));
  const rotation = drag * 0.08;

  return (
    <div className="mt-4">
      <style>{`
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.25); }
          50%       { box-shadow: 0 0 18px rgba(255,215,0,0.15); }
        }
      `}</style>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Wie gaan er ook?</p>

      {done ? (
        <div className="rounded-[24px] bg-white flex flex-col items-center justify-center py-12 px-6 text-center" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <p className="text-4xl mb-3">🎉</p>
          <p className="font-bold text-gray-800">Je hebt iedereen gezien!</p>
          <p className="text-sm text-gray-400 mt-1">Kom later terug voor nieuwe profielen</p>
        </div>
      ) : (
        <>
          {/* Card */}
          <div
            ref={cardRef}
            className="relative select-none cursor-grab active:cursor-grabbing"
            style={{
              transform: `translateX(${drag}px) rotate(${rotation}deg)`,
              transition: dragging ? 'none' : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
              touchAction: 'none',
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            <div className="rounded-[24px] overflow-hidden" style={isPremium
                ? { height: 380, animation: 'goldPulse 2s ease-in-out infinite', border: '1.5px solid rgba(255,223,100,0.6)' }
                : { height: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1.5px solid #FF4B72' }
              }>
              {current?.photo_url ? (
                <img src={current.photo_url} alt="" className="w-full h-full object-cover pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-8xl animate-bounce select-none pointer-events-none drop-shadow-md">
                    {current?.avatar ? current.avatar.split(' ')[0] : '👤'}
                  </div>
                  {current?.avatar && (
                    <div className="text-white font-bold text-xs mt-3 bg-black/30 px-3 py-1 rounded-full">
                      {current.avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}

              {/* Gradient overlay bottom */}
              <div className="absolute inset-0 rounded-[24px]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 50%)' }} />

              {/* Venue badge */}
              {currentDest?.venue_name && (
                <button
                  className="absolute top-4 right-4 px-4 py-2 rounded-xl flex items-center gap-2 active:scale-95 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,75,114,0.85) 0%, rgba(234,63,211,0.85) 100%)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 4px 14px rgba(255,75,114,0.4)',
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                  onClick={(e) => { e.stopPropagation(); onVenueClick && onVenueClick(currentDest); }}
                >
                  <span className="text-base">📍</span>
                  <span className="text-white text-sm font-bold truncate max-w-[150px]">{currentDest.venue_name}</span>
                </button>
              )}

              {/* Age badge */}
              <div className="absolute bottom-4 left-4 flex flex-col gap-1 items-start">
                {current?.avatar && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-black text-white bg-orange-500/95 shadow-md flex items-center gap-1">
                    <span>{current.avatar.split(' ')[0]}</span>
                    <span>{current.avatar.split(' ').slice(1).join(' ')}</span>
                  </span>
                )}
                {current?.age && (
                  <p className="text-white font-bold text-lg drop-shadow">{current.age} jaar</p>
                )}
              </div>

              {/* Like indicator */}
              <div className="absolute top-6 left-5 px-4 py-2 rounded-2xl border-4 border-green-400 rotate-[-12deg]" style={{ opacity: likeOpacity }}>
                <p className="text-green-400 font-black text-xl tracking-wider">LIKE</p>
              </div>

              {/* Skip indicator */}
              <div className="absolute top-6 right-5 px-4 py-2 rounded-2xl border-4 border-red-400 rotate-[12deg]" style={{ opacity: skipOpacity }}>
                <p className="text-red-400 font-black text-xl tracking-wider">NOPE</p>
              </div>
            </div>
          </div>

          {/* Counter */}
          <p className="text-center text-xs text-gray-400 mt-2">{index + 1} / {visibleProfiles.length}</p>

          {/* Buttons */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <button
              onClick={handleSkip}
              className="w-14 h-14 rounded-full bg-white flex items-center justify-center"
              style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
            <button
              onClick={handleLike}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white"
              style={{ background: GRAD, boxShadow: '0 6px 20px rgba(142,84,233,0.45)' }}
            >
              <Heart className="w-7 h-7" />
            </button>
          </div>

          {/* Paywall teaser for free users */}
          {!isPremium && profiles.length > FREE_LIMIT && index === visibleProfiles.length - 1 && (
            <button
              onClick={onShowPremium}
              className="w-full mt-4 py-3 rounded-[16px] flex items-center justify-center gap-2 text-sm font-bold"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#fdf2fb)', border: '1.5px solid #ede9fe', color: '#8E54E9' }}
            >
              <Crown className="w-4 h-4" />
              Zie alle {profiles.length} profielen met Premium
            </button>
          )}
        </>
      )}
    </div>
  );
}