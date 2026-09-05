import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';

import { useNotifications } from '@/components/welove/useNotifications';
import MatchesSwiper from '@/components/welove/MatchesSwiper';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

import { isMatch, calculateCompatibility } from '@/lib/matchUtils';
import { fetchReportedEmails } from '@/lib/reportUtils';
import NotificationBell from '@/components/welove/NotificationBell';
import SendHintSheet from '@/components/welove/SendHintSheet';



export default function Matches() {
  const navigate = useNavigate();
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
  const [myTodayHint, setMyTodayHint] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [hints, setHints] = useState([]);

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
      base44.entities.UserProfile.list('-created_date', 500),
      base44.entities.VenueCheckIn.list(),
      base44.entities.UserDestination.list(),
      base44.entities.Like.filter({ from_email: u.email }),
      base44.entities.Hint.filter({ from_email: u.email }),
    ]);

    const reportedEmails = await fetchReportedEmails(u.email);
    const likedEmails = new Set(myLikes.map(l => l.to_email));

    const userCountry = myProf?.country || 'Nederland';
    const others = allProfiles.filter((p) => p.user_email !== u.email && p.onboarding_complete && !reportedEmails.has(p.user_email) && (p.country || 'Nederland') === userCountry);

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

    const matchData = others
      .filter((p) => isMatch(myProf, p) && isAtSameVenue(p.user_email))
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
    setMyTodayHint(myHintsRecent[0] || null);

    if (myHintsRecent[0]) {
      const expiresAt = new Date(new Date(myHintsRecent[0].created_date).getTime() + 9 * 60 * 60 * 1000);
      const diffMs = expiresAt - new Date();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${hours}u ${mins}m`);
      } else {
        setTimeLeft('0m');
      }
    } else {
      setTimeLeft('');
    }

    // Load active hints for venue
    try {
      const allActiveHints = await base44.entities.Hint.list('-created_date', 100);
      const filteredVenueHints = allActiveHints.filter(h => h.created_date >= nineHoursAgo && h.from_email !== u.email);
      setHints(filteredVenueHints);
    } catch (e) {
      setHints([]);
    }

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
        className="flex items-center justify-between pt-12 px-5 pb-4 flex-shrink-0 backdrop-blur-xl z-[100]" 
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
            {myLocation?.venue_name ? `Matches - ${myLocation.venue_name}` : 'Matches'}
          </h1>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: textSub }}>
            {matches.length} {matches.length === 1 ? 'match op je locatie' : 'matches op je locatie'}
          </p>
        </div>
        <NotificationBell isDark={isDark} />
      </div>

      {/* No location locked state */}
      {!myLocation && (
        <div className="flex-1 flex flex-col items-center justify-start pt-14 sm:pt-16 p-3">
          <div 
            className="w-full max-w-sm p-6 rounded-[28px] text-center flex flex-col items-center border shadow-2xl transition-all"
            style={{
              background: isDark ? 'rgba(14, 15, 25, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: isDark ? 'rgba(255, 75, 114, 0.35)' : 'rgba(255, 75, 114, 0.25)',
              boxShadow: isDark 
                ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 75, 114, 0.2)' 
                : '0 16px 40px rgba(0, 0, 0, 0.12), 0 0 30px rgba(255, 75, 114, 0.12)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <h3 className={`text-base font-black tracking-tight mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Geen bestemming ingesteld
            </h3>
            <p className={`text-xs font-medium leading-relaxed mb-5 max-w-[250px] ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Stel je bestemming van vandaag in om je matches, hints, chat en kortingen te zien!
            </p>
            <button
              onClick={() => navigate(createPageUrl('Pinpoint'))}
              className="w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg active:scale-95 transition-transform text-center"
              style={{
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 6px 20px rgba(255, 75, 114, 0.4)',
              }}
            >
              Ga naar Pinpoint
            </button>
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
          onSent={() => { loadData(); }}
          isDark={isDark}
          initialProfile={hintingProfile}
          myTodayHint={myTodayHint}
          timeLeft={timeLeft}
          hints={hints}
          loadData={() => loadData()}
        />
      )}
    </div>);

}