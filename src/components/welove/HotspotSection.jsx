import React from 'react';
import { useLang } from '@/lib/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Flame, Users, Crown, MapPin } from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { calculateDistanceKm, formatDistance } from '@/lib/geoUtils';

export default function HotspotSection({ hotspots, isPremium, onHotspotClick, userPosition = null }) {
  const { tr } = useLang();
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
          <h2 className="font-black text-base leading-none" style={{ color: titleColor }}>{tr('Beste locaties vanavond', 'Best spots tonight')}</h2>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: subColor }}>{tr('Meest populaire hotspots in de stad', 'Most popular hotspots in town')}</p>
        </div>
      </div>

      {hotspots.length === 0 ? (
        <div className="rounded-[20px] p-5 text-center" style={{ background: emptyBg, border: emptyBorder }}>
          <p className="text-2xl mb-2">📍</p>
          <p className="text-sm leading-relaxed" style={{ color: subColor }}>
            {tr('Nog geen hotspots bekend. Wees de eerste die een bestemming kiest!', 'No hotspots yet. Be the first to pick a destination!')}
          </p>
        </div>
      ) : (
        <div 
          className="flex gap-3.5 overflow-x-auto pb-2 pt-1 no-scrollbar items-stretch"
          style={{
            scrollbarWidth: 'none',
            touchAction: 'pan-x',
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          {hotspots.map((spot, i) => {
            const isFirst = i === 0;
            const isSecond = i === 1;
            const dist = spot.distanceKm != null
              ? spot.distanceKm
              : (userPosition && spot.lat && spot.lng ? calculateDistanceKm(userPosition[0], userPosition[1], spot.lat, spot.lng) : null);
            const dLabel = dist != null ? formatDistance(dist) : null;

            // Kaartvlak; #1 krijgt een dunne goud-roze rand en een zachte gloed
            // Iets meer kleur: een zachte kleurtint die vanuit de hoek over het vlak loopt
            const base = isDark ? '#15151F' : '#FFFFFF';
            const tint = isFirst
              ? (isDark ? 'rgba(242,176,30,0.20), rgba(255,75,114,0.12)' : 'rgba(242,176,30,0.16), rgba(255,75,114,0.08)')
              : isSecond
              ? (isDark ? 'rgba(255,75,114,0.20), rgba(234,63,211,0.10)' : 'rgba(255,75,114,0.12), rgba(234,63,211,0.06)')
              : (isDark ? 'rgba(234,63,211,0.14), rgba(255,75,114,0.06)' : 'rgba(234,63,211,0.08), rgba(255,75,114,0.04)');
            const surface = `linear-gradient(150deg, ${tint} 55%, transparent 100%), ${base}`;
            const accentBorder = isFirst
              ? 'linear-gradient(135deg, #FFD45C 0%, #FF4B72 55%, #EA3FD3 100%)'
              : isSecond
              ? 'linear-gradient(135deg, rgba(255,75,114,0.8) 0%, rgba(234,63,211,0.6) 100%)'
              : (isDark ? 'linear-gradient(135deg, rgba(234,63,211,0.45) 0%, rgba(255,75,114,0.2) 100%)' : 'linear-gradient(135deg, rgba(234,63,211,0.35) 0%, rgba(255,75,114,0.15) 100%)');

            const rankStyle = isFirst
              ? { background: 'linear-gradient(135deg, #FFE08A 0%, #F2B01E 100%)', color: '#3B2600' }
              : isSecond
              ? { background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', color: '#FFFFFF' }
              : { background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', color: isDark ? 'rgba(255,255,255,0.75)' : '#374151' };

            const peopleColor = isFirst ? '#F2B01E' : '#FF4B72';

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
                className="flex-shrink-0 rounded-[22px] p-[1.5px] text-left relative transition-transform active:scale-[0.96] duration-200 cursor-pointer"
                style={{
                  width: isFirst ? 200 : 168,
                  background: accentBorder,
                  boxShadow: isFirst
                    ? (isDark ? '0 10px 28px rgba(242,176,30,0.18)' : '0 10px 24px rgba(242,176,30,0.22)')
                    : (isDark ? '0 6px 18px rgba(0,0,0,0.35)' : '0 6px 16px rgba(17,24,39,0.07)'),
                }}
              >
                <div
                  className="relative h-full rounded-[20.5px] px-4 pt-3.5 pb-3 flex flex-col overflow-hidden"
                  style={{ background: surface }}
                >
                  {/* Zachte kleurgloed in de hoek */}
                  <div
                    aria-hidden
                    className="absolute -top-10 -right-10 w-28 h-28 rounded-full pointer-events-none"
                    style={{
                      background: isFirst
                        ? 'radial-gradient(circle, rgba(242,176,30,0.28) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(255,75,114,0.16) 0%, transparent 70%)',
                    }}
                  />

                  {/* Bovenrij: plek in de ranglijst + afstand */}
                  <div className="relative flex items-center justify-between mb-3">
                    <div
                      className="h-7 min-w-[28px] px-2 rounded-full flex items-center justify-center gap-1 text-[12px] font-black"
                      style={rankStyle}
                    >
                      {isFirst && <Crown className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />}
                      {i + 1}
                    </div>
                    {dLabel && (
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5"
                        style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: subColor }}
                      >
                        <MapPin className="w-2.5 h-2.5" />
                        {dLabel}
                      </span>
                    )}
                  </div>

                  {/* Naam en locatie */}
                  <p className={`relative font-black leading-tight truncate ${isFirst ? 'text-[16px]' : 'text-[15px]'}`} style={{ color: titleColor }}>
                    {spot.venue_name}
                  </p>
                  <p className="relative text-[11.5px] font-medium truncate mt-0.5 flex items-center gap-1" style={{ color: subColor }}>
                    <MapPin className="w-3 h-3 flex-shrink-0 opacity-70" />
                    <span className="truncate">{spot.city || 'Utrecht, NL'}</span>
                  </p>

                  {/* Aantal mensen; bij #1 springen de poppetjes op en neer */}
                  <div className="relative mt-3.5">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11.5px] font-black"
                      style={{
                        background: isFirst ? 'rgba(242,176,30,0.14)' : 'rgba(255,75,114,0.12)',
                        color: peopleColor,
                      }}
                    >
                      <Users className={`w-3.5 h-3.5 ${isFirst ? 'animate-bounce' : ''}`} />
                      {spot.count} {tr('gaan hierheen', 'going')}
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