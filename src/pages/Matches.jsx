import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { Lock, MapPin } from 'lucide-react';

import { useNotifications } from '@/components/welove/useNotifications';
import MatchesSwiper from '@/components/welove/MatchesSwiper';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

import { calculateCompatibility } from '@/lib/matchUtils';
import NotificationBell from '@/components/welove/NotificationBell';
import SendHintSheet from '@/components/welove/SendHintSheet';



export default function Matches() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const headerBg = isDark ? 'linear-gradient(180deg, #0B0C10 0%, #08090E 100%)' : 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const user = useUser();
  const { markAllRead } = useNotifications();
  const [myProfile, setMyProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [myCheckIn, setMyCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hintingProfile, setHintingProfile] = useState(null);
  const [initialLikedIds, setInitialLikedIds] = useState([]);
  const [hasSentToday, setHasSentToday] = useState(false);

  useEffect(() => { if (user !== undefined) loadData(); }, [user]); // undefined = still loading auth
  useEffect(() => {markAllRead();}, []);

  const loadData = async () => {
    setLoading(true);
    const u = user;
    if (!u) {setLoading(false);return;}

    const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
    const myProf = profiles[0] || null;
    setMyProfile(myProf);


    // Get my check-in (VenueCheckIn or UserDestination)
    const now = new Date().toISOString();
    const [checkIns, destinations] = await Promise.all([
      base44.entities.VenueCheckIn.filter({ user_email: u.email }),
      base44.entities.UserDestination.filter({ user_email: u.email }),
    ]);
    const activeCheckIn = checkIns.find((c) => !c.expires_at || c.expires_at > now);
    const activeDestination = destinations.find((d) => d.status === 'active' && (!d.expires_at || d.expires_at > now));
    setMyCheckIn(activeCheckIn || activeDestination || null);

    // Fetch all needed data in one batch
    const [allProfiles, allCheckIns, allDestinations, myLikes, myHints] = await Promise.all([
      base44.entities.UserProfile.list('-created_date', 200),
      base44.entities.VenueCheckIn.list(),
      base44.entities.UserDestination.list(),
      base44.entities.Like.filter({ from_email: u.email }),
      base44.entities.Hint.filter({ from_email: u.email }),
    ]);

    const likedEmails = new Set(myLikes.map(l => l.to_email));

    const others = allProfiles.filter((p) => p.user_email !== u.email && p.onboarding_complete);

    const myLocation = activeCheckIn || activeDestination;
    const myVenueId = myLocation?.venue_id;
    const myVenueName = myLocation?.venue_name;

    const isAtSameVenue = (otherEmail) => {
      if (!myLocation) return false;
      const vName = (myVenueName || '').toLowerCase();
      const matchVenueStr = (dbName) => {
        if (!vName || !dbName) return false;
        const lowerDb = dbName.toLowerCase();
        return lowerDb.includes(vName) || vName.includes(lowerDb);
      };

      const theirCheckIn = allCheckIns.find((c) => c.user_email === otherEmail && (!c.expires_at || c.expires_at > now) && (myVenueId ? c.venue_id === myVenueId : matchVenueStr(c.venue_name)));
      if (theirCheckIn) return true;
      const theirDest = allDestinations.find((d) => d.user_email === otherEmail && d.status === 'active' && (!d.expires_at || d.expires_at > now) && (myVenueId ? d.venue_id === myVenueId : matchVenueStr(d.venue_name)));
      return !!theirDest;
    };

    const getArray = (val) => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch(e) { return val.split(',').map(s=>s.replace(/^"|"$/g,'').trim()); }
      }
      return [];
    };

    const isLooseMatch = (me, other) => {
      if (!me || !other) return false;
      if (!me.gender || !me.looking_for || !other.gender || !other.looking_for) return false;
      const iWantThem = me.looking_for === 'both' || me.looking_for === other.gender;
      const theyWantMe = other.looking_for === 'both' || other.looking_for === me.gender;
      if (!iWantThem || !theyWantMe) return false;
      
      const mInterests = getArray(me.interests);
      const oInterests = getArray(other.interests);
      const sharedInterests = mInterests.filter((i) => oInterests.includes(i)).length;
      
      const mTraits = getArray(me.traits);
      const oTraits = getArray(other.traits);
      const sharedTraits = mTraits.filter((tr) => oTraits.includes(tr)).length;
      
      return sharedInterests >= 1 || sharedTraits >= 1;
    };

    const matchData = others
      .filter((p) => isLooseMatch(myProf, p) && isAtSameVenue(p.user_email))
      .map((p) => ({
        profile: p,
        compatibility: calculateCompatibility(myProf, p),
        hasSameVenue: true,
      }));

    matchData.sort((a, b) => b.compatibility - a.compatibility);
    setMatches(matchData);

    const likedIds = matchData.filter(m => likedEmails.has(m.profile.user_email)).map(m => m.profile.id);
    setInitialLikedIds(likedIds);

    const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
    const myHintsRecent = myHints.filter(h => h.created_date >= nineHoursAgo);
    setHasSentToday(myHintsRecent.length > 0);

    setLoading(false);
  };

  const isPremium = true;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}><div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" /></div>;
  }

  const myLocation = myCheckIn;

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col" style={{ background: bg }}>
      {/* Glassmorphic Header styled like SuperMatchesSheet */}
      <div 
        className="flex items-center justify-between pt-12 px-5 pb-4 flex-shrink-0 backdrop-blur-xl z-20" 
        style={{ 
          background: isDark ? 'rgba(13,14,21,0.85)' : 'rgba(255,255,255,0.85)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}
      >
        <div>
          <h1
            className="font-black text-lg tracking-wide leading-tight"
            style={{
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            🔥 Matches
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: textSub }}>
            {matches.length} {matches.length === 1 ? 'match op je locatie' : 'matches op je locatie'}
          </p>
        </div>
        <NotificationBell isDark={isDark} />
      </div>

      {/* No location locked state */}
      {!myLocation && (
        <div className="flex flex-col items-center justify-center px-6 py-16 text-center flex-1">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,75,114,0.15)' }}>
            <Lock className="w-8 h-8" style={{ color: '#FF4B72' }} />
          </div>
          <h2 className={`text-lg font-black mb-2 ${textMain}`}>Geen locatie ingesteld</h2>
          <p className="text-sm mb-4" style={{ color: textSub }}>
            Zet je locatie aan of kies een bestemming op Pinpoint om je venue-matches te zien.
          </p>
          <div className="rounded-[16px] p-4 w-full max-w-xs border-2 cursor-pointer active:scale-95 transition-transform" onClick={() => window.location.href = '/pinpoint'} style={{ background: isDark ? 'rgba(255,75,114,0.12)' : 'rgba(255,75,114,0.08)', borderColor: 'rgba(255,75,114,0.35)' }}>
            <p className="text-xs font-semibold text-pink-500 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" />
              Ga naar Pinpoint en kies een bestemming
            </p>
          </div>
        </div>
      )}

      {myLocation && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <MatchesSwiper
            profiles={matches.map(m => m.profile)}
            initialLikedIds={initialLikedIds}
            isPremium={true}
            currentUserEmail={user?.email}
            onShowPremium={() => {}}
            isMutual={false}
            isDark={isDark}
            onSendHint={(profile) => setHintingProfile(profile)}
            hasSentToday={hasSentToday}
          />
        </div>
      )}

      {hintingProfile && (
        <SendHintSheet
          user={user}
          myProfile={myProfile}
          myCheckIn={myCheckIn}
          matches={matches.map(m => m.profile)}
          mutualMatches={[]}
          onClose={() => setHintingProfile(null)}
          onSent={() => { setHintingProfile(null); loadData(); }}
          isDark={isDark}
          initialProfile={hintingProfile}
        />
      )}
    </div>);

}