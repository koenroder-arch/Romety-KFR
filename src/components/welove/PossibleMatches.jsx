import React, { useState, useMemo, useRef } from 'react';
import { isMatch } from '@/lib/matchUtils';
import { Heart, Crown, MapPin, SlidersHorizontal, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const NL_CITIES = ['Amsterdam', 'Rotterdam', 'Utrecht', 'Den Haag', 'Eindhoven', 'Tilburg', 'Groningen', 'Breda', 'Nijmegen', 'Leiden', 'Haarlem', 'Maastricht', 'Arnhem', 'Enschede', 'Zwolle'];

export default function PossibleMatches({ allDestinations = [], allProfiles = [], isPremium, currentUserEmail, myProfile, onShowPremium }) {
  const [cityFilter, setCityFilter] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [likedEmails, setLikedEmails] = useState(new Set());
  const lastClickRef = useRef({});
  const [hearts, setHearts] = useState([]);

  // Build match cards: users going somewhere, excluding self
  const matchCards = useMemo(() => {
    return allDestinations
      .filter((d) => d.user_email !== currentUserEmail && d.status !== 'expired')
      .map((dest) => {
        const profile = allProfiles.find((p) => p.user_email === dest.user_email);
        if (!profile) return null;
        // Basic gender preference filter
        if (myProfile && !isMatch(myProfile, profile)) return null;
        return { profile, venueName: dest.venue_name, venueCity: dest.venue_city || '' };
      })
      .filter(Boolean);
  }, [allDestinations, allProfiles, currentUserEmail, myProfile]);

  // Get unique cities from match cards
  const availableCities = useMemo(() => {
    const cities = new Set();
    matchCards.forEach((m) => {
      if (m.venueCity) cities.add(m.venueCity);
    });
    return Array.from(cities).sort();
  }, [matchCards]);

  const filtered = cityFilter
    ? matchCards.filter((m) => m.venueCity === cityFilter || m.venueName?.toLowerCase().includes(cityFilter.toLowerCase()))
    : matchCards;

  // Free users see only first 3
  const FREE_LIMIT = 3;
  const visible = isPremium ? filtered : filtered.slice(0, FREE_LIMIT);
  const hiddenCount = filtered.length - visible.length;

  const handleLike = async (profile, venueName) => {
    if (likedEmails.has(profile.user_email)) return;
    setLikedEmails((prev) => new Set([...prev, profile.user_email]));

    const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
    const myName = myProfs[0]?.display_name || 'Iemand';

    await base44.entities.Like.create({ from_email: currentUserEmail, to_email: profile.user_email, venue_name: venueName });

    const profs = await base44.entities.UserProfile.filter({ user_email: profile.user_email });
    if (profs[0]) {
      await base44.entities.UserProfile.update(profs[0].id, { likes_received: (profs[0].likes_received || 0) + 1 });
    }

    const existingLikes = await base44.entities.Like.filter({ from_email: profile.user_email, to_email: currentUserEmail });
    if (existingLikes.length > 0) {
      await Promise.all([
        base44.entities.Notification.create({ to_email: profile.user_email, from_email: currentUserEmail, type: 'match', venue_name: venueName, from_name: myName }),
        base44.entities.Notification.create({ to_email: currentUserEmail, from_email: profile.user_email, type: 'match', venue_name: venueName, from_name: profile.display_name || 'Iemand' }),
      ]);
      toast.success(`🎉 Match met ${profile.display_name || 'iemand'}!`, { duration: 3000 });
    } else {
      toast.success(`Je hebt ${profile.display_name || 'iemand'} geliked! 💜`, { duration: 2000 });
    }
  };

  const handlePhotoClick = (e, profile, venueName, isBlurred) => {
    if (isBlurred) {
      if (onShowPremium) onShowPremium();
      return;
    }
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    const lastClick = lastClickRef.current[profile.user_email] || 0;

    if (now - lastClick < DOUBLE_PRESS_DELAY) {
      // Double tap detected!
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const heartId = Math.random();
      setHearts((prev) => [...prev, { id: heartId, x, y, userEmail: profile.user_email }]);

      // Trigger the like action
      if (!likedEmails.has(profile.user_email)) {
        handleLike(profile, venueName);
      }

      // Cleanup heart animation after transition finishes
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 700);

      // Reset timestamp
      lastClickRef.current[profile.user_email] = 0;
    } else {
      lastClickRef.current[profile.user_email] = now;
    }
  };

  if (matchCards.length === 0) return null;

  return (
    <div className="mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Mogelijke Matches</p>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
          style={
            cityFilter
              ? { background: GRAD, color: 'white', boxShadow: '0 4px 12px rgba(142,84,233,0.4)' }
              : { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.2)' }
          }
        >
          <SlidersHorizontal className="w-3 h-3" />
          {cityFilter ? cityFilter : 'Filter'}
          {cityFilter && (
            <span
              onClick={(e) => { e.stopPropagation(); setCityFilter(null); setShowFilter(false); }}
              className="ml-1"
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </div>

      {/* City filter dropdown */}
      {showFilter && (
        <div
          className="mb-3 rounded-[20px] p-3 flex flex-wrap gap-2"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
        >
          {(availableCities.length > 0 ? availableCities : NL_CITIES.slice(0, 10)).map((city) => (
            <button
              key={city}
              onClick={() => { setCityFilter(cityFilter === city ? null : city); setShowFilter(false); }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-all"
              style={
                cityFilter === city
                  ? { background: GRAD, color: 'white' }
                  : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.15)' }
              }
            >
              {cityFilter === city && <Check className="w-3 h-3" />}
              {city}
            </button>
          ))}
        </div>
      )}

      {/* Active filter indicator */}
      {cityFilter && (
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-purple-300" />
          <p className="text-xs text-purple-300 font-semibold">
            {filtered.length} {filtered.length === 1 ? 'match' : 'matches'} in {cityFilter}
          </p>
        </div>
      )}

      {/* Match grid — horizontal scroll */}
      {visible.length === 0 ? (
        <div className="rounded-[20px] py-8 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p className="text-white/40 text-sm">Geen matches gevonden{cityFilter ? ` in ${cityFilter}` : ''}</p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {visible.map(({ profile, venueName }, idx) => {
            const liked = likedEmails.has(profile.user_email);
            return (
              <div
                key={`${profile.user_email}-${idx}`}
                className="flex-shrink-0 w-28 flex flex-col rounded-[20px] overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {/* Venue label */}
                <div
                  className="px-2 pt-2 pb-1"
                  style={{ background: 'rgba(142,84,233,0.25)' }}
                >
                  <p className="text-white text-[10px] font-bold truncate leading-tight">{venueName}</p>
                </div>

                {/* Photo */}
                {(() => {
                  const isBlurred = !isPremium && idx >= FREE_LIMIT - 1;
                  return (
                    <div 
                      className="relative h-28 cursor-pointer select-none overflow-hidden"
                      onClick={(e) => handlePhotoClick(e, profile, venueName, isBlurred)}
                    >
                      {profile.photo_url ? (
                        <img
                          src={profile.photo_url}
                          alt=""
                          className="w-full h-full object-cover"
                          style={isBlurred ? { filter: 'blur(10px)', transform: 'scale(1.1)' } : {}}
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-4xl" 
                          style={{ 
                            background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)',
                            filter: isBlurred ? 'blur(10px)' : 'none' 
                          }}
                        >
                          {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                        </div>
                      )}

                      {/* Double Tap Animated Heart */}
                      <AnimatePresence>
                        {hearts
                          .filter((h) => h.userEmail === profile.user_email)
                          .map((h) => (
                            <motion.div
                              key={h.id}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: [0, 1.4, 1.2], opacity: [0, 1, 1] }}
                              exit={{ scale: 1.6, opacity: 0, y: -30 }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className="absolute pointer-events-none z-30"
                              style={{
                                left: h.x,
                                top: h.y,
                                x: '-50%',
                                y: '-50%',
                              }}
                            >
                              <Heart className="w-10 h-10 fill-[#FF4B72] text-white stroke-[1.5px] filter drop-shadow-[0_4px_12px_rgba(255,75,114,0.6)]" />
                            </motion.div>
                          ))}
                      </AnimatePresence>

                      {/* Age & Avatar */}
                      <div className="absolute bottom-1 left-1.5 right-1.5 flex flex-col gap-0.5 items-start">
                        {profile.avatar && (
                          <span className="text-white text-[8px] font-black px-1.5 py-0.5 rounded bg-pink-500/90 truncate max-w-full">
                            {profile.avatar.split(' ').slice(1).join(' ')}
                          </span>
                        )}
                        {profile.age && (
                          <span className="text-white text-[10px] font-bold drop-shadow">{profile.age}j</span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Like button */}
                <div className="p-2 flex justify-center">
                  <button
                    onClick={() => liked ? null : handleLike(profile, venueName)}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                    style={liked
                      ? { background: GRAD, boxShadow: '0 4px 10px rgba(142,84,233,0.5)' }
                      : { background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }
                    }
                  >
                    <Heart className={`w-4 h-4 ${liked ? 'text-white fill-white' : 'text-white/60'}`} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Premium paywall teaser */}
      {!isPremium && hiddenCount > 0 && (
        <button
          onClick={onShowPremium}
          className="w-full mt-3 py-3 rounded-[16px] flex items-center justify-center gap-2 text-sm font-bold"
          style={{ background: 'rgba(142,84,233,0.2)', border: '1.5px solid rgba(142,84,233,0.4)', color: '#C084FC' }}
        >
          <Crown className="w-4 h-4" />
          Zie {hiddenCount} meer met Premium
        </button>
      )}
    </div>
  );
}