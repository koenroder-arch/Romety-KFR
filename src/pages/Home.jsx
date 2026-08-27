import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { Heart, MapPin, Sparkles, Lock, Plus, ChevronDown, ChevronUp, Send, Sun, Gamepad2, Eye, X, MoreVertical, AlertTriangle, MessageCircle, Ticket, ChevronRight, ChevronLeft, Lightbulb, Flame } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';
import SendHintSheet from '@/components/welove/SendHintSheet';
import HintCard from '@/components/welove/HintCard';
import StoriesViewer from '@/components/welove/StoriesViewer';
import SuperMatchesSheet from '@/components/welove/SuperMatchesSheet';
import MatchAnimation from '@/components/welove/MatchAnimation';
import { motion, AnimatePresence } from 'framer-motion';
import { isMatch, calculateCompatibility } from '@/lib/matchUtils';
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
  const navigate = useNavigate();
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

  // Animated count-up state for the 3 stat blobs
  const [animMatchCount, setAnimMatchCount] = useState(0);
  const [animSuperCount, setAnimSuperCount] = useState(0);
  const [animLocationCount, setAnimLocationCount] = useState(0);
  const countUpRef = useRef(null);
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

  // Count-up animation: 0 → target in 500ms when data loads
  useEffect(() => {
    const targets = [
      { target: matches.length, setter: setAnimMatchCount },
      { target: superMatchCount, setter: setAnimSuperCount },
      { target: activeLocationCount, setter: setAnimLocationCount },
    ];
    const DURATION = 500;
    const STEPS = 30;
    const interval = DURATION / STEPS;

    if (countUpRef.current) clearInterval(countUpRef.current);
    targets.forEach(({ target, setter }) => setter(0));

    let step = 0;
    countUpRef.current = setInterval(() => {
      step++;
      const progress = step / STEPS;
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      targets.forEach(({ target, setter }) => {
        setter(Math.round(eased * target));
      });
      if (step >= STEPS) {
        clearInterval(countUpRef.current);
        targets.forEach(({ target, setter }) => setter(target));
      }
    }, interval);

    return () => { if (countUpRef.current) clearInterval(countUpRef.current); };
  }, [matches.length, superMatchCount, activeLocationCount]);

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

  const hasNewMatches = matches.some((m) => {
    if (!m.profile || !m.profile.created_date) return false;
    const createdTime = new Date(m.profile.created_date).getTime();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return createdTime > twoHoursAgo;
  });

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
      className="min-h-screen max-w-md mx-auto relative shadow-2xl border-l border-r pb-32" 
      style={{ 
        background: bg, 
        fontFamily: "'Inter', sans-serif", 
        overflow: showSheet || showSuperMatchSheet || selectedStoryGroup ? 'hidden' : 'auto',
        height: showSheet || showSuperMatchSheet || selectedStoryGroup ? '100vh' : 'auto',
        position: showSheet || showSuperMatchSheet || selectedStoryGroup ? 'relative' : 'static',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
      }}
    >
      {/* Header Container with Romety Fade */}
      <div 
        className="pt-12 sm:pt-14 pb-2.5 px-5 relative mb-0" 
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #4D122D 0%, #2E0B1B 65%, rgba(13,14,21,0) 100%)' 
            : 'linear-gradient(180deg, rgba(255,75,114,0.18) 0%, rgba(234,63,211,0.06) 70%, transparent 100%)' 
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <img 
              src="/romety-logo-transparent.png?v=3" 
              alt="Romety" 
              className="h-8 sm:h-9 w-auto object-contain select-none transition-transform active:scale-95" 
              style={{
                imageRendering: 'auto',
                mixBlendMode: isDark ? 'screen' : 'normal',
                filter: isDark ? 'drop-shadow(0 0 10px rgba(234, 63, 211, 0.4))' : 'drop-shadow(0 2px 8px rgba(255, 75, 114, 0.25))'
              }}
            />
          </div>
          <div className="flex items-center gap-3">
            <VenueBanner checkIn={myCheckIn} onRemoved={() => loadData(true)} />
            <NotificationBell isDark={isDark} />
          </div>
        </div>

        {/* Title */}
        <div className="flex justify-center text-center pt-1">
          <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Home</h1>
        </div>
      </div>

      {/* ── Stories (Verhalen) ── */}
      <div 
        className="pt-2 pb-2.5 border-b border-t mt-0 mb-1 relative" 
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

        <div className="flex gap-4 overflow-x-auto px-5 pb-1" style={{ scrollbarWidth: 'none' }}>
          {/* User's own story addition bubble if they don't have stories */}
          {!hasMyStories && (
            <div 
              className="flex flex-col items-center flex-shrink-0 cursor-pointer"
              onClick={() => navigate(createPageUrl('Hints'))}
            >
              <div className="relative w-20 h-20 rounded-full p-[3px] bg-gray-300 dark:bg-gray-800 flex items-center justify-center">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {myProfile?.photo_url ? (
                    <img src={myProfile.photo_url} alt="" className="w-full h-full object-cover opacity-60" />
                  ) : (
                    <span className="text-2xl">{myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}</span>
                  )}
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#FF4B72] border-2 border-white dark:border-gray-900 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-white" />
                </div>
              </div>
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
                  className="w-20 h-20 rounded-full p-[3px] transition-transform active:scale-95"
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
                        <span className="text-2xl">{group.user_avatar ? group.user_avatar.split(' ')[0] : '👤'}</span>
                      )}
                    </div>
                  </div>
                </div>
                {!isMe && (
                  <span className={`text-[11px] mt-1.5 font-semibold truncate max-w-[84px] ${textMain}`}>
                    Verhaal
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">

        {/* Stats / Matches live indicators — unified card */}
        <div
          className="mt-6 rounded-[24px] py-4 px-2 shadow-sm"
          style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.04)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <div className={`grid grid-cols-3 divide-x ${isDark ? 'divide-white/10' : 'divide-gray-100'} items-center`}>
            {/* Matches */}
            <div
              className="flex flex-col items-center justify-center relative transition-transform active:scale-95 cursor-pointer py-1.5"
              onClick={() => navigate(createPageUrl('Matches'))}
            >
              <span className={`text-3xl font-black leading-none tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{animMatchCount}</span>
              <span className={`text-[11px] font-bold tracking-wider mt-1.5 ${isDark ? 'text-white/80' : 'text-gray-500'}`}>MATCHES</span>
              {hasNewMatches && (
                <div
                  className="absolute -top-1 right-2 px-2 py-0.5 text-[8px] font-black text-white rounded-full tracking-wider animate-pulse shadow-md"
                  style={{ background: '#FF4A82' }}
                >
                  NEW
                </div>
              )}
            </div>

            {/* Super match */}
            <div
              className="flex flex-col items-center justify-center relative transition-transform active:scale-95 cursor-pointer py-1.5"
              onClick={() => setShowSuperMatchSheet(true)}
            >
              <span className={`text-3xl font-black leading-none tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{animSuperCount}</span>
              <span className={`text-[11px] font-bold tracking-wider mt-1.5 ${isDark ? 'text-white/80' : 'text-gray-500'}`}>SUPER</span>
            </div>

            {/* Live Accounts */}
            <div
              className="flex flex-col items-center justify-center relative transition-transform active:scale-95 cursor-pointer py-1.5"
              onClick={() => navigate(createPageUrl('Pinpoint'))}
            >
              <span className={`text-3xl font-black leading-none tabular-nums ${isDark ? 'text-white' : 'text-gray-900'}`}>{animLocationCount}</span>
              <span className={`text-[11px] font-bold tracking-wider mt-1.5 uppercase text-center leading-tight ${isDark ? 'text-white/80' : 'text-gray-500'}`}>OP LOCATIE</span>
            </div>
          </div>
        </div>

        {/* Action Buttons List: Reveal Likes, Super Matches, Hints, Games, Discounts with Brand Logo Fade */}
        <div className="mt-4 mb-4 relative">
          <div className={`space-y-3 sm:space-y-3.5 transition-all duration-300 ${!myCheckIn ? 'filter blur-[7px] pointer-events-none select-none opacity-40' : ''}`}>
            {/* 1. Onthul wie je heeft geliked (#FF4B72 - Felroze / Kersenrood) */}
            <button
              onClick={onRevealClick}
              className={`w-full flex items-center justify-between rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden shadow-sm ${
                unmatchedLikes.length > 0 ? '' : 'opacity-95'
              }`}
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 75, 114, 0.22) 0%, rgba(255, 75, 114, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 75, 114, 0.10) 0%, rgba(255, 75, 114, 0.02) 100%), #FFFFFF',
                border: isDark ? '1.5px solid rgba(255, 75, 114, 0.48)' : '1.5px solid rgba(255, 75, 114, 0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isDark ? '0 8px 24px rgba(255, 75, 114, 0.14)' : '0 4px 18px rgba(255, 75, 114, 0.08)',
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

              <div className="flex items-center gap-3.5 sm:gap-4 z-10 flex-1 min-w-0 pr-2">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: isDark ? 'rgba(255, 75, 114, 0.25)' : 'rgba(255, 75, 114, 0.12)' }}
                >
                  <Eye className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? 'text-white' : 'text-[#FF4B72]'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-0.5 ${isDark ? 'text-white/60' : 'text-[#FF4B72]'}`}>LIKES</p>
                  <p className={`text-[16px] sm:text-[18px] font-black leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Onthul wie je heeft geliked</p>
                  <p className={`text-[12px] sm:text-[13.5px] mt-0.5 truncate ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
                    Bekijk wie jou leuk vindt
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="min-w-[28px] h-7 px-2 sm:min-w-[32px] sm:h-8 sm:px-2.5 rounded-full bg-[#FF4B72] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-md">
                  {unmatchedLikes.length}
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </button>

            {/* 2. Super matches (#F9488A - Fade stap 1) */}
            <button
              onClick={() => setShowSuperMatchSheet(true)}
              className="w-full flex items-center justify-between rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden shadow-sm"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(249, 72, 138, 0.22) 0%, rgba(249, 72, 138, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(249, 72, 138, 0.10) 0%, rgba(249, 72, 138, 0.02) 100%), #FFFFFF',
                border: isDark ? '1.5px solid rgba(249, 72, 138, 0.48)' : '1.5px solid rgba(249, 72, 138, 0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isDark ? '0 8px 24px rgba(249, 72, 138, 0.14)' : '0 4px 18px rgba(249, 72, 138, 0.08)',
              }}
            >
              <div className="flex items-center gap-3.5 sm:gap-4 z-10 flex-1 min-w-0 pr-2">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: isDark ? 'rgba(249, 72, 138, 0.25)' : 'rgba(249, 72, 138, 0.12)' }}
                >
                  <Flame className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? 'text-white' : 'text-[#F9488A]'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-0.5 ${isDark ? 'text-white/60' : 'text-[#F9488A]'}`}>SUPER</p>
                  <p className={`text-[16px] sm:text-[18px] font-black leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Super matches</p>
                  <p className={`text-[12px] sm:text-[13.5px] mt-0.5 truncate ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
                    Ontdek je beste connecties
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="min-w-[28px] h-7 px-2 sm:min-w-[32px] sm:h-8 sm:px-2.5 rounded-full bg-[#F9488A] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-md">
                  {superMatchCount}
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </button>

            {/* 3. Stuur een hint (#F445A3 - Fade stap 2) */}
            <button
              onClick={onHintClick}
              className="w-full flex items-center justify-between rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden shadow-sm"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(244, 69, 163, 0.22) 0%, rgba(244, 69, 163, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(244, 69, 163, 0.10) 0%, rgba(244, 69, 163, 0.02) 100%), #FFFFFF',
                border: isDark ? '1.5px solid rgba(244, 69, 163, 0.48)' : '1.5px solid rgba(244, 69, 163, 0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isDark ? '0 8px 24px rgba(244, 69, 163, 0.14)' : '0 4px 18px rgba(244, 69, 163, 0.08)',
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

              <div className="flex items-center gap-3.5 sm:gap-4 z-10 flex-1 min-w-0 pr-2">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: isDark ? 'rgba(244, 69, 163, 0.25)' : 'rgba(244, 69, 163, 0.12)' }}
                >
                  <Lightbulb className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? 'text-white' : 'text-[#F445A3]'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-0.5 ${isDark ? 'text-white/60' : 'text-[#F445A3]'}`}>HINTS</p>
                  <p className={`text-[16px] sm:text-[18px] font-black leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Stuur een hint</p>
                  <p className={`text-[12px] sm:text-[13.5px] mt-0.5 truncate ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
                    Laat anoniem je interesse weten
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="min-w-[28px] h-7 px-2 sm:min-w-[32px] sm:h-8 sm:px-2.5 rounded-full bg-[#F445A3] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-md">
                  {hints.length + superMatchHints.length}
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </button>

            {/* 4. Spellen (#EE42BC - Fade stap 3) */}
            <button
              onClick={() => navigate(createPageUrl('Games'))}
              className="w-full flex items-center justify-between rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden shadow-sm"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(238, 66, 188, 0.22) 0%, rgba(238, 66, 188, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(238, 66, 188, 0.10) 0%, rgba(238, 66, 188, 0.02) 100%), #FFFFFF',
                border: isDark ? '1.5px solid rgba(238, 66, 188, 0.48)' : '1.5px solid rgba(238, 66, 188, 0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isDark ? '0 8px 24px rgba(238, 66, 188, 0.14)' : '0 4px 18px rgba(238, 66, 188, 0.08)',
              }}
            >
              <div className="flex items-center gap-3.5 sm:gap-4 z-10 flex-1 min-w-0 pr-2">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: isDark ? 'rgba(238, 66, 188, 0.25)' : 'rgba(238, 66, 188, 0.12)' }}
                >
                  <Gamepad2 className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? 'text-white' : 'text-[#EE42BC]'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-0.5 ${isDark ? 'text-white/60' : 'text-[#EE42BC]'}`}>GAMES</p>
                  <p className={`text-[16px] sm:text-[18px] font-black leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Spellen</p>
                  <p className={`text-[12px] sm:text-[13.5px] mt-0.5 truncate ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
                    Speel games en verdien beloningen
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="min-w-[28px] h-7 px-2 sm:min-w-[32px] sm:h-8 sm:px-2.5 rounded-full bg-[#EE42BC] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-md">
                  {activeGameCount}
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </button>

            {/* 5. Bekijk VIP kortingen (#EA3FD3 - Magenta / Neonpaars) */}
            <button
              onClick={() => setShowDiscountsModal(true)}
              className="w-full flex items-center justify-between rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 relative z-30 transition-all active:scale-[0.98] overflow-hidden shadow-sm"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(234, 63, 211, 0.22) 0%, rgba(234, 63, 211, 0.08) 100%)'
                  : 'linear-gradient(135deg, rgba(234, 63, 211, 0.10) 0%, rgba(234, 63, 211, 0.02) 100%), #FFFFFF',
                border: isDark ? '1.5px solid rgba(234, 63, 211, 0.48)' : '1.5px solid rgba(234, 63, 211, 0.30)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: isDark ? '0 8px 24px rgba(234, 63, 211, 0.14)' : '0 4px 18px rgba(234, 63, 211, 0.08)',
              }}
            >
              <div className="flex items-center gap-3.5 sm:gap-4 z-10 flex-1 min-w-0 pr-2">
                <div 
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                  style={{ background: isDark ? 'rgba(234, 63, 211, 0.25)' : 'rgba(234, 63, 211, 0.12)' }}
                >
                  <Sparkles className={`w-6 h-6 sm:w-7 sm:h-7 ${isDark ? 'text-white' : 'text-[#EA3FD3]'}`} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className={`text-[10px] sm:text-[11px] font-black tracking-wider uppercase mb-0.5 ${isDark ? 'text-white/60' : 'text-[#EA3FD3]'}`}>VIP DEALS</p>
                  <p className={`text-[16px] sm:text-[18px] font-black leading-snug truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>Bekijk VIP kortingen</p>
                  <p className={`text-[12px] sm:text-[13.5px] mt-0.5 truncate ${isDark ? 'text-white/80' : 'text-gray-500'}`}>
                    Exclusieve deals voor jou
                  </p>
                </div>
              </div>
              <div className="relative z-10 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                <div className="min-w-[28px] h-7 px-2 sm:min-w-[32px] sm:h-8 sm:px-2.5 rounded-full bg-[#EA3FD3] text-white text-xs sm:text-sm font-black flex items-center justify-center shadow-md">
                  {CLUB_DISCOUNTS.filter(d => !d.discount.includes('Geen actieve')).length}
                </div>
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'} flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                </div>
              </div>
            </button>
          </div>

          {/* Location Not Set Blur Overlay */}
          {!myCheckIn && (
            <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-3">
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
                  Stel je bestemming van vandaag in om je matches, hints, spellen en kortingen te zien!
                </p>
                <button
                  onClick={() => navigate(createPageUrl('Pinpoint'))}
                  className="w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg active:scale-95 transition-transform text-center"
                  style={{
                    background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                    boxShadow: '0 6px 20px rgba(255, 75, 114, 0.4)',
                  }}
                >
                  Stel een bestemming in om matches te zien
                </button>
              </div>
            </div>
          )}
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

      {/* ── Revealed Profile Sheet ── */}
      <AnimatePresence>
        {showRevealModal && revealedProfile && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[100]"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmClose(true)}
            />

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 400) {
                  setShowConfirmClose(true);
                }
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-0 z-[102] max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                touchAction: 'pan-y',
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

              {/* Top Bar Navigation (WhatsApp-style back button and Options) */}
              <div className="absolute left-4 right-4 z-20 flex justify-between items-center pointer-events-auto" style={{ top: 'max(16px, env(safe-area-inset-top, 16px))' }}>
                {/* Back Button */}
                <button
                  onClick={() => setShowConfirmClose(true)}
                  className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                  title="Terug"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                </button>

                {/* Three dots menu */}
                <div className="relative">
                  <button
                    onClick={() => setRevealedBioExpanded(!revealedBioExpanded)}
                    className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg"
                  >
                    <MoreVertical className="w-5.5 h-5.5 text-white" />
                  </button>
                </div>
              </div>

              {/* Pink Match Badge */}
              <div 
                className="absolute left-4 z-20 px-3 py-1.5 rounded-full text-[9px] font-black text-white tracking-widest shadow-md"
                style={{
                  top: 'calc(max(16px, env(safe-area-inset-top, 16px)) + 54px)',
                  background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                  boxShadow: '0 4px 12px rgba(255, 75, 114, 0.4)'
                }}
              >
                HEEFT JOU GELIKED! 💖
              </div>

              {/* Foreground Content */}
              <div 
                className="relative z-10 flex flex-col h-full p-6 pointer-events-none mt-auto"
                style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
              >
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Discounts Sheet ── */}
      <AnimatePresence>
        {showDiscountsModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[100]"
              style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDiscountsModal(false)}
            />

            <motion.div
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.8 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80 || info.velocity.x > 400) {
                  setShowDiscountsModal(false);
                }
              }}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="fixed inset-0 z-[102] max-w-md mx-auto flex flex-col overflow-hidden shadow-2xl"
              style={{
                background: isDark ? '#0E0E1C' : '#FFFFFF',
                touchAction: 'pan-y',
              }}
            >
              {/* WhatsApp-Style Header */}
              <div 
                className="p-4 pb-4 flex items-center justify-between flex-shrink-0" 
                style={{ 
                  paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
                  borderBottom: `1px solid ${divider}` 
                }}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDiscountsModal(false)}
                    className="w-10 h-10 -ml-1 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                    style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                    title="Terug"
                  >
                    <ChevronLeft className="w-6 h-6" style={{ color: textMain }} />
                  </button>
                  <div>
                    <h2 className={`text-lg font-black ${textMain}`}>
                      Lidmaatschapskortingen
                    </h2>
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      Exclusief voor Romety gebruikers
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiscountsModal(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white active:scale-90 transition-transform"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <X className="w-4 h-4" style={{ color: textMain }} />
                </button>
              </div>

              {/* List */}
              <div className="p-5 space-y-3.5 flex-1 overflow-y-auto">
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
              <div 
                className="p-4 border-t border-white/5 bg-black/10 flex-shrink-0"
                style={{ paddingBottom: 'calc(76px + env(safe-area-inset-bottom, 0px))' }}
              >
                <button
                  onClick={() => setShowDiscountsModal(false)}
                  className="w-full py-3.5 rounded-2xl font-black text-xs bg-white/10 hover:bg-white/15 text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Terug naar Home</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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