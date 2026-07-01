import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { Search, MapPin, X, Building2, Crosshair } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { T } from '@/lib/translations';
import { isMatch, calculateCompatibility, getArray, normalizeTrait, normalizeInterest } from '@/lib/matchUtils';
import MapView from '@/components/welove/MapView';
import VenueBottomSheet from '@/components/welove/VenueBottomSheet';
import HomeInfoSheet from '@/components/welove/HomeInfoSheet';
import { useTheme } from '@/lib/ThemeContext';

const GRAD = 'linear-gradient(135deg, #8E54E9 0%, #EA3FD3 100%)';

export default function Pinpoint() {
  const { lang } = useLang();
  const t = T[lang] || T.nl;
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const user = useUser();
  const [myProfile, setMyProfile] = useState(null);
  const [unlocked, setUnlocked] = useState(true);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [myCheckIn, setMyCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPosition, setUserPosition] = useState(null);
  const [bottomSheet, setBottomSheet] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [highlightedVenueId, setHighlightedVenueId] = useState(null);
  const [searchPin, setSearchPin] = useState(null);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [sheetSnap, setSheetSnap] = useState('hidden');
  const [snapState, setSnapState] = useState('hidden');
  const sheetJustOpenedRef = useRef(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [myDestination, setMyDestination] = useState(null);
  const [allDestinations, setAllDestinations] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [highMatches, setHighMatches] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);

  const startGPS = () => {
    if (!navigator.geolocation || watchIdRef.current) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => console.warn('GPS:', err.message),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const stopGPS = () => {
    if (watchIdRef.current) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null; }
  };

  useEffect(() => {
    if (user !== undefined) loadData(); // undefined = still loading auth
    return stopGPS;
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const u = user;
    if (!u) { setLoading(false); return; }

    const [profiles, allClubs, checkIns, searches] = await Promise.all([
      base44.entities.UserProfile.filter({ user_email: u.email }),
      base44.entities.Club.list(),
      base44.entities.VenueCheckIn.filter({ user_email: u.email }),
      base44.entities.SearchHistory.filter({ user_email: u.email }, '-created_date', 10),
    ]);
    const [allCheckIns, allDests, allProfs] = await Promise.all([
      base44.entities.VenueCheckIn.list(),
      base44.entities.UserDestination.list(),
      base44.entities.UserProfile.list('-created_date', 200),
    ]);
    setRecentSearches(searches);
    setAllProfiles(allProfs);

    const nowIso = new Date().toISOString();
    const activeDests = allDests.filter((d) => d.status === 'active' && (!d.expires_at || d.expires_at > nowIso));
    setAllDestinations(activeDests);
    setMyDestination(activeDests.find((d) => d.user_email === u.email) || null);

    const p = profiles[0] || null;
    setMyProfile(p);

    const countMap = {};
    const now = new Date().toISOString();
    allCheckIns.forEach((c) => {
      if (!c.expires_at || c.expires_at > now) {
        const key = c.venue_id || c.venue_name;
        countMap[key] = (countMap[key] || 0) + 1;
      }
    });

    const destCountMap = {};
    activeDests.forEach((d) => {
      const key = d.venue_id || d.venue_name;
      destCountMap[key] = (destCountMap[key] || 0) + 1;
    });

    const venues = allClubs
      .filter((c) => c.lat && c.lng && c.lat > 50 && c.lat < 54 && c.lng > 3 && c.lng < 8)
      .map((c) => ({
        id: c.id,
        name: c.name,
        city: c.city,
        lat: c.lat,
        lng: c.lng,
        matchCount: countMap[c.id] || countMap[c.name] || 0,
        destCount: (destCountMap[c.id] || 0) + (destCountMap[c.name] || 0)
      }));
    setClubs(venues);

    const active = checkIns.find((c) => !c.expires_at || c.expires_at > now);
    if (active) { setMyCheckIn(active); unlock(); }
    else if (p?.location_enabled) { unlock(); startGPS(); }

    // Check URL param — open venue from hotspot click
    const urlParams = new URLSearchParams(window.location.search);
    const venueId = urlParams.get('venueId');
    if (venueId) {
      const target = venues.find((v) => v.id === venueId || v.name === venueId);
      if (target) {
        unlockImmediate();
        setSelectedVenue(target);
        setBottomSheet(target);
        setHighlightedVenueId(target.id);
        setSheetSnap('peek');
        setSnapState('peek');
        setTimeout(() => { mapRef.current?.flyTo(target.lat, target.lng, 16); }, 800);
      }
    }

    // Calculate Hotspots
    const hotspotsCountMap = {};
    const hotspotsMetaMap = {};
    activeDests.forEach((d) => {
      const key = d.venue_id || d.venue_name;
      hotspotsCountMap[key] = (hotspotsCountMap[key] || 0) + 1;
      if (!hotspotsMetaMap[key]) hotspotsMetaMap[key] = { venue_id: d.venue_id, venue_name: d.venue_name };
    });
    const clubMap = {};
    allClubs.forEach((c) => { clubMap[c.id] = c; clubMap[c.name] = c; });
    const top5Hotspots = Object.entries(hotspotsCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const meta = hotspotsMetaMap[key];
        const club = clubMap[meta.venue_id] || clubMap[meta.venue_name];
        return { ...meta, count, city: club?.city || '' };
      });
    setHotspots(top5Hotspots);

    // Calculate High Matches
    if (p) {
      const others = allProfs.filter((prof) => prof.user_email !== u.email && prof.onboarding_complete);
      const matchData = others
        .filter((prof) => isMatch(p, prof))
        .map((prof) => ({
          profile: prof,
          compatibility: calculateCompatibility(p, prof),
          is80: isMatch(p, prof),
        }));
      setHighMatches(matchData.filter((m) => m.is80));
    }

    setLoading(false);
  };

  const unlock = () => {
    setOverlayVisible(false);
    setUnlocked(true);
  };

  const unlockImmediate = () => {
    setOverlayVisible(false);
    setUnlocked(true);
  };

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchSuggestions([]); return; }

    const clubMatches = clubs
      .filter((v) => v.name.toLowerCase().includes(q.toLowerCase()) || (v.city && v.city.toLowerCase().includes(q.toLowerCase())))
      .slice(0, 4)
      .map((v) => ({ type: 'club', id: v.id, label: v.name, sublabel: v.city, lat: v.lat, lng: v.lng, venue: v }));

    setSearchSuggestions(clubMatches);

    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=nl&limit=4&addressdetails=1`,
          { headers: { 'Accept-Language': 'nl' } }
        );
        const data = await res.json();
        const geoResults = data.map((item) => ({
          type: 'location',
          id: item.place_id,
          label: item.display_name.split(',')[0],
          sublabel: item.display_name.split(',').slice(1, 3).join(',').trim(),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          venue: null
        }));
        setSearchSuggestions((prev) => {
          const existing = prev.filter((s) => s.type === 'club');
          return [...existing, ...geoResults].slice(0, 8);
        });
      } catch (e) {}
      setSearchLoading(false);
    }, 350);
  };

  const saveSearch = async (item) => {
    if (!user) return;
    await base44.entities.SearchHistory.create({
      user_email: user.email,
      query: item.label,
      type: item.type,
      lat: item.lat,
      lng: item.lng
    });
    const searches = await base44.entities.SearchHistory.filter({ user_email: user.email }, '-created_date', 10);
    setRecentSearches(searches);
  };

  const handleSelectSuggestion = (item) => {
    setSearchQuery(item.label);
    setSearchSuggestions([]);
    setSearchFocused(false);
    searchInputRef.current?.blur();
    unlockImmediate();
    saveSearch(item);

    sheetJustOpenedRef.current = true;
    setTimeout(() => { sheetJustOpenedRef.current = false; }, 600);

    if (item.venue) {
      setHighlightedVenueId(item.venue.id);
      setSearchPin(null);
      setSelectedVenue(item.venue);
      setBottomSheet(item.venue);
      setSheetSnap('peek');
      setSnapState('peek');
      setTimeout(() => { mapRef.current?.flyTo(item.lat, item.lng, 16); }, 300);
    } else {
      setHighlightedVenueId(null);
      setSearchPin({ lat: item.lat, lng: item.lng, label: item.label });
      const locVenue = { name: item.label, city: item.sublabel, lat: item.lat, lng: item.lng };
      setSelectedVenue(locVenue);
      setBottomSheet(locVenue);
      setSheetSnap('peek');
      setSnapState('peek');
      setTimeout(() => { mapRef.current?.flyTo(item.lat, item.lng, 14); }, 300);
    }
  };

  const handleGoHere = async (venue) => {
    if (!user) return;

    // Clear any active VenueCheckIn because setting a new destination overrides any active check-in
    try {
      const activeCheckIns = await base44.entities.VenueCheckIn.filter({ user_email: user.email });
      for (const checkin of activeCheckIns) {
        await base44.entities.VenueCheckIn.delete(checkin.id);
      }
      setMyCheckIn(null);
    } catch (e) {
      console.error("Error clearing VenueCheckIn:", e);
    }

    if (myDestination) {
      await base44.entities.UserDestination.update(myDestination.id, { status: 'expired' });
    }
    const newDest = await base44.entities.UserDestination.create({
      user_email: user.email,
      venue_id: venue.id,
      venue_name: venue.name,
      status: 'active',
      expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    });
    setMyDestination(newDest);
    const all = await base44.entities.UserDestination.list();
    const refreshNow = new Date().toISOString();
    setAllDestinations(all.filter((d) => d.status === 'active' && (!d.expires_at || d.expires_at > refreshNow)));
  };

  const handleCancelGoing = async () => {
    if (!user) return;

    // Clear any active VenueCheckIn as well
    try {
      const activeCheckIns = await base44.entities.VenueCheckIn.filter({ user_email: user.email });
      for (const checkin of activeCheckIns) {
        await base44.entities.VenueCheckIn.delete(checkin.id);
      }
      setMyCheckIn(null);
    } catch (e) {
      console.error("Error clearing VenueCheckIn:", e);
    }

    if (myDestination) {
      await base44.entities.UserDestination.update(myDestination.id, { status: 'expired' });
      setMyDestination(null);
    }
    const all = await base44.entities.UserDestination.list();
    const refreshNow = new Date().toISOString();
    setAllDestinations(all.filter((d) => d.status === 'active' && (!d.expires_at || d.expires_at > refreshNow)));
  };

  const handleEnableLocation = async () => {
    if (!user) return;
    const expires = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    if (myProfile) {
      await base44.entities.UserProfile.update(myProfile.id, { location_enabled: true, location_expires_at: expires });
      setMyProfile((p) => ({ ...p, location_enabled: true, location_expires_at: expires }));
    }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn('Locatie geweigerd:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    startGPS();
    unlockImmediate();
  };

  const matchVenue = (d, venue) => {
    if (!venue || !d) return false;
    if (d.venue_id && venue.id && d.venue_id === venue.id) return true;
    const vName = (venue.name || venue.label || '').toLowerCase();
    const dName = (d.venue_name || '').toLowerCase();
    if (vName && dName && (dName.includes(vName) || vName.includes(dName))) return true;
    return false;
  };

  const goingCountForVenue = (venue) => allDestinations.filter((d) => matchVenue(d, venue)).length;
  const isGoingToVenue = (venue) => !!(myDestination && matchVenue(myDestination, venue));
  const isLiveCheckedIn = (venue) => !!(myCheckIn && matchVenue(myCheckIn, venue));

  const matchPotentialForVenue = (venue) => {
    if (!myProfile) return 0;
    const goingEmails = new Set(allDestinations.filter((d) => matchVenue(d, venue)).map((d) => d.user_email));
    
    // Filter to strict matches going to this venue
    const goingMatches = highMatches.filter((m) => goingEmails.has(m.profile.user_email));
    if (goingMatches.length > 0) {
      const totalScore = goingMatches.reduce((sum, m) => sum + m.compatibility, 0);
      return Math.round(totalScore / goingMatches.length);
    }

    // Fallback: loose matches compatibility average
    const candidates = allProfiles.filter((p) => p.user_email !== myProfile.user_email && isLooseMatch(myProfile, p));
    const goingCandidates = candidates.filter((p) => goingEmails.has(p.user_email));
    if (goingCandidates.length === 0) return 0;
    const totalScore = goingCandidates.reduce((sum, p) => {
      const t1 = getArray(myProfile.traits).map(normalizeTrait);
      const t2 = getArray(p.traits).map(normalizeTrait);
      const i1 = getArray(myProfile.interests).map(normalizeInterest);
      const i2 = getArray(p.interests).map(normalizeInterest);
      
      const traitOverlap = t1.filter((t) => t2.includes(t)).length;
      const interestOverlap = i1.filter((i) => i2.includes(i)).length;
      const maxTraits = Math.max(t1.length, 1);
      const maxInterests = Math.max(i1.length, 1);
      return sum + Math.round(traitOverlap / maxTraits * 70 + interestOverlap / maxInterests * 30);
    }, 0);
    return Math.min(100, Math.round(totalScore / goingCandidates.length));
  };

  // Looser match check for venue badge: gender preference + at least 1 shared interest or trait
  const isLooseMatch = (me, other) => {
    if (!me || !other) return false;
    if (!me.gender || !me.looking_for || !other.gender || !other.looking_for) return false;
    const iWantThem = me.looking_for === 'both' || me.looking_for === other.gender;
    const theyWantMe = other.looking_for === 'both' || other.looking_for === me.gender;
    if (!iWantThem || !theyWantMe) return false;
    
    const t1 = getArray(me.traits).map(normalizeTrait);
    const t2 = getArray(other.traits).map(normalizeTrait);
    const i1 = getArray(me.interests).map(normalizeInterest);
    const i2 = getArray(other.interests).map(normalizeInterest);
    
    const sharedInterests = i1.filter((i) => i2.includes(i)).length;
    const sharedTraits = t1.filter((t) => t2.includes(t)).length;
    return sharedInterests >= 1 || sharedTraits >= 1;
  };

  const matchGoingCountForVenue = (venue) => {
    if (!myProfile) return 0;
    return highMatches.filter((m) => allDestinations.some((d) => d.user_email === m.profile.user_email && matchVenue(d, venue))).length;
  };

  const matchGoingProfilesForVenue = (venue) => {
    if (!myProfile) return [];
    return highMatches.filter((m) => allDestinations.some((d) => d.user_email === m.profile.user_email && matchVenue(d, venue)));
  };

  const showSearchPanel = searchFocused;
  const crosshairBottom = bottomSheet
    ? (snapState === 'full'
        ? '90%'
        : snapState === 'peek'
        ? Math.round(window.innerHeight * 0.38) + 48
        : snapState === 'collapsed'
        ? 132
        : 40)
    : (unlocked ? '55%' : 40);

  const pageBg = isDark ? '#0A0E21' : '#F8F9FB';
  const searchBarBg = isDark ? 'rgba(20,20,40,0.92)' : 'rgba(255,255,255,0.95)';
  const searchBarBorder = (focused) => focused
    ? 'rgba(255,107,74,0.9)'
    : isDark ? 'rgba(255,107,74,0.5)' : 'rgba(255,107,74,0.4)';
  const searchTextColor = isDark ? 'text-white' : 'text-gray-900';
  const searchPlaceholderColor = isDark ? 'placeholder-white/30' : 'placeholder-gray-400';
  const dropdownBg = isDark ? 'rgba(14,14,28,0.92)' : 'rgba(255,255,255,0.98)';
  const dropdownBorder = isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.08)';
  const rowBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const sectionLabelColor = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
  const crosshairBg = isDark ? 'rgba(18,18,35,0.92)' : 'rgba(255,255,255,0.95)';
  const crosshairBorder = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)';

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: pageBg }}>
        <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 8px 28px rgba(255,107,74,0.45), 0 0 0 0px rgba(255,107,74,0); }
          50% { box-shadow: 0 8px 28px rgba(255,107,74,0.6), 0 0 0 6px rgba(255,107,74,0.35); }
        }
        .overlay-fadeout { animation: fadeOut 0.6s ease-out forwards; }
        .search-panel { max-height: min(60vh, 420px); overflow-y: auto; }
        .search-row { min-height: 52px; }
      `}</style>

      {/* ── Layer 0: Full-screen Map ── */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 0 }}
        onClick={() => {
          // do nothing — map clicks are handled by MapView's venue markers
        }}
      >
        <MapView
          ref={mapRef}
          venues={clubs}
          userPosition={userPosition}
          myCheckIn={myCheckIn}
          onVenueClick={(v) => { setSelectedVenue(v); setBottomSheet(v); setSheetSnap('peek'); setSnapState('peek'); }}
          onMapClick={() => { if (!sheetJustOpenedRef.current && snapState !== 'hidden') { setSnapState('hidden'); setSelectedVenue(null); setBottomSheet(null); setSheetSnap('hidden'); } }}
          highlightedVenueId={highlightedVenueId}
          searchPin={searchPin}
          myDestination={myDestination}
        />
      </div>

      {/* ── Map focus dimmer (when search is active) ── */}
      {searchFocused && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 10, background: 'rgba(0,0,0,0.45)', transition: 'opacity 0.3s ease' }}
        />
      )}

      {/* ── Layer 1: Top floating UI ── */}
      <div className="absolute top-0 left-0 right-0 px-4 pb-3" style={{ zIndex: 40, paddingTop: 'max(48px, env(safe-area-inset-top, 48px))' }}>

        {/* Live badge */}
        {myCheckIn && (
          <div className="absolute top-12 right-4 rounded-full px-3 py-1.5 flex items-center gap-1.5" style={{ background: isDark ? 'rgba(10,14,33,0.75)' : 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)', border: isDark ? '1px solid rgba(255,75,114,0.4)' : '1px solid rgba(255,75,114,0.2)' }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#FF4B72' }} />
            <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>{t.live}</span>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <div
            className="flex items-center gap-3 px-4 rounded-[20px]"
            style={{ height: 52, background: searchBarBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1.5px solid ${searchBarBorder(searchFocused)}`, boxShadow: searchFocused ? '0 4px 28px rgba(255,75,114,0.3)' : '0 4px 24px rgba(0,0,0,0.15)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
          >
            {searchLoading
              ? <div className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-pink-300 border-t-pink-600 animate-spin" />
              : <Search className="w-5 h-5 flex-shrink-0" style={{ color: '#FF4B72' }} />
            }
            <input
              ref={searchInputRef}
              className={`flex-1 bg-transparent focus:outline-none ${searchTextColor} ${searchPlaceholderColor}`}
              style={{ fontSize: '16px' }}
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onKeyDown={(e) => { if (e.key === 'Escape') { setSearchSuggestions([]); setSearchQuery(''); setSearchFocused(false); searchInputRef.current?.blur(); } }}
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => { setSearchQuery(''); setSearchSuggestions([]); setSearchPin(null); setHighlightedVenueId(null); }}
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
              >
                <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
              </button>
            )}
          </div>

          {/* Search suggestions + recent searches dropdown */}
          {showSearchPanel && (
            <div
              className="absolute w-full rounded-[20px] shadow-2xl mt-2 search-panel"
              style={{ background: dropdownBg, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: dropdownBorder, boxShadow: '0 16px 48px rgba(0,0,0,0.3)' }}
            >
              {/* Live suggestions */}
              {searchSuggestions.length > 0 && searchSuggestions.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}-${i}`}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="search-row w-full px-4 text-left flex items-center gap-3 transition-colors border-b"
                  style={{ borderColor: rowBorderColor }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,107,74,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.type === 'club' ? GRAD : (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)') }}>
                    {item.type === 'club' ? <Building2 className="w-4 h-4 text-white" /> : <MapPin className="w-4 h-4" style={{ color: subColor }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: labelColor }}>{item.label}</p>
                    <p className="text-xs truncate" style={{ color: subColor }}>{item.sublabel}</p>
                  </div>
                  {item.type === 'club' && item.venue && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}>
                      {item.venue.matchCount} matches
                    </span>
                  )}
                </button>
              ))}

              {/* Recent searches (shown when focused but no query) */}
              {searchQuery.length === 0 && recentSearches.length > 0 && (
                <>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: sectionLabelColor }}>{t.recentSearches}</p>
                  </div>
                  {Object.values(recentSearches.reduce((acc, s) => {
                    if (!acc[s.query]) acc[s.query] = { ...s, count: 1 };
                    else acc[s.query].count++;
                    return acc;
                  }, {})).map((s, i) => (
                    <button
                      key={s.id || i}
                      onMouseDown={() => {
                        const club = s.type === 'club' ? clubs.find((c) => c.name === s.query) : null;
                        handleSelectSuggestion({ type: s.type, id: s.id, label: s.query, sublabel: club?.city || '', lat: s.lat, lng: s.lng, venue: club || null });
                      }}
                      className="search-row w-full px-4 text-left flex items-center gap-3 border-b"
                      style={{ borderColor: rowBorderColor }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,75,114,0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: labelColor }}>{s.query}</p>
                        <p className="text-xs" style={{ color: subColor }}>{s.type === 'club' ? t.club : t.location}</p>
                      </div>
                      {s.count > 1 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}>{s.count}x</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Empty state */}
              {searchQuery.length > 2 && !searchLoading && searchSuggestions.length === 0 && (
                <div className="px-4 py-5 text-center text-sm" style={{ color: subColor }}>Geen resultaten gevonden</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Layer 2: Center-on-me button (right side) ── */}
      {unlocked && userPosition && (
        <button
          onClick={() => mapRef.current?.flyTo(userPosition[0], userPosition[1], 15)}
          className="absolute right-4 rounded-[14px] flex items-center justify-center"
          style={{ bottom: crosshairBottom, zIndex: 2100, width: 44, height: 44, background: crosshairBg, backdropFilter: 'blur(12px)', border: crosshairBorder, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', transition: 'bottom 0.4s cubic-bezier(0.22,1,0.36,1)' }}
        >
          <Crosshair className="w-5 h-5" style={{ color: '#FF4B72' }} />
        </button>
      )}

      {/* ── Layer 3 & 4: Persistent Draggable Bottom Sheet ── */}
      {bottomSheet ? (
        <VenueBottomSheet
          venue={bottomSheet}
          snapState={sheetSnap}
          onSnapChange={(s) => { setSheetSnap(s); setSnapState(s); }}
          onClose={() => { setBottomSheet(null); setSelectedVenue(null); setSheetSnap('hidden'); setSnapState('hidden'); }}
          onGoHere={async (v) => { await handleGoHere(v); }}
          onCancelGoing={handleCancelGoing}
          isGoing={isGoingToVenue(bottomSheet)}
          isCheckedIn={isLiveCheckedIn(bottomSheet)}
          goingCount={goingCountForVenue(bottomSheet)}
          matchGoingCount={matchGoingCountForVenue(bottomSheet)}
          matchGoingProfiles={matchGoingProfilesForVenue(bottomSheet)}
          matchPotential={matchPotentialForVenue(bottomSheet)}
          onShowPremium={() => {}}
          isPremium={true}
          currentUserEmail={user?.email}
          onVenueNavigate={(destOrVenue) => {
            const v = destOrVenue?.lat
              ? destOrVenue
              : clubs.find((c) => c.id === destOrVenue?.venue_id || c.name === destOrVenue?.venue_name) || bottomSheet;
            setBottomSheet(v);
            setSelectedVenue(v);
            setHighlightedVenueId(v?.id);
            setSheetSnap('peek');
            unlockImmediate();
            if (v?.lat && v?.lng) setTimeout(() => mapRef.current?.flyTo(v.lat, v.lng, 16), 650);
          }}
        />
      ) : (
        unlocked && (
          <HomeInfoSheet
            highMatches={highMatches}
            myCheckIn={myCheckIn}
            hotspots={hotspots}
            clubs={clubs}
            allDestinations={allDestinations}
            allProfiles={allProfiles}
            myProfile={myProfile}
            myDestination={myDestination}
            onGoHere={handleGoHere}
            onEnableLocation={handleEnableLocation}
            onCancelGoing={handleCancelGoing}
            onShowPremium={() => {}}
            onVenueNavigate={(destOrVenue) => {
              const v = destOrVenue?.lat
                ? destOrVenue
                : clubs.find((c) => c.id === destOrVenue?.venue_id || c.name === destOrVenue?.venue_name) || destOrVenue;
              setSearchQuery(v?.name || destOrVenue?.venue_name || '');
              
              setSearchFocused(false);
              searchInputRef.current?.blur();
              sheetJustOpenedRef.current = true;
              setTimeout(() => { sheetJustOpenedRef.current = false; }, 600);

              if (v?.lat && v?.lng) {
                setSearchPin({ lat: v.lat, lng: v.lng, label: v.name || destOrVenue?.venue_name || '' });
                setTimeout(() => { mapRef.current?.flyTo(v.lat, v.lng, 16); }, 300);
              } else {
                setSearchPin(null);
              }
              setSelectedVenue(v);
              setBottomSheet(v);
              setHighlightedVenueId(v?.id);
              setSheetSnap('peek');
              setSnapState('peek');
            }}
            onVenueClick={(hotspot) => {
              const target = clubs.find((c) => c.id === hotspot.venue_id || c.name === hotspot.venue_name);
              
              setSearchFocused(false);
              searchInputRef.current?.blur();
              sheetJustOpenedRef.current = true;
              setTimeout(() => { sheetJustOpenedRef.current = false; }, 600);

              if (target) {
                setSearchQuery(target.name);
                setSearchPin({ lat: target.lat, lng: target.lng, label: target.name });
                setSelectedVenue(target);
                setBottomSheet(target);
                setHighlightedVenueId(target.id);
                setSheetSnap('peek');
                setSnapState('peek');
                setTimeout(() => { mapRef.current?.flyTo(target.lat, target.lng, 16); }, 300);
              } else {
                const fallbackName = hotspot.venue_name || 'Locatie';
                const fallback = { name: fallbackName, city: hotspot.city || '', id: hotspot.venue_id };
                setSearchQuery(fallbackName);
                setSelectedVenue(fallback);
                setBottomSheet(fallback);
                setSheetSnap('peek');
                setSnapState('peek');
                
                // Fetch coordinates if it's a custom location not in our clubs list
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackName)}&countrycodes=nl&limit=1`)
                  .then(r => r.json())
                  .then(data => {
                    if (data && data[0]) {
                      const lat = parseFloat(data[0].lat);
                      const lng = parseFloat(data[0].lon);
                      setSearchPin({ lat, lng, label: fallbackName });
                      setTimeout(() => { mapRef.current?.flyTo(lat, lng, 16); }, 300);
                    }
                  })
                  .catch(() => setSearchPin(null));
              }
            }}
          />
        )
      )}

    </div>
  );
}