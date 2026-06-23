import React, { useState } from 'react';
import { isMatch } from '@/lib/matchUtils';
import { MapPin, Lock, Star, Crown, X } from 'lucide-react';
import { useLang } from '@/lib/LanguageContext';
import { T } from '@/lib/translations';
import { useTheme } from '@/lib/ThemeContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

// Unsplash nightlife photos (deterministic by club index)
const CLUB_PHOTOS = [
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
  'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=400&q=80',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&q=80',
  'https://images.unsplash.com/photo-1485872299829-c673f5194813?w=400&q=80',
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
  'https://images.unsplash.com/photo-1504196606672-aef5c9cefc92?w=400&q=80'
];

export default function RelevantClubs({ clubs, allDestinations, allProfiles, myProfile, onGoHere, onEnableLocation, onShowPremium, onVenueNavigate }) {
  const { lang } = useLang();
  const t = T[lang] || T.nl;
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [selectedClub, setSelectedClub] = useState(null);
  const [unlockedClubs, setUnlockedClubs] = useState(new Set());
  const [tappedProfile, setTappedProfile] = useState(null); // { profile, dest }

  const cardBg = isDark ? '#2D2D3A' : '#FFFFFF';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
  const cardShadow = isDark ? 'none' : '0 4px 12px rgba(0,0,0,0.05)';
  const textTitleColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)';
  const textNameColor = isDark ? 'text-white' : 'text-gray-900';
  const textCityColor = isDark ? 'text-gray-400' : 'text-gray-500';
  const emptyBg = isDark ? '#1E1E30' : '#FFFFFF';
  const emptyBorder = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)';
  const modalBg = isDark ? '#1E1E30' : '#FFFFFF';
  const modalBorder = isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.08)';
  const modalTextMain = isDark ? 'text-white' : 'text-gray-900';
  const modalTextSub = isDark ? 'text-gray-400' : 'text-gray-500';

  const clubsWithData = clubs.map((club) => {
    const going = allDestinations.filter((d) => d.venue_id === club.id || d.venue_name === club.name);
    const goingProfiles = going.map((d) => allProfiles.find((p) => p.user_email === d.user_email)).filter(Boolean);
    const matchGoingCount = goingProfiles.filter((p) => isMatch(myProfile, p)).length;
    return { ...club, goingCount: going.length, goingProfiles, matchGoingCount };
  }).filter((c) => c.goingCount > 0).sort((a, b) => b.matchGoingCount - a.matchGoingCount || b.goingCount - a.goingCount);

  return (
    <div className="mt-6">
      <h3 className="bg-transparent mb-4 text-xs font-bold uppercase tracking-widest opacity-100" style={{ color: textTitleColor }}>
        {t.relevantClubs}
      </h3>

      {clubsWithData.length === 0 ? (
        <div className="rounded-[20px] p-5 text-center shadow-sm" style={{ background: emptyBg, border: emptyBorder, boxShadow: cardShadow }}>
          <p className="text-2xl mb-2">🎉🪩🍻</p>
          <p className="text-sm leading-relaxed" style={{ color: textCityColor }}>
            {t.noPlansYet}
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {clubsWithData.map((club, idx) => {
            const photo = CLUB_PHOTOS[idx % CLUB_PHOTOS.length];
            const fakeRating = (4.0 + (idx % 5) * 0.1).toFixed(1);

            return (
              <div
                key={club.id}
                className="flex-shrink-0 rounded-[20px] overflow-hidden"
                style={{ width: 180, background: cardBg, border: cardBorder, boxShadow: cardShadow }}
              >
                {/* Photo & Info Clickable Area */}
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (onVenueNavigate) {
                      onVenueNavigate({ venue_id: club.id, venue_name: club.name, lat: club.lat, lng: club.lng });
                    }
                  }}
                >
                  {/* Photo */}
                  <div className="relative h-28 overflow-hidden">
                    <img src={photo} alt={club.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(10,10,20,0.85) 100%)' }} />
                    {club.matchGoingCount > 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: 'rgba(168,85,247,0.85)', backdropFilter: 'blur(4px)' }}>
                        {club.matchGoingCount} matches
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 pb-0">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className={`font-bold ${textNameColor} text-sm leading-tight truncate`}>{club.name}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-yellow-400 font-bold">{fakeRating}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs ${textCityColor}`}>{club.city}</span>
                      <span className={`text-xs ${textCityColor}`}>{club.goingCount} {t.going}</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Profile Locks & Upgrade Area */}
                <div className="p-3 pt-0">
                  {/* Blurred profiles — show placeholders if no real profiles yet */}
                  {(club.goingProfiles.length > 0 || club.goingCount > 0) && (
                    <div className="flex gap-1.5 mb-3">
                      {(club.goingProfiles.length > 0
                        ? club.goingProfiles.slice(0, 4)
                        : Array(Math.min(club.goingCount, 4)).fill(null)
                      ).map((profile, i) => {
                        if (!profile) return (
                          <div
                            key={i}
                            className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden relative flex items-center justify-center text-sm"
                            style={{ background: 'rgba(168,85,247,0.2)', border: '2px solid rgba(168,85,247,0.4)' }}
                          >
                            <span>👤</span>
                            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                              <Lock className="w-3 h-3 text-white drop-shadow" />
                            </div>
                          </div>
                        );
                        const dest = allDestinations.find((d) => d.user_email === profile.user_email);
                        return (
                          <button
                            key={i}
                            className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden relative"
                            style={{ border: '2px solid rgba(168,85,247,0.5)' }}
                            onClick={() => setTappedProfile({ profile, dest })}
                          >
                            {profile.photo_url ? (
                              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(4px)', transform: 'scale(1.1)' }} />
                            ) : (
                              <div 
                                className="w-full h-full flex items-center justify-center text-sm" 
                                style={{ background: 'rgba(168,85,247,0.2)', filter: 'blur(4px)', transform: 'scale(1.1)' }}
                              >
                                {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
                              </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Lock className="w-3 h-3 text-white drop-shadow" />
                            </div>
                          </button>
                        );
                      })}
                      {club.goingCount > 4 && (
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white" style={{ background: 'rgba(168,85,247,0.2)', border: '2px solid rgba(168,85,247,0.3)' }}>
                          +{club.goingCount - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Premium upgrade button */}
                  <button
                    onClick={() => onShowPremium && onShowPremium()}
                    className="w-full py-2 rounded-[12px] text-xs font-bold flex items-center justify-center gap-1.5"
                    style={{ background: 'linear-gradient(135deg,#f5f3ff,#fdf2fb)', color: '#8E54E9' }}
                  >
                    <Crown className="w-3 h-3" />
                    Upgrade naar Premium
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tapped profile popup */}
      {tappedProfile && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 3000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setTappedProfile(null)}
        >
          <div
            className="relative rounded-[28px] p-6 mx-6 text-center"
            style={{ background: modalBg, border: modalBorder, maxWidth: 300, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setTappedProfile(null)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
            >
              <X className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#000000' }} />
            </button>

            {/* Blurred photo */}
            <div className="w-24 h-24 rounded-[20px] overflow-hidden mx-auto mb-4 relative" style={{ border: '2px solid rgba(168,85,247,0.5)' }}>
              {tappedProfile.profile.photo_url ? (
                <img src={tappedProfile.profile.photo_url} alt="" className="w-full h-full object-cover" style={{ filter: 'blur(6px)', transform: 'scale(1.15)' }} />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-4xl" 
                  style={{ background: 'rgba(168,85,247,0.2)', filter: 'blur(6px)', transform: 'scale(1.15)' }}
                >
                  {tappedProfile.profile.avatar ? tappedProfile.profile.avatar.split(' ')[0] : '👤'}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>

            <p className={`font-black text-lg mb-1 ${modalTextMain}`}>
              {tappedProfile.profile.age ? `${tappedProfile.profile.age} jaar` : 'Profiel'}
            </p>
            {tappedProfile.dest?.venue_name && (
              <p className={`text-sm mb-4 ${modalTextSub}`}>📍 {tappedProfile.dest.venue_name}</p>
            )}

            {/* Navigate to venue */}
            {tappedProfile.dest && (
              <button
                onClick={() => {
                  setTappedProfile(null);
                  if (onVenueNavigate) onVenueNavigate(tappedProfile.dest);
                }}
                className="w-full py-3 rounded-[14px] text-white text-sm font-bold flex items-center justify-center gap-2 mb-3"
                style={{ background: GRAD, boxShadow: '0 6px 20px rgba(142,84,233,0.4)' }}
              >
                <MapPin className="w-4 h-4" />
                Ga naar {tappedProfile.dest.venue_name}
              </button>
            )}

            {/* Premium upsell */}
            <button
              onClick={() => {
                setTappedProfile(null);
                if (onShowPremium) onShowPremium();
              }}
              className="w-full py-3 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#f5f3ff,#fdf2fb)', color: '#8E54E9' }}
            >
              <Crown className="w-4 h-4" />
              Unlock met Welove Premium
            </button>
          </div>
        </div>
      )}
    </div>
  );
}