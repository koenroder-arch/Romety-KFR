import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Camera, ArrowLeft, X } from 'lucide-react';
import { compressImage } from '@/utils/imageUtils';
import { useLang } from '@/lib/LanguageContext';
import { T as GlobalT } from '@/lib/translations';
import { toast } from 'sonner';

const AVATAR_CATEGORIES = {
  'Zoogdieren': [
    { name: 'Leeuw', emoji: '🦁' },
    { name: 'Olifant', emoji: '🐘' },
    { name: 'Kangoeroe', emoji: '🦘' },
    { name: 'Dolfijn', emoji: '🐬' },
    { name: 'Jachtluipaard', emoji: '🐆' },
    { name: 'Ijsbeer', emoji: '🐻‍❄️' },
    { name: 'Gorilla', emoji: '🦍' },
    { name: 'Vleermuis', emoji: '🦇' },
    { name: 'Kameel', emoji: '🐫' },
    { name: 'Egel', emoji: '🦔' },
  ],
  'Vogels': [
    { name: 'Adelaar', emoji: '🦅' },
    { name: 'Pinguïn', emoji: '🐧' },
    { name: 'Kolibrie', emoji: '🐦' },
    { name: 'Uil', emoji: '🦉' },
    { name: 'Flamingo', emoji: '🦩' },
    { name: 'Zwaan', emoji: '🦢' },
    { name: 'Specht', emoji: '🐦' },
  ],
  'Reptielen': [
    { name: 'Kameleon', emoji: '🦎' },
    { name: 'Krokodil', emoji: '🐊' },
    { name: 'Schildpad', emoji: '🐢' },
    { name: 'Salamander', emoji: '🦎' },
    { name: 'Kikker', emoji: '🐸' },
  ],
  'Zeedieren': [
    { name: 'Haai', emoji: '🦈' },
    { name: 'Inktvis', emoji: '🐙' },
    { name: 'Zeester', emoji: '⭐' },
    { name: 'Koraalduivel', emoji: '🐠' },
    { name: 'Zwaardvis', emoji: '🐟' },
  ],
  'Overig': [
    { name: 'Vlinder', emoji: '🦋' },
    { name: 'Libelle', emoji: '🪲' },
    { name: 'Vuurvliegje', emoji: '💡' },
  ]
};

const STEPS = ['basics', 'preferences', 'traits', 'photo'];
const GRAD = { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' };

const T = {
  nl: {
    subtitle: 'Stel je profiel in',
    step0title: 'Vertel ons over jezelf',
    firstName: 'Voornaam', firstNamePh: 'Jouw naam',
    email: 'E-mail', emailPh: 'jouw@email.nl',
    age: 'Leeftijd (min. 18)', agePh: '25', ageError: 'Minimumleeftijd is 18 jaar',
    height: 'Lengte (cm)', heightPh: '170',
    gender: 'Geslacht', male: 'Man', female: 'Vrouw', nonbinary: 'Non-binary',
    lookingFor: 'Wat zoek je in een match?',
    rel: ['Relatie', 'Fun time', 'Ik weet het nog niet'],
    step1title: 'Jouw voorkeuren',
    iLookFor: 'Ik zoek', both: 'Beide',
    agePref: (min, max) => `Leeftijdsvoorkeur: ${min} – ${max} jaar`,
    heightPref: (min, max) => `Lengtevoorkeur: ${min} – ${max} cm`,
    min: 'Min', max: 'Max',
    bio: 'Bio (optioneel)', bioPh: 'Vertel iets over jezelf...',
    step2title: 'Jouw persoonlijkheid',
    traitsLabel: 'Eigenschappen (3–5)', interestsLabel: 'Interesses (3–5)',
    step3title: 'Voeg je foto toe',
    photoSub: 'Een profielfoto is verplicht om matches te kunnen zien.',
    uploadTap: 'Tik om een foto te uploaden', required: 'Verplicht ⚠️',
    uploading: 'Uploaden...', changePhoto: 'Andere foto kiezen',
    continue: 'Doorgaan →', finish: 'Start met verkennen',
  },
  en: {
    subtitle: 'Set up your profile',
    step0title: 'Tell us about yourself',
    firstName: 'First name', firstNamePh: 'Your name',
    email: 'E-mail', emailPh: 'you@email.com',
    age: 'Age (min. 18)', agePh: '25', ageError: 'Minimum age is 18',
    height: 'Height (cm)', heightPh: '170',
    gender: 'Gender', male: 'Male', female: 'Female', nonbinary: 'Non-binary',
    lookingFor: 'What are you looking for?',
    rel: ['Relationship', 'Fun time', 'Not sure yet'],
    step1title: 'Your preferences',
    iLookFor: 'I\'m looking for', both: 'Both',
    agePref: (min, max) => `Age preference: ${min} – ${max}`,
    heightPref: (min, max) => `Height preference: ${min} – ${max} cm`,
    min: 'Min', max: 'Max',
    bio: 'Bio (optional)', bioPh: 'Tell something about yourself...',
    step2title: 'Your personality',
    traitsLabel: 'Traits (3–5)', interestsLabel: 'Interests (3–5)',
    step3title: 'Add your photo',
    photoSub: 'A profile photo is required to see matches.',
    uploadTap: 'Tap to upload a photo', required: 'Required ⚠️',
    uploading: 'Uploading...', changePhoto: 'Choose different photo',
    continue: 'Continue →', finish: 'Start exploring',
  },
};

export default function Onboarding() {
  const { lang } = useLang();
  const t = T[lang] || T.nl;
  const gt = GlobalT[lang] || GlobalT.nl;
  const TRAITS = gt.onbTraits;
  const INTERESTS = gt.onbInterests;
  const [step, setStep] = useState(0);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [form, setForm] = useState({
    display_name: '', contact_email: '', age: '', gender: '', height_cm: '',
    relationship_status: '', looking_for: '', min_age_pref: 18, max_age_pref: 19,
    min_height_pref: 140, max_height_pref: 141,
    traits: [], interests: [], photo_url: '', bio: '', agreed_to_terms: false,
    avatar: '',
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        setUser(u);
        
        const existing = await base44.entities.UserProfile.filter({ user_email: u.email.toLowerCase().trim() });
        if (existing && existing.length > 0) {
          const profile = existing[0];
          if (profile.onboarding_complete === true) {
            window.location.replace('/');
            return;
          }
          setForm(f => ({
            ...f,
            contact_email: u.email,
            display_name: profile.display_name || '',
            age: profile.age ? String(profile.age) : '',
            gender: profile.gender || '',
            height_cm: profile.height_cm ? String(profile.height_cm) : '',
            relationship_status: profile.relationship_status || '',
            looking_for: profile.looking_for || '',
            min_age_pref: profile.min_age_pref !== undefined ? profile.min_age_pref : 18,
            max_age_pref: profile.max_age_pref !== undefined ? profile.max_age_pref : 19,
            min_height_pref: profile.min_height_pref !== undefined ? profile.min_height_pref : 140,
            max_height_pref: profile.max_height_pref !== undefined ? profile.max_height_pref : 141,
            traits: profile.traits || [],
            interests: profile.interests || [],
            photo_url: profile.photo_url || '',
            bio: profile.bio || '',
            avatar: profile.avatar || '',
          }));
          if (profile.photo_url) {
            setPhotoPreview(profile.photo_url);
          }
        } else {
          setForm(f => ({ ...f, contact_email: u.email }));
        }
      } catch (err) {
        console.error('Onboarding auth error:', err);
        base44.auth.redirectToLogin(window.location.href);
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#08090E]">
        <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const canContinue = () => {
    if (uploading) return false;
    if (step === 0) return !!(form.display_name && form.avatar && form.age && Number(form.age) >= 18 && form.gender && form.height_cm && form.relationship_status && form.agreed_to_terms);
    if (step === 1) return !!(form.looking_for);
    if (step === 2) return form.traits.length >= 3 && form.interests.length >= 2;
    if (step === 3) return !!form.photo_url;
    return true;
  };

  const toggleTrait = (label) => {
    const arr = form.traits;
    if (arr.includes(label)) { setForm(f => ({ ...f, traits: arr.filter(t => t !== label) })); return; }
    if (arr.length < 5) { setForm(f => ({ ...f, traits: [...arr, label] })); }
  };

  const toggleInterest = (label) => {
    const arr = form.interests;
    if (arr.includes(label)) { setForm(f => ({ ...f, interests: arr.filter(t => t !== label) })); return; }
    if (arr.length < 5) { setForm(f => ({ ...f, interests: [...arr, label] })); }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoPreview(URL.createObjectURL(file));
    setUploading(true);

    const compressedFile = await compressImage(file);

    const { file_url } = await base44.integrations.Core.UploadFile({ file: compressedFile });
    setForm(f => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const doSave = async () => {
    if (!user) return;
    const existing = await base44.entities.UserProfile.filter({ user_email: user.email });
    const { agreed_to_terms, ...cleanedForm } = form;
    
    const data = { 
      ...cleanedForm, 
      age: Number(form.age), 
      height_cm: Number(form.height_cm), 
      user_email: user.email, 
      onboarding_complete: true 
    };
    
    if (existing?.length > 0) {
      await base44.entities.UserProfile.update(existing[0].id, data);
    } else {
      await base44.entities.UserProfile.create(data);
    }
  };

  const nextStep = async () => {
    if (step < STEPS.length - 1) { 
      setStep(s => s + 1); 
    } else {
      try {
        await doSave();
        window.location.replace(createPageUrl('Pinpoint'));
      } catch (err) {
        console.error('Error saving onboarding data:', err);
        toast.error(lang === 'nl' ? 'Er is iets misgegaan bij het opslaan. Probeer het opnieuw.' : 'Something went wrong while saving. Please try again.');
      }
    }
  };

  const inputCls = "w-full mt-1 px-4 py-3.5 rounded-[16px] border border-white/10 focus:outline-none focus:border-pink-400 bg-white/5 text-white placeholder-white/30 text-sm transition-all focus:bg-white/10";
  const chipActive = (active) => active ? { ...GRAD, color: 'white' } : {};
  const chipCls = (active, disabled) => `py-3 rounded-[14px] text-sm font-semibold transition-all ${active ? 'text-white' : disabled ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed' : 'bg-white/5 border border-white/10 text-white/80 hover:border-[#FF4B72]/30 hover:text-white'}`;

  return (
    <div className="min-h-screen flex flex-col items-center" style={{ background: '#08090E', fontFamily: "'Inter', sans-serif" }}>

      <div className="w-full max-w-md px-5 pt-10 pb-12">
        {/* Logo */}
         <div className="text-center mb-6">
           <h1
             className="font-black tracking-tight leading-none"
             style={{
               fontSize: '2.4rem',
               background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
               WebkitBackgroundClip: 'text',
               WebkitTextFillColor: 'transparent',
               letterSpacing: '-0.02em',
             }}
           >
             ROMETY
           </h1>
           <div className="flex items-center justify-center gap-2 mt-1 mb-1">
             <div className="h-px w-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
             <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50">Connect &amp; Meet</span>
             <div className="h-px w-6" style={{ background: 'rgba(255,255,255,0.15)' }} />
           </div>
           <p className="text-white/40 text-sm mt-1">{t.subtitle}</p>
         </div>

        {/* Progress + back */}
        <div className="flex items-center gap-2 mb-8">
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-[#FF4B72] transition-colors" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : <div className="w-8 flex-shrink-0" />}
          {STEPS.map((s, i) => (
            <div key={s} className="h-1.5 flex-1 rounded-full transition-all duration-500" style={i <= step ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : { background: 'rgba(255,255,255,0.1)' }} />
          ))}
        </div>

        {/* Step 0: Basics */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">{t.step0title}</h2>

            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.firstName}</label>
              <input className={inputCls} placeholder={t.firstNamePh} value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Kies jouw Avatar</label>
              <button 
                type="button"
                onClick={() => setShowAvatarModal(true)}
                className="w-full mt-1 px-4 py-3.5 rounded-[16px] border border-white/10 flex items-center justify-between bg-white/5 text-white text-sm hover:border-pink-400/50 transition-colors"
                style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                {form.avatar ? (
                  <span className="flex items-center gap-2 font-bold text-white">
                    <span className="text-xl">{form.avatar.split(' ')[0]}</span>
                    <span>{form.avatar.split(' ').slice(1).join(' ')}</span>
                  </span>
                ) : (
                  <span className="text-white/30">Selecteer een avatar...</span>
                )}
                <span className="text-[#FF4B72] font-bold text-xs">Kies</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.age}</label>
                <input type="number" min="18" max="100" className={inputCls} placeholder={t.agePh} value={form.age}
                  onChange={e => setForm(f => ({ ...f, age: e.target.value }))}
                  style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                {form.age && Number(form.age) < 18 && <p className="text-red-400 text-xs mt-1 font-semibold">{t.ageError}</p>}
              </div>
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.height}</label>
                <input type="number" min="140" max="220" className={inputCls} placeholder={t.heightPh} value={form.height_cm} onChange={e => setForm(f => ({ ...f, height_cm: e.target.value }))} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.gender}</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['male', 'female', 'non-binary'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, gender: g }))} className={chipCls(form.gender === g)} style={chipActive(form.gender === g)}>
                    {g === 'male' ? t.male : g === 'female' ? t.female : t.nonbinary}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.lookingFor}</label>
              <div className="flex flex-col gap-2 mt-1">
                {t.rel.map(r => (
                  <button key={r} onClick={() => setForm(f => ({ ...f, relationship_status: r }))} className={`py-3.5 px-4 rounded-[14px] text-sm font-semibold text-left transition-all border ${form.relationship_status === r ? 'text-white border-transparent' : 'bg-white/5 border-white/10 text-white/80 hover:border-[#FF4B72]/30'}`} style={form.relationship_status === r ? { ...GRAD, boxShadow: '0 6px 20px rgba(255,75,114,0.35)' } : { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-3 mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,75,114,0.08)', border: '1px solid rgba(255,75,114,0.2)' }}>
              <input 
                type="checkbox" 
                id="terms" 
                checked={form.agreed_to_terms}
                onChange={e => setForm(f => ({ ...f, agreed_to_terms: e.target.checked }))}
                className="mt-1 w-5 h-5 rounded border-white/10 text-pink-500 bg-white/5 focus:ring-pink-500 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-white/70 leading-relaxed cursor-pointer select-none">
                Ik bevestig dat ik <strong>18 jaar of ouder</strong> ben en ga akkoord met de <a href="#" onClick={(e) => { e.preventDefault(); alert('Algemene Voorwaarden Placeholder'); }} className="text-[#FF4B72] font-bold underline">Algemene Voorwaarden</a> en het <a href="#" onClick={(e) => { e.preventDefault(); alert('Privacybeleid Placeholder'); }} className="text-[#FF4B72] font-bold underline">Privacybeleid</a>.
              </label>
            </div>
          </div>
        )}

        {/* Step 1: Preferences */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-white">{t.step1title}</h2>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.iLookFor}</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {['male', 'female', 'both'].map(g => (
                  <button key={g} onClick={() => setForm(f => ({ ...f, looking_for: g }))} className={chipCls(form.looking_for === g)} style={chipActive(form.looking_for === g)}>
                    {g === 'male' ? t.male : g === 'female' ? t.female : t.both}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.agePref(form.min_age_pref, form.max_age_pref)}</label>
              <div className="space-y-3 mt-3 bg-white/5 border border-white/10 rounded-[16px] p-4" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-8">{t.min}</span>
                  <input type="range" min="18" max="70" value={form.min_age_pref} onChange={e => setForm(f => ({ ...f, min_age_pref: Math.min(Number(e.target.value), f.max_age_pref - 1) }))} className="flex-1 accent-[#FF4B72]" />
                  <span className="text-sm font-black text-[#FF4B72] w-8 text-right">{form.min_age_pref}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-8">{t.max}</span>
                  <input type="range" min="18" max="70" value={form.max_age_pref} onChange={e => setForm(f => ({ ...f, max_age_pref: Math.max(Number(e.target.value), f.min_age_pref + 1) }))} className="flex-1 accent-[#FF4B72]" />
                  <span className="text-sm font-black text-[#FF4B72] w-8 text-right">{form.max_age_pref}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.heightPref(form.min_height_pref, form.max_height_pref)}</label>
              <div className="space-y-3 mt-3 bg-white/5 border border-white/10 rounded-[16px] p-4" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-8">{t.min}</span>
                  <input type="range" min="140" max="210" value={form.min_height_pref} onChange={e => setForm(f => ({ ...f, min_height_pref: Math.min(Number(e.target.value), f.max_height_pref - 1) }))} className="flex-1 accent-[#FF4B72]" />
                  <span className="text-sm font-black text-[#FF4B72] w-10 text-right">{form.min_height_pref}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-8">{t.max}</span>
                  <input type="range" min="140" max="210" value={form.max_height_pref} onChange={e => setForm(f => ({ ...f, max_height_pref: Math.max(Number(e.target.value), f.min_height_pref + 1) }))} className="flex-1 accent-[#FF4B72]" />
                  <span className="text-sm font-black text-[#FF4B72] w-10 text-right">{form.max_height_pref}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.bio}</label>
              <textarea rows={3} className={`${inputCls} resize-none`} placeholder={t.bioPh} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </div>
          </div>
        )}

        {/* Step 2: Traits & Interests */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white">{t.step2title}</h2>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.traitsLabel}</label>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${form.traits.length >= 3 ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'}`}>{form.traits.length}/5</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {TRAITS.map(({ label, emoji }) => {
                  const sel = form.traits.includes(label);
                  const maxed = form.traits.length >= 5 && !sel;
                  return (
                    <button key={label} onClick={() => !maxed && toggleTrait(label)}
                      className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5 ${sel ? 'text-white border-transparent' : maxed ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed' : 'bg-white/5 border border-white/10 text-white/80 hover:border-[#FF4B72]/30 hover:text-white'}`}
                      style={sel ? GRAD : {}}
                    ><span>{emoji}</span>{label}</button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-bold text-white/40 uppercase tracking-wider">{t.interestsLabel}</label>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${form.interests.length >= 2 ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'}`}>{form.interests.length}/5</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map(({ label, emoji }) => {
                  const sel = form.interests.includes(label);
                  const maxed = form.interests.length >= 5 && !sel;
                  return (
                    <button key={label} onClick={() => !maxed && toggleInterest(label)}
                      className={`px-3.5 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5 ${sel ? 'text-white border-transparent' : maxed ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed' : 'bg-white/5 border border-white/10 text-white/80 hover:border-[#FF4B72]/30 hover:text-white'}`}
                      style={sel ? GRAD : {}}
                    ><span>{emoji}</span>{label}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Photo */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-xl font-black text-white">{t.step3title}</h2>
            <p className="text-white/60 text-sm">{t.photoSub}</p>
            <label className="block cursor-pointer">
              <div className={`w-full h-72 rounded-[24px] border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${photoPreview ? 'border-pink-400' : 'border-white/10 hover:border-pink-400/50 bg-white/5'}`} style={!photoPreview ? { boxShadow: '0 10px 30px rgba(0,0,0,0.15)' } : {}}>
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center px-6">
                    <div className="w-16 h-16 rounded-full bg-pink-500/10 flex items-center justify-center mx-auto mb-3">
                      <Camera className="w-8 h-8 text-[#FF4B72]" />
                    </div>
                    <p className="text-white/80 text-sm font-semibold">{t.uploadTap}</p>
                    <p className="text-[#FF4B72] text-xs mt-1 font-semibold">{t.required}</p>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </label>
            {uploading && <p className="text-center text-pink-500 text-sm font-semibold animate-pulse">{t.uploading}</p>}
            {photoPreview && !uploading && (
              <label className="flex items-center justify-center gap-2 cursor-pointer text-sm font-semibold text-[#FF4B72]">
                <Camera className="w-4 h-4" /> {t.changePhoto}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            )}
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={nextStep}
          disabled={!canContinue()}
          className="w-full mt-8 py-4 rounded-[18px] font-black text-base transition-all"
          style={canContinue()
            ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', color: 'white', boxShadow: '0 10px 30px rgba(255,75,114,0.45)' }
            : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.05)', cursor: 'not-allowed' }
          }
        >
          {step === STEPS.length - 1 ? t.finish : t.continue}
        </button>
      </div>

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-5 animate-fade-in"
          style={{ background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setShowAvatarModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-[28px] overflow-hidden flex flex-col border transition-all"
            style={{ 
              background: '#141521', 
              borderColor: 'rgba(255,255,255,0.1)',
              maxHeight: '80vh',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              <h3 className="font-black text-white text-lg">Kies een Avatar</h3>
              <button 
                onClick={() => setShowAvatarModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list of categories and avatars */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {Object.entries(AVATAR_CATEGORIES).map(([category, items]) => (
                <div key={category}>
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2.5">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {items.map(({ name, emoji }) => {
                      const avatarStr = `${emoji} ${name}`;
                      const isSelected = form.avatar === avatarStr;
                      return (
                        <button
                          key={name}
                          onClick={() => {
                            setForm(f => ({ ...f, avatar: avatarStr }));
                            setShowAvatarModal(false);
                          }}
                          className={`flex items-center gap-2 px-3 py-3 rounded-xl border text-left transition-all ${isSelected ? 'border-pink-500 bg-pink-500/10 text-pink-400 font-bold' : 'border-white/10 bg-white/5 text-white/80 hover:border-pink-500/30'}`}
                          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                        >
                          <span className="text-xl">{emoji}</span>
                          <span className="text-xs">{name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}