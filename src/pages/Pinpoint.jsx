import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { Search, MapPin, X, Building2, Crosshair, Navigation, SlidersHorizontal } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { T } from '@/lib/translations';
import { isMatch, calculateCompatibility, getArray, normalizeTrait, normalizeInterest, genderMatch } from '@/lib/matchUtils';
import { calculateDistanceKm, formatDistance, sortVenuesByDistance } from '@/lib/geoUtils';
import MapView from '@/components/welove/MapView';
import VenueBottomSheet from '@/components/welove/VenueBottomSheet';
import HomeInfoSheet from '@/components/welove/HomeInfoSheet';
import LocationFilterModal from '@/components/welove/LocationFilterModal';
import { useTheme } from '@/lib/ThemeContext';
import { fetchReportedEmails } from '@/lib/reportUtils';
import { getCountryByName, venueInCountry, DEFAULT_COUNTRY } from '@/lib/countries';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

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
  const [useNearbyFilter, setUseNearbyFilter] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedRadius, setSelectedRadius] = useState('all'); // 'all' | '5' | '15' | '30' | '50'
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
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);

  // Active reference position: search location has priority, then GPS position (only when useNearbyFilter is active)
  const referencePosition = useMemo(() => {
    if (searchPin && searchPin.lat && searchPin.lng) {
      return [searchPin.lat, searchPin.lng];
    }
    if (useNearbyFilter && userPosition) {
      return userPosition;
    }
    return null;
  }, [searchPin, userPosition, useNearbyFilter]);

  // Location pin for the map: only shown when location filter is active, removed when filter is cleared or expired
  const locationPin = useMemo(() => {
    if (!useNearbyFilter) return null;
    if (searchPin && searchPin.lat && searchPin.lng) {
      return {
        lat: searchPin.lat,
        lng: searchPin.lng,
        label: selectedCity || searchPin.label || 'Gekozen stad',
      };
    }
    if (userPosition) {
      return {
        lat: userPosition[0],
        lng: userPosition[1],
        label: selectedCity || 'Huidige locatie',
      };
    }
    return null;
  }, [useNearbyFilter, searchPin, userPosition, selectedCity]);

  // Clubs sorted by proximity to the reference position (or standard list when no filter)
  const sortedClubs = useMemo(() => {
    if (!referencePosition || !clubs.length) return clubs;
    return sortVenuesByDistance(clubs, referencePosition[0], referencePosition[1]);
  }, [clubs, referencePosition]);

  // Clubs filtered by selected radius
  const displayedClubs = useMemo(() => {
    if (selectedRadius === 'all' || !referencePosition) return sortedClubs;
    const maxKm = Number(selectedRadius);
    return sortedClubs.filter((c) => c.distanceKm != null && c.distanceKm <= maxKm);
  }, [sortedClubs, selectedRadius, referencePosition]);

  // Hotspots: if useNearbyFilter is active with a selectedCity, strictly filter destinations for that city
  const displayedHotspots = useMemo(() => {
    if (!allDestinations.length) return [];

    const sameCountryEmails = new Set(
      allProfiles
        .filter((prof) => (prof.country || 'Nederland') === (myProfile?.country || 'Nederland'))
        .map((prof) => prof.user_email)
    );

    const clubMap = {};
    clubs.forEach((c) => {
      if (c.id) clubMap[c.id] = c;
      if (c.name) clubMap[c.name] = c;
    });

    let filteredDests = allDestinations.filter((d) => sameCountryEmails.has(d.user_email));

    // If city filter is active (via GPS reverse-geocode or user city input)
    if (useNearbyFilter && selectedCity) {
      const cityQuery = selectedCity.trim().toLowerCase();
      filteredDests = filteredDests.filter((d) => {
        const club = clubMap[d.venue_id] || clubMap[d.venue_name];
        const destCity = (d.venue_city || club?.city || '').toLowerCase();
        return destCity.length > 0 && (destCity.includes(cityQuery) || cityQuery.includes(destCity));
      });

      // If no destinations match this city, return empty array immediately (empty state)
      if (filteredDests.length === 0) {
        return [];
      }
    }

    const hotspotsCountMap = {};
    const hotspotsMetaMap = {};
    filteredDests.forEach((d) => {
      const key = d.venue_id || d.venue_name;
      hotspotsCountMap[key] = (hotspotsCountMap[key] || 0) + 1;
      if (!hotspotsMetaMap[key] || (!hotspotsMetaMap[key].venue_city && d.venue_city)) {
        hotspotsMetaMap[key] = { venue_id: d.venue_id, venue_name: d.venue_name, venue_city: d.venue_city };
      }
    });

    return Object.entries(hotspotsCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const meta = hotspotsMetaMap[key];
        const club = clubMap[meta?.venue_id] || clubMap[meta?.venue_name];
        return {
          ...meta,
          count,
          city: club?.city || meta?.venue_city || '',
          lat: club?.lat,
          lng: club?.lng,
        };
      });
  }, [allDestinations, clubs, allProfiles, myProfile, useNearbyFilter, selectedCity]);

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
    try {
      const u = user;
      if (!u) { setLoading(false); return; }

      const [
        profiles = [],
        allClubs = [],
        checkIns = [],
        searches = [],
        allCheckIns = [],
        allDests = [],
        allProfs = [],
        reportedEmails = new Set()
      ] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }).catch(() => []),
        base44.entities.Club.list().catch(() => []),
        base44.entities.VenueCheckIn.filter({ user_email: u.email }).catch(() => []),
        base44.entities.SearchHistory.filter({ user_email: u.email }, '-created_date', 10).catch(() => []),
        base44.entities.VenueCheckIn.list().catch(() => []),
        base44.entities.UserDestination.list().catch(() => []),
        base44.entities.UserProfile.list('-created_date', 500).catch(() => []),
        fetchReportedEmails(u.email).catch(() => new Set())
      ]);

      const safeProfs = allProfs.filter(p => p && p.user_email && !reportedEmails.has(p.user_email));
      const safeDests = allDests.filter(d => d && d.user_email && !reportedEmails.has(d.user_email));
      const safeCheckIns = allCheckIns.filter(c => c && c.user_email && !reportedEmails.has(c.user_email));

      setRecentSearches(searches);
      setAllProfiles(safeProfs);

      // Automatic background pruning: ensure user has at most 10 SearchHistory & 10 UserDestination rows in Supabase
      setTimeout(async () => {
        try {
          const allUserSearches = await base44.entities.SearchHistory.filter({ user_email: u.email }, '-created_date', 100);
          if (allUserSearches.length > 10) {
            const excess = allUserSearches.slice(10);
            for (const s of excess) {
              if (s.id) await base44.entities.SearchHistory.delete(s.id).catch(() => {});
            }
          }
          const allUserDests = await base44.entities.UserDestination.filter({ user_email: u.email }, '-created_date', 100);
          if (allUserDests.length > 10) {
            const excess = allUserDests.slice(10);
            for (const d of excess) {
              if (d.id) await base44.entities.UserDestination.delete(d.id).catch(() => {});
            }
          }
        } catch (err) {}
      }, 1000);

      const nowIso = new Date().toISOString();
      const activeDests = safeDests.filter((d) => d.status === 'active' && (!d.expires_at || d.expires_at > nowIso));
      setAllDestinations(activeDests);
      const myDest = activeDests.find((d) => d.user_email === u.email) || null;
      if (myDest && !myDest.venue_city && allClubs.length > 0) {
        const matched = allClubs.find((c) => c.id === myDest.venue_id || c.name === myDest.venue_name);
        if (matched) myDest.venue_city = matched.city;
      }
      setMyDestination(myDest);

      const p = profiles[0] || null;
      setMyProfile(p);

      // Determine country for filtering
      const userCountry = getCountryByName(p?.country);

      // Filter destinations to same country (profiles from same country only)
      const sameCountryEmails = new Set(
        allProfs
          .filter(prof => (prof.country || 'Nederland') === (p?.country || 'Nederland'))
          .map(prof => prof.user_email)
      );

      const countMap = {};
      const now = new Date().toISOString();
      safeCheckIns
        .filter(c => sameCountryEmails.has(c.user_email))
        .forEach((c) => {
          if (!c.expires_at || c.expires_at > now) {
            const key = c.venue_id || c.venue_name;
            countMap[key] = (countMap[key] || 0) + 1;
          }
        });

      const destCountMap = {};
      activeDests
        .filter(d => sameCountryEmails.has(d.user_email))
        .forEach((d) => {
          const key = d.venue_id || d.venue_name;
          destCountMap[key] = (destCountMap[key] || 0) + 1;
        });

      const venues = allClubs
        .filter((c) => c.lat && c.lng && venueInCountry(c.lat, c.lng, userCountry))
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

      // Fly map to user's country on first load
      setTimeout(() => {
        if (mapRef.current && userCountry) {
          mapRef.current.flyTo(userCountry.center[0], userCountry.center[1], userCountry.zoom);
        }
      }, 500);

      const active = checkIns.find((c) => !c.expires_at || c.expires_at > now);
      if (active) {
        if (!active.venue_city && allClubs.length > 0) {
          const matched = allClubs.find((c) => c.id === active.venue_id || c.name === active.venue_name);
          if (matched) active.venue_city = matched.city;
        }
        setMyCheckIn(active);
        unlock();
      }
      const storedExpiry = localStorage.getItem('pinpoint_nearby_expires_at');
      const storedCity = localStorage.getItem('pinpoint_filter_city');
      const isLocationActive = (storedExpiry && new Date(storedExpiry) > new Date()) || 
        (p?.location_enabled && (!p?.location_expires_at || new Date(p.location_expires_at) > new Date()));

      if (isLocationActive) {
        setUseNearbyFilter(true);
        if (storedCity) setSelectedCity(storedCity);
        unlock();
        startGPS();
      } else {
        setUseNearbyFilter(false);
        setSelectedCity(null);
        localStorage.removeItem('pinpoint_nearby_expires_at');
        localStorage.removeItem('pinpoint_filter_city');
      }

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
    } catch (err) {
      console.error('Error loading Pinpoint data:', err);
    } finally {
      setLoading(false);
    }
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
    clearTimeout(searchDebounceRef.current);

    if (q.trim().length < 2) {
      setSearchSuggestions([]);
      setSearchLoading(false);
      return;
    }

    const clubMatches = sortedClubs
      .filter((v) => v.name.toLowerCase().includes(q.toLowerCase()) || (v.city && v.city.toLowerCase().includes(q.toLowerCase())))
      .slice(0, 5)
      .map((v) => ({
        type: 'club',
        id: v.id,
        label: v.name,
        sublabel: v.city,
        lat: v.lat,
        lng: v.lng,
        venue: v,
        distanceKm: v.distanceKm
      }));

    setSearchSuggestions(clubMatches);
    setSearchLoading(true);

    searchDebounceRef.current = setTimeout(async () => {
      const userCountry = getCountryByName(myProfile?.country);
      const countryCode = userCountry?.code || DEFAULT_COUNTRY.code;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q.trim())}&countrycodes=${countryCode}&limit=4&addressdetails=1`,
          { headers: { 'Accept-Language': 'nl' } }
        );
        const data = await res.json();
        const geoResults = Array.isArray(data) ? data.map((item) => {
          const roadPart = item.display_name.split(',').slice(1, 3).join(',').trim();
          const cityPart = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '';
          let sublabel = roadPart;
          if (cityPart && !roadPart.toLowerCase().includes(cityPart.toLowerCase())) {
            sublabel = `${roadPart}, ${cityPart}`;
          }
          const itemLat = parseFloat(item.lat);
          const itemLng = parseFloat(item.lon);
          const distFromUser = userPosition ? calculateDistanceKm(userPosition[0], userPosition[1], itemLat, itemLng) : null;
          return {
            type: 'location',
            id: item.place_id,
            label: item.display_name.split(',')[0],
            sublabel,
            lat: itemLat,
            lng: itemLng,
            venue: null,
            distanceKm: distFromUser
          };
        }) : [];
        setSearchSuggestions((prev) => {
          const existing = prev.filter((s) => s.type === 'club');
          return [...existing, ...geoResults].slice(0, 8);
        });
      } catch (e) {}
      setSearchLoading(false);
    }, 450);
  };

  const saveSearch = async (item) => {
    if (!user) return;
    try {
      // 1. Fetch current search history for this user
      const existing = await base44.entities.SearchHistory.filter({ user_email: user.email }, '-created_date', 50);
      
      // 2. Delete existing identical query to avoid duplicate rows in Supabase
      const duplicates = existing.filter(s => s.query === item.label);
      for (const d of duplicates) {
        if (d.id) await base44.entities.SearchHistory.delete(d.id).catch(() => {});
      }
      
      // 3. Create new search
      const newEntry = await base44.entities.SearchHistory.create({
        user_email: user.email,
        query: item.label,
        type: item.type,
        sublabel: item.sublabel,
        lat: item.lat,
        lng: item.lng
      });
      
      // 4. Delete oldest entries if count exceeds 10 in Supabase
      const nonDupes = existing.filter(s => s.query !== item.label);
      const allUpdated = [newEntry, ...nonDupes];
      if (allUpdated.length > 10) {
        const toDelete = allUpdated.slice(10);
        for (const oldItem of toDelete) {
          if (oldItem.id) await base44.entities.SearchHistory.delete(oldItem.id).catch(() => {});
        }
      }
      setRecentSearches(allUpdated.slice(0, 10));
    } catch (e) {
      console.error("Error saving search history:", e);
    }
  };

  const handleSelectSuggestion = (item) => {
    clearTimeout(searchDebounceRef.current);
    setSearchLoading(false);
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
      setSearchPin({ lat: item.lat, lng: item.lng, label: item.label });
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
      setTimeout(() => { mapRef.current?.flyTo(item.lat, item.lng, 12); }, 300);
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

    // Expire existing active destinations and keep max 10 in Supabase
    try {
      const myDests = await base44.entities.UserDestination.filter({ user_email: user.email }, '-created_date', 50);
      for (const d of myDests) {
        if (d.status === 'active') {
          await base44.entities.UserDestination.update(d.id, { status: 'expired' }).catch(() => {});
        }
      }
      // If user already has >= 10 destinations in DB, delete the oldest so total stays <= 10
      if (myDests.length >= 10) {
        const toDelete = myDests.slice(9);
        for (const oldD of toDelete) {
          if (oldD.id) await base44.entities.UserDestination.delete(oldD.id).catch(() => {});
        }
      }

      let resolvedCity = venue.city || '';
      if (!resolvedCity && allDestinations.length > 0) {
        const found = allDestinations.find(d => d.venue_city && (d.venue_id === venue.id || d.venue_name === venue.name));
        if (found) resolvedCity = found.venue_city;
      }

      const newDest = await base44.entities.UserDestination.create({
        user_email: user.email,
        venue_id: venue.id,
        venue_name: venue.name,
        venue_city: resolvedCity,
        status: 'active',
        created_date: new Date().toISOString(),
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      });
      setMyDestination(newDest);
      const all = await base44.entities.UserDestination.list();
      const refreshNow = new Date().toISOString();
      setAllDestinations(all.filter((d) => d.status === 'active' && (!d.expires_at || d.expires_at > refreshNow)));
    } catch (err) {
      console.error('Error creating destination:', err);
    }
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

  const handleCancelDestination = handleCancelGoing;

  const handleEnableLocation = async () => {
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('pinpoint_nearby_expires_at', expiresAt);
    setUseNearbyFilter(true);
    unlockImmediate();
    startGPS();

    // If we already have a cached position, react immediately
    if (userPosition && userPosition[0] && userPosition[1]) {
      setSearchPin({ lat: userPosition[0], lng: userPosition[1], label: selectedCity || 'Huidige locatie' });
      if (mapRef.current) {
        mapRef.current.flyTo(userPosition[0], userPosition[1], 10);
      }
    }

    if (user && myProfile) {
      base44.entities.UserProfile.update(myProfile.id, { location_enabled: true, location_expires_at: expiresAt }).catch(() => {});
      setMyProfile((p) => ({ ...p, location_enabled: true, location_expires_at: expiresAt }));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserPosition([lat, lng]);
          setUseNearbyFilter(true);
          setSearchPin({ lat, lng, label: selectedCity || 'Huidige locatie' });
          if (mapRef.current) {
            mapRef.current.flyTo(lat, lng, 10);
          }
          // Reverse-geocode in the background without blocking the UI
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, { headers: { 'Accept-Language': 'nl' } })
            .then(res => res.json())
            .then(data => {
              const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || '';
              if (cityName) {
                setSelectedCity(cityName);
                localStorage.setItem('pinpoint_filter_city', cityName);
                setSearchPin({ lat, lng, label: cityName });
              }
            })
            .catch(() => {});
        },
        (err) => console.warn('Locatie:', err.message),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }
  };

  const handleSelectCity = (city) => {
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    localStorage.setItem('pinpoint_nearby_expires_at', expiresAt);
    const rawName = (city.label || city.name || '').split(',')[0].trim();
    setSelectedCity(rawName);
    localStorage.setItem('pinpoint_filter_city', rawName);
    if (city.lat && city.lng) {
      setUserPosition([city.lat, city.lng]);
      setSearchPin({ lat: city.lat, lng: city.lng, label: rawName });
      if (mapRef.current) {
        mapRef.current.flyTo(city.lat, city.lng, 10);
      }
    }
    setUseNearbyFilter(true);
    unlockImmediate();
  };

  const handleClearFilter = async () => {
    localStorage.removeItem('pinpoint_nearby_expires_at');
    localStorage.removeItem('pinpoint_filter_city');
    setUseNearbyFilter(false);
    setSelectedCity(null);
    setSearchPin(null);
    setSelectedRadius('all');
    if (myProfile && user) {
      await base44.entities.UserProfile.update(myProfile.id, {
        location_enabled: false,
        location_expires_at: null,
      }).catch(() => {});
      setMyProfile((prev) => ({ ...prev, location_enabled: false, location_expires_at: null }));
    }
    const userCountry = getCountryByName(myProfile?.country);
    if (mapRef.current && userCountry) {
      mapRef.current.flyTo(userCountry.center[0], userCountry.center[1], userCountry.zoom);
    }
  };

  const toggleNearbyFilter = () => {
    setFilterModalOpen(true);
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
    const myCountry = me.country || 'Nederland';
    const otherCountry = other.country || 'Nederland';
    if (!genderMatch(me, other)) return false;
    
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
  const pageBg = isDark ? '#08090E' : '#F8F9FB';
  const searchBarBg = isDark ? 'rgba(13,14,21,0.88)' : 'rgba(255,255,255,0.92)';
  const searchBarBorder = (focused) => focused
    ? 'rgba(255, 75, 114, 0.55)'
    : isDark ? 'rgba(255, 75, 114, 0.28)' : 'rgba(255, 75, 114, 0.20)';
  const searchTextColor = isDark ? 'text-white' : 'text-gray-900';
  const searchPlaceholderColor = isDark ? 'placeholder-white/30' : 'placeholder-gray-400';
  const dropdownBg = isDark ? 'rgba(13,14,21,0.95)' : 'rgba(255,255,255,0.98)';
  const dropdownBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)';
  const rowBorderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const labelColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const sectionLabelColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.4)';

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: pageBg }}>
        <div className="w-10 h-10 rounded-full border-4 border-pink-200 border-t-pink-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md overflow-hidden" style={{ background: pageBg, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes borderPulse {
          0%, 100% { box-shadow: 0 4px 16px rgba(255,75,114,0.2), 0 0 0 0px rgba(255,75,114,0); }
          50% { box-shadow: 0 4px 18px rgba(234,63,211,0.25), 0 0 0 3px rgba(255,75,114,0.12); }
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
          venues={displayedClubs}
          searchPin={searchPin}
          myCheckIn={myCheckIn}
          onVenueClick={(v) => {
            setSelectedVenue(v);
            setBottomSheet(v);
            setHighlightedVenueId(v.id);
            setSearchPin({ lat: v.lat, lng: v.lng, label: v.name });
            setSheetSnap('peek');
            setSnapState('peek');
          }}
          onMapClick={() => {
            if (!sheetJustOpenedRef.current && snapState !== 'hidden') {
              setSnapState('hidden');
              setSelectedVenue(null);
              setBottomSheet(null);
              setSheetSnap('hidden');
              setHighlightedVenueId(null);
              setSearchPin(null);
            }
          }}
          highlightedVenueId={highlightedVenueId}
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

        {/* Search bar row + Filter button */}
        <div className="relative">
          <div className="flex items-center gap-2.5">
            {/* Search Input */}
            <div
              className="flex-1 flex items-center gap-3 px-4 rounded-[20px]"
              style={{ height: 52, background: searchBarBg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1.5px solid ${searchBarBorder(searchFocused)}`, boxShadow: searchFocused ? '0 4px 18px rgba(255,75,114,0.18)' : isDark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.08)', transition: 'border-color 0.2s, box-shadow 0.2s' }}
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
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    clearTimeout(searchDebounceRef.current);
                    setSearchLoading(false);
                    setSearchSuggestions([]);
                    setSearchQuery('');
                    setSearchFocused(false);
                    searchInputRef.current?.blur();
                  }
                }}
              />
              {searchQuery.length > 0 && (
                <button
                  onClick={() => {
                    clearTimeout(searchDebounceRef.current);
                    setSearchLoading(false);
                    setSearchQuery('');
                    setSearchSuggestions([]);
                    setSearchPin(null);
                    setHighlightedVenueId(null);
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                >
                  <X className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }} />
                </button>
              )}
            </div>

            {/* Filter button next to search bar */}
            <button
              onClick={toggleNearbyFilter}
              className="w-[52px] h-[52px] rounded-[20px] flex items-center justify-center flex-shrink-0 transition-all duration-300 active:scale-90"
              style={{
                background: useNearbyFilter ? GRAD : searchBarBg,
                border: useNearbyFilter ? '1.5px solid rgba(255,255,255,0.35)' : `1.5px solid ${searchBarBorder(false)}`,
                boxShadow: useNearbyFilter
                  ? '0 4px 18px rgba(255,75,114,0.4), 0 0 12px rgba(234,63,211,0.25)'
                  : isDark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
              title={useNearbyFilter ? 'Locatiefilter uitschakelen (toont heel Nederland)' : 'Filter op jouw huidige locatie'}
            >
              <SlidersHorizontal
                className="w-5 h-5 transition-transform duration-300"
                style={{
                  color: useNearbyFilter ? '#FFFFFF' : '#FF4B72',
                  transform: useNearbyFilter ? 'scale(1.08)' : 'scale(1)',
                }}
              />
            </button>
          </div>

          {/* Search suggestions + recent searches dropdown */}
          {showSearchPanel && (
            <div
              className="absolute w-full rounded-[20px] shadow-2xl mt-2 search-panel"
              style={{ background: dropdownBg, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: dropdownBorder, boxShadow: '0 16px 40px rgba(0,0,0,0.35)' }}
            >
              {/* Live suggestions */}
              {searchSuggestions.length > 0 && searchSuggestions.map((item, i) => (
                <button
                  key={`${item.type}-${item.id}-${i}`}
                  onMouseDown={() => handleSelectSuggestion(item)}
                  className="search-row w-full px-4 text-left flex items-center gap-3 transition-colors border-b"
                  style={{ borderColor: rowBorderColor }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,75,114,0.10)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: item.type === 'club' ? GRAD : (isDark ? 'rgba(255,75,114,0.15)' : 'rgba(255,75,114,0.10)') }}>
                    {item.type === 'club' ? <Building2 className="w-4 h-4 text-white" /> : <MapPin className="w-4 h-4" style={{ color: '#FF4B72' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: labelColor }}>{item.label}</p>
                    <p className="text-xs truncate" style={{ color: subColor }}>{item.sublabel}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {item.type === 'club' && item.venue && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}>
                        {item.venue.matchCount} matches
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {/* Recent searches (shown when focused but no query) */}
              {searchQuery.length === 0 && recentSearches.length > 0 && (
                <>
                  <div className="px-4 pt-3.5 pb-1">
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: sectionLabelColor }}>{t.recentSearches}</p>
                  </div>
                  {Object.values(recentSearches.reduce((acc, s) => {
                    if (!acc[s.query]) acc[s.query] = { ...s, count: 1 };
                    else acc[s.query].count++;
                    return acc;
                  }, {})).slice(0, 6).map((s, i) => (
                    <button
                      key={s.id || i}
                      onMouseDown={() => {
                        const club = s.type === 'club' ? sortedClubs.find((c) => c.name === s.query) : null;
                        handleSelectSuggestion({ type: s.type, id: s.id, label: s.query, sublabel: s.sublabel || club?.city || '', lat: s.lat, lng: s.lng, venue: club || null });
                      }}
                      className="search-row w-full px-4 text-left flex items-center gap-3 border-b"
                      style={{ borderColor: rowBorderColor }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,75,114,0.10)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isDark ? 'rgba(255,75,114,0.15)' : 'rgba(255,75,114,0.10)' }}>
                        <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: labelColor }}>{s.query}</p>
                        <p className="text-xs truncate" style={{ color: subColor }}>{s.sublabel || (s.type === 'club' ? t.club : t.location)}</p>
                      </div>
                      {s.count > 1 && (
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}>{s.count}x</span>
                      )}
                    </button>
                  ))}
                </>
              )}

              {/* Loading state indicator */}
              {searchLoading && searchSuggestions.length === 0 && searchQuery.trim().length >= 2 && (
                <div className="px-4 py-5 flex items-center justify-center gap-2 text-sm" style={{ color: subColor }}>
                  <div className="w-4 h-4 rounded-full border-2 border-pink-300 border-t-pink-600 animate-spin" />
                  <span>Zoeken...</span>
                </div>
              )}

              {/* Empty state (only when search has completed and no results exist) */}
              {searchQuery.trim().length >= 3 && !searchLoading && searchSuggestions.length === 0 && (
                <div className="px-4 py-5 text-center text-sm" style={{ color: subColor }}>Geen resultaten gevonden</div>
              )}
            </div>
          )}
        </div>
      </div>

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
          userPosition={userPosition}
          referencePosition={referencePosition}
          onVenueNavigate={(destOrVenue) => {
            const v = destOrVenue?.lat
              ? destOrVenue
              : sortedClubs.find((c) => c.id === destOrVenue?.venue_id || c.name === destOrVenue?.venue_name) || bottomSheet;
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
            hotspots={displayedHotspots}
            clubs={displayedClubs}
            allDestinations={allDestinations}
            allProfiles={allProfiles}
            myProfile={myProfile}
            myDestination={myDestination}
            userPosition={userPosition}
            referencePosition={referencePosition}
            useNearbyFilter={useNearbyFilter}
            selectedCity={selectedCity}
            onEnableNearby={() => {
              setUseNearbyFilter(true);
              handleEnableLocation();
            }}
            onDisableNearby={() => {
              setUseNearbyFilter(false);
              setSelectedRadius('all');
            }}
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
              const target = clubs.find(
                (c) =>
                  (hotspot.venue_id && c.id === hotspot.venue_id) ||
                  (hotspot.id && c.id === hotspot.id) ||
                  (hotspot.venue_name && c.name === hotspot.venue_name) ||
                  (hotspot.name && c.name === hotspot.name) ||
                  (c.name && hotspot.venue_name && c.name.toLowerCase() === hotspot.venue_name.toLowerCase()) ||
                  (c.name && hotspot.name && c.name.toLowerCase() === hotspot.name.toLowerCase())
              );
              
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

      {/* ── Layer 5: Location Filter Modal ── */}
      <LocationFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        isDark={isDark}
        useNearbyFilter={useNearbyFilter}
        activeLocationLabel={selectedCity || (userPosition ? 'Huidige locatie' : null)}
        isGpsActive={useNearbyFilter && !selectedCity && !!userPosition}
        onSelectGps={handleEnableLocation}
        onSelectCity={handleSelectCity}
        onClearFilter={handleClearFilter}
        userCountry={getCountryByName(myProfile?.country)}
      />

    </div>
  );
}