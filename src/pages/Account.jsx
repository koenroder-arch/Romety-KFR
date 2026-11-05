import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { authStorage } from '@/lib/authStorage';
import { isAppAdmin } from '@/lib/moderation';
import { useUser } from '@/lib/useUser';
import BlockedUsersSheet from '@/components/welove/BlockedUsersSheet';
import ModerationSheet from '@/components/welove/ModerationSheet';
import { createPageUrl } from '@/utils';
import { 
  Ban, Flag, LogOut, Camera, ChevronRight, Edit2, Check, X, Trash2, Plus, Moon, Sun, Eye, Heart, Gamepad2,
  Bell, HelpCircle, MessageCircle, MessageSquare, ArrowRightLeft, AlertTriangle, Globe, ArrowLeft,
  User, Calendar, Ruler, FileText, Sparkles, Target, Compass, Users, Smile, Send, Loader2, MapPin
} from 'lucide-react';
import { usePullToRefresh } from '@/components/welove/usePullToRefresh';
import { InstagramSpinner } from '@/components/welove/PullToRefreshSpinner';
import ProfilePhotoCarousel, { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';
import { compressImage } from '@/utils/imageUtils';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';
import { COUNTRIES, countryName } from '@/lib/countries';
import { trNow } from '@/lib/LanguageContext';
import { dt } from '@/lib/displayText';

// Engelse versie van de veelgestelde vragen op de Account-pagina
const FAQS_EN = [
  { q: "What are matches?", a: "Matches are profiles that fit you well based on your interests, personality traits and preferences. The higher the match percentage, the bigger the chance of a great connection!" },
  { q: "How does the Pinpoint page work?", a: "Pinpoint is Romety's interactive nightlife map. Here you discover clubs, bars and real-time hotspots. You can say which location you are going to tonight or check in live when you are there. That way you instantly see which potential matches are going to the same place, so you can meet in real life!" },
  { q: "How does the chat work and what are the phases?", a: "The chat goes through 4 phases to build a genuine and active connection:\n• Phase 1 (48 hours): First introduction to see if there is a spark. At the end you can both extend.\n• Phase 2 (48 hours): Photo verification — you both send a live camera photo to unlock the extended 48h chat.\n• Phase 3 (24 hours): The final 24 hours to decide whether you want each other's details.\n• Phase 4 (Exchange contact): The chat no longer expires and you can share contact details or socials!" },
  { q: "What are received likes and how do they work?", a: "Under 'Received likes' you see who liked your profile. You can view these likes, reveal them and like back. As soon as you like someone back, you have an instant match and can get in touch right away!" },
  { q: "What do Chats, Locations and Likes mean?", a: "• Chats: Your active chats.\n• Locations: The number of users currently at a location.\n• Likes: The number of likes you have received." },
  { q: "How do Supermatches work?", a: "When you and someone else mark each other as a Supermatch or go to the same nightlife venue, you instantly unlock a Supermatch to get in touch faster and more easily!" },
  { q: "What are Hints?", a: "With hints you can send a fun, low-key message to matches in the same club or bar to break the ice." },
];

const TRAITS_LIST = [
  { label: 'Avontuurlijk', emoji: '🧗' },
  { label: 'Creatief', emoji: '🎨' },
  { label: 'Ambitieus', emoji: '🚀' },
  { label: 'Zorgzaam', emoji: '🤗' },
  { label: 'Grappig', emoji: '😂' },
  { label: 'Intellectueel', emoji: '🧠' },
  { label: 'Romantisch', emoji: '🌹' },
  { label: 'Spontaan', emoji: '⚡' },
  { label: 'Sportief', emoji: '💪' },
  { label: 'Relaxed', emoji: '😌' },
  { label: 'Gepassioneerd', emoji: '🔥' },
  { label: 'Loyaal', emoji: '🤝' },
];

const INTERESTS_LIST = [
  { label: 'Reizen', emoji: '✈️' },
  { label: 'Muziek', emoji: '🎵' },
  { label: 'Fitness', emoji: '🏋️' },
  { label: 'Kunst', emoji: '🖼️' },
  { label: 'Koken', emoji: '🍳' },
  { label: 'Fotografie', emoji: '📸' },
  { label: 'Lezen', emoji: '📚' },
  { label: 'Gaming', emoji: '🎮' },
  { label: 'Dansen', emoji: '💃' },
  { label: 'Yoga', emoji: '🧘' },
  { label: 'Films', emoji: '🎬' },
  { label: 'Natuur', emoji: '🌿' },
];

const GOALS = ['Relatie', 'Fun time', 'Ik weet het nog niet'];

const GENDER_OPTIONS = [
  { value: 'man', get label() { return trNow('Man', 'Male'); } },
  { value: 'vrouw', get label() { return trNow('Vrouw', 'Female'); } },
  { value: 'anders', get label() { return trNow('Anders', 'Other'); } },
];

const LOOKING_FOR_OPTIONS = [
  { value: 'man', get label() { return trNow('Man', 'Male'); } },
  { value: 'vrouw', get label() { return trNow('Vrouw', 'Female'); } },
  { value: 'both', get label() { return trNow('Beide', 'Both'); } },
];

const getGenderLabel = (g) => {
  if (!g) return trNow('Niet ingesteld', 'Not set');
  const val = String(g).toLowerCase().trim();
  if (val === 'man' || val === 'male') return trNow('Man', 'Male');
  if (val === 'vrouw' || val === 'female') return trNow('Vrouw', 'Female');
  if (val === 'anders' || val === 'non-binary' || val === 'nonbinary') return trNow('Anders', 'Other');
  return g;
};

const getLookingForLabel = (lf) => {
  if (!lf) return trNow('Niet ingesteld', 'Not set');
  const val = String(lf).toLowerCase().trim();
  if (val === 'man' || val === 'male') return trNow('Man', 'Male');
  if (val === 'vrouw' || val === 'female') return trNow('Vrouw', 'Female');
  if (val === 'both' || val === 'beide' || val === 'iedereen' || val === 'all' || val === 'anders') return trNow('Beide', 'Both');
  return lf;
};

const formatStatCount = (val) => {
  const num = Math.round(Number(val)) || 0;
  if (num >= 1000000) {
    const formatted = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}M`;
  }
  if (num >= 1000) {
    const formatted = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${formatted}k`;
  }
  return String(num);
};

const getStatFontSize = (formattedStr) => {
  const len = String(formattedStr).length;
  if (len >= 5) return 'text-sm sm:text-base';
  if (len >= 4) return 'text-base sm:text-lg';
  return 'text-lg';
};

export default function Account() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';
  const user = useUser();

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const headerBg = isDark 
    ? 'linear-gradient(180deg, #4D122D 0%, #2E0B1B 65%, rgba(13,14,21,0) 100%)' 
    : 'linear-gradient(180deg, rgba(255,75,114,0.25) 0%, rgba(234,63,211,0.1) 70%, transparent 100%)';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const cardBorder = isDark ? '1.5px solid rgba(255, 75, 114, 0.25)' : '1px solid rgba(0,0,0,0.06)';
  const cardShadow = isDark ? '0 0 16px rgba(255, 75, 114, 0.15)' : '0 4px 20px rgba(0,0,0,0.06)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';
  const divider = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)';

  const [myProfile, setMyProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeSheet, setActiveSheet] = useState(null);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const routerLocation = useLocation();

  // Beheerders zien "Meldingen behandelen"; een seintje over een melding opent dit scherm direct
  useEffect(() => {
    let active = true;
    isAppAdmin().then((ok) => {
      if (!active) return;
      setIsAdmin(ok);
      if (ok && new URLSearchParams(routerLocation.search).get('moderation') === '1') {
        setShowModeration(true);
        navigate(createPageUrl('Account'), { replace: true });
      }
    });
    return () => { active = false; };
  }, [routerLocation.search]);
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({});
  const [initialForm, setInitialForm] = useState({});
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Country change warning
  const [showCountryWarning, setShowCountryWarning] = useState(false);
  const [pendingCountry, setPendingCountry] = useState(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Backup snapshots for sub-sheets validation (restored if < 3 upon exit)
  const sheetBackupTraitsRef = useRef([]);
  const sheetBackupInterestsRef = useRef([]);
  const [minItemsWarningModal, setMinItemsWarningModal] = useState(null); // 'traits' | 'interests' | null
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // Real Stats matching exact logic
  const [stats, setStats] = useState({ chats: 0, locations: 0, matches: 0 });

  // Toggles & Modals
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSurvey, setShowDeleteSurvey] = useState(false);
  const [deleteAnswers, setDeleteAnswers] = useState({ foundMatch: '', reason: '' });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  
  const [openFaq, setOpenFaq] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const initialLoadedRef = useRef(false);

  // Lock body and background scrolling when editing screen is open
  useEffect(() => {
    if (editing) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [editing]);

  // Change detection for Save button & Discard warning
  const hasChanges = React.useMemo(() => {
    if (!initialForm || Object.keys(initialForm).length === 0) return false;
    
    if ((form.display_name || '') !== (initialForm.display_name || '')) return true;
    if ((form.gender || '') !== (initialForm.gender || '')) return true;
    if (String(form.age ?? '') !== String(initialForm.age ?? '')) return true;
    if (String(form.height_cm ?? '') !== String(initialForm.height_cm ?? '')) return true;
    if ((form.relationship_status || 'Relatie') !== (initialForm.relationship_status || 'Relatie')) return true;
    if ((form.looking_for || '') !== (initialForm.looking_for || '')) return true;
    if ((form.bio || '') !== (initialForm.bio || '')) return true;
    if (Number(form.min_age_pref || 18) !== Number(initialForm.min_age_pref || 18)) return true;
    if (Number(form.max_age_pref || 90) !== Number(initialForm.max_age_pref || 90)) return true;
    if (Number(form.min_height_pref || 140) !== Number(initialForm.min_height_pref || 140)) return true;
    if (Number(form.max_height_pref || 260) !== Number(initialForm.max_height_pref || 260)) return true;
    
    const initialTraits = initialForm.traits || [];
    const currentTraits = form.traits || [];
    if (initialTraits.length !== currentTraits.length) return true;
    for (let i = 0; i < initialTraits.length; i++) {
      if (initialTraits[i] !== currentTraits[i]) return true;
    }

    const initialInterests = initialForm.interests || [];
    const currentInterests = form.interests || [];
    if (initialInterests.length !== currentInterests.length) return true;
    for (let i = 0; i < initialInterests.length; i++) {
      if (initialInterests[i] !== currentInterests[i]) return true;
    }

    return false;
  }, [form, initialForm]);

  const [pendingNavUrl, setPendingNavUrl] = useState(null);

  const isAccountBusy = Boolean(editing || activeSheet || showPreview || showDeleteConfirm || showDeleteSurvey || deleting);

  const { pullDistance, isRefreshing, isPulling, containerProps } = usePullToRefresh({
    onRefresh: () => loadData(),
    disabled: isAccountBusy,
  });

  // Intercept bottom nav bar clicks while editing with unsaved changes
  useEffect(() => {
    if (editing && hasChanges) {
      window.__romety_nav_blocker = (targetUrl) => {
        setPendingNavUrl(targetUrl);
        setShowDiscardConfirm(true);
        return true; // block navigation
      };
    } else {
      window.__romety_nav_blocker = null;
    }
    return () => {
      window.__romety_nav_blocker = null;
    };
  }, [editing, hasChanges]);

  const handleBackClick = () => {
    if (hasChanges) {
      setPendingNavUrl(null);
      setShowDiscardConfirm(true);
    } else {
      setEditing(false);
      setActiveSheet(null);
    }
  };

  const handleConfirmDiscard = () => {
    setForm({ ...initialForm });
    setShowDiscardConfirm(false);
    setActiveSheet(null);
    setEditing(false);
    if (pendingNavUrl) {
      const url = pendingNavUrl;
      setPendingNavUrl(null);
      navigate(url);
    }
  };

  const handleCancelDiscard = () => {
    setShowDiscardConfirm(false);
    setPendingNavUrl(null);
  };

  const userEmail = user?.email || (user ? 'logged_in' : null);
  useEffect(() => { 
    if (user !== undefined) loadData(initialLoadedRef.current); 
  }, [userEmail, user === undefined]);

  const loadData = async (silent = false) => {
    if (!initialLoadedRef.current && !silent) setLoading(true);
    const u = user;
    if (!u) {
      setLoading(false);
      initialLoadedRef.current = true;
      return;
    }

    try {
      const [
        profiles = [],
        roomsA = [],
        roomsB = [],
        likesISent = [],
        likesIReceived = [],
        allProfiles = [],
        allCheckIns = [],
        allDestinations = []
      ] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.ChatRoom.filter({ user_a_email: u.email }).catch(() => []),
        base44.entities.ChatRoom.filter({ user_b_email: u.email }).catch(() => []),
        base44.entities.Like.filter({ from_email: u.email }),
        base44.entities.Like.filter({ to_email: u.email }),
        base44.entities.UserProfile.list('-created_date', 500).catch(() => []),
        base44.entities.VenueCheckIn.list().catch(() => []),
        base44.entities.UserDestination.list().catch(() => []),
      ]);

      const p = profiles[0] || null;
      setMyProfile(p);
      const initialVals = {
        display_name: p?.display_name || u.full_name || '',
        age: p?.age || '',
        height_cm: p?.height_cm || '',
        gender: p?.gender || '',
        looking_for: p?.looking_for || '',
        relationship_status: p?.relationship_status || p?.relationship_goal || 'Relatie',
        bio: p?.bio || '',
        traits: Array.isArray(p?.traits) ? p.traits : [],
        interests: Array.isArray(p?.interests) ? p.interests : [],
        photos: Array.isArray(p?.photos) ? p.photos.filter(Boolean) : (p?.photo_url ? [p.photo_url] : []),
        country: p?.country || 'Nederland',
        min_age_pref: (p?.min_age_pref !== undefined && p?.min_age_pref !== null && Number(p?.min_age_pref) >= 18) ? Number(p.min_age_pref) : 18,
        max_age_pref: (p?.max_age_pref !== undefined && p?.max_age_pref !== null && Number(p?.max_age_pref) <= 90 && Number(p?.max_age_pref) >= 18) ? Number(p.max_age_pref) : 90,
        min_height_pref: (p?.min_height_pref !== undefined && p?.min_height_pref !== null && Number(p?.min_height_pref) >= 140) ? Number(p.min_height_pref) : 140,
        max_height_pref: (p?.max_height_pref !== undefined && p?.max_height_pref !== null && Number(p?.max_height_pref) <= 260 && Number(p?.max_height_pref) >= 140) ? Number(p.max_height_pref) : 260,
      };
      setForm(initialVals);
      setInitialForm(initialVals);

      // Calculate exact active chats count matching Chat.jsx
      const allRooms = [...(roomsA || []), ...(roomsB || [])];
      const seenRooms = new Set();
      const uniqRooms = allRooms.filter(r => { if (seenRooms.has(r.id)) return false; seenRooms.add(r.id); return true; });
      const now = new Date();
      const activeChatsCount = uniqRooms.filter(r => {
        const isNotDeleted = !r.deleted_at || new Date(r.deleted_at) > now;
        return isNotDeleted && (r.status === 'active' || r.status === 'pending');
      }).length;

      // Calculate exact likes received count
      const receivedLikesCount = (likesIReceived || []).length;

      // Calculate exact total users with active locations matching Pinpoint / Home
      const nowIso = now.toISOString();
      const userCountry = p?.country || 'Nederland';
      const sameCountryEmails = new Set(
        (allProfiles || [])
          .filter(prof => (prof.country || 'Nederland') === userCountry)
          .map(prof => prof.user_email)
      );

      const activeCheckInEmails = (allCheckIns || [])
        .filter(c => c && (!c.expires_at || c.expires_at > nowIso) && (sameCountryEmails.size === 0 || sameCountryEmails.has(c.user_email)))
        .map(c => c.user_email);
      const activeDestEmails = (allDestinations || [])
        .filter(d => d && d.status === 'active' && (!d.expires_at || d.expires_at > nowIso) && (sameCountryEmails.size === 0 || sameCountryEmails.has(d.user_email)))
        .map(d => d.user_email);
      const uniqueActiveLocationUsers = new Set([...activeCheckInEmails, ...activeDestEmails]);

      setStats({
        chats: activeChatsCount,
        locations: uniqueActiveLocationUsers.size,
        matches: receivedLikesCount
      });
    } catch (e) {
      console.error('Failed to load profile data:', e);
    } finally {
      setLoading(false);
      initialLoadedRef.current = true;
    }
  };

  const handlePhotoUpload = async (file, slotIndex) => {
    if (!file || !myProfile) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file, 800, 800, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      
      const currentPhotos = getProfilePhotos(myProfile);
      let updatedPhotos = [...currentPhotos];
      let replacedPhotoUrl = null;

      if (slotIndex !== undefined && slotIndex < updatedPhotos.length) {
        // Replace existing slot
        replacedPhotoUrl = updatedPhotos[slotIndex];
        updatedPhotos[slotIndex] = file_url;
      } else {
        // Append new photo (max 3)
        if (updatedPhotos.length < 3) {
          updatedPhotos.push(file_url);
        } else {
          replacedPhotoUrl = updatedPhotos[2];
          updatedPhotos[2] = file_url;
        }
      }

      // Verwijder het oude vervangen bestand uit Supabase Storage om onnodige opslag te voorkomen
      if (replacedPhotoUrl && replacedPhotoUrl !== file_url) {
        await base44.integrations.Core.DeleteFile({ file_url: replacedPhotoUrl });
      }

      updatedPhotos = updatedPhotos.slice(0, 3);
      const primaryPhoto = updatedPhotos[0] || null;

      try {
        await base44.entities.UserProfile.update(myProfile.id, {
          photos: updatedPhotos,
          photo_url: primaryPhoto
        });
      } catch (dbErr) {
        console.warn('Photos column not in DB yet, updating photo_url fallback:', dbErr);
        await base44.entities.UserProfile.update(myProfile.id, {
          photo_url: primaryPhoto
        });
      }

      setMyProfile(p => ({ ...p, photos: updatedPhotos, photo_url: primaryPhoto }));
      setForm(f => ({ ...f, photos: updatedPhotos }));
      toast.success(trNow('Foto succesvol toegevoegd! 📸', 'Photo added successfully! 📸'));
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(trNow('Kan foto niet uploaden. Probeer het opnieuw.', 'Could not upload photo. Please try again.'));
    }
    setUploading(false);
  };

  const handlePhotoDelete = async (indexToDelete) => {
    if (!myProfile) return;
    try {
      const currentPhotos = getProfilePhotos(myProfile);
      
      // Profiel moet altijd minimaal 1 hoofdfoto behouden
      if (currentPhotos.length <= 1) {
        toast.error(trNow('Je profiel moet altijd een hoofdfoto hebben. Upload eerst een andere foto om deze te kunnen veranderen!', 'Your profile always needs a main photo. Upload another photo first before changing this one!'));
        return;
      }

      const photoToDelete = currentPhotos[indexToDelete];

      // 1. Verwijder EERST het daadwerkelijke bestand uit de Supabase Storage bucket
      if (photoToDelete) {
        await base44.integrations.Core.DeleteFile({ file_url: photoToDelete });
      }

      // 2. Verwijder DAARNA het bijbehorende record/verwijzing uit de database
      const updatedPhotos = currentPhotos.filter((_, idx) => idx !== indexToDelete);
      const primaryPhoto = updatedPhotos[0] || null;

      try {
        await base44.entities.UserProfile.update(myProfile.id, {
          photos: updatedPhotos,
          photo_url: primaryPhoto
        });
      } catch (dbErr) {
        console.warn('Photos column not in DB yet, updating photo_url fallback:', dbErr);
        await base44.entities.UserProfile.update(myProfile.id, {
          photo_url: primaryPhoto
        });
      }

      setMyProfile(p => ({ ...p, photos: updatedPhotos, photo_url: primaryPhoto }));
      setForm(f => ({ ...f, photos: updatedPhotos }));
      
      if (indexToDelete === 0) {
        toast.success(trNow('Hoofdfoto verwijderd. Foto 2 is nu automatisch je hoofdfoto!', 'Main photo removed. Photo 2 is now automatically your main photo!'));
      } else {
        toast.success(trNow('Foto verwijderd', 'Photo removed'));
      }
    } catch (err) {
      console.error('Delete photo error:', err);
      toast.error(trNow('Kan foto niet verwijderen', 'Could not remove photo'));
    }
  };

  // Initiates checkmark click -> validates min 3 traits & interests before confirmation
  const handleInitiateSave = () => {
    if ((form.traits || []).length < 3) {
      toast.error(trNow('Kies minimaal 3 eigenschappen (3 tot 5)!', 'Choose at least 3 traits (3 to 5)!'));
      return;
    }
    if ((form.interests || []).length < 3) {
      toast.error(trNow('Kies minimaal 3 interesses (3 tot 5)!', 'Choose at least 3 interests (3 to 5)!'));
      return;
    }
    if (form.age !== undefined && form.age !== null && form.age !== '') {
      if (Number(form.age) < 18) {
        toast.error(trNow('Je moet minimaal 18 jaar oud zijn!', 'You must be at least 18 years old!'));
        return;
      }
      if (Number(form.age) > 90) {
        toast.error(trNow('Maximale leeftijd is 90 jaar!', 'Maximum age is 90!'));
        return;
      }
    }
    if (form.height_cm !== undefined && form.height_cm !== null && form.height_cm !== '') {
      if (Number(form.height_cm) > 260) {
        toast.error(trNow('Maximale lengte is 260 cm!', 'Maximum height is 260 cm!'));
        return;
      }
    }
    setShowSaveConfirm(true);
  };

  // Executes actual save into database
  const executeSave = async () => {
    setShowSaveConfirm(false);
    setSaving(true);
    try {
      const u = user;
      if (!u) {
        toast.error(trNow('Geen ingelogde gebruiker gevonden.', 'No logged-in user found.'));
        setSaving(false);
        return;
      }

      const existing = await base44.entities.UserProfile.filter({ user_email: u.email });
      const targetProfile = existing[0] || myProfile;

      const photosList = form.photos || myProfile?.photos || [];
      const updatedData = {
        display_name: form.display_name || u.full_name || '',
        age: form.age ? parseInt(form.age, 10) : null,
        height_cm: form.height_cm ? parseInt(form.height_cm, 10) : null,
        gender: form.gender || null,
        looking_for: form.looking_for || null,
        relationship_status: form.relationship_status || 'Relatie',
        bio: form.bio || '',
        traits: form.traits || [],
        interests: form.interests || [],
        photos: photosList,
        photo_url: photosList[0] || myProfile?.photo_url || null,
        country: form.country || 'Nederland',
        min_age_pref: Number(form.min_age_pref) || 18,
        max_age_pref: Number(form.max_age_pref) || 90,
        min_height_pref: Number(form.min_height_pref) || 140,
        max_height_pref: Number(form.max_height_pref) || 260,
        user_email: u.email
      };

      if (targetProfile && targetProfile.id) {
        try {
          await base44.entities.UserProfile.update(targetProfile.id, updatedData);
        } catch (dbErr) {
          console.warn('Photos column not in DB yet, saving without photos array:', dbErr);
          const { photos, ...fallbackData } = updatedData;
          await base44.entities.UserProfile.update(targetProfile.id, fallbackData);
        }
        setMyProfile(p => ({ ...p, ...updatedData }));
      } else {
        try {
          const created = await base44.entities.UserProfile.create({ ...updatedData, onboarding_complete: true });
          setMyProfile(created);
        } catch (dbErr) {
          console.warn('Photos column not in DB yet, creating without photos array:', dbErr);
          const { photos, ...fallbackData } = updatedData;
          const created = await base44.entities.UserProfile.create({ ...fallbackData, onboarding_complete: true });
          setMyProfile(created);
        }
      }

      setInitialForm({ ...updatedData, photos: photosList });
      setEditing(false);
      toast.success(trNow('Account gewijzigd en opgeslagen! ✨', 'Account updated and saved! ✨'));
    } catch (e) {
      console.error('Save error details:', e);
      toast.error(trNow('Fout bij opslaan: ', 'Error while saving: ') + (e?.message || trNow('Probeer het opnieuw', 'Please try again')));
    }
    setSaving(false);
  };

  // Trait toggle selection (min 3, max 5)
  const handleToggleTrait = (traitLabel) => {
    const current = form.traits || [];
    if (current.includes(traitLabel)) {
      setForm(f => ({
        ...f,
        traits: (f.traits || []).filter(t => t !== traitLabel)
      }));
    } else {
      if (current.length >= 5) {
        toast.error(trNow('Je kunt maximaal 5 eigenschappen kiezen! Deselecteer er eerst een.', 'You can choose up to 5 traits! Deselect one first.'));
        return;
      }
      setForm(f => ({
        ...f,
        traits: [...(f.traits || []), traitLabel]
      }));
    }
  };

  // Interest toggle selection (min 3, max 5)
  const handleToggleInterest = (interestLabel) => {
    const current = form.interests || [];
    if (current.includes(interestLabel)) {
      setForm(f => ({
        ...f,
        interests: (f.interests || []).filter(i => i !== interestLabel)
      }));
    } else {
      if (current.length >= 5) {
        toast.error(trNow('Je kunt maximaal 5 interesses kiezen! Deselecteer er eerst een.', 'You can choose up to 5 interests! Deselect one first.'));
        return;
      }
      setForm(f => ({
        ...f,
        interests: [...(f.interests || []), interestLabel]
      }));
    }
  };

  // Helper to open sub-sheet and capture backup snapshot for rollback
  const openSubSheet = (sheetName) => {
    if (sheetName === 'traits') {
      sheetBackupTraitsRef.current = [...(form.traits || [])];
    } else if (sheetName === 'interests') {
      sheetBackupInterestsRef.current = [...(form.interests || [])];
    }
    setActiveSheet(sheetName);
  };

  // Helper to close sub-sheet with validation; prompt popup modal if < 3
  const handleCloseSubSheet = () => {
    if (activeSheet === 'traits') {
      const current = form.traits || [];
      if (current.length < 3) {
        setMinItemsWarningModal('traits');
        return;
      }
    } else if (activeSheet === 'interests') {
      const current = form.interests || [];
      if (current.length < 3) {
        setMinItemsWarningModal('interests');
        return;
      }
    } else if (activeSheet === 'age_height') {
      if (form.age && Number(form.age) < 18) {
        setForm(f => ({ ...f, age: 18 }));
        toast.info(trNow('Leeftijd is ingesteld op 18 jaar.', 'Age has been set to 18.'));
      } else if (form.age && Number(form.age) > 90) {
        setForm(f => ({ ...f, age: 90 }));
        toast.info(trNow('Leeftijd is gemaximaliseerd op 90 jaar.', 'Age has been capped at 90.'));
      }
      if (form.height_cm && Number(form.height_cm) > 260) {
        setForm(f => ({ ...f, height_cm: 260 }));
        toast.info(trNow('Lengte is gemaximaliseerd op 260 cm.', 'Height has been capped at 260 cm.'));
      }
    }
    setActiveSheet(null);
  };

  const handleConfirmMinItemsLeave = () => {
    if (minItemsWarningModal === 'traits') {
      setForm(f => ({ ...f, traits: sheetBackupTraitsRef.current || initialForm.traits || [] }));
      toast.error(trNow('Minimaal 3 eigenschappen vereist. Oude selectie is behouden.', 'At least 3 traits required. Previous selection kept.'));
    } else if (minItemsWarningModal === 'interests') {
      setForm(f => ({ ...f, interests: sheetBackupInterestsRef.current || initialForm.interests || [] }));
      toast.error(trNow('Minimaal 3 interesses vereist. Oude selectie is behouden.', 'At least 3 interests required. Previous selection kept.'));
    }
    setMinItemsWarningModal(null);
    setActiveSheet(null);
  };

  const handleCancelMinItemsLeave = () => {
    setMinItemsWarningModal(null);
  };

  const handlePerformLogout = async () => {
    try {
      authStorage.clearUser();
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
      authStorage.clearUser();
      window.location.replace('/Login');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const toastId = toast.loading(trNow('Account en gegevens worden verwijderd...', 'Deleting account and data...'));

    try {
      const email = (
        user?.email || 
        user?.user_email || 
        myProfile?.user_email || 
        myProfile?.contact_email || 
        authStorage.getUserSync()?.email || 
        localStorage.getItem('romety_user_email') || 
        localStorage.getItem('romety_last_email') || 
        ''
      ).toLowerCase().trim();

      if (!email) throw new Error('Geen e-mailadres gevonden voor dit account');

      // 0. Vertrekreden opslaan (de database haalt het e-mailadres eraf bij het verwijderen)
      if (deleteAnswers?.selectedOption) {
        const { error: surveyError } = await supabase.from('AccountDeletionSurvey').insert([
          {
            reason: deleteAnswers.selectedOption,
            custom_feedback: deleteAnswers.customText?.trim() || null,
            user_email: email,
            created_at: new Date().toISOString()
          }
        ]);
        if (surveyError) console.warn('[handleDeleteAccount] Vertrekreden niet opgeslagen:', surveyError);
      }

      // 1. Eigen bestanden uit de opslag verwijderen (dit kan alleen zolang je nog ingelogd bent)
      const isMine = (value) => (value || '').toLowerCase() === email;
      const [{ data: stories }, { data: chatMessages }] = await Promise.all([
        supabase.from('Story').select('media_url, user_email').ilike('user_email', email),
        supabase.from('ChatMessage').select('media_url, sender_email').ilike('sender_email', email),
      ]);
      const fileUrls = new Set([
        myProfile?.photo_url,
        ...(Array.isArray(myProfile?.photos) ? myProfile.photos.map((p) => (typeof p === 'string' ? p : p?.url)) : []),
        ...(stories || []).filter((x) => isMine(x.user_email)).map((x) => x.media_url),
        ...(chatMessages || []).filter((x) => isMine(x.sender_email)).map((x) => x.media_url),
      ].filter(Boolean));
      await Promise.allSettled([...fileUrls].map((file_url) => base44.integrations.Core.DeleteFile({ file_url })));

      // 2. Login en alle gegevens verwijderen. Lukt dit niet, dan melden we dat eerlijk (zie catch).
      const { error: deleteError } = await supabase.rpc('delete_user_account');
      if (deleteError) throw deleteError;

      // 5. Clear all local auth storage and chat caches (localStorage, sessionStorage, IndexedDB, cookies)
      authStorage.clearUser();
      try {
        localStorage.removeItem('welove_lang');
        localStorage.removeItem('welove_user');
        localStorage.removeItem('welove_user_async');
        localStorage.removeItem('romety_user_email');
        localStorage.removeItem('romety_last_email');
        localStorage.removeItem('romety_registered_username');
        localStorage.removeItem('romety_pending_verification');
        localStorage.removeItem('seen_chat_room_ids');

        // Schoon alle gerelateerde keys op
        Object.keys(localStorage).forEach(key => {
          if (
            key.startsWith('chat_') || 
            key.startsWith('deleted_chat_') || 
            key.startsWith('romety_') ||
            key.startsWith('sb-')
          ) {
            localStorage.removeItem(key);
          }
        });

        sessionStorage.clear();
        sessionStorage.setItem('romety_splash_shown', 'true');
      } catch (err) {}

      // 6. Sign out globally from Supabase Auth
      try {
        // De login bestaat niet meer, dus alleen de sessie op dit apparaat opruimen
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        console.warn('[handleDeleteAccount] signOut error:', e);
      }

      toast.dismiss(toastId);
      toast.success(trNow('Je account is succesvol verwijderd.', 'Your account has been deleted.'));

      // 7. Redirect directly to Login page
      setTimeout(() => {
        window.location.replace('/Login');
      }, 400);

    } catch (e) {
      console.error('Error deleting user account:', e);
      toast.dismiss(toastId);
      toast.error(trNow(
        'Je account kon niet worden verwijderd. Je bent nog ingelogd; probeer het opnieuw.',
        'Your account could not be deleted. You are still logged in; please try again.'
      ));
    } finally {
      setDeleting(false);
    }
  };

  const handleSurveySubmit = async () => {
    try {
      authStorage.clearUser();
      sessionStorage.removeItem('romety_splash_shown');
      sessionStorage.clear();
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
      authStorage.clearUser();
      window.location.replace('/Onboarding');
    }
  };

  const handleSendFeedback = async (e) => {
    e?.preventDefault();
    if (!feedbackText.trim()) {
      toast.error(trNow('Typ eerst je feedback', 'Type your feedback first'));
      return;
    }
    setSendingFeedback(true);
    try {
      const email = (user?.email || user?.user_email || '').toLowerCase().trim();
      const today = new Date().toISOString().slice(0, 10);
      const storageKey = `romety_fb_count_${email || 'anon'}`;
      
      let currentFeedbackData = { date: today, count: 0 };
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.date === today && typeof parsed.count === 'number') {
            currentFeedbackData = parsed;
          }
        }
      } catch (err) {}

      // Only insert into Supabase if user sent less than 2 feedback requests today
      if (currentFeedbackData.count < 2) {
        const { error } = await supabase.from('Feedback').insert([
          {
            message: feedbackText.trim(),
            user_email: email || null,
            created_at: new Date().toISOString()
          }
        ]);
        if (error) {
          console.warn('Feedback insert error:', error);
        }
        // Update local daily counter
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            date: today,
            count: currentFeedbackData.count + 1
          }));
        } catch (err) {}
      } else {
        // Silent throttle: user reaches 2/day -> skip database insert to prevent spam
        console.log('[Feedback] Daily limit of 2 reached; silently skipping database write.');
      }

      toast.success(trNow('Bedankt voor je feedback! 🙌', 'Thanks for your feedback! 🙌'));
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      console.error('Feedback error:', err);
      toast.success(trNow('Bedankt voor je feedback! 🙌', 'Thanks for your feedback! 🙌'));
      setFeedbackText('');
      setShowFeedbackModal(false);
    } finally {
      setSendingFeedback(false);
    }
  };

  const FAQS = trNow('nl', 'en') === 'en' ? FAQS_EN : [
    {
      q: "Wat zijn matches?",
      a: "Matches zijn profielen die op basis van jouw interesses, persoonlijkheidseigenschappen en voorkeuren goed bij jou passen. Hoe hoger het matchpercentage, hoe groter de kans op een geweldige klik!"
    },
    {
      q: "Hoe werkt de Pinpoint pagina?",
      a: "Pinpoint is de interactieve uitgaanskaart van Romety. Hier ontdek je clubs, bars en realtime hotspots. Je kunt aangeven naar welke locatie je vanavond gaat of live inchecken wanneer je er bent. Zo zie je direct welke potentiële matches naar dezelfde plek gaan, zodat je elkaar ter plekke in het echt kunt ontmoeten!"
    },
    {
      q: "Hoe werkt de chat en wat zijn de fases?",
      a: "De chat verloopt in 4 fases om een oprechte en actieve connectie op te bouwen:\n• Fase 1 (48 uur): Eerste kennismaking om te zien of er een klik is. Aan het eind kunnen jullie beiden verlengen.\n• Fase 2 (48 uur): Foto-verificatie — stuur beiden een live camera-foto om de uitgebreide 48u chat te ontgrendelen.\n• Fase 3 (24 uur): De laatste 24 uur om te beslissen of jullie elkaars gegevens willen.\n• Fase 4 (Contact uitwisselen): Chat verloopt niet meer en jullie kunnen elkaars contactgegevens of socials delen!"
    },
    {
      q: "Wat zijn ontvangen likes en hoe werkt het?",
      a: "Onder 'Ontvangen likes' zie je wie jouw profiel heeft geliket. Je kunt deze likes bekijken, onthullen en terugliken. Zodra je iemand terugliket, hebben jullie meteen een match en kun je direct in contact komen!"
    },
    {
      q: "Wat betekenen Chats, Locaties en Likes?",
      a: "• Chats: Jouw actieve chats.\n• Locaties: Het aantal gebruikers dat momenteel op locatie is.\n• Likes: Het aantal likes dat jij hebt ontvangen."
    },
    {
      q: "Hoe werken de Supermatches?",
      a: "Wanneer jij en iemand anders elkaar als Supermatch markeren of naar dezelfde uitgaanslocatie gaan, ontgrendelen jullie direct een Supermatch om sneller en makkelijker contact te leggen!"
    },
    {
      q: "Wat zijn Hints?",
      a: "Met hints kun je op een laagdrempelige en speelse manier een leuk berichtje sturen naar matches in dezelfde club of bar om het ijs te breken."
    }
  ];

  // Helper to get emoji for a label
  const getEmojiForTrait = (lbl) => {
    const found = TRAITS_LIST.find(t => t.label === lbl);
    return found ? found.emoji : '✨';
  };

  const getEmojiForInterest = (lbl) => {
    const found = INTERESTS_LIST.find(i => i.label === lbl);
    return found ? found.emoji : '🌟';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}>
        <div className="w-10 h-10 rounded-full border-4 border-rose-200 border-t-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div 
      className={`min-h-screen max-w-md mx-auto relative ${editing ? 'overflow-hidden max-h-screen' : ''}`} 
      style={{ 
        background: bg, 
        fontFamily: "'Inter', sans-serif", 
        paddingBottom: 'calc(84px + env(safe-area-inset-bottom, 16px))' 
      }}
      {...containerProps}
    >
      {/* Top Over-Scroll Extension to eliminate black gap when pulling down */}
      <div 
        className="absolute -top-[500px] left-0 right-0 h-[500px] pointer-events-none" 
        style={{ background: isDark ? '#4D122D' : '#FFF0F4' }}
      />
      
      {/* Fixed Sticky Top Header Pinned to Top */}
      <div 
        className="sticky top-0 left-0 right-0 z-40 px-5 pb-4 select-none min-h-[104px] flex flex-col justify-end" 
        style={{ 
          background: isDark 
            ? 'linear-gradient(180deg, #4D122D 0%, #350D1F 75%, #200813 100%)' 
            : 'linear-gradient(180deg, #FFF0F4 0%, #FEE2EA 75%, #FAF9FB 100%)', 
          paddingTop: 'max(48px, calc(env(safe-area-inset-top, 0px) + 12px))',
          borderBottom: isDark ? '1px solid rgba(255, 75, 114, 0.15)' : '1px solid rgba(0,0,0,0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="relative flex items-center justify-between w-full">
          <div className="w-8 z-10" />

          {/* Centered Title */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <h1 className={`text-2xl font-black tracking-tight leading-tight pointer-events-auto ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {trNow('Mijn Account', 'My Account')}
            </h1>
          </div>

          {/* Edit action on the right */}
          <div className="flex items-center gap-2 z-10">
            <button 
              onClick={() => {
                setEditing(true);
                setInitialForm({ ...form });
                setActiveSheet(null);
              }} 
              className={`p-2 rounded-2xl backdrop-blur-md border transition-all active:scale-95 ${
                isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-white/90 border-gray-200 text-gray-800'
              }`}
              aria-label={trNow('Profiel bewerken', 'Edit profile')}
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Pull-to-Refresh Spinner Gap Area below pinned header */}
      <div 
        className="w-full flex items-center justify-center pointer-events-none overflow-hidden"
        style={{
          height: isRefreshing ? 48 : pullDistance,
          opacity: isRefreshing ? 1 : Math.min(1, Math.max(0, (pullDistance - 6) / 20)),
          transition: isPulling ? 'none' : 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
          willChange: 'height, opacity',
        }}
      >
        <div
          style={{
            transform: `scale(${isRefreshing ? 1 : Math.min(1, 0.45 + (pullDistance / 48) * 0.55)})`,
            transition: isPulling ? 'none' : 'transform 0.25s ease-out',
          }}
        >
          <InstagramSpinner 
            size={30} 
            isRefreshing={isRefreshing} 
            pullDistance={pullDistance} 
            color="#FF4B72" 
          />
        </div>
      </div>

      {/* Main Container */}
      <div className="px-[3px] pt-3 relative z-10 max-w-md mx-auto space-y-4">

        {/* ── Profile Card ── */}
        <div className="rounded-[28px] p-5" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          
          <div className="flex items-center gap-4">
            {/* Avatar Photo */}
            <label className="relative flex-shrink-0 cursor-pointer group">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], 0);
                }} 
                disabled={uploading} 
              />
              <div className="w-20 h-20 rounded-2xl overflow-hidden p-[2.5px] bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-400 shadow-md transition-transform group-active:scale-95">
                <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                  ) : (myProfile?.photos?.[0] || myProfile?.photo_url) ? (
                    <img src={myProfile?.photos?.[0] || myProfile?.photo_url} alt="profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">{myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}</span>
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-lg bg-gradient-to-r from-pink-500 to-rose-600 text-white group-active:scale-90 transition-all">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </label>

            {/* Display Name & Quick Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className={`font-black text-lg truncate ${textMain}`}>
                  {myProfile?.display_name || user?.full_name}
                  {myProfile?.age ? `, ${myProfile.age}` : ''}
                </h2>
                <button
                  onClick={() => setShowPreview(true)}
                  className={`px-3 py-1.5 rounded-2xl font-black text-xs flex items-center gap-1.5 backdrop-blur-md border shadow-sm transition-all active:scale-95 flex-shrink-0 ${
                    isDark 
                      ? 'bg-white/10 border-white/15 text-pink-300 hover:bg-white/20' 
                      : 'bg-white/90 border-pink-200 text-pink-600 hover:bg-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Voorvertoning
                </button>
              </div>
              <p className="text-xs font-medium truncate mt-0.5" style={{ color: textSub }}>
                {myProfile?.contact_email || user?.email}
              </p>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {myProfile?.avatar && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-pink-500/15 text-pink-500 border border-pink-500/20 flex items-center gap-1">
                    <span>{myProfile.avatar.split(' ')[0]}</span>
                    <span>{myProfile.avatar.split(' ').slice(1).join(' ')}</span>
                  </span>
                )}
                {myProfile?.gender && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                    {getGenderLabel(myProfile.gender)}
                  </span>
                )}
                {myProfile?.height_cm && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                    📏 {myProfile.height_cm} cm
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Multi-Photo Upload Section (Max 3 Foto's) ── */}
          <div className="mt-5 pt-4" style={{ borderTop: divider }}>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-pink-500" />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: textMain }}>
                  Mijn Foto's <span className="text-pink-500">({getProfilePhotos(myProfile).length}/3)</span>
                </span>
              </div>
              <span className="text-[10px] font-semibold text-white/50">
                Max. 3 foto's
              </span>
            </div>

            {/* 3 Photo Slots Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((slotIdx) => {
                const photos = getProfilePhotos(myProfile);
                const photoUrl = photos[slotIdx];
                const isFirst = slotIdx === 0;

                return (
                  <div 
                    key={slotIdx} 
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden border transition-all"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                      borderColor: photoUrl 
                        ? (isDark ? 'rgba(255,75,114,0.4)' : 'rgba(255,75,114,0.3)')
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                      borderStyle: photoUrl ? 'solid' : 'dashed'
                    }}
                  >
                    {photoUrl ? (
                      <>
                        <img src={photoUrl} alt={`${trNow('Foto', 'Photo')} ${slotIdx + 1}`} className="w-full h-full object-cover select-none" />
                        
                        {/* Slot Badge */}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white shadow">
                          {isFirst ? trNow('Hoofd', 'Main') : `#${slotIdx + 1}`}
                        </div>

                        {/* Replace button */}
                        <label className="absolute bottom-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center cursor-pointer text-white shadow active:scale-90 transition-transform">
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], slotIdx);
                            }} 
                            disabled={uploading} 
                          />
                          <Camera className="w-3 h-3" />
                        </label>

                        {/* Delete button */}
                        <button
                          onClick={() => handlePhotoDelete(slotIdx)}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600/80 backdrop-blur-sm flex items-center justify-center text-white shadow active:scale-90 transition-transform"
                          title={trNow('Foto verwijderen', 'Remove photo')}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <label className="w-full h-full flex flex-col items-center justify-center gap-1.5 cursor-pointer p-2 text-center group active:scale-95 transition-transform">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], slotIdx);
                          }} 
                          disabled={uploading} 
                        />
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-pink-500/15 text-pink-500 group-hover:bg-pink-500/25 transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-white/60">
                          {isFirst ? trNow('Hoofdfoto', 'Main photo') : `${trNow('Foto', 'Photo')} ${slotIdx + 1}`}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Card Quick Info Tags */}
          <div className="mt-4 pt-3 space-y-3" style={{ borderTop: divider }}>
            <div className="flex flex-wrap items-center gap-2">
              {(myProfile?.relationship_status || myProfile?.relationship_goal) && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                  🎯 {trNow('Zoekt', 'Looking for')}: {dt(myProfile.relationship_status || myProfile.relationship_goal)}
                </span>
              )}
              {myProfile?.looking_for && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
                  ❤️ {trNow('Zoekt', 'Looking for')}: {getLookingForLabel(myProfile.looking_for)}
                </span>
              )}
            </div>

            {myProfile?.bio && (
              <p className={`text-xs leading-relaxed font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                "{myProfile.bio}"
              </p>
            )}

            {myProfile?.traits?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {myProfile.traits.map(t => (
                  <span key={t} className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-500/15 text-pink-500 border border-pink-500/20">
                    {dt(t)}
                  </span>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Mijn Statistieken Dashboard ── */}
        <div className="grid grid-cols-3 gap-3">
          <div 
            className="rounded-2xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 min-w-0 overflow-hidden" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
            onClick={() => navigate(createPageUrl('Chat'))}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-pink-500/15 text-pink-500">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div className="h-7 flex items-center justify-center w-full min-w-0">
              <span className={`${getStatFontSize(formatStatCount(stats.chats))} font-black leading-none tabular-nums truncate max-w-full text-center ${textMain}`}>
                {formatStatCount(stats.chats)}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-full mt-0.5" style={{ color: textSub }}>Chats</span>
          </div>

          <div 
            className="rounded-2xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 min-w-0 overflow-hidden" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
            onClick={() => navigate(createPageUrl('Pinpoint'))}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-amber-500/15 text-amber-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="h-7 flex items-center justify-center w-full min-w-0">
              <span className={`${getStatFontSize(formatStatCount(stats.locations))} font-black leading-none tabular-nums truncate max-w-full text-center ${textMain}`}>
                {formatStatCount(stats.locations)}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-full mt-0.5" style={{ color: textSub }}>{trNow('Locaties', 'Locations')}</span>
          </div>

          <div 
            className="rounded-2xl p-3 sm:p-3.5 text-center flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 min-w-0 overflow-hidden" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
            onClick={() => navigate(createPageUrl('Matches'))}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-purple-500/15 text-purple-500">
              <Heart className="w-4 h-4" />
            </div>
            <div className="h-7 flex items-center justify-center w-full min-w-0">
              <span className={`${getStatFontSize(formatStatCount(stats.matches))} font-black leading-none tabular-nums truncate max-w-full text-center ${textMain}`}>
                {formatStatCount(stats.matches)}
              </span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-full mt-0.5" style={{ color: textSub }}>Likes</span>
          </div>
        </div>

        {/* ── Settings & Preferences ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          
          {/* Land row */}
          <div className="relative" style={{ borderBottom: divider }}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer select-none"
              onClick={() => setShowCountryDropdown(v => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${textMain}`}>{trNow('Land', 'Country')}</p>
                  <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,75,114,0.9)' }}>
                    {countryName(myProfile?.country || 'Nederland')}
                  </p>
                </div>
              </div>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showCountryDropdown ? 'rotate-90' : ''}`}
                style={{ color: textSub }}
              />
            </div>

            {/* Dropdown */}
            {showCountryDropdown && (
              <div
                className="absolute left-0 right-0 z-50 rounded-b-2xl overflow-y-auto"
                style={{
                  background: isDark ? '#141521' : '#FFFFFF',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
                  maxHeight: '260px',
                  top: '100%',
                }}
              >
                {COUNTRIES.map(({ name }) => {
                  const current = (myProfile?.country || 'Nederland') === name;
                  return (
                    <button
                      key={name}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-left transition-colors ${
                        current
                          ? 'text-pink-500'
                          : isDark ? 'text-white/80 hover:bg-white/5' : 'text-gray-800 hover:bg-gray-50'
                      }`}
                      style={current ? { borderLeft: '3px solid #FF4B72', paddingLeft: '13px' } : {}}
                      onClick={() => {
                        setShowCountryDropdown(false);
                        if (name !== (myProfile?.country || 'Nederland')) {
                          setPendingCountry(name);
                          setShowCountryWarning(true);
                        }
                      }}
                    >
                      <Globe className={`w-3.5 h-3.5 flex-shrink-0 ${current ? 'text-pink-500' : 'text-pink-400/60'}`} />
                      {countryName(name)}
                      {current && <Check className="w-3.5 h-3.5 ml-auto text-pink-500" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Theme Switch */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: divider }}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-amber-400/15 text-amber-400' : 'bg-pink-500/15 text-pink-500'}`}>
                {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </div>
              <div>
                <p className={`text-sm font-bold ${textMain}`}>{isDark ? trNow('Donkere modus', 'Dark mode') : trNow('Lichte modus', 'Light mode')}</p>
                <p className="text-[11px] font-medium" style={{ color: textSub }}>{isDark ? trNow('Wissel naar licht thema', 'Switch to light theme') : trNow('Wissel naar donker thema', 'Switch to dark theme')}</p>
              </div>
            </div>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-12 h-6 rounded-full transition-all flex items-center p-0.5 cursor-pointer select-none"
              style={isDark ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : { background: 'rgba(0,0,0,0.12)' }}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Alleen voor beheerders: meldingen behandelen */}
          {isAdmin && (
            <button
              onClick={() => setShowModeration(true)}
              className="w-full flex items-center justify-between p-4 text-left active:opacity-70 transition-opacity"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-500/15 text-orange-500">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${textMain}`}>{trNow('Meldingen behandelen', 'Handle reports')}</p>
                  <p className="text-[11px] font-medium" style={{ color: textSub }}>{trNow('Alleen zichtbaar voor beheerders', 'Only visible to admins')}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: textSub }} />
            </button>
          )}

          {/* Geblokkeerde gebruikers */}
          <button
            onClick={() => setShowBlockedUsers(true)}
            className="w-full flex items-center justify-between p-4 text-left active:opacity-70 transition-opacity"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-red-500/15 text-red-500">
                <Ban className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-bold ${textMain}`}>{trNow('Geblokkeerde gebruikers', 'Blocked users')}</p>
                <p className="text-[11px] font-medium" style={{ color: textSub }}>{trNow('Bekijken en deblokkeren', 'View and unblock')}</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: textSub }} />
          </button>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-500">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-bold ${textMain}`}>{trNow('Push Notificaties', 'Push Notifications')}</p>
                <p className="text-[11px] font-medium" style={{ color: textSub }}>{trNow('Meldingen voor games & hints', 'Notifications for games & hints')}</p>
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !notificationsEnabled;
                setNotificationsEnabled(nextVal);
                toast.success(nextVal ? trNow('Notificaties ingeschakeld 🔔', 'Notifications enabled 🔔') : trNow('Notificaties uitgeschakeld', 'Notifications disabled'));
              }}
              className="w-12 h-6 rounded-full transition-all flex items-center p-0.5 cursor-pointer select-none"
              style={notificationsEnabled ? { background: 'linear-gradient(135deg, #3B82F6, #2563EB)' } : { background: 'rgba(0,0,0,0.12)' }}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-all ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

        </div>

        {/* ── FAQ Accordion ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: divider }}>
            <HelpCircle className="w-4 h-4 text-pink-500" />
            <span className={`text-xs font-black uppercase tracking-wider ${textMain}`}>{trNow('Veelgestelde Vragen', 'Frequently Asked Questions')}</span>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? divider : 'none' }}>
              <button 
                onClick={() => setOpenFaq(openFaq === i ? null : i)} 
                className="w-full px-4 py-3.5 text-left flex items-center justify-between transition-colors hover:bg-black/5"
              >
                <span className={`text-xs font-bold pr-2 ${textMain}`}>{faq.q}</span>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} style={{ color: textSub }} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3.5 pt-1">
                  <p className="text-xs leading-relaxed font-medium whitespace-pre-line" style={{ color: textSub }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Account Actions ── */}
        <div className="space-y-2.5 pt-2">

          {/* Feedback Button */}
          <button 
            type="button"
            onClick={() => setShowFeedbackModal(true)} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between transition-colors duration-150 hover:brightness-105 active:opacity-85 outline-none focus:outline-none select-none cursor-pointer" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className={`font-bold text-xs ${textMain}`}>{trNow('Feedback geven', 'Give feedback')}</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: textSub }} />
          </button>
          
          {/* Logout Button */}
          <button 
            type="button"
            onClick={() => setShowLogoutConfirm(true)} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between transition-colors duration-150 hover:brightness-105 active:opacity-85 outline-none focus:outline-none select-none cursor-pointer" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-500">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-rose-500">{trNow('Uitloggen', 'Log out')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>

          {/* Delete Account Button */}
          <button 
            type="button"
            onClick={() => setShowDeleteConfirm(true)} 
            disabled={deleting} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between border border-red-500/30 transition-colors duration-150 hover:brightness-105 active:opacity-85 outline-none focus:outline-none select-none cursor-pointer bg-red-500/5" 
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/20 text-red-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-red-500">
                {deleting ? trNow('Account verwijderen...', 'Deleting account...') : trNow('Account definitief verwijderen', 'Permanently delete account')}
              </span>
            </div>
          </button>

        </div>

      </div>

      {showModeration && <ModerationSheet isDark={isDark} onClose={() => setShowModeration(false)} />}
      {showBlockedUsers && <BlockedUsersSheet isDark={isDark} onClose={() => setShowBlockedUsers(false)} />}

      {/* ── SLIDE-IN EDIT PROFILE SCREEN (APPLE SETTINGS STYLE) ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[200] overflow-y-auto pointer-events-auto max-w-md mx-auto flex flex-col overscroll-contain"
            style={{ background: bg }}
          >
            {/* Header */}
            <div className={`sticky top-0 z-20 pt-12 sm:pt-14 px-5 pb-4 flex items-center justify-between border-b backdrop-blur-md ${isDark ? 'bg-[#08090E]/90 border-white/10' : 'bg-[#F8F9FB]/90 border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackClick}
                  className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all active:scale-95 ${isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-gray-100 border-gray-200 text-gray-800 hover:bg-gray-200'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="font-black text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600">
                    {trNow('Account aanpassen', 'Edit account')}
                  </h1>
                  <p className={`text-[11px] font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{trNow('Pas je gegevens en voorkeuren aan', 'Adjust your details and preferences')}</p>
                </div>
              </div>
              <button
                onClick={handleInitiateSave}
                disabled={!hasChanges || saving}
                className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  hasChanges && !saving
                    ? 'text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md active:scale-95 cursor-pointer'
                    : isDark
                      ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Opslaan
              </button>
            </div>

            {/* Apple Settings Style List Container */}
            <div className="flex-1 px-4 py-5 space-y-6 pb-28">
              
              {/* Section 1: Eigen informatie */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: textSub }}>
                  {trNow('Eigen informatie', 'Your information')}
                </p>
                <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: cardBg, border: cardBorder }}>
                  
                  {/* Row: Gebruikersnaam */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('username')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-500">
                        <User className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Gebruikersnaam', 'Username')}</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.display_name || trNow('Niet ingesteld', 'Not set')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Gender */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('gender')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/15 text-indigo-500">
                        <Smile className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>Gender</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {getGenderLabel(form.gender)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Leeftijd en eigen lengte */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('age_height')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Leeftijd en eigen lengte', 'Age and height')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.age ? `${form.age} ${trNow('jr', 'yrs')}` : '-'} • {form.height_cm ? `${form.height_cm} cm` : '-'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Bio */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('bio')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/15 text-emerald-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>Bio</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.bio ? form.bio : trNow('Over mij', 'About me')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                </div>
              </div>

              {/* Section 2: Interesses */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: textSub }}>
                  {trNow('Interesses', 'Interests')}
                </p>
                <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: cardBg, border: cardBorder }}>
                  
                  {/* Row: Relatiedoel */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('goals')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-500">
                        <Target className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Relatiedoel', 'Relationship goal')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {dt(form.relationship_status || 'Relatie')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Op zoek naar */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('looking_for')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                        <Heart className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Op zoek naar', 'Looking for')}</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {getLookingForLabel(form.looking_for)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Eigenschappen */}
                  <button
                    type="button"
                    onClick={() => openSubSheet('traits')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/15 text-amber-500">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Eigenschappen', 'Traits')}</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {(form.traits || []).length > 0 ? `${(form.traits || []).length}/5 ${trNow('gekozen', 'chosen')}` : trNow('Kies 3 – 5', 'Choose 3 – 5')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Interesses */}
                  <button
                    type="button"
                    onClick={() => openSubSheet('interests')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/15 text-purple-500">
                        <Compass className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Interesses', 'Interests')}</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {(form.interests || []).length > 0 ? `${(form.interests || []).length}/5 ${trNow('gekozen', 'chosen')}` : trNow('Kies 3 – 5', 'Choose 3 – 5')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Lengte */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('height_pref')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                    style={{ borderBottom: divider }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/15 text-cyan-500">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Lengte', 'Height')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.min_height_pref || 140} – {form.max_height_pref || 260} cm
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                  {/* Row: Leeftijd */}
                  <button
                    type="button"
                    onClick={() => setActiveSheet('age_pref')}
                    className="w-full flex items-center justify-between p-3.5 text-left transition-colors hover:bg-black/5 active:bg-black/10"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className={`text-sm font-bold ${textMain}`}>{trNow('Leeftijd', 'Age')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.min_age_pref || 18} – {form.max_age_pref || 90} jr
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                </div>
              </div>

              {/* Primary Save Button at bottom */}
              <div className="pt-2">
                <button
                  onClick={handleInitiateSave}
                  disabled={!hasChanges || saving}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                    hasChanges && !saving
                      ? 'text-white bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 shadow-lg active:scale-98 cursor-pointer'
                      : isDark
                        ? 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed'
                        : 'bg-gray-200 border border-gray-300 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  {saving ? trNow('Opslaan...', 'Saving...') : trNow('Wijzigingen opslaan', 'Save changes')}
                </button>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SUB-SHEET MODAL FOR APPLE SETTINGS ITEMS ── */}
      <AnimatePresence>
        {activeSheet && (
          <motion.div
            // Alleen de achtergrondkleur vervaagt: opacity + backdrop-blur samen gaf een korte flikkering
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`fixed inset-0 z-[250] pointer-events-auto flex justify-center p-4 sm:p-6 select-none ${
              activeSheet === 'username' || activeSheet === 'bio'
                ? 'items-start pt-20 sm:pt-24'
                : 'items-center'
            }`}
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
            onClick={handleCloseSubSheet}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{
                duration: 0.22,
                ease: [0.16, 1, 0.3, 1]
              }}
              className="relative w-full max-w-sm sm:max-w-md rounded-[28px] sm:rounded-[32px] overflow-hidden p-5 sm:p-6 flex flex-col max-h-[82vh]"
              style={{ background: cardBg, border: cardBorder, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <h3 className={`text-base font-black ${textMain}`}>
                  {activeSheet === 'username' && trNow('Gebruikersnaam', 'Username')}
                  {activeSheet === 'gender' && 'Gender'}
                  {activeSheet === 'age_height' && trNow('Leeftijd en eigen lengte', 'Age and height')}
                  {activeSheet === 'bio' && trNow('Bio / Over mij', 'Bio / About me')}
                  {activeSheet === 'goals' && trNow('Relatiedoel', 'Relationship goal')}
                  {activeSheet === 'looking_for' && trNow('Op zoek naar', 'Looking for')}
                  {activeSheet === 'traits' && trNow('Eigenschappen', 'Traits')}
                  {activeSheet === 'interests' && trNow('Interesses', 'Interests')}
                  {activeSheet === 'height_pref' && trNow('Lengtevoorkeur matches', 'Height preference for matches')}
                  {activeSheet === 'age_pref' && trNow('Leeftijdsvoorkeur matches', 'Age preference for matches')}
                </h3>
                <button
                  onClick={handleCloseSubSheet}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                    color: '#FFFFFF',
                  }}
                  title={trNow('Opslaan & Sluiten', 'Save & Close')}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Sheet Content by type */}
              <div className="overflow-y-auto space-y-4 py-1">
                {activeSheet === 'username' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                      {trNow('Weergavenaam', 'Display name')}
                    </label>
                    <input
                      type="text"
                      autoFocus
                      className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                      value={form.display_name || ''}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder={trNow('Bijv. Koen', 'E.g. Alex')}
                    />
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      {trNow('Dit is de naam die andere gebruikers op je profiel zien.', 'This is the name other users see on your profile.')}
                    </p>
                  </div>
                )}

                {activeSheet === 'gender' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: textSub }}>
                      {trNow('Wat is jouw gender?', 'What is your gender?')}
                    </label>
                    <div className="space-y-2">
                      {GENDER_OPTIONS.map(opt => {
                        const isSelected = form.gender === opt.value || (opt.value === 'man' && form.gender === 'male') || (opt.value === 'vrouw' && form.gender === 'female') || (opt.value === 'anders' && (form.gender === 'non-binary' || form.gender === 'nonbinary'));
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, gender: opt.value }))}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all text-left ${isSelected ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-md' : isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'}`}
                          >
                            <span className="font-bold text-sm">{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSheet === 'age_height' && (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                          {trNow('Leeftijd (jaren)', 'Age (years)')}
                        </label>
                        <span className="text-[10px] font-bold text-pink-500">{trNow('Min. 18 jaar', 'Min. 18 years')}</span>
                      </div>
                      <input
                        type="number"
                        min="18"
                        max="90"
                        className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                        value={form.age || ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setForm(f => ({ ...f, age: '' }));
                            return;
                          }
                          const num = Number(val);
                          if (num > 90) {
                            setForm(f => ({ ...f, age: 90 }));
                            toast.info(trNow('Maximale leeftijd is 90 jaar.', 'Maximum age is 90.'));
                          } else {
                            setForm(f => ({ ...f, age: val }));
                          }
                        }}
                        onBlur={e => {
                          const num = Number(e.target.value);
                          if (num && num < 18) {
                            setForm(f => ({ ...f, age: 18 }));
                            toast.info(trNow('Leeftijd is automatisch ingesteld op het minimum van 18 jaar.', 'Age has automatically been set to the minimum of 18.'));
                          } else if (num && num > 90) {
                            setForm(f => ({ ...f, age: 90 }));
                            toast.info(trNow('Leeftijd is automatisch ingesteld op het maximum van 90 jaar.', 'Age has automatically been set to the maximum of 90.'));
                          }
                        }}
                        placeholder={trNow('Bijv. 24', 'E.g. 24')}
                      />
                      {form.age && (Number(form.age) < 18 || Number(form.age) > 90) && (
                        <p className="text-[11px] font-bold text-red-500 mt-1">
                          {Number(form.age) < 18 ? trNow('⚠️ Minimale leeftijd is 18 jaar.', '⚠️ Minimum age is 18.') : trNow('⚠️ Maximale leeftijd is 90 jaar.', '⚠️ Maximum age is 90.')}
                        </p>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                          {trNow('Eigen lengte (cm)', 'Your height (cm)')}
                        </label>
                        <span className="text-[10px] font-bold text-pink-500">Max. 260 cm</span>
                      </div>
                      <input
                        type="number"
                        min="100"
                        max="260"
                        className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                        value={form.height_cm || ''}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === '') {
                            setForm(f => ({ ...f, height_cm: '' }));
                            return;
                          }
                          const num = Number(val);
                          if (num > 260) {
                            setForm(f => ({ ...f, height_cm: 260 }));
                            toast.info(trNow('Maximale lengte is 260 cm.', 'Maximum height is 260 cm.'));
                          } else {
                            setForm(f => ({ ...f, height_cm: val }));
                          }
                        }}
                        onBlur={e => {
                          const num = Number(e.target.value);
                          if (num && num > 260) {
                            setForm(f => ({ ...f, height_cm: 260 }));
                            toast.info(trNow('Lengte is automatisch ingesteld op het maximum van 260 cm.', 'Height has automatically been set to the maximum of 260 cm.'));
                          }
                        }}
                        placeholder={trNow('Bijv. 182', 'E.g. 182')}
                      />
                      {form.height_cm && Number(form.height_cm) > 260 && (
                        <p className="text-[11px] font-bold text-red-500 mt-1">
                          {trNow('⚠️ Maximale lengte is 260 cm.', '⚠️ Maximum height is 260 cm.')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeSheet === 'bio' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                        {trNow('Bio tekst', 'Bio text')}
                      </label>
                      <span className="text-[10px] font-bold text-gray-400">
                        {(form.bio || '').length}/250
                      </span>
                    </div>
                    <textarea
                      rows={4}
                      maxLength={250}
                      autoFocus
                      className={`w-full px-4 py-3 rounded-2xl text-xs resize-none outline-none font-medium focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                      value={form.bio || ''}
                      onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      placeholder={trNow('Vertel iets leuks over jezelf, je passies of weekendplannen...', 'Tell something fun about yourself, your passions or weekend plans...')}
                    />
                  </div>
                )}

                {activeSheet === 'goals' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: textSub }}>
                      {trNow('Waar ben je naar op zoek?', 'What are you looking for?')}
                    </label>
                    <div className="space-y-2">
                      {GOALS.map(g => {
                        const isSelected = form.relationship_status === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, relationship_status: g }))}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all text-left ${isSelected ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-md' : isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'}`}
                          >
                            <span className="font-bold text-sm">{dt(g)}</span>
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSheet === 'looking_for' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: textSub }}>
                      {trNow('Naar wie ben je op zoek?', 'Who are you looking for?')}
                    </label>
                    <div className="space-y-2">
                      {LOOKING_FOR_OPTIONS.map(opt => {
                        const isSelected = form.looking_for === opt.value || 
                          (opt.value === 'man' && form.looking_for === 'male') || 
                          (opt.value === 'vrouw' && form.looking_for === 'female') || 
                          (opt.value === 'both' && (form.looking_for === 'both' || form.looking_for === 'beide' || form.looking_for === 'iedereen' || form.looking_for === 'all' || form.looking_for === 'anders'));
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setForm(f => ({ ...f, looking_for: opt.value }))}
                            className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all text-left ${isSelected ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-md' : isDark ? 'bg-white/5 border-white/10 text-white hover:bg-white/10' : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100'}`}
                          >
                            <span className="font-bold text-sm">{opt.label}</span>
                            {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeSheet === 'traits' && (() => {
                  const traitsCount = (form.traits || []).length;
                  const isUnderMinTraits = traitsCount < 3;
                  return (
                    <div className="space-y-4">
                      {/* 5 Slots Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textSub }}>
                            {trNow('Jouw eigenschappen (3 – 5)', 'Your traits (3 – 5)')}
                          </p>
                          <span className={`text-[11px] font-black ${
                            isUnderMinTraits ? 'text-red-500 animate-pulse' : 'text-pink-500'
                          }`}>
                            {traitsCount}/5 {trNow('gekozen', 'chosen')} {isUnderMinTraits ? trNow('(min. 3 vereist!)', '(min. 3 required!)') : ''}
                          </span>
                        </div>

                        {/* 5 slots grid with red pulsing borders when < 3 */}
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {[0, 1, 2, 3, 4].map(idx => {
                            const trait = (form.traits || [])[idx];
                            return trait ? (
                              <div
                                key={idx}
                                onClick={() => handleToggleTrait(trait)}
                                className={`group relative p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 border ${
                                  isUnderMinTraits
                                    ? 'animate-pulse ring-2 ring-red-500/50 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                                    : ''
                                }`}
                                style={{
                                  background: isUnderMinTraits
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(244, 63, 94, 0.12) 100%)'
                                    : 'linear-gradient(135deg, rgba(255, 75, 114, 0.22) 0%, rgba(234, 63, 211, 0.12) 100%)',
                                  borderColor: isUnderMinTraits ? '#EF4444' : 'rgba(255, 75, 114, 0.45)',
                                  minHeight: '68px',
                                }}
                                title={trNow('Klik om te verwijderen', 'Click to remove')}
                              >
                                <span className="text-lg sm:text-xl leading-none mb-1">{getEmojiForTrait(trait)}</span>
                                <span className={`text-[10px] font-bold truncate max-w-full leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{dt(trait)}</span>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm opacity-90 group-hover:opacity-100">
                                  ✕
                                </div>
                              </div>
                            ) : (
                              <div
                                key={idx}
                                className={`p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center text-center border border-dashed transition-all ${
                                  isUnderMinTraits
                                    ? 'animate-pulse ring-2 ring-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                    : ''
                                }`}
                                style={{
                                  borderColor: isUnderMinTraits ? '#EF4444' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                  background: isUnderMinTraits
                                    ? 'rgba(239, 68, 68, 0.08)'
                                    : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                  minHeight: '68px',
                                }}
                              >
                                <Plus className={`w-4 h-4 mb-0.5 ${isUnderMinTraits ? 'text-red-500 animate-pulse' : isDark ? 'text-white/40' : 'text-gray-400'}`} />
                                <span className={`text-[9px] font-semibold ${isUnderMinTraits ? 'text-red-500 font-bold' : isDark ? 'text-white/40' : 'text-gray-400'}`}>Slot {idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>

                        {isUnderMinTraits && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 animate-pulse mt-2 px-1">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Selecteer minimaal 3 eigenschappen (nog {3 - traitsCount} nodig)</span>
                          </div>
                        )}
                      </div>

                      {/* Available traits list with select/deselect checkmark */}
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: textSub }}>
                          {trNow('Tik om te selecteren of deselecteren:', 'Tap to select or deselect:')}
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                          {TRAITS_LIST.map(t => {
                            const isSelected = (form.traits || []).includes(t.label);
                            return (
                              <button
                                key={t.label}
                                type="button"
                                onClick={() => handleToggleTrait(t.label)}
                                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-md ring-2 ring-pink-500/30'
                                    : isDark
                                      ? 'bg-white/5 border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/10'
                                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <span>{t.emoji}</span>
                                <span>{dt(t.label)}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeSheet === 'interests' && (() => {
                  const interestsCount = (form.interests || []).length;
                  const isUnderMinInterests = interestsCount < 3;
                  return (
                    <div className="space-y-4">
                      {/* 5 Slots Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: textSub }}>
                            {trNow('Jouw interesses (3 – 5)', 'Your interests (3 – 5)')}
                          </p>
                          <span className={`text-[11px] font-black ${
                            isUnderMinInterests ? 'text-red-500 animate-pulse' : 'text-pink-500'
                          }`}>
                            {interestsCount}/5 {trNow('gekozen', 'chosen')} {isUnderMinInterests ? trNow('(min. 3 vereist!)', '(min. 3 required!)') : ''}
                          </span>
                        </div>

                        {/* 5 slots grid with red pulsing borders when < 3 */}
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {[0, 1, 2, 3, 4].map(idx => {
                            const interest = (form.interests || [])[idx];
                            return interest ? (
                              <div
                                key={idx}
                                onClick={() => handleToggleInterest(interest)}
                                className={`group relative p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all active:scale-95 border ${
                                  isUnderMinInterests
                                    ? 'animate-pulse ring-2 ring-red-500/50 shadow-[0_0_14px_rgba(239,68,68,0.4)]'
                                    : ''
                                }`}
                                style={{
                                  background: isUnderMinInterests
                                    ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.22) 0%, rgba(244, 63, 94, 0.12) 100%)'
                                    : 'linear-gradient(135deg, rgba(234, 63, 211, 0.22) 0%, rgba(147, 51, 234, 0.12) 100%)',
                                  borderColor: isUnderMinInterests ? '#EF4444' : 'rgba(234, 63, 211, 0.45)',
                                  minHeight: '68px',
                                }}
                                title={trNow('Klik om te verwijderen', 'Click to remove')}
                              >
                                <span className="text-lg sm:text-xl leading-none mb-1">{getEmojiForInterest(interest)}</span>
                                <span className={`text-[10px] font-bold truncate max-w-full leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{dt(interest)}</span>
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center text-[9px] font-black shadow-sm opacity-90 group-hover:opacity-100">
                                  ✕
                                </div>
                              </div>
                            ) : (
                              <div
                                key={idx}
                                className={`p-1.5 sm:p-2 rounded-2xl flex flex-col items-center justify-center text-center border border-dashed transition-all ${
                                  isUnderMinInterests
                                    ? 'animate-pulse ring-2 ring-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                                    : ''
                                }`}
                                style={{
                                  borderColor: isUnderMinInterests ? '#EF4444' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                                  background: isUnderMinInterests
                                    ? 'rgba(239, 68, 68, 0.08)'
                                    : isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                  minHeight: '68px',
                                }}
                              >
                                <Plus className={`w-4 h-4 mb-0.5 ${isUnderMinInterests ? 'text-red-500 animate-pulse' : isDark ? 'text-white/40' : 'text-gray-400'}`} />
                                <span className={`text-[9px] font-semibold ${isUnderMinInterests ? 'text-red-500 font-bold' : isDark ? 'text-white/40' : 'text-gray-400'}`}>Slot {idx + 1}</span>
                              </div>
                            );
                          })}
                        </div>

                        {isUnderMinInterests && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 animate-pulse mt-2 px-1">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Selecteer minimaal 3 interesses (nog {3 - interestsCount} nodig)</span>
                          </div>
                        )}
                      </div>

                      {/* Available interests list with select/deselect checkmark */}
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: textSub }}>
                          {trNow('Tik om te selecteren of deselecteren:', 'Tap to select or deselect:')}
                        </p>
                        <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto pr-1">
                          {INTERESTS_LIST.map(i => {
                            const isSelected = (form.interests || []).includes(i.label);
                            return (
                              <button
                                key={i.label}
                                type="button"
                                onClick={() => handleToggleInterest(i.label)}
                                className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent shadow-md ring-2 ring-purple-500/30'
                                    : isDark
                                      ? 'bg-white/5 border-white/10 text-gray-300 hover:border-white/25 hover:bg-white/10'
                                      : 'bg-gray-100 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                <span>{i.emoji}</span>
                                <span>{dt(i.label)}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] text-white" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {activeSheet === 'height_pref' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: textSub }}>{trNow('Bereik:', 'Range:')}</span>
                      <span className="text-sm font-black text-pink-500">
                        {form.min_height_pref || 140} – {form.max_height_pref || 260} cm
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>{trNow('Max. lengte', 'Max. height')}</span>
                          <span className="font-bold text-pink-500">{form.max_height_pref || 260} cm</span>
                        </div>
                        <input
                          type="range"
                          min="140"
                          max="260"
                          value={form.max_height_pref || 260}
                          onChange={e => setForm(f => ({
                            ...f,
                            max_height_pref: Math.max(Number(e.target.value), (f.min_height_pref || 140) + 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>{trNow('Min. lengte', 'Min. height')}</span>
                          <span className="font-bold text-pink-500">{form.min_height_pref || 140} cm</span>
                        </div>
                        <input
                          type="range"
                          min="140"
                          max="260"
                          value={form.min_height_pref || 140}
                          onChange={e => setForm(f => ({
                            ...f,
                            min_height_pref: Math.min(Number(e.target.value), (f.max_height_pref || 260) - 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      {trNow('Matches binnen jouw lengtevoorkeur krijgen voorrang op de home- en ontdekpagina.', 'Matches within your height preference get priority on the home and discover pages.')}
                    </p>
                  </div>
                )}

                {activeSheet === 'age_pref' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: textSub }}>{trNow('Bereik:', 'Range:')}</span>
                      <span className="text-sm font-black text-pink-500">
                        {form.min_age_pref || 18} – {form.max_age_pref || 90} jaar
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>{trNow('Max. leeftijd', 'Max. age')}</span>
                          <span className="font-bold text-pink-500">{form.max_age_pref || 90} jaar</span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="90"
                          value={form.max_age_pref || 90}
                          onChange={e => setForm(f => ({
                            ...f,
                            max_age_pref: Math.max(Number(e.target.value), (f.min_age_pref || 18) + 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>{trNow('Min. leeftijd', 'Min. age')}</span>
                          <span className="font-bold text-pink-500">{form.min_age_pref || 18} jaar</span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="90"
                          value={form.min_age_pref || 18}
                          onChange={e => setForm(f => ({
                            ...f,
                            min_age_pref: Math.min(Number(e.target.value), (f.max_age_pref || 90) - 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      {trNow('Profielen binnen deze leeftijdscategorie worden aan jou voorgesteld.', 'Profiles within this age range will be suggested to you.')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: MINIMUM 3 ITEMS WARNING (TRAITS & INTERESTS) ── */}
      <AnimatePresence>
        {minItemsWarningModal && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center px-6 pointer-events-auto select-none">
            <motion.div 
              key="min-items-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={handleCancelMinItemsLeave}
            />
            <motion.div 
              key="min-items-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 rounded-[28px] w-full max-w-xs p-5 text-center shadow-2xl border ${
                isDark ? 'bg-[#141521] border-red-500/30 text-white' : 'bg-white border-red-200 text-gray-900'
              }`}
              style={{
                boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 25px rgba(239,68,68,0.2)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-red-500/15 text-red-500">
                <AlertTriangle className="w-6 h-6 stroke-[2.4] animate-pulse" />
              </div>
              <h4 className="text-sm font-black mb-1.5">
                {trNow('Minimaal 3', 'At least 3')} {minItemsWarningModal === 'traits' ? trNow('eigenschappen', 'traits') : trNow('interesses', 'interests')} {trNow('vereist', 'required')}
              </h4>
              <p className={`text-[11px] font-medium leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {trNow('Je hebt momenteel minder dan 3', 'You currently have fewer than 3')} {minItemsWarningModal === 'traits' ? trNow('eigenschappen', 'traits') : trNow('interesses', 'interests')} {trNow('geselecteerd. Als je nu weggaat, wordt je oude selectie behouden.', 'selected. If you leave now, your previous selection will be kept.')}
              </p>
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={handleCancelMinItemsLeave} 
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all border cursor-pointer ${
                    isDark 
                      ? 'border-white/15 text-white bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmMinItemsLeave} 
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all hover:opacity-95 cursor-pointer"
                >
                  {trNow('Ja, ga terug', 'Yes, go back')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SAVE CONFIRMATION (WARNING MATCHES COULD BE LOST) ── */}
      <AnimatePresence>
        {showSaveConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 pointer-events-auto">
            <motion.div 
              key="save-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={() => setShowSaveConfirm(false)}
            />
            <motion.div 
              key="save-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-2xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">{trNow('Account wijzigen?', 'Change account?')}</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                {trNow('Weet je zeker dat je jouw account wilt opslaan? Je kunt potentiële matches en hints verliezen door het veranderen van je profielgegevens en voorkeuren.', 'Are you sure you want to save your account? You may lose potential matches and hints by changing your profile details and preferences.')}
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowSaveConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15 cursor-pointer"
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
                <button 
                  type="button"
                  onClick={executeSave} 
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:opacity-95 cursor-pointer"
                >
                  {trNow('Ja, opslaan', 'Yes, save')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DISCARD CONFIRMATION (WHEN RETURNING WITH UNSAVED CHANGES) ── */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 pointer-events-auto">
            <motion.div 
              key="discard-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={handleCancelDiscard}
            />
            <motion.div 
              key="discard-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">{trNow('Wijzigingen verwerpen?', 'Discard changes?')}</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                {trNow('Weet je het zeker? Je hebt aanpassingen gemaakt die nog niet zijn opgeslagen. Als je weggaat, gaan deze verloren.', 'Are you sure? You have unsaved changes. If you leave, they will be lost.')}
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={handleCancelDiscard} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15 cursor-pointer"
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmDiscard} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700 cursor-pointer"
                >
                  {trNow('Ja, verwerpen', 'Yes, discard')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: PROFILE PREVIEW (MATCHES PAGE SWIPER CARD STYLE) ── */}
      <AnimatePresence>
        {showPreview && (
          <div className="fixed inset-0 z-[300] pointer-events-auto flex items-center justify-center p-4">
            <motion.div 
              key="preview-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.18, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/80" 
              onClick={() => setShowPreview(false)}
            />
            <motion.div 
              key="preview-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-sm h-[560px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col justify-end" 
              onClick={e => e.stopPropagation()}
            >
              
              {/* Close Button */}
              <button 
                onClick={() => setShowPreview(false)} 
                className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Photo Background Carousel with Indicator Dots */}
              <ProfilePhotoCarousel 
                profile={{
                  ...myProfile,
                  ...form,
                  photos: (form.photos && form.photos.length > 0) 
                    ? form.photos 
                    : (myProfile?.photos || (myProfile?.photo_url ? [myProfile.photo_url] : []))
                }} 
                dotsClassName="top-4 left-4 z-30" 
              />

              {/* Foreground Card Content matching MatchesSwiper */}
              <div className="relative z-10 p-6 flex flex-col pointer-events-none">
                <div className="pointer-events-auto flex flex-col">
                  {/* Name / Age / Height */}
                  <h2 className="text-[28px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                    {form.age || myProfile?.age || '24'} {trNow('jaar', 'yrs')} {form.height_cm || myProfile?.height_cm ? `• ${form.height_cm || myProfile.height_cm} cm` : ''}
                  </h2>

                  {/* Tags (Avatar first, then interests/traits) */}
                  <div className="flex flex-wrap gap-1.5 mb-5 items-center">
                    {myProfile?.avatar && (
                      <span className="px-3.5 py-1 rounded-full text-[13px] font-bold text-white bg-black/45 backdrop-blur-md border-2 border-pink-500/50 shadow-sm flex items-center gap-1.5">
                        <span className="text-sm">{myProfile.avatar.split(' ')[0]}</span>
                        <span className="text-pink-100">{myProfile.avatar.split(' ').slice(1).join(' ')}</span>
                      </span>
                    )}
                    {[...(form.interests || myProfile?.interests || []).slice(0, 2), ...(form.traits || myProfile?.traits || []).slice(0, 1)].map((tag) => (
                      <span key={tag} className="px-3.5 py-1 rounded-full text-[13px] font-semibold text-white bg-black/40 backdrop-blur-[2px] shadow-sm border-2 border-white/20">
                        {dt(tag)}
                      </span>
                    ))}
                  </div>

                  {/* Fake Action Buttons (Like & Hint) */}
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 px-3 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2 text-white font-bold text-[15px] shadow-lg active:scale-95 transition-transform">
                      <Heart className="w-4.5 h-4.5" color="white" fill="transparent" strokeWidth={2.4} />
                      Like
                    </button>
                    <button className="flex-1 py-3 px-3 rounded-full border-2 border-white/35 bg-black/40 backdrop-blur-md flex items-center justify-center gap-2 text-white font-bold text-[15px] shadow-lg active:scale-95 transition-transform">
                      <MessageCircle className="w-4.5 h-4.5" color="white" strokeWidth={2.4} />
                      Hint
                    </button>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: LOGOUT CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 pointer-events-auto">
            <motion.div 
              key="logout-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={() => setShowLogoutConfirm(false)}
            />
            <motion.div 
              key="logout-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-2xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <LogOut className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">{trNow('Uitloggen', 'Log out')}</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                {trNow('Weet je het zeker dat je wilt uitloggen bij Romety?', 'Are you sure you want to log out of Romety?')}
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  {trNow('Nee', 'No')}
                </button>
                <button 
                  type="button"
                  onClick={handlePerformLogout} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
                >
                  {trNow('Ja', 'Yes')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center px-6 pointer-events-auto">
            <motion.div 
              key="delete-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div 
              key="delete-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-2xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trash2 className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">{trNow('Account verwijderen', 'Delete account')}</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                {trNow('Weet je het zeker? Al je matches, hints en overige informatie worden hiermee definitief verwijderd uit de database.', 'Are you sure? All your matches, hints and other information will be permanently deleted.')}
              </p>
              <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  {trNow('Nee', 'No')}
                </button>
                <button 
                  type="button"
                  onClick={() => { 
                    setShowDeleteConfirm(false); 
                    setDeleteAnswers({ selectedOption: 'Ik heb iemand gevonden ❤️', customText: '' });
                    setShowDeleteSurvey(true); 
                  }} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
                >
                  {trNow('Ja', 'Yes')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE SURVEY (BEFORE DEFINITIVE DELETION) ── */}
      <AnimatePresence>
        {showDeleteSurvey && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-auto">
            <motion.div 
              key="survey-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75" 
              onClick={() => setShowDeleteSurvey(false)}
            />
            <motion.div 
              key="survey-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 w-full max-w-sm p-6 rounded-[28px] shadow-2xl border ${
                isDark ? 'bg-[#141521] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-red-500/10 text-red-500">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-center mb-1">{trNow('Waarom verlaat je Romety?', 'Why are you leaving Romety?')}</h3>
              <p className="text-xs text-center mb-4 leading-relaxed opacity-60">
                {trNow('We vinden het jammer dat je gaat. Laat ons weten waarom zodat we Romety kunnen verbeteren:', 'We are sorry to see you go. Let us know why so we can improve Romety:')}
              </p>
              
              {/* 3 Selectable Options */}
              <div className="space-y-2 mb-4">
                {[
                  'Ik heb iemand gevonden ❤️',
                  'Ik vind de app niet lekker werken',
                  'Anders'
                ].map(opt => {
                  const isSelected = deleteAnswers.selectedOption === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDeleteAnswers(a => ({ ...a, selectedOption: opt }))}
                      className={`w-full p-3 rounded-2xl text-xs font-bold border transition-all text-left flex items-center justify-between active:scale-98 ${
                        isSelected
                          ? 'border-pink-500 bg-pink-500/10 text-pink-500 shadow-sm'
                          : isDark
                            ? 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span>{({ 'Ik heb iemand gevonden ❤️': trNow('Ik heb iemand gevonden ❤️', 'I found someone ❤️'), 'Ik vind de app niet lekker werken': trNow('Ik vind de app niet lekker werken', 'The app does not work well for me'), 'Anders': trNow('Anders', 'Other') })[opt] || opt}</span>
                      <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-pink-500 bg-pink-500 text-white' : isDark ? 'border-white/20' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Optional Textarea when Anders is chosen */}
              {deleteAnswers.selectedOption === 'Anders' && (
                <div className="mb-4">
                  <textarea
                    rows={2}
                    className={`w-full rounded-2xl border px-3 py-2.5 text-xs resize-none outline-none transition-all ${
                      isDark 
                        ? 'border-white/15 bg-white/5 text-white placeholder-white/40 focus:border-pink-500' 
                        : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-pink-500'
                    }`}
                    placeholder={trNow('Optioneel: typ hier je reden...', 'Optional: type your reason here...')}
                    value={deleteAnswers.customText || ''}
                    onChange={e => setDeleteAnswers(a => ({ ...a, customText: e.target.value }))}
                  />
                </div>
              )}

              {/* Bottom Action Buttons: Annuleren vs Verwijderen */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => setShowDeleteSurvey(false)}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold border transition-all active:scale-95 ${
                    isDark 
                      ? 'border-white/15 text-white/80 bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 shadow-md active:scale-95 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    trNow('Verwijderen...', 'Deleting...')
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      {trNow('Verwijder', 'Delete')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Country Change Warning Modal ── */}
      <AnimatePresence>
        {showCountryWarning && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 pointer-events-auto">
            <motion.div
              key="country-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75"
              onClick={() => { setShowCountryWarning(false); setPendingCountry(null); }}
            />
            <motion.div
              key="country-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-xs rounded-[28px] overflow-hidden"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                border: isDark ? '1.5px solid rgba(255,75,114,0.3)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Warning icon */}
                <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(255,75,114,0.12)' }}>
                  <AlertTriangle className="w-7 h-7 text-pink-500" />
                </div>

                <h3 className={`text-lg font-black text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {trNow('Land wijzigen?', 'Change country?')}
                </h3>
                <p className={`text-sm text-center mb-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  Je wisselt naar <strong className={isDark ? 'text-white' : 'text-gray-900'}>{pendingCountry}</strong>.
                </p>
                <p className="text-sm text-center text-pink-500 font-semibold mb-6">
                  {trNow('Je verliest je matches in het huidige land.', 'You will lose your matches in the current country.')}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCountryWarning(false); setPendingCountry(null); }}
                    className={`flex-1 py-3.5 rounded-2xl font-bold text-sm border transition-all ${isDark ? 'border-white/15 text-white/70 bg-white/5' : 'border-gray-200 text-gray-600 bg-gray-100'}`}
                  >
                    {trNow('Annuleren', 'Cancel')}
                  </button>
                  <button
                    onClick={async () => {
                      if (!myProfile?.id || !user?.email) return;
                      setSaving(true);
                      try {
                        // Use the same comprehensive update as executeSave to satisfy RLS
                        const photosList = myProfile?.photos || (myProfile?.photo_url ? [myProfile.photo_url] : []);
                        const updatePayload = {
                          display_name: myProfile.display_name || '',
                          age: myProfile.age || null,
                          relationship_status: myProfile.relationship_status || 'Relatie',
                          bio: myProfile.bio || '',
                          traits: myProfile.traits || [],
                          interests: myProfile.interests || [],
                          photo_url: myProfile.photo_url || null,
                          country: pendingCountry,
                          user_email: user.email,
                        };
                        try {
                          await base44.entities.UserProfile.update(myProfile.id, { ...updatePayload, photos: photosList });
                        } catch {
                          await base44.entities.UserProfile.update(myProfile.id, updatePayload);
                        }
                        setMyProfile(p => ({ ...p, country: pendingCountry }));
                        setForm(f => ({ ...f, country: pendingCountry }));
                        toast.success(trNow(`Land gewijzigd naar ${pendingCountry}`, `Country changed to ${countryName(pendingCountry, 'en')}`));
                      } catch (e) {
                        console.error('Country save error:', e);
                        toast.error(trNow('Kon land niet opslaan: ', 'Could not save country: ') + (e?.message || trNow('onbekende fout', 'unknown error')));
                      }
                      setSaving(false);
                      setShowCountryWarning(false);
                      setPendingCountry(null);
                    }}
                    className="flex-1 py-3.5 rounded-2xl font-black text-white text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', boxShadow: '0 8px 20px rgba(255,75,114,0.4)' }}
                  >
                    {saving ? '...' : trNow('Bevestigen', 'Confirm')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── MODAL: FEEDBACK ── */}
      <AnimatePresence>
        {showFeedbackModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 pointer-events-auto">
            <motion.div 
              key="feedback-backdrop"
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              transition={{ duration: 0.16, ease: "easeOut" }} 
              className="fixed inset-0 bg-black/75"
              onClick={() => setShowFeedbackModal(false)}
            />
            <motion.div 
              key="feedback-dialog"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 w-full max-w-xs sm:max-w-sm p-4 sm:p-5 rounded-[24px] shadow-2xl border ${
                isDark ? 'bg-[#141521] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                    <MessageSquare className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-sm font-black">{trNow('Feedback of suggestie', 'Feedback or suggestion')}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFeedbackModal(false)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90 ${
                    isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] mb-3 leading-relaxed opacity-60">
                {trNow('Wat vind je van Romety of wat kunnen we verbeteren? We horen het graag!', 'What do you think of Romety or what can we improve? We would love to hear it!')}
              </p>

              <div className="mb-3.5">
                <textarea
                  rows={3}
                  className={`w-full rounded-xl border p-3 text-xs resize-none outline-none transition-all ${
                    isDark 
                      ? 'border-white/15 bg-white/5 text-white placeholder-white/40 focus:border-pink-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-pink-500'
                  }`}
                  placeholder={trNow('Typ hier jouw feedback of idee...', 'Type your feedback or idea here...')}
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={sendingFeedback}
                  onClick={() => setShowFeedbackModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                    isDark 
                      ? 'border-white/15 text-white/80 bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
                <button
                  type="button"
                  disabled={sendingFeedback || !feedbackText.trim()}
                  onClick={handleSendFeedback}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md active:scale-95 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sendingFeedback ? trNow('Versturen...', 'Sending...') : (
                    <>
                      <Send className="w-3 h-3" />
                      {trNow('Versturen', 'Send')}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}