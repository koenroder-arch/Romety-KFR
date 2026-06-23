import React, { useState } from 'react';
import { MapPin, X, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';

export default function HintCard({ hint, isDark, onReacted, isSuperMatch }) {
  const [expanded, setExpanded] = useState(false);
  const [reacting, setReacting] = useState(false);
  const user = useUser();

  const hasReacted = user && (hint.heart_reactions || []).includes(user.email);

  const handleHeart = async (e) => {
    e.stopPropagation();
    if (!user || reacting) return;
    setReacting(true);
    try {
      if (hasReacted) {
        // Unlike: remove user's email from the reactions array
        const updated = (hint.heart_reactions || []).filter((email) => email !== user.email);
        await base44.entities.Hint.update(hint.id, { heart_reactions: updated });
      } else {
        // Like: add user's email to the reactions array
        const updated = [...(hint.heart_reactions || []), user.email];
        await base44.entities.Hint.update(hint.id, { heart_reactions: updated });

        // Fetch current user's name
        const myProfs = await base44.entities.UserProfile.filter({ user_email: user.email });
        const myName = myProfs[0]?.display_name || user.email.split('@')[0];

        // Send notification to the hint creator
        await base44.entities.Notification.create({
          to_email: hint.from_email,
          from_email: user.email,
          type: 'like',
          from_name: myName,
          venue_name: `Je hint: "${hint.message}"`
        });
      }
    } catch (err) {
      console.error("Error toggling reaction to hint:", err);
    } finally {
      setReacting(false);
      if (onReacted) onReacted();
    }
  };

  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const cardBg = isDark ? '#1E1E35' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const timeStr = hint.created_date ? format(new Date(hint.created_date), 'd MMM · HH:mm', { locale: nl }) : '';

  return (
    <>
      {/* Compact card */}
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.99]"
        style={{
          background: cardBg,
          border: isSuperMatch ? '1.5px solid #EA3FD3' : `1px solid ${divider}`,
          boxShadow: isSuperMatch ? (isDark ? '0 0 12px rgba(234, 63, 211, 0.35)' : '0 4px 16px rgba(234, 63, 211, 0.15)') : 'none',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Small blurred avatar */}
          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,75,114,0.15)' }}>
            {hint.from_photo_url ? (
              <img src={hint.from_photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div 
                className="w-full h-full flex items-center justify-center text-lg"
                style={hint.from_avatar ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : {}}
              >
                {hint.from_avatar ? hint.from_avatar.split(' ')[0] : '👤'}
              </div>
            )}
          </div>

          {/* Hint message — main focus */}
          <div className="flex-1 min-w-0">
            <div
              className="px-3 py-2 rounded-xl rounded-tl-none text-sm font-black mb-1.5"
              style={{
                background: isDark ? 'linear-gradient(135deg, rgba(255,75,114,0.12), rgba(234,63,211,0.08))' : 'linear-gradient(135deg, rgba(255,75,114,0.08), rgba(234,63,211,0.05))',
                color: textMain,
                border: isDark ? '1px solid rgba(255,75,114,0.25)' : '1px solid rgba(255,75,114,0.15)'
              }}
            >
              ✨ {hint.message}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#FF4B72' }} />
              <span className="text-[10px] font-bold" style={{ color: '#FF4B72' }}>{hint.venue_name}</span>
              <span className="text-[10px]" style={{ color: textSub }}>· {timeStr}</span>
            </div>
          </div>
        </div>

        {/* Right side container */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hint.from_avatar && (
            <div className="px-2.5 py-1 rounded-full text-white font-black text-[11px] flex items-center gap-1 shadow-sm" style={{ background: '#FF4B72' }}>
              <span>{hint.from_avatar.split(' ')[0]}</span>
              <span>{hint.from_avatar.split(' ').slice(1).join(' ')}</span>
            </div>
          )}

          {(hint.heart_reactions || []).length > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-full" style={{ background: hasReacted ? 'rgba(255,75,110,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${hasReacted ? 'rgba(255,75,110,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
              <Heart className="w-3 h-3" fill={hasReacted ? '#FF4B6E' : 'none'} style={{ color: hasReacted ? '#FF4B6E' : textSub }} />
              <span className="text-[10px] font-black" style={{ color: hasReacted ? '#FF4B6E' : textMain }}>
                {hint.heart_reactions.length}
              </span>
            </div>
          )}
        </div>
      </button>

      {/* Popup overlay */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
        >
          <div
            className="w-full max-w-sm rounded-[28px] overflow-hidden relative h-[560px] cursor-pointer transition-all"
            style={{
              background: '#0A0E21',
              border: isSuperMatch ? '1.5px solid #EA3FD3' : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isSuperMatch ? '0 0 24px rgba(234, 63, 211, 0.4)' : 'none',
            }}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => { e.stopPropagation(); handleHeart(e); }}
          >
            {/* Background photo */}
            <div className="absolute inset-0 z-0 bg-gray-900">
              {hint.from_photo_url ? (
                <img src={hint.from_photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
              ) : (
                <div 
                  className="w-full h-full flex flex-col items-center justify-center relative" 
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                >
                  <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                    {hint.from_avatar ? hint.from_avatar.split(' ')[0] : '👤'}
                  </div>
                  {hint.from_avatar && (
                    <div className="absolute bottom-40 text-center text-white/50 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                      {hint.from_avatar.split(' ').slice(1).join(' ')}
                    </div>
                  )}
                </div>
              )}
              {/* Gradient overlay to make text readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
            </div>

            {/* Top Right Avatar Badge */}
            {hint.from_avatar && (
              <div className="absolute top-4 right-14 z-20">
                <div className="px-3.5 py-1.5 rounded-full text-white font-black text-xs shadow-md tracking-wide bg-pink-500/90 border border-white/20 backdrop-blur-sm flex items-center gap-1">
                  <span>{hint.from_avatar.split(' ')[0]}</span>
                  <span>{hint.from_avatar.split(' ').slice(1).join(' ')}</span>
                </div>
              </div>
            )}

            {/* Top Close Button */}
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90 transition-transform"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Foreground Content */}
            <div className="relative z-10 flex flex-col h-full p-6 pointer-events-none">
              
              {/* Top Section: Hint speech bubble + venue details */}
              <div className="flex flex-col items-start mt-6">
                <div 
                  className="px-4 py-3 rounded-2xl rounded-tl-none text-base font-black border border-white/10 backdrop-blur-sm max-w-[85%] text-white" 
                  style={{ background: 'linear-gradient(135deg, rgba(255,75,114,0.35), rgba(234,63,211,0.25))' }}
                >
                  ✨ {hint.message}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-white/80 text-[11px] font-semibold pl-2">
                  <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                  <span>{hint.venue_name}</span>
                  <span>·</span>
                  <span>{timeStr}</span>
                </div>
              </div>

              {/* Bottom Section: Profile Details & Like Action */}
              <div className="mt-auto pointer-events-auto flex flex-col">
                {/* Age */}
                {hint.from_age && (
                  <h2 className="text-[30px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                    {hint.from_age} jaar
                  </h2>
                )}

                {/* Traits */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {hint.from_traits?.length > 0 && hint.from_traits.slice(0, 3).map(trait => (
                    <span key={trait} className="px-3.5 py-1.5 rounded-full text-[13px] font-bold text-white bg-black/35 backdrop-blur-[2px] shadow-sm">
                      {trait}
                    </span>
                  ))}
                </div>

                {/* Like Button */}
                <button
                  onClick={handleHeart}
                  disabled={reacting}
                  className="w-full py-3.5 px-4 rounded-full border border-white/20 bg-black/35 backdrop-blur-sm flex items-center justify-center gap-2.5 text-white font-bold text-[16px] active:scale-95 transition-transform"
                >
                  <Heart className="w-5 h-5" color={hasReacted ? '#FF5A43' : 'white'} fill={hasReacted ? '#FF5A43' : 'transparent'} strokeWidth={2.5} />
                  {hasReacted ? 'Geliked! ❤️' : 'Like Bericht'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}