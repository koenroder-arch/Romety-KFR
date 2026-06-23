import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isMatch } from '@/lib/matchUtils';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
const FREE_DAILY_LIMIT = 5;
const TICK_MS = 50;

export default function VenueDiscovery({ myProfile, currentUserEmail, isPremium, onShowPremium }) {
  const [profiles, setProfiles] = useState([]);    // unseen, filtered
  const [currentIdx, setCurrentIdx] = useState(0);
  const [swipedToday, setSwipedToday] = useState(0);
  const [loading, setLoading] = useState(true);




  // ─── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserEmail || !myProfile) return;
    loadProfiles();

    return () => {};
  }, [currentUserEmail, myProfile]);

  const loadProfiles = async () => {
    setLoading(true);

    // Seen profiles (all-time)
    const seenRecords = await base44.entities.SeenProfiles.filter({ user_email: currentUserEmail });
    const seenEmailSet = new Set(seenRecords.map(s => s.seen_user_email));

    // Today's count for free limit
    const today = new Date().toISOString().split('T')[0];
    const todayCount = seenRecords.filter(s => s.seen_date === today).length;
    setSwipedToday(todayCount);

    // Fetch 100 profiles
    const allProfiles = await base44.entities.UserProfile.list('-created_date', 100);

    // Fetch active destinations to prioritise same-venue people
    const allDests = await base44.entities.UserDestination.list('-created_date', 200);
    const myDests = allDests.filter(d => d.user_email === currentUserEmail && d.status === 'active');
    const myVenueIds = new Set(myDests.map(d => d.venue_id).filter(Boolean));
    const venueUserEmails = new Set(
      allDests
        .filter(d => d.status === 'active' && myVenueIds.has(d.venue_id) && d.user_email !== currentUserEmail)
        .map(d => d.user_email)
    );
    // Map user_email → their destination venue name
    const userVenueMap = {};
    allDests.filter(d => d.status === 'active').forEach(d => {
      if (d.user_email !== currentUserEmail) userVenueMap[d.user_email] = d.venue_name;
    });

    // Filter: completed, not self, not seen
    const unseen = allProfiles.filter(p =>
      p.user_email !== currentUserEmail &&
      p.onboarding_complete &&
      !seenEmailSet.has(p.user_email)
    );

    // Build enriched list, sorted: same-venue first, then by shared interests
    const enriched = unseen.map(p => {
      const sharedInterests = (myProfile?.interests || []).filter(i => (p.interests || []).includes(i));
      return {
        profile: p,
        sameVenue: venueUserEmails.has(p.user_email),
        venueName: userVenueMap[p.user_email] || null,
        sharedInterests,
        matched: isMatch(myProfile, p),
      };
    }).sort((a, b) => {
      if (a.sameVenue !== b.sameVenue) return a.sameVenue ? -1 : 1;
      return b.sharedInterests.length - a.sharedInterests.length;
    });

    setProfiles(enriched);
    setLoading(false);
  };

  // Timer verwijderd — profielen gaan niet automatisch verder

  // ─── Advance ─────────────────────────────────────────────────────────────────
  const advance = useCallback(async () => {
    const current = profiles[currentIdx];
    if (!current) return;

    const today = new Date().toISOString().split('T')[0];
    await base44.entities.SeenProfiles.create({
      user_email: currentUserEmail,
      seen_user_email: current.profile.user_email,
      seen_date: today,
    });
    setSwipedToday(prev => prev + 1);
    setCurrentIdx(prev => prev + 1);
  }, [currentIdx, profiles, currentUserEmail]);

  // ─── Framer drag ─────────────────────────────────────────────────────────────
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-120, 0], [0, 1]);

  const handleDragEnd = useCallback((_, info) => {
    if (info.offset.y < -40) advance();
    else y.set(0);
  }, [advance]);

  // ─── Render states ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-[24px] h-64 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (currentIdx >= profiles.length) {
    return (
      <div className="rounded-[24px] p-8 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-4xl mb-3">🎉</p>
        <p className="text-white font-bold">Je bent helemaal bij!</p>
        <p className="text-white/40 text-sm mt-1">Kom later terug voor nieuwe matches bij de clubs.</p>
      </div>
    );
  }

  const { profile, sameVenue, venueName, sharedInterests, matched } = profiles[currentIdx];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Venue Discovery</p>

      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`card-${currentIdx}`}
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeInOut' }}
          drag="y"
          dragConstraints={{ top: -200, bottom: 20 }}
          dragElastic={0.15}
          onDragEnd={handleDragEnd}
          style={{ y, opacity, cursor: 'grab', touchAction: 'none' }}
          className="rounded-[24px] overflow-hidden relative select-none"
          whileTap={{ cursor: 'grabbing' }}
        >
          {/* Gold glow when matched */}
          <style>{`
            @keyframes goldPulse {
              0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.25); }
              50%       { box-shadow: 0 0 18px rgba(255,215,0,0.15); }
            }
          `}</style>

          <div
            className="rounded-[24px] overflow-hidden"
            style={(isPremium || matched)
              ? { animation: 'goldPulse 2s ease-in-out infinite', border: '1.5px solid rgba(255,223,100,0.6)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }
              : { border: '1.5px solid #A061FF', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }
            }
          >
            {/* Full-height photo */}
            <div className="relative" style={{ height: 380 }}>
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-7xl animate-bounce select-none pointer-events-none drop-shadow-md">
                    {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                  </div>
                  {profile.avatar && (
                    <div className="text-white font-bold text-xs mt-3 bg-black/30 px-3 py-1 rounded-full">
                      {profile.avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}

              {/* Dark gradient overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,14,33,0.95) 0%, rgba(10,14,33,0.15) 50%, transparent 100%)' }} />

              {/* Top-right: venue badge */}
              {venueName && (
                <div className="absolute top-4 right-4 z-20">
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = '/Pinpoint'; }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white backdrop-blur-sm"
                    style={{ background: 'rgba(160,97,255,0.75)', border: '1px solid rgba(160,97,255,0.9)' }}
                  >
                    <MapPin className="w-3 h-3" /> {venueName}
                  </button>
                </div>
              )}

              {/* Top-left: match/premium badge */}
              {(isPremium || matched) && (
                <div className="absolute top-4 left-4 z-20">
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm" style={{ background: 'rgba(255,215,0,0.2)', border: '1px solid #FFD700', color: '#FFD700' }}>
                    {isPremium ? '👑 Premium' : '✨ Match'}
                  </span>
                </div>
              )}

              {/* Bottom info: age + interests only */}
              <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                <div className="flex items-baseline gap-2 mb-3">
                  {profile.age && (
                    <span className="text-white font-black text-3xl leading-none">{profile.age}</span>
                  )}
                  {profile.avatar && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black text-white bg-orange-500/90 shadow-md flex items-center gap-1">
                      <span>{profile.avatar.split(' ')[0]}</span>
                      <span>{profile.avatar.split(' ').slice(1).join(' ')}</span>
                    </span>
                  )}
                </div>
                {sharedInterests.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {sharedInterests.slice(0, 3).map(interest => (
                      <span key={interest} className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(160,97,255,0.35)', color: '#E0BBFF', border: '1px solid rgba(160,97,255,0.4)' }}>
                        {interest}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Swipe hint */}
            <div className="py-3 text-center" style={{ background: '#0E1225' }}>
              <p className="text-white/25 text-xs">↑ Swipe omhoog voor de volgende</p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}