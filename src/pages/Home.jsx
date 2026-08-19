import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { Heart, MapPin, Sparkles, Lock, Plus, ChevronDown, ChevronUp, Send, Sun, Gamepad2, Eye, X, MoreVertical, AlertTriangle, MessageCircle, Ticket, ChevronRight, Lightbulb } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';
import SendHintSheet from '@/components/welove/SendHintSheet';
import HintCard from '@/components/welove/HintCard';
import StoriesViewer from '@/components/welove/StoriesViewer';
import SuperMatchesSheet from '@/components/welove/SuperMatchesSheet';
import MatchAnimation from '@/components/welove/MatchAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { isMatch, calculateCompatibility, getArray } from '@/lib/matchUtils';
import VenueBanner from '@/components/welove/VenueBanner';
import NotificationBell from '@/components/welove/NotificationBell';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', label: 'Ongepaste foto', emoji: '🖼️' },
  { id: 'fraude_scam', label: 'Fraude of scam', emoji: '⚠️' },
  { id: 'ai_foto', label: 'AI foto', emoji: '🤖' },
  { id: 'bot_account', label: 'Een Bot account', emoji: '👾' },
  { id: 'stalking', label: 'Stalking', emoji: '🚫' },
];

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

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
  const [activeLocationCount, setActiveLocationCount] = useState(0);
  const [unmatchedLikes, setUnmatchedLikes] = useState([]);
  const [revealedProfile, setRevealedProfile] = useState(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [showDiscountsModal, setShowDiscountsModal] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [revealedBioExpanded, setRevealedBioExpanded] = useState(false);
  const [reportState, setReportState] = useState(null);
  const [hintingProfile, setHintingProfile] = useState(null);
  const [matchAnim, setMatchAnim] = useState(null);

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

  // Wave animation state
  const [lastHintClick, setLastHintClick] = useState(() => parseInt(localStorage.getItem('last_hint_click') || '0', 10));
  const [lastRevealClick, setLastRevealClick] = useState(() => parseInt(localStorage.getItem('last_reveal_click') || '0', 10));

  const twentyFourHours = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const showHintWave = (now - lastHintClick) > twentyFourHours;
  const showRevealWave = (now - lastRevealClick) > twentyFourHours;

  const onHintClick = () => {
    setShowSheet(true);
    const t = Date.now();
    localStorage.setItem('last_hint_click', t.toString());
    setLastHintClick(t);
  };

  const onRevealClick = () => {
    handleRevealLikeClick();
    const t = Date.now();
    localStorage.setItem('last_reveal_click', t.toString());
    setLastRevealClick(t);
  };

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
        base44.entities.UserProfile.list('-created_date', 500).catch(() => []),
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
      if (myCI && !myCI.venue_city) {
        if (allClubs.length > 0) {
          const matchedClub = allClubs.find((c) => c.id === myCI.venue_id || c.name === myCI.venue_name);
          if (matchedClub) myCI.venue_city = matchedClub.city;
        }
        if (!myCI.venue_city && allDestinations.length > 0) {
          const found = allDestinations.find((d) => d.venue_city && (d.venue_id === myCI.venue_id || d.venue_name === myCI.venue_name));
          if (found) myCI.venue_city = found.venue_city;
        }
      }
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

      // Unmatched likes (who liked me but I haven't liked back)
      const unmatched = likesIReceived.filter((l) => l && l.from_email && !iLiked.has(l.from_email));
      setUnmatchedLikes(unmatched);
      setAllProfiles(allProfiles);

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
        const activeStories = allStories.filter(story => {
          if (!story) return false;
          const isRecent = story.created_date >= nineHoursAgo;
          const isMe = story.user_email === u.email;
          const creatorProfile = allProfiles.find(p => p && p.user_email === story.user_email);
          const isAMatch = creatorProfile && isMatch(myProf, creatorProfile);
          return isRecent && (isMe || isAMatch);
        }).map(story => {
          const creatorProfile = allProfiles.find(p => p && p.user_email === story.user_email);
          return {
            ...story,
            user_avatar: creatorProfile?.avatar || null
          };
        });
        setStories(activeStories);
      }

      // Calculate active location count
      const activeCheckInEmails = allCheckIns.filter(c => !c.expires_at || c.expires_at > now).map(c => c.user_email);
      const activeDestEmails = allDestinations.filter(d => d.status === 'active' && (!d.expires_at || d.expires_at > now)).map(d => d.user_email);
      const uniqueActiveEmails = new Set([...activeCheckInEmails, ...activeDestEmails]);
      setActiveLocationCount(uniqueActiveEmails.size);

      setAllDestinations(allDestinations);
    } catch (err) {
      console.error("[Home] Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const CLUB_DISCOUNTS = [
    { name: 'G-Spot', city: 'Hilversum', discount: '🍸 2e premium cocktail helemaal gratis!' },
    { name: 'Escape', city: 'Amsterdam', discount: '🎟️ Gratis VIP entree voor 00:00 uur + welkomstshotje!' },
    { name: 'Heineken Experience', city: 'Amsterdam', discount: '🍺 15% korting op merchandise & 1 extra koud biertje!' },
    { name: 'De Jansbar', city: 'Utrecht', discount: '🥃 Ontvang een gratis shotje bij je eerste drankje!' },
    { name: 'Grand Café De Vrienden', city: 'Utrecht', discount: 'Geen actieve kortingen momenteel' },
    { name: 'Café Flater', city: 'Utrecht', discount: 'Geen actieve kortingen momenteel' }
  ];

  const handleRevealLikeClick = async () => {
    if (unmatchedLikes.length === 0) {
      alert("Je hebt nog geen likes ontvangen.");
      return;
    }

    const nextLike = unmatchedLikes[0];
    const targetEmail = nextLike.from_email;

    const foundProfile = allProfiles.find(p => p.user_email === targetEmail);
    if (foundProfile) {
      setRevealedProfile(foundProfile);
      setShowRevealModal(true);
    } else {
      alert("Profiel kon niet geladen worden.");
    }
  };

  const handleLikeRevealedProfile = async () => {
    if (!revealedProfile) return;
    try {
      await base44.entities.Like.create({
        from_email: user.email,
        to_email: revealedProfile.user_email
      });

      await Promise.all([
        base44.entities.Notification.create({
          to_email: revealedProfile.user_email,
          from_email: user.email,
          type: 'match',
          from_name: myProfile?.display_name || 'Iemand'
        }).catch(() => {}),
        base44.entities.Notification.create({
          to_email: user.email,
          from_email: revealedProfile.user_email,
          type: 'match',
          from_name: revealedProfile.display_name || 'Een Match'
        }).catch(() => {})
      ]);

      setShowRevealModal(false);
      const matched = revealedProfile;
      setRevealedProfile(null);
      setMatchAnim({ myProfile, matchedProfile: matched });
      loadData(true);
    } catch (e) {
      alert("Er ging iets mis met het liken van het profiel.");
    }
  };

  const handleConfirmCloseReveal = (confirm) => {
    if (confirm) {
      setShowRevealModal(false);
      setRevealedProfile(null);
      setShowConfirmClose(false);
    } else {
      setShowConfirmClose(false);
    }
  };

  const handleOpenReport = (e, profile) => {
    e.stopPropagation();
    setReportState({
      profile,
      step: 'choose',
      reason: null,
      details: ''
    });
  };

  const handleSelectReason = (reason) => {
    setReportState(prev => ({ ...prev, step: 'detail', reason }));
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason) return;
    try {
      await base44.entities.Report.create({
        reporter_email: user.email,
        reporter_name: myProfile?.display_name || '',
        reported_email: reportState.profile.user_email,
        reported_name: reportState.profile.display_name || '',
        reason: reportState.reason,
        details: reportState.details || '',
        created_date: new Date().toISOString(),
      });
      setReportState(prev => ({ ...prev, step: 'done' }));
    } catch (err) {
      console.error('Error submitting report:', err);
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
        className="pt-12 sm:pt-14 pb-6 px-5 relative mb-2" 
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #4D122D 0%, #2E0B1B 65%, rgba(13,14,21,0) 100%)' 
            : 'linear-gradient(180deg, rgba(255,75,114,0.18) 0%, rgba(234,63,211,0.06) 70%, transparent 100%)' 
        }}
      >
        {/* Logo */}
        <div className="flex items-start justify-between mb-2">
          <h1
            className="font-black tracking-tight leading-none text-base mt-1.5"
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
          <div className="flex flex-col items-end gap-2">
            <NotificationBell isDark={isDark} />
            <VenueBanner checkIn={myCheckIn} onRemoved={() => loadData(true)} />
          </div>
        </div>

        {/* Title */}
        <div className="flex justify-center text-center pt-1">
          <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Home</h1>
        </div>
      </div>

      {/* ── Stories (Verhalen) ── */}
      <div 
        className="pt-3 pb-3 border-b border-t mt-2 mb-2 relative" 
        style={{ 
          borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          opacity: myCheckIn ? 1 : 0.55
        }}
      >
        {!myCheckIn && (
          <div 
            className="absolute inset-0 z-20 cursor-pointer" 
            onClick={() => alert("Stel eerst een locatie in om de verhalen te kunnen bekijken.")}
          />
        )}
        <div className="px-5 mb-2 flex items-center justify-between">
          <span className="text-xs font-black text-[#FF4B72]">
            {myCheckIn ? (
              <>
                Verhalen bij <span className="text-[#EA3FD3] font-black ml-0.5">{myCheckIn.venue_name}</span>
              </>
            ) : (
              "Verhalen op locaties"
            )}
          </span>
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
                <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#FF4B72] border-2 border-white dark:border-gray-900 flex items-center justify-center">
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

      <div className="px-5 mt-4 space-y-4">

        {/* Activity Summary (Blob style) */}
        <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
          <div 
            className="flex flex-col items-center justify-center relative w-[118px] h-[118px] transition-transform active:scale-95 cursor-pointer flex-shrink-0"
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
            className="flex flex-col items-center justify-center relative w-[118px] h-[118px] transition-transform active:scale-95 cursor-pointer flex-shrink-0"
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

          {/* Live Accounts blob */}
          <div
            className="flex flex-col items-center justify-center relative w-[118px] h-[118px] transition-transform active:scale-95 flex-shrink-0 cursor-pointer"
            style={{
              borderRadius: '38% 62% 50% 50% / 45% 45% 55% 55%',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)'
            }}
            onClick={() => window.location.href = createPageUrl('Pinpoint')}
          >
            <span className="text-3xl font-black text-white leading-none">{activeLocationCount}</span>
            <span className="text-[10px] font-bold text-white/80 tracking-widest mt-1 uppercase text-center leading-tight">OP LOCATIE</span>
          </div>
        </div>

        {/* Top 2 squares: Send a hint & Reveal Likes */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4 mx-1">
          {/* Reveal Likes (Left) */}
          <button
            onClick={onRevealClick}
            className={`w-full flex flex-col justify-between text-left rounded-[32px] rounded-bl-[12px] p-4 sm:p-5 min-h-[150px] sm:min-h-[170px] relative z-30 transition-all active:scale-[0.98] overflow-hidden ${
              unmatchedLikes.length > 0 ? '' : 'opacity-95'
            }`}
            style={{
              background: 'linear-gradient(135deg, #EA3FD3 0%, #FF4B72 100%)',
              boxShadow: '0 8px 24px rgba(234, 63, 211, 0.25)',
            }}
          >
            {/* Shimmer wave */}
            {showRevealWave && (
              <div 
                className="absolute inset-0 w-[200%] animate-shimmer pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
                }}
              />
            )}
            
            {/* Faint Watermark Background Icon */}
            <Eye className="absolute -left-4 -top-4 w-20 h-20 sm:w-24 sm:h-24 text-white/10 pointer-events-none" />

            <div className="w-full flex items-center justify-between relative z-10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Eye className="w-4 h-4 text-white" />
              </div>
              {unmatchedLikes.length > 0 && (
                <span className="bg-white text-[#EA3FD3] text-[10px] sm:text-[11px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm">
                  {unmatchedLikes.length}
                </span>
              )}
            </div>

            <div className="w-full mt-auto relative z-10 pr-6">
              <p className="text-white text-xs sm:text-[15px] font-black leading-tight sm:leading-snug">
                Onthul wie<br/>je heeft geliked
              </p>
            </div>

            <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center z-10">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
          </button>

          {/* Send a Hint (Right) */}
          <button
            onClick={onHintClick}
            className="w-full flex flex-col justify-between text-left rounded-[32px] rounded-tr-[12px] p-4 sm:p-5 min-h-[150px] sm:min-h-[170px] relative z-30 transition-all active:scale-[0.98] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #EA3FD3 0%, #FF4B72 100%)',
              boxShadow: '0 8px 24px rgba(255, 75, 114, 0.25)',
            }}
          >
            {/* Shimmer wave */}
            {showHintWave && (
              <div 
                className="absolute inset-0 w-[200%] animate-shimmer pointer-events-none"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)'
                }}
              />
            )}

            {/* Faint Watermark Background Icon */}
            <Lightbulb className="absolute -left-4 -top-4 w-20 h-20 sm:w-24 sm:h-24 text-white/10 pointer-events-none" />

            <div className="w-full flex items-center justify-between relative z-10">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white flex items-center justify-center shadow-md">
                <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#FF4B72] rotate-0" />
              </div>
            </div>

            <div className="w-full mt-auto relative z-10 pr-6">
              <p className="text-white/60 text-[8px] sm:text-[9px] font-black tracking-wider uppercase">
                SEND A HINT
              </p>
              <p className="text-white text-xs sm:text-base font-black leading-tight sm:leading-snug mt-0.5">
                Send a hint
              </p>
            </div>

            <div className="absolute bottom-4 right-4 sm:bottom-5 sm:right-5 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center z-10">
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            </div>
          </button>
        </div>

        {/* GAMES BAR */}
        <div className="mx-1 mt-4 mb-4">
          <button
            onClick={() => window.location.href = createPageUrl('Games')}
            className="w-full flex items-center justify-between rounded-[32px] rounded-br-[12px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.25)',
            }}
          >
            {/* Faint Watermark Background Icon */}
            <Gamepad2 className="absolute -right-6 -bottom-6 w-24 h-24 sm:w-28 sm:h-28 text-white/10 pointer-events-none" />

            <div className="flex items-center gap-3 sm:gap-4 z-10 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-white/60 text-[8px] sm:text-[9px] font-black tracking-wider uppercase">GAMES</p>
                <p className="text-white text-sm sm:text-base font-black leading-tight mt-0.5">Spellen</p>
                <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 truncate">
                  Speel games en verdien beloningen
                </p>
              </div>
            </div>
            <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              {activeGameCount > 0 && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#1D4ED8] text-xs font-black flex items-center justify-center shadow-md">
                  {activeGameCount}
                </div>
              )}
            </div>
          </button>
        </div>

        {/* VIP DISCOUNTS BAR */}
        <div className="mx-1 mt-4 mb-4">
          <button
            onClick={() => setShowDiscountsModal(true)}
            className="w-full flex flex-col justify-between sm:flex-row sm:items-center rounded-[32px] rounded-bl-[12px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
            }}
          >
            {/* Faint Watermark Background Icon */}
            <Sparkles className="absolute -right-6 -bottom-6 w-24 h-24 sm:w-28 sm:h-28 text-white/10 pointer-events-none" />

            <div className="flex items-center gap-3 sm:gap-4 z-10 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-white text-sm sm:text-base font-black leading-tight">Bekijk VIP kortingen</p>
                <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 truncate">
                  Exclusieve deals voor jou
                </p>
              </div>
            </div>
            <div className="relative z-10 flex-shrink-0 flex justify-end mt-2 sm:mt-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/20 flex items-center justify-center">
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
            </div>
          </button>
        </div>

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
          onSent={() => { loadData(true); }}
          isDark={isDark}
          myTodayHint={myTodayHint}
          timeLeft={timeLeft}
          superMatchHints={superMatchHints}
          hints={hints}
          loadData={() => loadData(true)}
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

      {/* ── Revealed Profile Modal ── */}
      {showRevealModal && revealedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(5, 6, 10, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div 
            className="w-full max-w-md h-full sm:h-[85vh] sm:rounded-[36px] overflow-hidden relative flex flex-col"
            style={{
              background: isDark ? '#141521' : '#FFFFFF',
              border: '4px solid #FF4B72',
              boxShadow: '0 0 35px rgba(255, 75, 114, 0.7)',
            }}
          >
            {/* Photo Background */}
            <div className="absolute inset-0 z-0 bg-gray-900 cursor-pointer">
              {revealedProfile.photo_url ? (
                <img src={revealedProfile.photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                    {revealedProfile.avatar ? revealedProfile.avatar.split(' ')[0] : '👤'}
                  </div>
                  {revealedProfile.avatar && (
                    <div className="absolute bottom-32 text-center text-white/50 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                      {revealedProfile.avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
            </div>

            {/* Top Bar Navigation (X close and Options) */}
            <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center pointer-events-auto">
              {/* Close Button */}
              <button
                onClick={() => setShowConfirmClose(true)}
                className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>

              {/* Three dots menu */}
              <div className="relative">
                <button
                  onClick={() => setRevealedBioExpanded(!revealedBioExpanded)}
                  className="w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                >
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Pink Match Badge */}
            <div 
              className="absolute top-16 left-4 z-20 px-3 py-1.5 rounded-full text-[9px] font-black text-white tracking-widest shadow-md"
              style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', boxShadow: '0 4px 12px rgba(255, 75, 114, 0.4)' }}
            >
              HEEFT JOU GELIKED! 💖
            </div>

            {/* Foreground Content */}
            <div className="relative z-10 flex flex-col h-full p-6 pb-8 pointer-events-none mt-auto">
              <div className="mt-auto pointer-events-auto flex flex-col">
                {/* Age & Height */}
                <h2 className="text-[32px] font-black text-white drop-shadow-md leading-none mb-4 tracking-wide text-left">
                  {revealedProfile.age} jaar {revealedProfile.height_cm ? `• ${revealedProfile.height_cm} cm` : ''}
                </h2>

                {/* Bio expandable section */}
                <AnimatePresence>
                  {revealedBioExpanded && revealedProfile.bio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden text-left"
                    >
                      <div className="rounded-2xl px-4 py-3 border border-white/20" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(12px)' }}>
                        <p className="text-sm text-white/90 font-medium leading-relaxed">
                          {revealedProfile.bio}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  {revealedBioExpanded && !revealedProfile.bio && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden text-left"
                    >
                      <div className="rounded-2xl px-4 py-3 border border-white/15" style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)' }}>
                        <p className="text-sm text-white/50 font-medium italic">
                          Geen bio beschikbaar
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tags (Avatar, interests, traits) */}
                <div className="flex flex-wrap gap-2 mb-6 items-center">
                  {revealedProfile.avatar && (
                    <span className="px-4 py-1.5 rounded-full text-[14px] font-bold text-white bg-black/45 backdrop-blur-md border-2 border-pink-500/50 shadow-sm flex items-center gap-1.5">
                      <span className="text-base">{revealedProfile.avatar.split(' ')[0]}</span>
                      <span className="text-pink-100">{revealedProfile.avatar.split(' ').slice(1).join(' ')}</span>
                    </span>
                  )}
                  {[...(revealedProfile.interests || []).slice(0, 2), ...(revealedProfile.traits || []).slice(0, 1)].map((tag) => (
                    <span key={tag} className="px-4 py-1.5 rounded-full text-[14px] font-semibold text-white bg-black/40 backdrop-blur-[2px] shadow-sm border-2 border-white/20">
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Swiper Action Buttons */}
                <div className="flex gap-4">
                  <button 
                    onClick={(e) => {
                      e.currentTarget.blur();
                      handleLikeRevealedProfile();
                    }} 
                    className="flex-1 py-3.5 px-4 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform shadow-lg"
                  >
                    <Heart className="w-5 h-5 fill-white text-white animate-pulse" />
                    Like
                  </button>
                  <button 
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setHintingProfile(revealedProfile);
                    }} 
                    className="flex-1 py-3.5 px-4 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" color="white" strokeWidth={2.4} />
                    Hint
                  </button>
                </div>
              </div>
            </div>

            {/* Nested Confirmation Close Overlay */}
            {showConfirmClose && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-black/90 backdrop-blur-sm text-center">
                <div className="space-y-4 max-w-xs">
                  <p className="text-lg font-black text-white leading-tight">
                    Weet je het zeker?
                  </p>
                  <p className="text-xs text-gray-300">
                    Wil je dit profiel afsluiten zonder te liken?
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleConfirmCloseReveal(true)}
                      className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs hover:bg-red-600 transition-all active:scale-95"
                    >
                      Ja, sluit af
                    </button>
                    <button
                      onClick={() => handleConfirmCloseReveal(false)}
                      className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs transition-all active:scale-95"
                    >
                      Nee, terug
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Discounts Modal ── */}
      {showDiscountsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(5, 6, 10, 0.85)', backdropFilter: 'blur(8px)' }}>
          <div 
            className="w-full max-w-md rounded-[32px] overflow-hidden relative flex flex-col max-h-[90vh]"
            style={{
              background: isDark ? '#141521' : '#FFFFFF',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className={`text-xl font-black ${textMain}`}>
                  Lidmaatschapskortingen
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                  Exclusief voor Romety gebruikers
                </p>
              </div>
              <button
                onClick={() => setShowDiscountsModal(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {CLUB_DISCOUNTS.map((club, idx) => {
                const hasDiscount = club.discount !== 'Geen actieve kortingen momenteel';
                return (
                  <div 
                    key={idx} 
                    className="p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all"
                    style={{
                      background: hasDiscount 
                        ? (isDark ? 'rgba(212,163,59,0.08)' : 'rgba(212,163,59,0.04)') 
                        : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'),
                      borderColor: hasDiscount 
                        ? 'rgba(212,163,59,0.3)' 
                        : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black" style={{ color: hasDiscount ? '#D4A33B' : undefined }}>{club.name}</span>
                        <span className="text-[10px] opacity-50">({club.city})</span>
                      </div>
                      <p className={`text-xs mt-1 font-semibold ${hasDiscount ? textMain : 'text-gray-400 italic'}`}>
                        {club.discount}
                      </p>
                    </div>
                    {hasDiscount && (
                      <div className="w-8 h-8 rounded-xl bg-[#D4A33B]/20 flex items-center justify-center flex-shrink-0 text-base">
                        🏷️
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Button */}
            <div className="p-5 border-t border-white/5 bg-black/10">
              <button
                onClick={() => setShowDiscountsModal(false)}
                className="w-full py-4 rounded-2xl font-black text-xs bg-white/5 hover:bg-white/10 text-white transition-all active:scale-95"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SendHintSheet for revealed profile */}
      {hintingProfile && (
        <SendHintSheet
          user={user}
          myProfile={myProfile}
          myCheckIn={myCheckIn}
          matches={matches}
          mutualMatches={mutualMatches}
          onClose={() => setHintingProfile(null)}
          onSent={() => { setHintingProfile(null); loadData(); }}
          isDark={isDark}
          initialProfile={hintingProfile}
        />
      )}

      {/* ── Match Animation (after liking a revealed profile) ── */}
      {matchAnim && (
        <MatchAnimation
          myProfile={matchAnim.myProfile}
          matchedProfile={matchAnim.matchedProfile}
          onDone={() => setMatchAnim(null)}
          onSendHint={(profile) => {
            setMatchAnim(null);
            setHintingProfile(profile);
          }}
        />
      )}

    </div>
  );
}