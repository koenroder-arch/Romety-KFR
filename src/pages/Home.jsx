import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { Heart, MapPin, Sparkles, Lock, Plus, ChevronDown, ChevronUp, Send, Sun, Gamepad2 } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';
import SendHintSheet from '@/components/welove/SendHintSheet';
import HintCard from '@/components/welove/HintCard';
import StoriesViewer from '@/components/welove/StoriesViewer';
import SuperMatchesSheet from '@/components/welove/SuperMatchesSheet';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
import { isMatch, calculateCompatibility } from '@/lib/matchUtils';
import VenueBanner from '@/components/welove/VenueBanner';
import NotificationBell from '@/components/welove/NotificationBell';

export default function Home() {
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const headerBg = isDark ? 'linear-gradient(180deg, #0B0C10 0%, #08090E 100%)' : 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const cardBorder = isDark ? '1.5px solid rgba(255, 75, 114, 0.25)' : 'none';
  const cardShadow = isDark ? '0 0 12px rgba(255, 75, 114, 0.15)' : '0 4px 20px rgba(0,0,0,0.08)';
  const plainCardBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : 'none';
  const plainCardShadow = isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.06)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const user = useUser();
  const [myProfile, setMyProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [myCheckIn, setMyCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [superMatchCount, setSuperMatchCount] = useState(0);
  const [superMatchProfiles, setSuperMatchProfiles] = useState([]);
  const [allDestinations, setAllDestinations] = useState([]);
  const [showSuperMatchSheet, setShowSuperMatchSheet] = useState(false);
  const [activeGameCount, setActiveGameCount] = useState(0);

  // Hints related states
  const [hints, setHints] = useState([]);
  const [superMatchHints, setSuperMatchHints] = useState([]);
  const [hasSentToday, setHasSentToday] = useState(false);
  const [myTodayHint, setMyTodayHint] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [mutualMatches, setMutualMatches] = useState([]);
  const [superHintsCollapsed, setSuperHintsCollapsed] = useState(true);
  const [regularHintsCollapsed, setRegularHintsCollapsed] = useState(true);

  // Stories related states
  const [stories, setStories] = useState([]);
  const [selectedStoryGroup, setSelectedStoryGroup] = useState(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [seenStoryIds, setSeenStoryIds] = useState([]);

  useEffect(() => {
    try {
      const seenStr = localStorage.getItem('seen_story_ids');
      setSeenStoryIds(seenStr ? JSON.parse(seenStr) : []);
    } catch (e) {
      setSeenStoryIds([]);
    }
  }, []);

  // Countdown timer for next hint
  useEffect(() => {
    if (!hasSentToday || !myTodayHint) return;
    const calcTime = () => {
      const now = new Date();
      const created = new Date(myTodayHint.created_date);
      const expiry = new Date(created.getTime() + 9 * 60 * 60 * 1000);
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft('Nu beschikbaar');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}u ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    };
    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [hasSentToday, myTodayHint]);

  useEffect(() => { if (user !== undefined) loadData(); }, [user]); // undefined = still loading auth

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    const u = user;
    if (!u) { setLoading(false); return; }

    try {
      const now = new Date().toISOString();

      // Round 1: user-specific data
      const [
        myProfiles = [],
        subs = [],
        myCheckIns = [],
        myDestinations = []
      ] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }).catch(() => []),
        base44.entities.PremiumSubscription.filter({ user_email: u.email }).catch(() => []),
        base44.entities.VenueCheckIn.filter({ user_email: u.email }).catch(() => []),
        base44.entities.UserDestination.filter({ user_email: u.email }).catch(() => []),
      ]);

      // Round 2: likes + global profiles
      const [
        likesISent = [],
        likesIReceived = [],
        allProfiles = []
      ] = await Promise.all([
        base44.entities.Like.filter({ from_email: u.email }).catch(() => []),
        base44.entities.Like.filter({ to_email: u.email }).catch(() => []),
        base44.entities.UserProfile.list('-created_date', 100).catch(() => []),
      ]);

      // Round 3: global venue data + hints + stories
      const [
        allCheckIns = [],
        allDestinations = [],
        allClubs = [],
        allHints = [],
        allStories = []
      ] = await Promise.all([
        base44.entities.VenueCheckIn.list().catch(() => []),
        base44.entities.UserDestination.list().catch(() => []),
        base44.entities.Club.list().catch(() => []),
        base44.entities.Hint.list('-created_date', 100).catch(() => []),
        base44.entities.Story.list('-created_date', 100).catch(() => []),
      ]);

      const myProf = myProfiles[0] || null;
      setMyProfile(myProf);

      // Check-in
      const activeCheckIn = myCheckIns.find((c) => !c.expires_at || c.expires_at > now);
      const activeDestination = myDestinations.find((d) => d.status === 'active' && (!d.expires_at || d.expires_at > now));
      const myCI = activeCheckIn || activeDestination || null;
      setMyCheckIn(myCI);

      // Matches
      const others = allProfiles.filter((p) => p && p.user_email && p.user_email !== u.email && p.onboarding_complete);
      const matchData = others
        .filter((p) => isMatch(myProf, p))
        .map((p) => ({
          profile: p,
          compatibility: calculateCompatibility(myProf, p),
          hasSameVenue: activeCheckIn
            ? allCheckIns.some((c) => c && c.user_email === p.user_email && c.venue_id === activeCheckIn.venue_id && (!c.expires_at || c.expires_at > now))
            : false,
          is80: isMatch(myProf, p),
        }));
      matchData.sort((a, b) => {
        if (a.hasSameVenue && !b.hasSameVenue) return -1;
        if (!a.hasSameVenue && b.hasSameVenue) return 1;
        return b.compatibility - a.compatibility;
      });
      setMatches(matchData);

      // Super matches
      const iLiked = new Set(likesISent.map((l) => l && l.to_email).filter(Boolean));
      const likedMe = new Set(likesIReceived.map((l) => l && l.from_email).filter(Boolean));
      const mutualEmails = [...iLiked].filter((e) => likedMe.has(e));
      setSuperMatchCount(mutualEmails.length);

      // Supermatch profiles for sheet
      const superProfs = allProfiles.filter((p) => p && p.user_email && mutualEmails.includes(p.user_email));
      setSuperMatchProfiles(superProfs);

      // Mutual matches for SendHintSheet
      setMutualMatches(superProfs);

      // Active game count
      try {
        const [gameSessP1 = [], gameSessP2 = []] = await Promise.all([
          base44.entities.GameSession.filter({ player1_email: u.email }).catch(() => []),
          base44.entities.GameSession.filter({ player2_email: u.email }).catch(() => []),
        ]);
        const allGameSess = [...gameSessP1, ...gameSessP2];
        const seen = new Set();
        const uniq = allGameSess.filter(s => { if (s && seen.has(s.id)) return false; if (s) seen.add(s.id); return true; });
        setActiveGameCount(uniq.filter(s => s && (s.status === 'active' || s.status === 'pending')).length);
      } catch(e) { /* ignore */ }

      // Hints (exp. after 9 hours)
      const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();

      const activeHints = allHints.filter(h => h && h.created_date >= nineHoursAgo);

      const mutualEmailsSet = new Set(mutualEmails);
      const superHints = activeHints.filter(h => h && mutualEmailsSet.has(h.from_email) && h.from_email !== u.email);
      setSuperMatchHints(superHints);

      const myVenueName = myCI?.venue_name || activeHints.find(h => h && h.from_email === u.email)?.venue_name;
      const venueHints = myVenueName
        ? activeHints.filter(h => h && h.venue_name === myVenueName && h.from_email !== u.email && !mutualEmailsSet.has(h.from_email))
        : activeHints.filter(h => h && h.from_email !== u.email && !mutualEmailsSet.has(h.from_email));
      setHints(venueHints);

      const myHintsRecent = activeHints.filter(h => h && h.from_email === u.email);
      setHasSentToday(myHintsRecent.length > 0);
      setMyTodayHint(myHintsRecent[0] || null);

      // Non-blocking background pruning
      setTimeout(() => {
        try {
          const oldHints = allHints.filter(h => h && h.created_date < nineHoursAgo);
          for (const oldHint of oldHints) {
            if (oldHint && oldHint.id) base44.entities.Hint.delete(oldHint.id).catch(() => {});
          }
          const oldStories = allStories.filter(s => s && s.created_date < nineHoursAgo);
          for (const oldStory of oldStories) {
            if (oldStory && oldStory.id) {
              if (oldStory.media_url) {
                base44.integrations.Core.DeleteFile({ file_url: oldStory.media_url }).catch(() => {});
              }
              base44.entities.Story.delete(oldStory.id).catch(() => {});
            }
          }
        } catch (e) {}
      }, 1000);

      if (myCI) {
        const activeStories = allStories.filter(story => {
          if (!story) return false;
          const isRecent = story.created_date >= nineHoursAgo;
          const isSameVenue = story.venue_name === myCI.venue_name;
          const isMe = story.user_email === u.email;
          const creatorProfile = allProfiles.find(p => p && p.user_email === story.user_email);
          const isAMatch = creatorProfile && isMatch(myProf, creatorProfile);
          return isRecent && isSameVenue && (isMe || isAMatch);
        }).map(story => {
          const creatorProfile = allProfiles.find(p => p && p.user_email === story.user_email);
          return {
            ...story,
            user_avatar: creatorProfile?.avatar || null
          };
        });
        setStories(activeStories);
      } else {
        setStories([]);
      }

      setAllDestinations(allDestinations);
    } catch (err) {
      console.error("[Home] Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Group stories by user
  const storiesByUser = {};
  stories.forEach(s => {
    if (!storiesByUser[s.user_email]) {
      storiesByUser[s.user_email] = {
        user_email: s.user_email,
        user_name: s.user_name || s.user_email.split('@')[0],
        user_photo_url: s.user_photo_url,
        user_avatar: s.user_avatar || null,
        items: []
      };
    }
    storiesByUser[s.user_email].items.push(s);
  });

  Object.values(storiesByUser).forEach(group => {
    group.items.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
  });

  const sortedStoryUsers = Object.values(storiesByUser).sort((a, b) => {
    if (a.user_email === user?.email) return -1;
    if (b.user_email === user?.email) return 1;
    return 0;
  });

  const hasMyStories = !!storiesByUser[user?.email];

  // Group hints by venue
  const venueGroups = hints.reduce((acc, h) => {
    const key = h.venue_name || 'Onbekend';
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}><div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" /></div>;
  }

  return (
    <div 
      className="min-h-screen pb-32" 
      style={{ 
        background: bg, 
        fontFamily: "'Inter', sans-serif", 
        overflow: showSheet || showSuperMatchSheet || selectedStoryGroup ? 'hidden' : 'auto',
        height: showSheet || showSuperMatchSheet || selectedStoryGroup ? '100vh' : 'auto',
        position: showSheet || showSuperMatchSheet || selectedStoryGroup ? 'relative' : 'static'
      }}
    >
      {/* Header Container with Romety Fade */}
      <div 
        className="pt-12 sm:pt-14 pb-6 px-5 relative overflow-hidden mb-2" 
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #4D122D 0%, #2E0B1B 65%, rgba(13,14,21,0) 100%)' 
            : 'linear-gradient(180deg, rgba(255,75,114,0.18) 0%, rgba(234,63,211,0.06) 70%, transparent 100%)' 
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between mb-2">
          <h1
            className="font-black tracking-tight leading-none text-base"
            style={{
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              color: 'transparent',
              letterSpacing: '-0.02em',
            }}
          >
            ROMETY
          </h1>
          <NotificationBell isDark={isDark} />
        </div>

        {/* Title */}
        <div className="flex justify-center text-center pt-1">
          <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Home</h1>
        </div>
      </div>

      {/* ── Stories (Verhalen) ── */}
      {myCheckIn && (
        <div className="pt-3 pb-3 border-b border-t mt-2 mb-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
          <div className="px-5 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-500">Verhalen van matches</span>
            <span className="text-[10px]" style={{ color: textSub }}>{myCheckIn.venue_name}</span>
          </div>
          <div className="flex gap-4 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
            {/* User's own story addition bubble if they don't have stories */}
            {!hasMyStories && (
              <div 
                className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                onClick={() => window.location.href = createPageUrl('Hints')}
              >
                <div className="relative w-16 h-16 rounded-full p-[3px] bg-gray-300 dark:bg-gray-800 flex items-center justify-center">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    {myProfile?.photo_url ? (
                      <img src={myProfile.photo_url} alt="" className="w-full h-full object-cover opacity-60" />
                    ) : (
                      <span className="text-lg">{myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}</span>
                    )}
                  </div>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <span className="text-[10px] mt-1 font-semibold" style={{ color: textSub }}>Jouw verhaal</span>
              </div>
            )}

            {/* List of active stories grouped by user */}
            {sortedStoryUsers.map((group) => {
              const isMe = group.user_email === user?.email;
              const isGroupSeen = group.items.every(item => seenStoryIds.includes(item.id));
              return (
                <div
                  key={group.user_email}
                  className="flex flex-col items-center flex-shrink-0 cursor-pointer"
                  onClick={() => {
                    setSelectedStoryGroup(group);
                    setActiveStoryIndex(0);
                  }}
                >
                  <div 
                    className="w-16 h-16 rounded-full p-[3px] transition-transform active:scale-95"
                    style={{
                      background: isGroupSeen 
                        ? (isDark ? '#374151' : '#E5E7EB')
                        : 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                    }}
                  >
                    <div className="w-full h-full rounded-full overflow-hidden bg-white dark:bg-[#08090E] p-[2px]">
                      <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800 flex items-center justify-center">
                        {group.user_photo_url ? (
                          <img src={group.user_photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{group.user_avatar ? group.user_avatar.split(' ')[0] : '👤'}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold truncate max-w-[68px] ${textMain}`}>
                    {isMe ? 'Jouw verhaal' : 'Verhaal'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-5 mt-4 space-y-4">

        {/* Activity Summary (Blob style) */}
        <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
          <div 
            className="flex flex-col items-center justify-center relative w-[112px] h-[112px] transition-transform active:scale-95 cursor-pointer flex-shrink-0"
            style={{
              borderRadius: '43% 57% 39% 61% / 46% 40% 60% 54%',
              background: '#20222F',
              border: '1.5px solid rgba(255,255,255,0.06)'
            }}
            onClick={() => window.location.href = createPageUrl('Matches')}
          >
            <span className="text-3xl font-black text-white leading-none">{matches.length}</span>
            <span className="text-[10px] font-bold text-gray-400 tracking-widest mt-1">MATCHES</span>
            
            <div 
              className="absolute -top-1 -right-1 px-2.5 py-0.5 text-[9px] font-black text-white rounded-full tracking-wider animate-pulse shadow-md"
              style={{ background: '#FF4A82' }}
            >
              NEW
            </div>
          </div>

          <div 
            className="flex flex-col items-center justify-center relative w-[112px] h-[112px] transition-transform active:scale-95 cursor-pointer flex-shrink-0"
            style={{
              borderRadius: '50% 50% 40% 60% / 50% 50% 50% 50%',
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              boxShadow: '0 10px 30px rgba(234, 63, 211, 0.4)'
            }}
            onClick={() => setShowSuperMatchSheet(true)}
          >
            <span className="text-3xl font-black text-[#1C0D26] leading-none">{superMatchCount}</span>
            <span className="text-[10px] font-bold text-[#1C0D26]/75 tracking-widest mt-1">SUPER</span>
          </div>

          {/* Games blob */}
          <div
            className="flex flex-col items-center justify-center relative w-[112px] h-[112px] transition-transform active:scale-95 cursor-pointer flex-shrink-0"
            style={{
              borderRadius: '38% 62% 50% 50% / 45% 45% 55% 55%',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
              boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)'
            }}
            onClick={() => window.location.href = createPageUrl('Games')}
          >
            <Gamepad2 className="w-8 h-8 text-white mb-1" />
            <span className="text-[10px] font-bold text-white/80 tracking-widest mt-1">SPELLEN</span>
            {activeGameCount > 0 && (
              <div
                className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full text-white text-[10px] font-black flex items-center justify-center px-1"
                style={{ background: '#F59E0B', boxShadow: '0 2px 8px rgba(245,158,11,0.5)' }}
              >
                {activeGameCount}
              </div>
            )}
          </div>
        </div>

        <VenueBanner checkIn={myCheckIn} onRemoved={loadData} />

        <div className="mx-1 mt-3 mb-2">
          <button
            onClick={() => myCheckIn && !hasSentToday && setShowSheet(true)}
            className="w-full flex items-center justify-between rounded-[22px] px-5 py-4 relative z-30 border border-l-[4px] border-l-[#FF4B72] shadow-lg active:scale-[0.98] transition-all"
            style={{
              background: isDark ? 'rgba(20,21,33,0.95)' : 'rgba(255,255,255,1)',
              borderColor: isDark ? 'rgba(255, 75, 114, 0.3)' : 'rgba(255, 75, 114, 0.15)',
              boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.25)' : '0 8px 32px rgba(0,0,0,0.06)',
              opacity: (myCheckIn && !hasSentToday) ? 1 : 0.6,
              cursor: (myCheckIn && !hasSentToday) ? 'pointer' : 'not-allowed',
            }}
            disabled={!myCheckIn || hasSentToday}
          >
            <div className="flex items-center gap-3.5 z-10 flex-1 min-w-0">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(255, 75, 114, 0.15)' }}
              >
                <Sun className="w-4 h-4 text-[#FF4B72] fill-[#FF4B72]/10" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-widest text-[#FF4B72] uppercase">SEND A HINT</p>
                <p className={`text-base font-extrabold truncate mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>Send a hint</p>
                <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {hasSentToday
                    ? `Nieuwe hint over ${timeLeft}`
                    : !myCheckIn
                    ? 'Stel eerst een bestemming in'
                    : `Poke your ${myCheckIn.venue_name} matches`}
                </p>
              </div>
            </div>
            
            <div className="relative z-10 flex-shrink-0">
              <div 
                className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-gray-400' 
                    : 'bg-black/5 border-black/10 text-gray-500'
                }`}
              >
                <Send className="w-4 h-4 text-[#FF4B72]" />
              </div>
            </div>
          </button>
        </div>

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
                  <Sparkles className="w-4 h-4" style={{ color: '#FF4B72' }} />
                </div>
                <div>
                  <p className={`text-sm font-black text-left ${textMain}`}>✨ {myTodayHint.message}</p>
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

        {/* Supermatch hints (always visible at the top, even without check-in) */}
        {superMatchHints.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setSuperHintsCollapsed(!superHintsCollapsed)}
              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-3.5 text-left focus:outline-none transition-all active:scale-[0.98]"
              style={{
                background: isDark ? 'rgba(234,63,211,0.07)' : 'rgba(234,63,211,0.04)',
                border: isDark ? '1.5px solid rgba(234,63,211,0.35)' : '1.5px solid rgba(234,63,211,0.2)',
                boxShadow: isDark ? '0 2px 10px rgba(234,63,211,0.08)' : '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <span className="text-xs font-black tracking-wide flex items-center gap-1.5" style={{ color: '#EA3FD3' }}>
                💜 HINTS VAN JE SUPERMATCHES ({superMatchHints.length})
              </span>
              {superHintsCollapsed ? (
                <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#EA3FD3' }} />
              ) : (
                <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: '#EA3FD3' }} />
              )}
            </button>
            {!superHintsCollapsed && (
              <div className="space-y-2">
                {superMatchHints.map(hint => (
                  <HintCard key={hint.id} hint={hint} isDark={isDark} onReacted={() => loadData(true)} isSuperMatch={true} />
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
            {/* Hints in jouw omgeving */}
            {Object.keys(venueGroups).length > 0 && (
              <div>
                <button
                  onClick={() => setRegularHintsCollapsed(!regularHintsCollapsed)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl mb-3.5 text-left focus:outline-none transition-all active:scale-[0.98]"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${divider}`,
                    boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.02)'
                  }}
                >
                  <span className="text-xs font-black tracking-wide" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                    📍 HINTS IN JOUW OMGEVING ({hints.length})
                  </span>
                  {regularHintsCollapsed ? (
                    <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />
                  ) : (
                    <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }} />
                  )}
                </button>
                {!regularHintsCollapsed && (
                  <div>
                    {Object.entries(venueGroups).map(([venue, venueHints]) => (
                      <div key={venue} className="mb-5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                          <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>{venue}</span>
                          <span className="text-xs" style={{ color: textSub }}>({venueHints.length})</span>
                        </div>
                        <div className="space-y-2">
                          {venueHints.map(hint => (
                            <HintCard key={hint.id} hint={hint} isDark={isDark} onReacted={() => loadData(true)} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {Object.keys(venueGroups).length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(255,75,114,0.1)' }}>
                  <Sparkles className="w-7 h-7" style={{ color: '#FF4B72' }} />
                </div>
                <p className={`font-black text-sm mb-1 ${textMain}`}>Nog geen hints</p>
                <p className="text-xs" style={{ color: textSub }}>Wees de eerste die een hint stuurt!</p>
              </div>
            )}
          </>
        )}

      </div>

      {/* SendHintSheet */}
      {showSheet && (
        <SendHintSheet
          user={user}
          myProfile={myProfile}
          myCheckIn={myCheckIn}
          matches={matches}
          mutualMatches={mutualMatches}
          onClose={() => setShowSheet(false)}
          onSent={() => { setShowSheet(false); loadData(); }}
          isDark={isDark}
        />
      )}

      {/* SuperMatches Sheet */}
      {showSuperMatchSheet && (
        <SuperMatchesSheet
          profiles={superMatchProfiles}
          currentUser={user}
          myProfile={myProfile}
          isDark={isDark}
          onClose={() => setShowSuperMatchSheet(false)}
        />
      )}

      {/* StoriesViewer */}
      {selectedStoryGroup && (
        <StoriesViewer
          group={selectedStoryGroup}
          allGroups={sortedStoryUsers}
          onClose={(nextGroup) => {
            setSelectedStoryGroup(nextGroup);
            setActiveStoryIndex(0);
            try {
              const seenStr = localStorage.getItem('seen_story_ids');
              setSeenStoryIds(seenStr ? JSON.parse(seenStr) : []);
            } catch (e) {}
          }}
          isDark={isDark}
          currentUserEmail={user?.email}
          onStoryDeleted={(storyId) => {
            setStories((prev) => prev.filter((s) => s.id !== storyId));
            setSelectedStoryGroup((prev) => {
              if (!prev) return null;
              const updatedItems = prev.items.filter((item) => item.id !== storyId);
              if (updatedItems.length === 0) return null;
              return { ...prev, items: updatedItems };
            });
            loadData();
          }}
        />
      )}

    </div>
  );
}