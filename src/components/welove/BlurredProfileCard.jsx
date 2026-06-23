import React from 'react';
import { Crown, MapPin } from 'lucide-react';

export default function BlurredProfileCard({ profile, isPremium, compatibility, hasSameVenue, onUpgrade }) {
  const goldStyle = isPremium
    ? { animation: 'goldPulse 2s ease-in-out infinite', border: '1.5px solid rgba(255,223,100,0.6)', boxShadow: '0 0 12px rgba(255,215,0,0.2)' }
    : { border: '1.5px solid #FF4B72', boxShadow: '0 0 12px rgba(255,75,114,0.15)' };

  return (
    <>
      <style>{`
        @keyframes goldPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.25); }
          50%       { box-shadow: 0 0 18px rgba(255,215,0,0.15); }
        }
      `}</style>
    <div className="relative bg-white rounded-3xl overflow-hidden wl-card cursor-pointer" style={goldStyle}>
      {/* Photo */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-pink-100">
        {profile.photo_url ? (
          <>
            <img
              src={profile.photo_url}
              alt="Match"
              className={`w-full h-full object-cover transition-all duration-500 ${isPremium ? '' : 'blur-2xl scale-110'}`}
            />
            {!isPremium && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
                <button
                  onClick={e => { e.stopPropagation(); onUpgrade(); }}
                  className="wl-btn rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg"
                >
                  <Crown className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-bold">Unlock</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div 
              className={`w-full h-full flex items-center justify-center text-5xl transition-all duration-500 ${isPremium ? '' : 'blur-2xl scale-110'}`}
              style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
            >
              {profile.avatar ? profile.avatar.split(' ')[0] : '👤'}
            </div>
            {!isPremium && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 backdrop-blur-sm">
                <button
                  onClick={e => { e.stopPropagation(); onUpgrade(); }}
                  className="wl-btn rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg"
                >
                  <Crown className="w-3.5 h-3.5 text-white" />
                  <span className="text-white text-xs font-bold">Unlock</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Compatibility badge */}
        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow">
          <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>{compatibility}%</span>
        </div>

        {/* Same venue badge */}
        {hasSameVenue && (
          <div className="absolute top-2.5 left-2.5 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow">
            <MapPin className="w-3 h-3" /> Same spot
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="font-bold text-gray-900 text-sm">{profile.age} years</span>
          {profile.height_cm && (
            <span className="text-gray-400 text-xs">· {profile.height_cm} cm</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {profile.avatar && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-pink-100 text-pink-700 flex items-center gap-0.5">
              <span>{profile.avatar.split(' ')[0]}</span>
              <span>{profile.avatar.split(' ').slice(1).join(' ')}</span>
            </span>
          )}
          {profile.traits?.length > 0 && (
            profile.traits.slice(0, 2).map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                {t}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
    </>
  );
}