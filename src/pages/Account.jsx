import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { createPageUrl } from '@/utils';
import { Crown, HelpCircle, LogOut, Camera, ChevronRight, Edit2, Check, X, Trash2, RefreshCw, Moon, Sun } from 'lucide-react';
import { compressImage } from '@/utils/imageUtils';
import PremiumModal from '@/components/welove/PremiumModal';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

const TRAITS = ['Adventurous', 'Creative', 'Ambitious', 'Caring', 'Funny', 'Intellectual', 'Romantic', 'Spontaneous', 'Athletic', 'Laid-back', 'Passionate', 'Loyal'];
const INTERESTS = ['Travel', 'Music', 'Fitness', 'Art', 'Cooking', 'Photography', 'Reading', 'Gaming', 'Dancing', 'Yoga', 'Movies', 'Nature'];



export default function Account() {
  const { lang } = useLang();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const headerBg = isDark ? 'linear-gradient(180deg, #0B0C10 0%, #08090E 100%)' : 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
  const cardBg = isDark ? '#141521' : '#FFFFFF';
  const cardBorder = isDark ? '1.5px solid rgba(255, 75, 114, 0.25)' : 'none';
  const cardShadow = isDark ? '0 0 12px rgba(255, 75, 114, 0.15)' : '0 4px 20px rgba(0,0,0,0.08)';
  const plainCardBg = isDark ? '#141521' : '#FFFFFF';
  const plainCardBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : 'none';
  const plainCardShadow = isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.06)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)';
  const user = useUser();
  const [myProfile, setMyProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [showPremium, setShowPremium] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSurvey, setShowDeleteSurvey] = useState(false);
  const [deleteAnswers, setDeleteAnswers] = useState({ foundMatch: '', reason: '' });
  const [deleting, setDeleting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user !== undefined) loadData(); }, [user]); // undefined = still loading auth

  const loadData = async () => {
    const u = user;
    if (!u) { setLoading(false); return; }

    const profiles = await base44.entities.UserProfile.filter({ user_email: u.email });
    const p = profiles[0] || null;

    // Sync premium
    const now = new Date().toISOString();
    const subs = await base44.entities.PremiumSubscription.filter({ user_email: u.email });
    const activeSub = subs.find(s => s.is_active && s.expires_at > now);
    if (p) {
      const isPremium = !!activeSub;
      if (isPremium !== p.is_premium) {
        await base44.entities.UserProfile.update(p.id, { is_premium: isPremium });
        p.is_premium = isPremium;
      }
    }

    setMyProfile(p);
    setForm({ display_name: p?.display_name || '', bio: p?.bio || '', traits: p?.traits || [], interests: p?.interests || [] });
    setLoading(false);
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !myProfile) return;
    setUploading(true);
    
    // Compress the image before uploading to save storage space and bandwidth
    const compressedFile = await compressImage(file, 800, 800, 0.85);
    
    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
    await base44.entities.UserProfile.update(myProfile.id, { photo_url: file_url });
    setMyProfile(p => ({ ...p, photo_url: file_url }));
    setUploading(false);
  };

  const handleSave = async () => {
    if (!myProfile) return;
    setSaving(true);
    await base44.entities.UserProfile.update(myProfile.id, form);
    setMyProfile(p => ({ ...p, ...form }));
    setSaving(false);
    setEditing(false);
  };

  const toggleLocation = async () => {
    if (!myProfile) return;
    const newVal = !myProfile.location_enabled;
    if (newVal && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {}, // permission granted
        (err) => console.warn('Locatie geweigerd:', err.message),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
    const expires = newVal ? new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() : null;
    await base44.entities.UserProfile.update(myProfile.id, { location_enabled: newVal, location_expires_at: expires });
    setMyProfile(p => ({ ...p, location_enabled: newVal, location_expires_at: expires }));
  };

  const toggleTag = (arr, item, max) => {
    if (arr.includes(item)) return arr.filter(t => t !== item);
    if (arr.length >= max) return arr;
    return [...arr, item];
  };

  const handleUpgrade = () => { setShowPremium(false); setMyProfile(p => ({ ...p, is_premium: true })); };

  const handleCancelPremium = async () => {
    const subs = await base44.entities.PremiumSubscription.filter({ user_email: user.email });
    const activeSub = subs.find(s => s.is_active);
    if (activeSub) await base44.entities.PremiumSubscription.update(activeSub.id, { is_active: false });
    if (myProfile) await base44.entities.UserProfile.update(myProfile.id, { is_premium: false });
    setMyProfile(p => ({ ...p, is_premium: false }));
    setShowCancelConfirm(false);
  };

  const handleLogout = () => setShowLogoutConfirm(true);

  const handleChangeAccount = () => {
    if (myProfile) base44.entities.UserProfile.update(myProfile.id, { onboarding_complete: false });
    window.location.href = createPageUrl('Onboarding');
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    // Delete all user data
    const profiles = await base44.entities.UserProfile.filter({ user_email: user.email });
    for (const p of profiles) await base44.entities.UserProfile.delete(p.id);
    const checkIns = await base44.entities.VenueCheckIn.filter({ user_email: user.email });
    for (const c of checkIns) await base44.entities.VenueCheckIn.delete(c.id);
    const subs = await base44.entities.PremiumSubscription.filter({ user_email: user.email });
    for (const s of subs) await base44.entities.PremiumSubscription.delete(s.id);
    setDeleting(false);
    setShowDeleteSurvey(true);
  };

  const handleSurveySubmit = () => {
    base44.auth.logout();
  };

  const isPremium = myProfile?.is_premium;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: bg }}><div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: bg, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div className="px-5 pt-12 pb-16 rounded-[4px_4px_16px_16px]" style={{ background: headerBg }}>
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-black text-white">{t.account}</h1>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Edit2 className="w-4 h-4 text-white" />
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="rounded-full p-2" style={{ background: 'rgba(255,255,255,0.1)' }}><X className="w-4 h-4 text-white" /></button>
              <button onClick={handleSave} disabled={saving} className="rounded-full p-2 bg-white"><Check className="w-4 h-4" style={{ color: '#FF4B72' }} /></button>
            </div>
          )}
        </div>
      </div>

      {/* Profile card */}
      <div className="px-5 -mt-10">
        <div className="rounded-3xl p-5 mb-4" style={{ background: cardBg, border: cardBorder, boxShadow: cardShadow }}>
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,75,114,0.2)' }}>
                {myProfile?.photo_url ? (
                  <img src={myProfile.photo_url} alt="profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl" style={myProfile?.avatar ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : {}}>
                    {myProfile?.avatar ? myProfile.avatar.split(' ')[0] : '👤'}
                  </div>
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}>
                <Camera className="w-3 h-3 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>

            <div className="flex-1">
              {editing ? (
                <input className="w-full font-bold text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-rose-400" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} />
              ) : (
                <p className={`font-bold ${textMain}`}>{myProfile?.display_name || user?.full_name}</p>
              )}
              <p className="text-xs mt-0.5" style={{ color: textSub }}>{myProfile?.contact_email || user?.email}</p>
              {myProfile?.avatar && (
                <div className="flex items-center gap-1 mt-1 text-orange-500 font-bold text-xs">
                  <span>{myProfile.avatar.split(' ')[0]}</span>
                  <span>{myProfile.avatar.split(' ').slice(1).join(' ')}</span>
                </div>
              )}
              {isPremium && (
                <div className="flex items-center gap-1 mt-1">
                  <Crown className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-bold text-yellow-400">Premium member</span>
                </div>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-4">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: textSub }}>{t.bio}</label>
              <textarea rows={2} className={`w-full mt-1 px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none ${textMain}`} style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid #E5E7EB' }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder={t.bioPlaceholder} />
              <label className="text-xs font-semibold uppercase tracking-wide mt-3 block" style={{ color: textSub }}>{t.traits}</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TRAITS.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, traits: toggleTag(f.traits, t, 8) }))} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all`} style={form.traits.includes(t) ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', color: 'white' } : { background: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', color: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!editing && myProfile?.bio && (
            <p className="text-sm mt-3" style={{ color: textSub }}>{myProfile.bio}</p>
          )}
          {!editing && myProfile?.traits?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {myProfile.traits.map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: 'rgba(255,75,114,0.2)', color: '#FF4B72' }}>{t}</span>
              ))}
            </div>
          )}
        </div>



        {/* Settings list */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: plainCardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
          {/* Dark/Light mode toggle */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: divider }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: isDark ? 'rgba(255,200,50,0.15)' : 'rgba(100,100,200,0.1)' }}>
                {isDark ? <Moon style={{ width: 18, height: 18, color: '#FACC15' }} /> : <Sun style={{ width: 18, height: 18, color: '#FF4B72' }} />}
              </div>
              <div>
                <p className={`text-sm font-semibold ${textMain}`}>{isDark ? 'Donkere modus' : 'Lichte modus'}</p>
                <p className="text-xs" style={{ color: textSub }}>{isDark ? 'Schakel over naar licht' : 'Schakel over naar donker'}</p>
              </div>
            </div>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="w-12 h-6 rounded-full transition-all"
              style={isDark ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : { background: 'rgba(0,0,0,0.12)' }}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-all mx-0.5 ${isDark ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>


        </div>

        {/* FAQ */}
        <div className="rounded-2xl overflow-hidden mb-4" style={{ background: plainCardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: divider }}>
            <HelpCircle className="w-4 h-4" style={{ color: '#FF4B72' }} />
            <span className={`text-sm font-bold ${textMain}`}>{t.faq}</span>
          </div>
          {t.faqs.map((faq, i) => (
            <div key={i} style={{ borderBottom: i < t.faqs.length - 1 ? divider : 'none' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full px-4 py-3.5 text-left flex items-center justify-between">
                <span className={`text-sm font-medium ${textMain}`}>{faq.q}</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} style={{ color: textSub }} />
              </button>
              {openFaq === i && (
                <div className="px-4 pb-3.5">
                  <p className="text-sm" style={{ color: textSub }}>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Change Account */}
        <button onClick={handleChangeAccount} className="w-full rounded-2xl p-4 flex items-center gap-3 mb-3" style={{ background: plainCardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,75,114,0.15)' }}>
            <RefreshCw className="w-4 h-4" style={{ color: '#FF4B72' }} />
          </div>
          <span className={`font-semibold text-sm ${textMain}`}>{t.changeAccount}</span>
        </button>

        {/* Logout */}
        <button onClick={handleLogout} className="w-full rounded-2xl p-4 flex items-center gap-3 mb-3" style={{ background: plainCardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,80,80,0.1)' }}>
            <LogOut className="w-4 h-4 text-red-400" />
          </div>
          <span className="font-semibold text-sm text-red-400">{t.logout}</span>
        </button>

        {/* Delete Account */}
        <button onClick={() => setShowDeleteConfirm(true)} disabled={deleting} className="w-full rounded-2xl p-4 flex items-center gap-3 mb-4" style={{ background: plainCardBg, border: '1px solid rgba(255,80,80,0.2)', boxShadow: plainCardShadow }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,80,80,0.1)' }}>
            <Trash2 className="w-4 h-4 text-red-500" />
          </div>
          <span className="font-semibold text-sm text-red-400">{deleting ? t.deleting : t.deleteAccount}</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5" onClick={() => setShowLogoutConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.logoutConfirmTitle}</h3>
            <p className="text-gray-500 text-sm mb-6">{t.logoutConfirmBody}</p>
            <button onClick={() => base44.auth.logout()} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold mb-3">{t.logoutYes}</button>
            <button onClick={() => setShowLogoutConfirm(false)} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">{t.confirmNo}</button>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-5" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.deleteConfirmTitle}</h3>
            <p className="text-gray-500 text-sm mb-6">{t.deleteConfirmBody}</p>
            <button onClick={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }} className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold mb-3">{t.deleteYes}</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">{t.confirmNo}</button>
          </div>
        </div>
      )}

      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-10" onClick={e => e.stopPropagation()} style={{ animation: 'slideUp 0.3s ease-out' }}>
            <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{t.cancelPremiumTitle}</h3>
            <p className="text-gray-500 text-sm mb-6">{t.cancelPremiumBody}</p>
            <button onClick={handleCancelPremium} className="w-full bg-red-500 text-white py-4 rounded-2xl font-bold mb-3">
              {t.cancelYes}
            </button>
            <button onClick={() => setShowCancelConfirm(false)} className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-bold">
              {t.cancelNo}
            </button>
          </div>
        </div>
      )}

      {showDeleteSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[28px] w-full max-w-sm p-6" style={{ animation: 'modalIn 0.3s ease-out', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}>
            <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }`}</style>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">👋</div>
              <h3 className="text-xl font-black text-gray-900">{t.accountDeleted}</h3>
              <p className="text-sm text-gray-400 mt-1">{t.beforeLeaving}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-800 mb-2">{t.foundMatch}</p>
              <div className="flex gap-2">
                {[t.yes, t.no].map(opt => (
                  <button
                    key={opt}
                    onClick={() => setDeleteAnswers(a => ({ ...a, foundMatch: opt }))}
                    className={`flex-1 py-3 rounded-[14px] text-sm font-bold border-2 transition-all ${deleteAnswers.foundMatch === opt ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-gray-100 text-gray-600 bg-gray-50'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-5">
              <p className="text-sm font-bold text-gray-800 mb-2">{t.deleteReason}</p>
              <textarea
                rows={3}
                className="w-full rounded-[14px] border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:border-orange-400"
                placeholder={t.deleteReasonPh}
                value={deleteAnswers.reason}
                onChange={e => setDeleteAnswers(a => ({ ...a, reason: e.target.value }))}
              />
            </div>
            <button
              onClick={handleSurveySubmit}
              className="w-full py-4 rounded-[18px] font-black text-white text-base"
              style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
            >
              {t.confirmClose}
            </button>
          </div>
        </div>
      )}

      {showPremium && (
        <PremiumModal
          onClose={() => setShowPremium(false)}
          onUpgrade={handleUpgrade}
          userProfile={myProfile}
        />
      )}
    </div>
  );
}