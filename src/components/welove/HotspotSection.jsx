import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Users, Crown, Sparkles, Trophy } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';

export default function HotspotSection({ hotspots, isPremium, onHotspotClick }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const titleColor = isDark ? '#FFFFFF' : '#111827';
  const subColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.55)';
  const emptyBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const emptyBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

  return (
    <div>
      {/* Title */}
      <div className="flex items-center gap-2 mb-3.5">
        <div className="p-1.5 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white shadow-md">
          <Flame className="w-4 h-4" />
        </div>
        <div>
          <h2 className="font-black text-base leading-none" style={{ color: titleColor }}>Beste locaties vanavond</h2>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: subColor }}>Meest populaire hotspots in de stad</p>
        </div>
      </div>

      {hotspots.length === 0 ? (
        <div className="rounded-[20px] p-5 text-center" style={{ background: emptyBg, border: emptyBorder }}>
          <p className="text-2xl mb-2">📍</p>
          <p className="text-sm leading-relaxed" style={{ color: subColor }}>
            Nog geen hotspots bekend. Wees de eerste die een bestemming kiest!
          </p>
        </div>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar items-stretch" style={{ scrollbarWidth: 'none' }}>
          {hotspots.map((spot, i) => {
            const isFirst = i === 0;
            const isSecond = i === 1;

            // Tiered Styles
            let cardWidth = 155;
            let cardBg = '';
            let cardBorder = '';
            let boxShadow = 'none';

            if (isFirst) {
              cardWidth = 195;
              cardBg = isDark
                ? 'linear-gradient(135deg, rgba(255, 75, 114, 0.35) 0%, rgba(234, 63, 211, 0.3) 50%, rgba(245, 158, 11, 0.25) 100%)'
                : 'linear-gradient(135deg, rgba(255, 75, 114, 0.18) 0%, rgba(234, 63, 211, 0.15) 50%, rgba(245, 158, 11, 0.15) 100%)';
              cardBorder = isDark
                ? '2px solid rgba(245, 158, 11, 0.8)'
                : '2px solid rgba(255, 107, 74, 0.6)';
              boxShadow = 'none';
            } else if (isSecond) {
              cardWidth = 170;
              cardBg = isDark
                ? 'linear-gradient(135deg, rgba(255, 75, 114, 0.2) 0%, rgba(234, 63, 211, 0.15) 100%)'
                : 'linear-gradient(135deg, rgba(255, 75, 114, 0.1) 0%, rgba(234, 63, 211, 0.08) 100%)';
              cardBorder = isDark
                ? '1.5px solid rgba(255, 75, 114, 0.5)'
                : '1.5px solid rgba(255, 75, 114, 0.3)';
              boxShadow = 'none';
            } else {
              cardWidth = 155;
              cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)';
              cardBorder = isDark ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(0, 0, 0, 0.08)';
              boxShadow = 'none';
            }

            return (
              <button
                key={spot.venue_id || spot.venue_name}
                onClick={() => {
                  if (onHotspotClick) {
                    onHotspotClick(spot);
                  } else {
                    navigate(`/Pinpoint?venueId=${encodeURIComponent(spot.venue_id || spot.venue_name)}`);
                  }
                }}
                className="flex-shrink-0 rounded-[24px] p-4 text-left relative transition-all active:scale-[0.96] hover:brightness-[1.06] duration-200 cursor-pointer flex flex-col justify-between overflow-hidden"
                style={{
                  width: cardWidth,
                  background: cardBg,
                  border: cardBorder,
                  boxShadow: 'none',
                }}
              >

                <div>
                  {/* Header Row: Rank Badge & Crown */}
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`h-7 px-2.5 rounded-full flex items-center justify-center font-black text-xs shadow-sm ${
                        isFirst
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-gray-950 font-black tracking-wider shadow-amber-500/30'
                          : isSecond
                          ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black'
                          : isDark ? 'bg-white/15 text-white/70' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {isFirst ? '🏆 #1' : isSecond ? '🥈 #2' : `#${i + 1}`}
                    </div>

                    {isFirst && (
                      <div className="flex items-center gap-1 bg-amber-400/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-400/40">
                        <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-wider text-amber-300">Hot</span>
                      </div>
                    )}
                  </div>

                  {/* Venue Name */}
                  <p className={`font-black tracking-wide leading-tight truncate ${isFirst ? 'text-base' : 'text-sm'}`} style={{ color: titleColor }}>
                    {spot.venue_name}
                  </p>
                  
                  {spot.city && (
                    <p className="text-[11px] font-medium mt-0.5 truncate" style={{ color: subColor }}>
                      {spot.city}
                    </p>
                  )}
                </div>

                {/* Footer Count */}
                <div className="mt-4 pt-2.5" style={{ borderTop: isFirst ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-1.5">
                    <Users className={`w-3.5 h-3.5 ${isFirst ? 'text-amber-300 animate-bounce' : 'text-pink-500'}`} />
                    <span className={`text-xs font-black ${isFirst ? 'text-amber-300' : 'text-pink-500'}`}>
                      {spot.count} gaan hierheen
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}