import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { authStorage } from '@/lib/authStorage';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { 
  LogOut, Camera, ChevronRight, Edit2, Check, X, Trash2, Plus, Moon, Sun, Eye, Heart, Gamepad2,
  Bell, HelpCircle, MessageCircle, MessageSquare, ArrowRightLeft, AlertTriangle, Globe, ArrowLeft,
  User, Calendar, Ruler, FileText, Sparkles, Target, Compass, Users, Smile, Send, Loader2, MapPin
} from 'lucide-react';
import { usePullToRefresh } from '@/components/welove/usePullToRefresh';
import { InstagramSpinner } from '@/components/welove/PullToRefreshSpinner';
import ProfilePhotoCarousel, { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';
import { compressImage } from '@/utils/imageUtils';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';
import { COUNTRIES } from '@/lib/countries';

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
  { value: 'man', label: 'Man' },
  { value: 'vrouw', label: 'Vrouw' },
  { value: 'anders', label: 'Anders' },
];

const LOOKING_FOR_OPTIONS = [
  { value: 'man', label: 'Man' },
  { value: 'vrouw', label: 'Vrouw' },
  { value: 'both', label: 'Beide' },
];

const getGenderLabel = (g) => {
  if (!g) return 'Niet ingesteld';
  const val = String(g).toLowerCase().trim();
  if (val === 'man' || val === 'male') return 'Man';
  if (val === 'vrouw' || val === 'female') return 'Vrouw';
  if (val === 'anders' || val === 'non-binary' || val === 'nonbinary') return 'Anders';
  return g;
};

const getLookingForLabel = (lf) => {
  if (!lf) return 'Niet ingesteld';
  const val = String(lf).toLowerCase().trim();
  if (val === 'man' || val === 'male') return 'Man';
  if (val === 'vrouw' || val === 'female') return 'Vrouw';
  if (val === 'both' || val === 'beide' || val === 'iedereen' || val === 'all' || val === 'anders') return 'Beide';
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

  // Lock body and background scrolling when editing screen or activeSheet popup is open
  useEffect(() => {
    if (editing || activeSheet) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      if (activeSheet) {
        document.body.style.touchAction = 'none';
      }

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [editing, activeSheet]);

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
    if (Number(form.max_age_pref || 35) !== Number(initialForm.max_age_pref || 35)) return true;
    if (Number(form.min_height_pref || 150) !== Number(initialForm.min_height_pref || 150)) return true;
    if (Number(form.max_height_pref || 205) !== Number(initialForm.max_height_pref || 205)) return true;
    
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

  useEffect(() => { 
    if (user !== undefined) loadData(); 
  }, [user]);

  const loadData = async () => {
    const u = user;
    if (!u) { setLoading(false); return; }

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
        min_age_pref: p?.min_age_pref !== undefined && p?.min_age_pref !== null ? p.min_age_pref : 18,
        max_age_pref: p?.max_age_pref !== undefined && p?.max_age_pref !== null ? p.max_age_pref : 35,
        min_height_pref: p?.min_height_pref !== undefined && p?.min_height_pref !== null ? p.min_height_pref : 150,
        max_height_pref: p?.max_height_pref !== undefined && p?.max_height_pref !== null ? p.max_height_pref : 205,
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
    }
    setLoading(false);
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
      toast.success('Foto succesvol toegevoegd! 📸');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Kan foto niet uploaden. Voeg de "photos" kolom toe in Supabase.');
    }
    setUploading(false);
  };

  const handlePhotoDelete = async (indexToDelete) => {
    if (!myProfile) return;
    try {
      const currentPhotos = getProfilePhotos(myProfile);
      
      // Profiel moet altijd minimaal 1 hoofdfoto behouden
      if (currentPhotos.length <= 1) {
        toast.error('Je profiel moet altijd een hoofdfoto hebben. Upload eerst een andere foto om deze te kunnen veranderen!');
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
        toast.success('Hoofdfoto verwijderd. Foto 2 is nu automatisch je hoofdfoto!');
      } else {
        toast.success('Foto verwijderd');
      }
    } catch (err) {
      console.error('Delete photo error:', err);
      toast.error('Kan foto niet verwijderen');
    }
  };

  // Initiates checkmark click -> validates min 3 traits & interests before confirmation
  const handleInitiateSave = () => {
    if ((form.traits || []).length < 3) {
      toast.error('Kies minimaal 3 eigenschappen (3 tot 5)!');
      return;
    }
    if ((form.interests || []).length < 3) {
      toast.error('Kies minimaal 3 interesses (3 tot 5)!');
      return;
    }
    if (form.age !== undefined && form.age !== null && form.age !== '' && Number(form.age) < 18) {
      toast.error('Je moet minimaal 18 jaar oud zijn!');
      return;
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
        toast.error('Geen ingelogde gebruiker gevonden.');
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
        max_age_pref: Number(form.max_age_pref) || 35,
        min_height_pref: Number(form.min_height_pref) || 150,
        max_height_pref: Number(form.max_height_pref) || 205,
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
      toast.success('Account gewijzigd en opgeslagen in database! ✨');
    } catch (e) {
      console.error('Save error details:', e);
      toast.error('Fout bij opslaan: ' + (e?.message || 'Probeer het opnieuw'));
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
        toast.error('Je kunt maximaal 5 eigenschappen kiezen! Deselecteer er eerst een.');
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
        toast.error('Je kunt maximaal 5 interesses kiezen! Deselecteer er eerst een.');
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
    } else if (activeSheet === 'age_height' && form.age && Number(form.age) < 18) {
      setForm(f => ({ ...f, age: 18 }));
      toast.info('Leeftijd is ingesteld op 18 jaar.');
    }
    setActiveSheet(null);
  };

  const handleConfirmMinItemsLeave = () => {
    if (minItemsWarningModal === 'traits') {
      setForm(f => ({ ...f, traits: sheetBackupTraitsRef.current || initialForm.traits || [] }));
      toast.error('Minimaal 3 eigenschappen vereist. Oude selectie is behouden.');
    } else if (minItemsWarningModal === 'interests') {
      setForm(f => ({ ...f, interests: sheetBackupInterestsRef.current || initialForm.interests || [] }));
      toast.error('Minimaal 3 interesses vereist. Oude selectie is behouden.');
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
    if (!user) return;
    setDeleting(true);
    const toastId = toast.loading('Account en gegevens worden verwijderd...');

    try {
      const email = (user.email || user.user_email || '').toLowerCase().trim();

      if (email) {
        // 0. Save exit feedback to Supabase if provided
        try {
          if (deleteAnswers?.selectedOption) {
            await supabase.from('AccountDeletionSurvey').insert([
              {
                reason: deleteAnswers.selectedOption,
                custom_feedback: deleteAnswers.customText?.trim() || null,
                user_email: email,
                created_at: new Date().toISOString()
              }
            ]).catch(() => {});
          }
        } catch (e) {
          console.warn('[handleDeleteAccount] Error saving deletion feedback:', e);
        }

        // 1. Delete user photos & story media from storage
        try {
          const { data: userProfiles } = await supabase.from('UserProfile').select('photo_url, photos').eq('user_email', email);
          if (userProfiles && userProfiles.length > 0) {
            for (const p of userProfiles) {
              if (p.photo_url) await base44.integrations.Core.DeleteFile({ file_url: p.photo_url }).catch(() => {});
              if (Array.isArray(p.photos)) {
                for (const photo of p.photos) {
                  const url = typeof photo === 'string' ? photo : photo?.url;
                  if (url) await base44.integrations.Core.DeleteFile({ file_url: url }).catch(() => {});
                }
              }
            }
          }
        } catch (e) {
          console.warn('[handleDeleteAccount] Error deleting profile photos:', e);
        }

        try {
          const { data: userStories } = await supabase.from('Story').select('media_url').eq('user_email', email);
          if (userStories && userStories.length > 0) {
            for (const s of userStories) {
              if (s.media_url) await base44.integrations.Core.DeleteFile({ file_url: s.media_url }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[handleDeleteAccount] Error deleting story media:', e);
        }

        try {
          const { data: userChatMsgs } = await supabase.from('ChatMessage').select('media_url').eq('sender_email', email);
          if (userChatMsgs && userChatMsgs.length > 0) {
            for (const m of userChatMsgs) {
              if (m.media_url) await base44.integrations.Core.DeleteFile({ file_url: m.media_url }).catch(() => {});
            }
          }
        } catch (e) {
          console.warn('[handleDeleteAccount] Error deleting chat photos:', e);
        }

        // 2. Delete all records across all Supabase tables in parallel safely
        const deleteTasks = [
          supabase.from('UserProfile').delete().eq('user_email', email),
          supabase.from('UserDestination').delete().eq('user_email', email),
          supabase.from('VenueCheckIn').delete().eq('user_email', email),
          supabase.from('Like').delete().or(`from_email.eq.${email},to_email.eq.${email}`),
          supabase.from('Hint').delete().or(`from_email.eq.${email},to_email.eq.${email}`),
          supabase.from('GameSession').delete().or(`player1_email.eq.${email},player2_email.eq.${email}`),
          supabase.from('CardGameRound').delete().eq('asker_email', email),
          supabase.from('NumberGameState').delete().eq('player_email', email),
          supabase.from('Notification').delete().or(`from_email.eq.${email},to_email.eq.${email}`),
          supabase.from('Story').delete().eq('user_email', email),
          supabase.from('SearchHistory').delete().eq('user_email', email),
          supabase.from('ChatRoom').delete().or(`user1_email.eq.${email},user2_email.eq.${email}`),
          supabase.from('ChatMessage').delete().eq('sender_email', email),
          supabase.from('SeenProfiles').delete().or(`user_email.eq.${email},seen_user_email.eq.${email}`),
          supabase.from('PremiumSubscription').delete().eq('user_email', email),
          supabase.from('Report').delete().or(`reporter_email.eq.${email},reported_email.eq.${email}`),
        ];

        await Promise.allSettled(deleteTasks);
      }

      // 3. Clear all local auth storage (localStorage, sessionStorage, IndexedDB, cookies)
      authStorage.clearUser();
      try {
        localStorage.removeItem('welove_lang');
        localStorage.removeItem('romety_user_email');
        localStorage.removeItem('seen_chat_room_ids');
        sessionStorage.setItem('romety_splash_shown', 'true');
      } catch (err) {}

      // 4. Sign out from Supabase Auth
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('[handleDeleteAccount] signOut error:', e);
      }

      toast.dismiss(toastId);
      toast.success('Je account is succesvol verwijderd.');

      // 5. Redirect to Language selection page (leads to Onboarding after language is chosen)
      setTimeout(() => {
        window.location.replace('/Language');
      }, 400);

    } catch (e) {
      console.error('Error deleting user account:', e);
      authStorage.clearUser();
      try {
        localStorage.removeItem('welove_lang');
        sessionStorage.setItem('romety_splash_shown', 'true');
        await supabase.auth.signOut();
      } catch (err) {}
      toast.dismiss(toastId);
      toast.success('Je account is verwijderd.');
      window.location.replace('/Language');
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
      toast.error('Typ eerst je feedback');
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

      toast.success('Bedankt voor je feedback! 🙌');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } catch (err) {
      console.error('Feedback error:', err);
      toast.success('Bedankt voor je feedback! 🙌');
      setFeedbackText('');
      setShowFeedbackModal(false);
    } finally {
      setSendingFeedback(false);
    }
  };

  const FAQS = [
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
      className={`min-h-screen max-w-md mx-auto relative ${editing ? 'overflow-hidden max-h-screen pointer-events-none' : ''}`} 
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
              Mijn Account
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
              aria-label="Profiel bewerken"
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
                        <img src={photoUrl} alt={`Foto ${slotIdx + 1}`} className="w-full h-full object-cover select-none" />
                        
                        {/* Slot Badge */}
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[9px] font-bold text-white shadow">
                          {isFirst ? 'Hoofd' : `#${slotIdx + 1}`}
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
                          title="Foto verwijderen"
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
                          {isFirst ? 'Hoofdfoto' : `Foto ${slotIdx + 1}`}
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
                  🎯 Zoekt: {myProfile.relationship_status || myProfile.relationship_goal}
                </span>
              )}
              {myProfile?.looking_for && (
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-pink-500/15 text-pink-400 border border-pink-500/20">
                  ❤️ Zoekt: {getLookingForLabel(myProfile.looking_for)}
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
                    {t}
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
            <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-full mt-0.5" style={{ color: textSub }}>Locaties</span>
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
                  <p className={`text-sm font-bold ${textMain}`}>Land</p>
                  <p className="text-[11px] font-semibold" style={{ color: 'rgba(255,75,114,0.9)' }}>
                    {myProfile?.country || 'Nederland'}
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
                      {name}
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
                <p className={`text-sm font-bold ${textMain}`}>{isDark ? 'Donkere modus' : 'Lichte modus'}</p>
                <p className="text-[11px] font-medium" style={{ color: textSub }}>{isDark ? 'Wissel naar licht thema' : 'Wissel naar donker thema'}</p>
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

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-500/15 text-blue-500">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-sm font-bold ${textMain}`}>Push Notificaties</p>
                <p className="text-[11px] font-medium" style={{ color: textSub }}>Meldingen voor games & hints</p>
              </div>
            </div>
            <button
              onClick={() => {
                const nextVal = !notificationsEnabled;
                setNotificationsEnabled(nextVal);
                toast.success(nextVal ? 'Notificaties ingeschakeld 🔔' : 'Notificaties uitgeschakeld');
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
            <span className={`text-xs font-black uppercase tracking-wider ${textMain}`}>Veelgestelde Vragen</span>
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
            onClick={() => setShowFeedbackModal(true)} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between transition-all active:scale-[0.99]" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className={`font-bold text-xs ${textMain}`}>Feedback geven</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: textSub }} />
          </button>
          
          {/* Logout Button */}
          <button 
            onClick={() => setShowLogoutConfirm(true)} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between transition-all active:scale-[0.99]" 
            style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/15 text-rose-500">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-rose-500">Uitloggen</span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>

          {/* Delete Account Button */}
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            disabled={deleting} 
            className="w-full rounded-2xl p-3.5 flex items-center justify-between border border-red-500/30 transition-all active:scale-[0.99] bg-red-500/5" 
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/20 text-red-500">
                <Trash2 className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-red-500">
                {deleting ? 'Account verwijderen...' : 'Account definitief verwijderen'}
              </span>
            </div>
          </button>

        </div>

      </div>

      {/* ── SLIDE-IN EDIT PROFILE SCREEN (APPLE SETTINGS STYLE) ── */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className={`fixed inset-0 z-[200] ${activeSheet ? 'overflow-hidden pointer-events-none' : 'overflow-y-auto pointer-events-auto'} max-w-md mx-auto flex flex-col overscroll-contain`}
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
                    Account aanpassen
                  </h1>
                  <p className={`text-[11px] font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Pas je gegevens en voorkeuren aan</p>
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
                  Eigen informatie
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
                      <span className={`text-sm font-bold ${textMain}`}>Gebruikersnaam</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.display_name || 'Niet ingesteld'}
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
                      <span className={`text-sm font-bold ${textMain}`}>Leeftijd en eigen lengte</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.age ? `${form.age} jr` : '-'} • {form.height_cm ? `${form.height_cm} cm` : '-'}
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
                        {form.bio ? form.bio : 'Over mij'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </button>

                </div>
              </div>

              {/* Section 2: Interesses */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: textSub }}>
                  Interesses
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
                      <span className={`text-sm font-bold ${textMain}`}>Relatiedoel</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.relationship_status || 'Relatie'}
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
                      <span className={`text-sm font-bold ${textMain}`}>Op zoek naar</span>
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
                      <span className={`text-sm font-bold ${textMain}`}>Eigenschappen</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {(form.traits || []).length > 0 ? `${(form.traits || []).length}/5 gekozen` : 'Kies 3 – 5'}
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
                      <span className={`text-sm font-bold ${textMain}`}>Interesses</span>
                    </div>
                    <div className="flex items-center gap-2 max-w-[50%]">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {(form.interests || []).length > 0 ? `${(form.interests || []).length}/5 gekozen` : 'Kies 3 – 5'}
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
                      <span className={`text-sm font-bold ${textMain}`}>Lengte</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.min_height_pref || 140} – {form.max_height_pref || 210} cm
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
                      <span className={`text-sm font-bold ${textMain}`}>Leeftijd</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold truncate" style={{ color: textSub }}>
                        {form.min_age_pref || 18} – {form.max_age_pref || 70} jr
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
                  {saving ? 'Opslaan...' : 'Wijzigingen opslaan'}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="fixed inset-0 z-[250] pointer-events-auto flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md select-none"
            onTouchMove={(e) => {
              if (e.target === e.currentTarget) e.preventDefault();
            }}
            onClick={handleCloseSubSheet}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 340,
                mass: 0.85
              }}
              className={`relative w-full max-w-sm sm:max-w-md rounded-[28px] sm:rounded-[32px] overflow-hidden p-5 sm:p-6 flex flex-col max-h-[82vh] ${
                activeSheet === 'username'
                  ? '-translate-y-22 sm:-translate-y-24'
                  : activeSheet === 'bio'
                    ? '-translate-y-28 sm:-translate-y-32'
                    : '-translate-y-6 sm:-translate-y-8'
              }`}
              style={{ background: cardBg, border: cardBorder, boxShadow: '0 24px 60px rgba(0,0,0,0.6)' }}
              onClick={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <h3 className={`text-base font-black ${textMain}`}>
                  {activeSheet === 'username' && 'Gebruikersnaam'}
                  {activeSheet === 'gender' && 'Gender'}
                  {activeSheet === 'age_height' && 'Leeftijd en eigen lengte'}
                  {activeSheet === 'bio' && 'Bio / Over mij'}
                  {activeSheet === 'goals' && 'Relatiedoel'}
                  {activeSheet === 'looking_for' && 'Op zoek naar'}
                  {activeSheet === 'traits' && 'Eigenschappen'}
                  {activeSheet === 'interests' && 'Interesses'}
                  {activeSheet === 'height_pref' && 'Lengtevoorkeur matches'}
                  {activeSheet === 'age_pref' && 'Leeftijdsvoorkeur matches'}
                </h3>
                <button
                  onClick={handleCloseSubSheet}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                    color: '#FFFFFF',
                  }}
                  title="Opslaan & Sluiten"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Sheet Content by type */}
              <div className="overflow-y-auto space-y-4 py-1">
                {activeSheet === 'username' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                      Weergavenaam
                    </label>
                    <input
                      type="text"
                      autoFocus
                      className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                      value={form.display_name || ''}
                      onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                      placeholder="Bijv. Koen"
                    />
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      Dit is de naam die andere gebruikers op je profiel zien.
                    </p>
                  </div>
                )}

                {activeSheet === 'gender' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: textSub }}>
                      Wat is jouw gender?
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
                          Leeftijd (jaren)
                        </label>
                        <span className="text-[10px] font-bold text-pink-500">Min. 18 jaar</span>
                      </div>
                      <input
                        type="number"
                        min="18"
                        max="99"
                        className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                        value={form.age || ''}
                        onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                        onBlur={e => {
                          const num = Number(e.target.value);
                          if (num && num < 18) {
                            setForm(f => ({ ...f, age: 18 }));
                            toast.info('Leeftijd is automatisch ingesteld op het minimum van 18 jaar.');
                          }
                        }}
                        placeholder="Bijv. 24"
                      />
                      {form.age && Number(form.age) < 18 && (
                        <p className="text-[11px] font-bold text-red-500 mt-1">
                          ⚠️ Minimale leeftijd is 18 jaar.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase tracking-wider block mb-1.5" style={{ color: textSub }}>
                        Eigen lengte (cm)
                      </label>
                      <input
                        type="number"
                        min="120"
                        max="230"
                        className={`w-full font-bold rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-pink-500 ${isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'}`}
                        value={form.height_cm || ''}
                        onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))}
                        placeholder="Bijv. 182"
                      />
                    </div>
                  </div>
                )}

                {activeSheet === 'bio' && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-bold uppercase tracking-wider block" style={{ color: textSub }}>
                        Bio tekst
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
                      placeholder="Vertel iets leuks over jezelf, je passies of weekendplannen..."
                    />
                  </div>
                )}

                {activeSheet === 'goals' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider block mb-2" style={{ color: textSub }}>
                      Waar ben je naar op zoek?
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
                            <span className="font-bold text-sm">{g}</span>
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
                      Naar wie ben je op zoek?
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
                            Jouw eigenschappen (3 – 5)
                          </p>
                          <span className={`text-[11px] font-black ${
                            isUnderMinTraits ? 'text-red-500 animate-pulse' : 'text-pink-500'
                          }`}>
                            {traitsCount}/5 gekozen {isUnderMinTraits ? '(min. 3 vereist!)' : ''}
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
                                title="Klik om te verwijderen"
                              >
                                <span className="text-lg sm:text-xl leading-none mb-1">{getEmojiForTrait(trait)}</span>
                                <span className={`text-[10px] font-bold truncate max-w-full leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{trait}</span>
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
                          Tik om te selecteren of deselecteren:
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
                                <span>{t.label}</span>
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
                            Jouw interesses (3 – 5)
                          </p>
                          <span className={`text-[11px] font-black ${
                            isUnderMinInterests ? 'text-red-500 animate-pulse' : 'text-pink-500'
                          }`}>
                            {interestsCount}/5 gekozen {isUnderMinInterests ? '(min. 3 vereist!)' : ''}
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
                                title="Klik om te verwijderen"
                              >
                                <span className="text-lg sm:text-xl leading-none mb-1">{getEmojiForInterest(interest)}</span>
                                <span className={`text-[10px] font-bold truncate max-w-full leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>{interest}</span>
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
                          Tik om te selecteren of deselecteren:
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
                                <span>{i.label}</span>
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
                      <span className="text-xs font-bold" style={{ color: textSub }}>Bereik:</span>
                      <span className="text-sm font-black text-pink-500">
                        {form.min_height_pref || 140} – {form.max_height_pref || 210} cm
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>Max. lengte</span>
                          <span className="font-bold text-pink-500">{form.max_height_pref || 210} cm</span>
                        </div>
                        <input
                          type="range"
                          min="140"
                          max="210"
                          value={form.max_height_pref || 210}
                          onChange={e => setForm(f => ({
                            ...f,
                            max_height_pref: Math.max(Number(e.target.value), (f.min_height_pref || 140) + 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>Min. lengte</span>
                          <span className="font-bold text-pink-500">{form.min_height_pref || 140} cm</span>
                        </div>
                        <input
                          type="range"
                          min="140"
                          max="210"
                          value={form.min_height_pref || 140}
                          onChange={e => setForm(f => ({
                            ...f,
                            min_height_pref: Math.min(Number(e.target.value), (f.max_height_pref || 210) - 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      Matches binnen jouw lengtevoorkeur krijgen voorrang op de home- en ontdekpagina.
                    </p>
                  </div>
                )}

                {activeSheet === 'age_pref' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold" style={{ color: textSub }}>Bereik:</span>
                      <span className="text-sm font-black text-pink-500">
                        {form.min_age_pref || 18} – {form.max_age_pref || 70} jaar
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>Max. leeftijd</span>
                          <span className="font-bold text-pink-500">{form.max_age_pref || 70} jaar</span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="70"
                          value={form.max_age_pref || 70}
                          onChange={e => setForm(f => ({
                            ...f,
                            max_age_pref: Math.max(Number(e.target.value), (f.min_age_pref || 18) + 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1">
                          <span style={{ color: textSub }}>Min. leeftijd</span>
                          <span className="font-bold text-pink-500">{form.min_age_pref || 18} jaar</span>
                        </div>
                        <input
                          type="range"
                          min="18"
                          max="70"
                          value={form.min_age_pref || 18}
                          onChange={e => setForm(f => ({
                            ...f,
                            min_age_pref: Math.min(Number(e.target.value), (f.max_age_pref || 70) - 1)
                          }))}
                          className="w-full accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>
                      Profielen binnen deze leeftijdscategorie worden aan jou voorgesteld.
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
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.2 }} 
            className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 backdrop-blur-sm px-6 select-none" 
            onClick={handleCancelMinItemsLeave}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className={`rounded-[28px] w-full max-w-xs p-5 text-center shadow-2xl border ${
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
                Minimaal 3 {minItemsWarningModal === 'traits' ? 'eigenschappen' : 'interesses'} vereist
              </h4>
              <p className={`text-[11px] font-medium leading-relaxed mb-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Je hebt momenteel minder dan 3 {minItemsWarningModal === 'traits' ? 'eigenschappen' : 'interesses'} geselecteerd. Als je nu weggaat, wordt je oude selectie behouden.
              </p>
              <div className="flex gap-2.5">
                <button 
                  type="button"
                  onClick={handleCancelMinItemsLeave} 
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs active:scale-95 transition-all border ${
                    isDark 
                      ? 'border-white/15 text-white bg-white/5 hover:bg-white/10' 
                      : 'border-gray-200 text-gray-700 bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  Annuleren
                </button>
                <button 
                  type="button"
                  onClick={handleConfirmMinItemsLeave} 
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 text-white py-2.5 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-all hover:opacity-95"
                >
                  Ja, ga terug
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: SAVE CONFIRMATION (WARNING MATCHES COULD BE LOST) ── */}
      <AnimatePresence>
        {showSaveConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" 
            onClick={() => setShowSaveConfirm(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-2xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">Account wijzigen?</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                Weet je zeker dat je jouw account wilt opslaan? Je kunt potentiële matches en hints verliezen door het veranderen van je profielgegevens en voorkeuren.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowSaveConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  Annuleren
                </button>
                <button 
                  onClick={executeSave} 
                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:opacity-95"
                >
                  Ja, opslaan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DISCARD CONFIRMATION (WHEN RETURNING WITH UNSAVED CHANGES) ── */}
      <AnimatePresence>
        {showDiscardConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" 
            onClick={handleCancelDiscard}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">Wijzigingen verwerpen?</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                Weet je het zeker? Je hebt aanpassingen gemaakt die nog niet zijn opgeslagen. Als je weggaat, gaan deze verloren.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={handleCancelDiscard} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  Annuleren
                </button>
                <button 
                  onClick={handleConfirmDiscard} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
                >
                  Ja, verwerpen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: PROFILE PREVIEW (MATCHES PAGE SWIPER CARD STYLE) ── */}
      <AnimatePresence>
        {showPreview && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.24 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" 
            onClick={() => setShowPreview(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="w-full max-w-sm h-[560px] rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col justify-end" 
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
                    {form.age || myProfile?.age || '24'} jaar {form.height_cm || myProfile?.height_cm ? `• ${form.height_cm || myProfile.height_cm} cm` : ''}
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
                        {tag}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: LOGOUT CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" 
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <LogOut className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">Uitloggen</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                Weet je het zeker dat je wilt uitloggen bij Romety?
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowLogoutConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  Nee
                </button>
                <button 
                  onClick={handlePerformLogout} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
                >
                  Ja
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" 
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="bg-white dark:bg-[#141521] rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 dark:border-white/10" 
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trash2 className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />
                <h4 className="text-gray-900 dark:text-white font-bold text-xs">Account verwijderen</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium text-[11px] leading-relaxed mb-4">
                Weet je het zeker? Al je matches, hints en overige informatie worden hiermee definitief verwijderd uit de database.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="flex-1 bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white py-2 rounded-xl font-bold text-xs active:scale-95 transition-all hover:bg-gray-200 dark:hover:bg-white/15"
                >
                  Nee
                </button>
                <button 
                  onClick={() => { 
                    setShowDeleteConfirm(false); 
                    setDeleteAnswers({ selectedOption: 'Ik heb iemand gevonden ❤️', customText: '' });
                    setShowDeleteSurvey(true); 
                  }} 
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
                >
                  Ja
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: DELETE SURVEY (BEFORE DEFINITIVE DELETION) ── */}
      <AnimatePresence>
        {showDeleteSurvey && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteSurvey(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className={`w-full max-w-sm p-6 rounded-[28px] shadow-2xl border ${
                isDark ? 'bg-[#141521] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-red-500/10 text-red-500">
                <Trash2 className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-center mb-1">Waarom verlaat je Romety?</h3>
              <p className="text-xs text-center mb-4 leading-relaxed opacity-60">
                We vinden het jammer dat je gaat. Laat ons weten waarom zodat we Romety kunnen verbeteren:
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
                      <span>{opt}</span>
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
                    placeholder="Optioneel: typ hier je reden..."
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
                  Annuleren
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 shadow-md active:scale-95 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {deleting ? (
                    'Verwijderen...'
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Verwijder
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Country Change Warning Modal ── */}
      <AnimatePresence>
        {showCountryWarning && (
          <motion.div
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[110] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', overflowY: 'hidden' }}
            onClick={() => { setShowCountryWarning(false); setPendingCountry(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.90, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className="w-full max-w-xs rounded-[28px] overflow-hidden"
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
                  Land wijzigen?
                </h3>
                <p className={`text-sm text-center mb-1 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  Je wisselt naar <strong className={isDark ? 'text-white' : 'text-gray-900'}>{pendingCountry}</strong>.
                </p>
                <p className="text-sm text-center text-pink-500 font-semibold mb-6">
                  Je verliest je matches in het huidige land.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowCountryWarning(false); setPendingCountry(null); }}
                    className={`flex-1 py-3.5 rounded-2xl font-bold text-sm border transition-all ${isDark ? 'border-white/15 text-white/70 bg-white/5' : 'border-gray-200 text-gray-600 bg-gray-100'}`}
                  >
                    Annuleren
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
                        toast.success(`Land gewijzigd naar ${pendingCountry}`);
                      } catch (e) {
                        console.error('Country save error:', e);
                        toast.error('Kon land niet opslaan: ' + (e?.message || 'onbekende fout'));
                      }
                      setSaving(false);
                      setShowCountryWarning(false);
                      setPendingCountry(null);
                    }}
                    className="flex-1 py-3.5 rounded-2xl font-black text-white text-sm transition-all"
                    style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', boxShadow: '0 8px 20px rgba(255,75,114,0.4)' }}
                  >
                    {saving ? '...' : 'Bevestigen'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL: FEEDBACK ── */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.22 }} 
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowFeedbackModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: "spring", damping: 28, stiffness: 340, mass: 0.85 }}
              className={`relative w-full max-w-xs sm:max-w-sm p-4 sm:p-5 rounded-[24px] shadow-2xl border -translate-y-22 sm:-translate-y-26 ${
                isDark ? 'bg-[#141521] border-white/10 text-white' : 'bg-white border-gray-100 text-gray-900'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-pink-500/15 text-pink-500">
                    <MessageSquare className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <h3 className="text-sm font-black">Feedback of suggestie</h3>
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
                Wat vind je van Romety of wat kunnen we verbeteren? We horen het graag!
              </p>

              <div className="mb-3.5">
                <textarea
                  rows={3}
                  autoFocus
                  className={`w-full rounded-xl border p-3 text-xs resize-none outline-none transition-all ${
                    isDark 
                      ? 'border-white/15 bg-white/5 text-white placeholder-white/40 focus:border-pink-500' 
                      : 'border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-pink-500'
                  }`}
                  placeholder="Typ hier jouw feedback of idee..."
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
                  Annuleren
                </button>
                <button
                  type="button"
                  disabled={sendingFeedback || !feedbackText.trim()}
                  onClick={handleSendFeedback}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md active:scale-95 transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {sendingFeedback ? 'Versturen...' : (
                    <>
                      <Send className="w-3 h-3" />
                      Versturen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}