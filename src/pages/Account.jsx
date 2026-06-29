import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { 
  LogOut, Camera, ChevronRight, Edit2, Check, X, Trash2, 
  RefreshCw, Moon, Sun, Eye, Heart, Gamepad2, Sparkles, MapPin,
  Bell, HelpCircle, User, MessageCircle, ArrowRightLeft, AlertTriangle
} from 'lucide-react';
import { compressImage } from '@/utils/imageUtils';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';

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

export default function Account() {
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
  const [showPreview, setShowPreview] = useState(false);
  const [form, setForm] = useState({});

  // Swap Workflow States
  const [pendingNewTrait, setPendingNewTrait] = useState(null);
  const [pendingNewInterest, setPendingNewInterest] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  // Real Stats matching Home/Games/Matches exact logic
  const [stats, setStats] = useState({ games: 0, hints: 0, matches: 0 });

  // Toggles & Modals
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSurvey, setShowDeleteSurvey] = useState(false);
  const [deleteAnswers, setDeleteAnswers] = useState({ foundMatch: '', reason: '' });
  
  const [openFaq, setOpenFaq] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (user !== undefined) loadData(); 
  }, [user]);

  const loadData = async () => {
    const u = user;
    if (!u) { setLoading(false); return; }

    try {
      const [profiles, gameSessP1, gameSessP2, likesISent, likesIReceived, userStories] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.GameSession.filter({ player1_email: u.email }),
        base44.entities.GameSession.filter({ player2_email: u.email }),
        base44.entities.Like.filter({ from_email: u.email }),
        base44.entities.Like.filter({ to_email: u.email }),
        base44.entities.Story.filter({ user_email: u.email }),
      ]);

      const p = profiles[0] || null;
      setMyProfile(p);
      setForm({
        display_name: p?.display_name || u.full_name || '',
        age: p?.age || '',
        height_cm: p?.height_cm || '',
        relationship_status: p?.relationship_status || p?.relationship_goal || 'Relatie',
        bio: p?.bio || '',
        traits: Array.isArray(p?.traits) ? p.traits : [],
        interests: Array.isArray(p?.interests) ? p.interests : []
      });

      // Calculate exact games count (active + pending) matching Home.jsx & Games.jsx
      const allGameSess = [...(gameSessP1 || []), ...(gameSessP2 || [])];
      const seenGames = new Set();
      const uniqGames = allGameSess.filter(s => { if (seenGames.has(s.id)) return false; seenGames.add(s.id); return true; });
      const activeAndPendingCount = uniqGames.filter(s => s.status === 'active' || s.status === 'pending').length;

      // Calculate exact supermatches count matching Home.jsx & Matches.jsx
      const iLiked = new Set((likesISent || []).map(l => l.to_email));
      const likedMe = new Set((likesIReceived || []).map(l => l.from_email));
      const mutualEmails = [...iLiked].filter(e => likedMe.has(e));
      const supermatchCount = mutualEmails.length;

      setStats({
        games: activeAndPendingCount,
        stories: (userStories || []).length,
        matches: supermatchCount
      });
    } catch (e) {
      console.error('Failed to load profile data:', e);
    }
    setLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !myProfile) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(file, 800, 800, 0.85);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
      await base44.entities.UserProfile.update(myProfile.id, { photo_url: file_url });
      setMyProfile(p => ({ ...p, photo_url: file_url }));
      toast.success('Profielfoto bijgewerkt! 📸');
    } catch (err) {
      console.error(err);
      toast.error('Kan foto niet uploaden');
    }
    setUploading(false);
  };

  // Initiates checkmark click -> triggers modal
  const handleInitiateSave = () => {
    if (pendingNewTrait || pendingNewInterest) {
      toast.error('Tik eerst op een van jouw rode keuzes om het verwisselen af te ronden!');
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

      const updatedData = {
        display_name: form.display_name || u.full_name || '',
        age: form.age ? parseInt(form.age, 10) : null,
        relationship_status: form.relationship_status || 'Relatie',
        bio: form.bio || '',
        traits: form.traits || [],
        interests: form.interests || [],
        user_email: u.email
      };

      if (targetProfile && targetProfile.id) {
        await base44.entities.UserProfile.update(targetProfile.id, updatedData);
        setMyProfile(p => ({ ...p, ...updatedData }));
      } else {
        const created = await base44.entities.UserProfile.create({ ...updatedData, onboarding_complete: true });
        setMyProfile(created);
      }

      setEditing(false);
      toast.success('Account gewijzigd en opgeslagen in database! ✨');
    } catch (e) {
      console.error('Save error details:', e);
      toast.error('Fout bij opslaan: ' + (e?.message || 'Probeer het opnieuw'));
    }
    setSaving(false);
  };

  // Trait selection & swap logic
  const handleSelectNewTrait = (newTraitLabel) => {
    setPendingNewTrait(newTraitLabel);
  };

  const handleSwapOldTrait = (oldTraitLabel) => {
    if (!pendingNewTrait) return;
    setForm(f => ({
      ...f,
      traits: (f.traits || []).map(t => t === oldTraitLabel ? pendingNewTrait : t)
    }));
    toast.success(`"${oldTraitLabel}" verwisseld voor "${pendingNewTrait}"! ✨`);
    setPendingNewTrait(null);
  };

  // Interest selection & swap logic
  const handleSelectNewInterest = (newInterestLabel) => {
    setPendingNewInterest(newInterestLabel);
  };

  const handleSwapOldInterest = (oldInterestLabel) => {
    if (!pendingNewInterest) return;
    setForm(f => ({
      ...f,
      interests: (f.interests || []).map(i => i === oldInterestLabel ? pendingNewInterest : i)
    }));
    toast.success(`"${oldInterestLabel}" verwisseld voor "${pendingNewInterest}"! ✨`);
    setPendingNewInterest(null);
  };

  const handlePerformLogout = async () => {
    try {
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
    }
    window.location.href = createPageUrl('Onboarding');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const email = user.email;

      // 1. Delete profiles & photos
      const profiles = await base44.entities.UserProfile.filter({ user_email: email });
      for (const p of profiles) {
        if (p.photo_url) await base44.integrations.Core.DeleteFile({ file_url: p.photo_url }).catch(e => console.error(e));
        await base44.entities.UserProfile.delete(p.id);
      }

      // 2. Delete check-ins & destinations
      const checkIns = await base44.entities.VenueCheckIn.filter({ user_email: email });
      for (const c of checkIns) await base44.entities.VenueCheckIn.delete(c.id);

      const dests = await base44.entities.UserDestination.filter({ user_email: email });
      for (const d of dests) await base44.entities.UserDestination.delete(d.id);

      // 3. Delete likes (sent & received)
      const likesSent = await base44.entities.Like.filter({ from_email: email });
      for (const l of likesSent) await base44.entities.Like.delete(l.id);
      const likesRec = await base44.entities.Like.filter({ to_email: email });
      for (const l of likesRec) await base44.entities.Like.delete(l.id);

      // 4. Delete hints (sent & received)
      const hintsSent = await base44.entities.Hint.filter({ from_email: email });
      for (const h of hintsSent) await base44.entities.Hint.delete(h.id);
      const hintsRec = await base44.entities.Hint.filter({ to_email: email });
      for (const h of hintsRec) await base44.entities.Hint.delete(h.id);

      // 5. Delete game sessions
      const games1 = await base44.entities.GameSession.filter({ player1_email: email });
      for (const g of games1) await base44.entities.GameSession.delete(g.id);
      const games2 = await base44.entities.GameSession.filter({ player2_email: email });
      for (const g of games2) await base44.entities.GameSession.delete(g.id);

      // 6. Delete notifications
      const notifs1 = await base44.entities.Notification.filter({ from_email: email });
      for (const n of notifs1) await base44.entities.Notification.delete(n.id);
      const notifs2 = await base44.entities.Notification.filter({ to_email: email });
      for (const n of notifs2) await base44.entities.Notification.delete(n.id);

      // 7. Delete stories & search history
      const stories = await base44.entities.Story.filter({ user_email: email });
      for (const s of stories) {
        if (s.media_url) await base44.integrations.Core.DeleteFile({ file_url: s.media_url }).catch(e => console.error(e));
        await base44.entities.Story.delete(s.id);
      }
      const searches = await base44.entities.SearchHistory.filter({ user_email: email });
      for (const s of searches) await base44.entities.SearchHistory.delete(s.id);

      setShowDeleteSurvey(true);
    } catch (e) {
      console.error('Error deleting user data:', e);
      toast.error('Er is een fout opgetreden bij het wissen van gegevens.');
    }
    setDeleting(false);
  };

  const handleSurveySubmit = async () => {
    try {
      await base44.auth.logout();
    } catch (e) {
      console.error(e);
    }
    window.location.href = createPageUrl('Onboarding');
  };

  const FAQS = [
    { q: "Hoe werken de Supermatches?", a: "Wanneer jij en iemand anders elkaar als supermatch markeren of naar dezelfde uitgaanslocatie gaan, ontgrendelen jullie interactieve games en directe berichten!" },
    { q: "Wat zijn Hints?", a: "Met hints kun je anoniem of direct een leuk berichtje sturen naar matches in dezelfde club of bar om het ijs te breken." },
    { q: "Hoe werkt het Nummer Spel?", a: "In dit spel raad je om en om het telefoonnummer van je match Lingo-stijl. De winnaar krijgt direct het telefoonnummer!" },
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
    <div className="min-h-screen pb-36 select-none" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      
      {/* Top Header Background */}
      <div className="px-5 pt-14 sm:pt-16 pb-20 relative overflow-hidden" style={{ background: headerBg }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Mijn Account</h1>
            <p className={`text-xs mt-1 font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>Beheer je profiel en voorkeuren</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
            <button
              onClick={() => setShowPreview(true)}
              className={`px-3 py-2 rounded-2xl font-black text-xs flex items-center gap-1.5 backdrop-blur-md border shadow-sm transition-all active:scale-95 ${
                isDark 
                  ? 'bg-white/10 border-white/15 text-pink-300 hover:bg-white/20' 
                  : 'bg-white/90 border-pink-200 text-pink-600 hover:bg-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Voorvertoning
            </button>

            {!editing ? (
              <button 
                onClick={() => {
                  setEditing(true);
                  setPendingNewTrait(null);
                  setPendingNewInterest(null);
                }} 
                className={`p-2 rounded-2xl backdrop-blur-md border transition-all active:scale-95 ${
                  isDark ? 'bg-white/10 border-white/15 text-white hover:bg-white/20' : 'bg-white/90 border-gray-200 text-gray-800'
                }`}
              >
                <Edit2 className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditing(false);
                    setPendingNewTrait(null);
                    setPendingNewInterest(null);
                  }} 
                  className={`p-2.5 rounded-2xl backdrop-blur-md border ${isDark ? 'bg-white/10 border-white/15 text-white' : 'bg-white/90 border-gray-200 text-gray-800'}`}
                >
                  <X className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleInitiateSave} 
                  disabled={saving} 
                  className="p-2.5 rounded-2xl text-white bg-gradient-to-r from-rose-500 to-pink-600 shadow-md active:scale-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="px-5 -mt-12 relative z-10 max-w-md mx-auto space-y-4">

        {/* ── Profile Card & Editor ── */}
        <div className="rounded-[28px] p-5" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          
          <div className="flex items-center gap-4">
            {/* Avatar Photo */}
            <label className="relative flex-shrink-0 cursor-pointer group">
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} disabled={uploading} />
              <div className="w-20 h-20 rounded-2xl overflow-hidden p-[2.5px] bg-gradient-to-tr from-pink-500 via-rose-400 to-purple-400 shadow-md transition-transform group-active:scale-95">
                <div className={`w-full h-full rounded-2xl overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin" />
                  ) : myProfile?.photo_url ? (
                    <img src={myProfile.photo_url} alt="profile" className="w-full h-full object-cover" />
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
              {editing ? (
                <div className="space-y-2">
                  <input 
                    className={`w-full font-bold rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-pink-400 ${
                      isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'
                    }`} 
                    value={form.display_name} 
                    onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} 
                    placeholder="Gebruikersnaam / Weergavenaam"
                  />
                  <div>
                    <input 
                      type="number"
                      className={`w-full font-bold rounded-xl px-3 py-1 text-xs outline-none ${
                        isDark ? 'bg-white/10 text-white border border-white/15' : 'bg-gray-100 text-gray-900 border border-gray-200'
                      }`} 
                      value={form.age} 
                      onChange={e => setForm(f => ({ ...f, age: e.target.value }))} 
                      placeholder="Leeftijd"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <h2 className={`font-black text-lg truncate ${textMain}`}>
                    {myProfile?.display_name || user?.full_name}
                    {myProfile?.age ? `, ${myProfile.age}` : ''}
                  </h2>
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
                    {myProfile?.height_cm && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'}`}>
                        📏 {myProfile.height_cm} cm
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* EDIT FORM DETAILS */}
          {editing ? (
            <div className="mt-5 pt-4 space-y-5" style={{ borderTop: divider }}>
              
              {/* Relatiedoel */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider block mb-1.5" style={{ color: textSub }}>
                  Relatiedoel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map(g => (
                    <button
                      key={g}
                      onClick={() => setForm(f => ({ ...f, relationship_status: g }))}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all text-center border ${
                        form.relationship_status === g
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent shadow-sm'
                          : isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bio with counter */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider block" style={{ color: textSub }}>
                    Bio / Over mij
                  </label>
                  <span className="text-[10px] font-bold text-gray-400">
                    {(form.bio || '').length}/250
                  </span>
                </div>
                <textarea 
                  rows={3} 
                  maxLength={250}
                  className={`w-full px-3.5 py-2.5 rounded-2xl text-xs resize-none outline-none font-medium ${
                    isDark ? 'bg-white/8 text-white border border-white/12 focus:border-pink-500' : 'bg-gray-100 text-gray-900 border border-gray-200 focus:border-pink-500'
                  }`} 
                  value={form.bio} 
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} 
                  placeholder="Vertel iets leuks over jezelf..." 
                />
              </div>

              {/* ── EIGENSCHAPPEN SWAP SECTION ── */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider block" style={{ color: textSub }}>
                    Eigenschappen (max 1 verwisselen)
                  </label>
                </div>

                {/* ACTIVE EIGENSCHAPPEN */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400">
                    {pendingNewTrait 
                      ? <span className="text-red-500 font-black animate-pulse">⚠️ Tik op een van jouw RODE eigenschappen om te verwisselen met "{pendingNewTrait}"!</span>
                      : "Jouw huidige keuzes:"
                    }
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(form.traits || []).map(t => (
                      <button
                        key={t}
                        onClick={() => pendingNewTrait && handleSwapOldTrait(t)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                          pendingNewTrait 
                            ? 'bg-red-500/25 border-red-500 text-red-400 animate-pulse cursor-pointer shadow-md' 
                            : 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-transparent'
                        }`}
                      >
                        <span>{getEmojiForTrait(t)}</span>
                        <span>{t}</span>
                        {pendingNewTrait && <ArrowRightLeft className="w-3 h-3 text-red-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AVAILABLE NEW TRAITS TO CHOOSE FROM */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-gray-400">Nieuwe eigenschap kiezen om te verwisselen:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {TRAITS_LIST.filter(t => !(form.traits || []).includes(t.label)).map(t => {
                      const isPending = pendingNewTrait === t.label;
                      return (
                        <button
                          key={t.label}
                          onClick={() => handleSelectNewTrait(t.label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                            isPending 
                              ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                              : isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20' : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span>{t.emoji}</span>
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── INTERESSES SWAP SECTION ── */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black uppercase tracking-wider block" style={{ color: textSub }}>
                    Interesses (max 1 verwisselen)
                  </label>
                </div>

                {/* ACTIVE INTERESSES */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-gray-400">
                    {pendingNewInterest 
                      ? <span className="text-red-500 font-black animate-pulse">⚠️ Tik op een van jouw RODE interesses om te verwisselen met "{pendingNewInterest}"!</span>
                      : "Jouw huidige keuzes:"
                    }
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(form.interests || []).map(i => (
                      <button
                        key={i}
                        onClick={() => pendingNewInterest && handleSwapOldInterest(i)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                          pendingNewInterest 
                            ? 'bg-red-500/25 border-red-500 text-red-400 animate-pulse cursor-pointer shadow-md' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-transparent'
                        }`}
                      >
                        <span>{getEmojiForInterest(i)}</span>
                        <span>{i}</span>
                        {pendingNewInterest && <ArrowRightLeft className="w-3 h-3 text-red-400" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AVAILABLE NEW INTERESTS TO CHOOSE FROM */}
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] font-bold text-gray-400">Nieuwe interesse kiezen om te verwisselen:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {INTERESTS_LIST.filter(i => !(form.interests || []).includes(i.label)).map(i => {
                      const isPending = pendingNewInterest === i.label;
                      return (
                        <button
                          key={i.label}
                          onClick={() => handleSelectNewInterest(i.label)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                            isPending 
                              ? 'bg-amber-400/20 border-amber-400 text-amber-300 font-bold shadow-sm'
                              : isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20' : 'bg-gray-100 border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <span>{i.emoji}</span>
                          <span>{i.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* NON-EDITING DISPLAY VIEW */
            <div className="mt-4 pt-3 space-y-3" style={{ borderTop: divider }}>
              {(myProfile?.relationship_status || myProfile?.relationship_goal) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/20">
                    🎯 Zoekt: {myProfile.relationship_status || myProfile.relationship_goal}
                  </span>
                </div>
              )}

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
          )}

        </div>

        {/* ── Mijn Statistieken Dashboard ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl p-3.5 text-center flex flex-col items-center justify-center" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-pink-500/15 text-pink-500">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <span className={`text-lg font-black ${textMain}`}>{stats.games}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: textSub }}>Games</span>
          </div>

          <div className="rounded-2xl p-3.5 text-center flex flex-col items-center justify-center" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-amber-500/15 text-amber-500">
              <Camera className="w-4 h-4" />
            </div>
            <span className={`text-lg font-black ${textMain}`}>{stats.stories}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: textSub }}>Stories</span>
          </div>

          <div className="rounded-2xl p-3.5 text-center flex flex-col items-center justify-center" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1.5 bg-purple-500/15 text-purple-500">
              <Heart className="w-4 h-4" />
            </div>
            <span className={`text-lg font-black ${textMain}`}>{stats.matches}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: textSub }}>Super</span>
          </div>
        </div>

        {/* ── Settings & Preferences ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          
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
                  <p className="text-xs leading-relaxed font-medium" style={{ color: textSub }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Account Actions ── */}
        <div className="space-y-2.5 pt-2">
          
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

      {/* ── MODAL: SAVE CONFIRMATION (NORMAL NOTIFICATION STYLE & SMALLER) ── */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" onClick={() => setShowSaveConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-500 flex-shrink-0" />
              <h4 className="text-gray-900 font-bold text-xs">Account wijzigen</h4>
            </div>
            <p className="text-gray-600 font-medium text-[11px] leading-relaxed mb-4">
              Weet je zeker dat je account wordt veranderd? Je kan matches en hints verliezen door het veranderen van je account.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSaveConfirm(false)} 
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
              >
                Nee
              </button>
              <button 
                onClick={executeSave} 
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PROFILE PREVIEW (MATCHES PAGE SWIPER CARD STYLE) ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-sm h-[560px] rounded-[32px] overflow-hidden relative shadow-2xl flex flex-col justify-end" onClick={e => e.stopPropagation()}>
            
            {/* Close Button */}
            <button 
              onClick={() => setShowPreview(false)} 
              className="absolute top-4 right-4 z-30 p-2 rounded-full bg-black/40 text-white backdrop-blur-md border border-white/20 hover:bg-black/60 transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Top Badge */}
            <div className="absolute top-4 left-4 z-30 pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-black/40 text-pink-300 backdrop-blur-md border border-white/20">
                👁️ Voorvertoning op Matches
              </span>
            </div>

            {/* Photo Background */}
            <div className="absolute inset-0 z-0 bg-gray-900">
              {myProfile?.photo_url ? (
                <img src={myProfile.photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-[100px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                    {myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}
                  </div>
                </div>
              )}
              {/* Gradient overlay to make text readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
            </div>

            {/* Foreground Card Content matching MatchesSwiper */}
            <div className="relative z-10 p-6 flex flex-col pointer-events-auto">
              {/* Name / Age / Height */}
              <h2 className="text-[28px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                {myProfile?.age || '24'} jaar {myProfile?.height_cm ? `• ${myProfile.height_cm} cm` : ''}
              </h2>

              {/* Tags (Avatar first, then interests/traits) */}
              <div className="flex flex-wrap gap-1.5 mb-5 items-center">
                {myProfile?.avatar && (
                  <span className="px-3.5 py-1 rounded-full text-[13px] font-bold text-white bg-black/45 backdrop-blur-md border-2 border-pink-500/50 shadow-sm flex items-center gap-1.5">
                    <span className="text-sm">{myProfile.avatar.split(' ')[0]}</span>
                    <span className="text-pink-100">{myProfile.avatar.split(' ').slice(1).join(' ')}</span>
                  </span>
                )}
                {[...(myProfile?.interests || []).slice(0, 2), ...(myProfile?.traits || []).slice(0, 1)].map((tag) => (
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
        </div>
      )}

      {/* ── MODAL: LOGOUT CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <LogOut className="w-4.5 h-4.5 text-rose-500 flex-shrink-0" />
              <h4 className="text-gray-900 font-bold text-xs">Uitloggen</h4>
            </div>
            <p className="text-gray-600 font-medium text-[11px] leading-relaxed mb-4">
              Weet je het zeker dat je wilt uitloggen bij Romety?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowLogoutConfirm(false)} 
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
              >
                Nee
              </button>
              <button 
                onClick={handlePerformLogout} 
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE CONFIRM (NORMAL NOTIFICATION STYLE) ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs px-6" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xs p-4 text-center shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trash2 className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />
              <h4 className="text-gray-900 font-bold text-xs">Account verwijderen</h4>
            </div>
            <p className="text-gray-600 font-medium text-[11px] leading-relaxed mb-4">
              Weet je het zeker? Al je matches, hints en overige informatie worden hiermee definitief verwijderd uit de database.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className="flex-1 bg-red-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all hover:bg-red-700"
              >
                Nee
              </button>
              <button 
                onClick={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }} 
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 text-white py-2 rounded-xl font-bold text-xs shadow-xs active:scale-95 transition-all"
              >
                Ja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE SURVEY ── */}
      {showDeleteSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-2">👋</div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Account Verwijderd</h3>
            <p className="text-xs text-gray-500 mb-5">Laat ons weten waarom je weggaat zodat we Romety kunnen verbeteren:</p>
            
            <div className="text-left mb-4">
              <p className="text-xs font-bold text-gray-800 mb-2">Heb je een match gevonden via Romety?</p>
              <div className="flex gap-2">
                {['Ja! 🎉', 'Nee 😔'].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDeleteAnswers(a => ({ ...a, foundMatch: opt }))}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${deleteAnswers.foundMatch === opt ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-gray-100 text-gray-600 bg-gray-50'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-left mb-5">
              <p className="text-xs font-bold text-gray-800 mb-2">Reden voor vertrek (optioneel):</p>
              <textarea
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-800 resize-none outline-none focus:border-pink-400"
                placeholder="Vertel ons kort je reden..."
                value={deleteAnswers.reason}
                onChange={e => setDeleteAnswers(a => ({ ...a, reason: e.target.value }))}
              />
            </div>

            <button
              onClick={handleSurveySubmit}
              className="w-full py-3.5 rounded-2xl font-black text-white text-sm bg-gradient-to-r from-pink-500 to-rose-600 shadow-md"
            >
              Sluiten & Afmelden
            </button>
          </div>
        </div>
      )}

    </div>
  );
}