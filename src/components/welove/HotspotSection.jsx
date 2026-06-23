import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Users, Crown } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

export default function HotspotSection({ hotspots, isPremium, onHotspotClick }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const cardBg = isDark
    ? 'linear-gradient(135deg, rgba(255, 75, 114, 0.15) 0%, rgba(234, 63, 211, 0.15) 100%)'
    : 'linear-gradient(135deg, rgba(255, 75, 114, 0.08) 0%, rgba(234, 63, 211, 0.08) 100%)';
  const cardBorder = isDark
    ? '1px solid rgba(255, 75, 114, 0.35)'
    : '1px solid rgba(255, 75, 114, 0.2)';

  const titleColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';
  const emptyBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const emptyBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

  return (
    <div>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-5 h-5 text-pink-405" style={{ color: '#FF4B72' }} />
        <h2 className="font-black text-base" style={{ color: titleColor }}>Beste locaties vanavond</h2>
      </div>

      {hotspots.length === 0 ? (
        <div className="rounded-[20px] p-5 text-center" style={{ background: emptyBg, border: emptyBorder }}>
          <p className="text-2xl mb-2">📍</p>
          <p className="text-sm leading-relaxed" style={{ color: subColor }}>
            Nog geen hotspots bekend. Wees de eerste die een bestemming kiest!
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          {hotspots.map((spot, i) => (
            <button
              key={spot.venue_id || spot.venue_name}
              onClick={() => {
                if (onHotspotClick) {
                  onHotspotClick(spot);
                } else {
                  navigate(`/Pinpoint?venueId=${encodeURIComponent(spot.venue_id || spot.venue_name)}`);
                }
              }}
              className="flex-shrink-0 rounded-[20px] p-4 text-left relative transition-all active:scale-[0.96] hover:brightness-[1.05] duration-150 cursor-pointer"
              style={{
                width: 160,
                background: cardBg,
                border: cardBorder,
                boxShadow: 'none',
              }}
            >
              {/* Rank badge */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center font-black text-xs mb-3 text-white"
                style={{ background: GRAD }}
              >
                {i + 1}
              </div>

              {/* Crown for #1 */}
              {i === 0 && (
                <div className="absolute top-3 right-3">
                  <Crown className="w-4 h-4 text-yellow-500" />
                </div>
              )}

              <p className="font-bold text-sm leading-tight truncate" style={{ color: titleColor }}>{spot.venue_name}</p>
              {spot.city && (
                <p className="text-xs mt-0.5 truncate" style={{ color: subColor }}>{spot.city}</p>
              )}

              <div className="flex items-center gap-1 mt-3">
                <Users className="w-3 h-3" style={{ color: '#FF4B72' }} />
                <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>{spot.count} gaan hierheen</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}