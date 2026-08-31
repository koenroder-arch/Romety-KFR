import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, X, Heart, Users, ChevronRight } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';
import { isMatch } from '@/lib/matchUtils';
import HotspotSection from './HotspotSection';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

const SHEET_H = () => Math.round(window.innerHeight * 0.85);
// Set PEEK_VISIBLE to 50% of the screen so it opens significantly higher than the usual 27%
const PEEK_VISIBLE = () => Math.round(window.innerHeight * 0.50);
const FULL_Y = 0;
const getPeekY = () => SHEET_H() - PEEK_VISIBLE();
const getHiddenY = () => SHEET_H() + 40;

export default function HomeInfoSheet({
  highMatches = [],
  myCheckIn = null,
  hotspots = [],
  onVenueClick,
  clubs = [],
  allDestinations = [],
  allProfiles = [],
  myProfile = null,
  myDestination = null,
  onGoHere,
  onEnableLocation,
  onShowPremium,
  onVenueNavigate,
  onCancelGoing,
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const PEEK_Y = getPeekY();
  const HIDDEN_Y = getHiddenY();
  const sheetHeight = SHEET_H();

  const [snapState, setSnapState] = useState('peek'); // 'peek' | 'full'
  const y = useMotionValue(PEEK_Y);
  const sheetRef = useRef(null);

  // Calculate the #1 venue where the most matching profiles for the current user are going tonight
  const topMatchVenue = useMemo(() => {
    if (!myProfile || !allProfiles.length || !allDestinations.length) return null;

    const matchingProfiles = allProfiles.filter(
      (p) => p.user_email && p.user_email !== myProfile.user_email && isMatch(myProfile, p)
    );
    const matchingEmailSet = new Set(matchingProfiles.map((p) => p.user_email));

    // Filter active destinations for matches
    const matchDests = allDestinations.filter((d) => matchingEmailSet.has(d.user_email));
    if (!matchDests.length) return null;

    const counts = {};
    const metaMap = {};
    matchDests.forEach((d) => {
      const key = d.venue_id || d.venue_name;
      counts[key] = (counts[key] || 0) + 1;
      if (!metaMap[key]) {
        metaMap[key] = {
          venue_id: d.venue_id,
          venue_name: d.venue_name,
          venue_city: d.venue_city,
          profiles: []
        };
      }
      const prof = matchingProfiles.find((p) => p.user_email === d.user_email);
      if (prof) metaMap[key].profiles.push(prof);
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;

    const [topKey, count] = sorted[0];
    const meta = metaMap[topKey];
    const club = clubs.find((c) => c.id === meta.venue_id || c.name === meta.venue_name);

    return {
      ...meta,
      count,
      city: club?.city || meta.venue_city || '',
      club: club || { id: meta.venue_id, name: meta.venue_name, city: meta.venue_city }
    };
  }, [myProfile, allProfiles, allDestinations, clubs]);

  useEffect(() => {
    const target = snapState === 'full' ? FULL_Y : PEEK_Y;
    animate(y, target, { type: 'spring', stiffness: 400, damping: 38 });
  }, [snapState]);

  const handleDragEnd = (_, info) => {
    const velocity = info.velocity.y;
    const currentY = y.get();
    let targetState;

    if (velocity > 500 || currentY > PEEK_Y + 100) {
      targetState = 'peek';
    } else if (velocity < -500 || currentY < PEEK_Y - 100) {
      targetState = 'full';
    } else {
      targetState = currentY < PEEK_Y ? 'full' : 'peek';
    }

    if (targetState === snapState) {
      const target = targetState === 'full' ? FULL_Y : PEEK_Y;
      animate(y, target, { type: 'spring', stiffness: 400, damping: 38 });
    } else {
      setSnapState(targetState);
    }
  };

  const bgOpacity = useTransform(y, [FULL_Y, PEEK_Y, HIDDEN_Y], [0.6, 0.05, 0]);

  const cardBg = isDark ? '#1A1A2E' : '#FFFFFF';
  const cardBorder = isDark ? '1.5px solid #FF6B4A' : 'none';
  const cardShadow = isDark ? '0 0 12px rgba(255,107,74,0.3)' : '0 4px 20px rgba(0,0,0,0.08)';
  const plainCardBorder = isDark ? '1px solid rgba(255,255,255,0.06)' : 'none';
  const plainCardShadow = isDark ? 'none' : '0 4px 16px rgba(0,0,0,0.06)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)';

  return (
    <>
      {/* Backdrop — only visible when fully open */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1990, background: 'rgba(0,0,0,1)', opacity: bgOpacity }}
      />

      <motion.div
        ref={sheetRef}
        drag="y"
        dragConstraints={{ top: FULL_Y, bottom: PEEK_Y }}
        dragElastic={0.05}
        onDragEnd={handleDragEnd}
        style={{
          y,
          position: 'fixed',
          bottom: 0,
          left: '50%',
          translateX: '-50%',
          width: '100%',
          maxWidth: 448,
          zIndex: 2000,
          touchAction: 'none',
        }}
      >
        <div
          className="rounded-t-[32px] flex flex-col overflow-hidden"
          style={{
            background: isDark ? '#08090E' : 'rgba(255,255,255,1)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '28px 28px 0 0',
            boxShadow: 'none',
            height: sheetHeight,
          }}
        >
          {/* Drag handle */}
          <div
            className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            onClick={() => setSnapState(snapState === 'full' ? 'peek' : 'full')}
          >
            <div className="w-10 h-1 rounded-full mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />
            <h3 className={`font-black text-lg ${textMain}`}>Verken Hotspots & Matches</h3>
          </div>

          {/* Scrollable full content */}
          <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4">
            {/* Active Checkin CTA or Destination Banner */}
            {myCheckIn ? (
              <div className="rounded-[20px] p-4 flex items-center justify-between" style={{ background: cardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.15)' }}>
                    <MapPin className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${textMain}`}>{myCheckIn.venue_name}</p>
                    <p className="text-xs text-green-400 font-semibold">Live ingecheckt</p>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              </div>
            ) : myDestination ? (
              <div 
                className="rounded-[20px] p-4 flex items-center justify-between border" 
                style={{ 
                  background: isDark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(34, 197, 94, 0.03)', 
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.35)' : 'rgba(34, 197, 94, 0.25)' 
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: isDark ? 'rgba(34,197,94,0.15)' : 'rgba(34,197,94,0.08)' }}>
                    <MapPin className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm" style={{ color: isDark ? '#4ade80' : '#15803d' }}>
                      Je gaat naar {myDestination.venue_name}
                    </h3>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onCancelGoing) onCancelGoing();
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  style={{ 
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    color: isDark ? '#4ade80' : '#15803d'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-[18px] p-3 px-4 border flex items-center justify-between gap-3" style={{ background: isDark ? 'rgba(251,146,60,0.1)' : 'rgba(251,146,60,0.06)', borderColor: 'rgba(251,146,60,0.3)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.2)' }}>
                    <AlertCircle className="w-4.5 h-4.5 text-orange-400" />
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-xs ${textMain}`}>📍 Vind je match vanavond</h3>
                    <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: textSub }}>Kies een bestemming om matches te ontdekken</p>
                  </div>
                </div>
              </div>
            )}

            {/* Hotspots - Beste locaties vanavond */}
            <HotspotSection
              hotspots={hotspots}
              isPremium={true}
              onHotspotClick={(hotspot) => {
                if (onVenueClick) {
                  onVenueClick(hotspot);
                }
              }}
            />

            {/* Top Match-Locatie vanavond (Compact & strak) */}
            {topMatchVenue ? (
              <button 
                onClick={() => {
                  if (onVenueClick) {
                    onVenueClick({
                      venue_id: topMatchVenue.venue_id,
                      venue_name: topMatchVenue.venue_name,
                      venue_city: topMatchVenue.venue_city || topMatchVenue.city,
                      city: topMatchVenue.city || topMatchVenue.venue_city,
                      count: topMatchVenue.count
                    });
                  }
                }}
                className="w-full rounded-[18px] sm:rounded-[20px] p-3.5 px-4 flex items-center justify-between text-left transition-all active:scale-[0.98] shadow-sm relative overflow-hidden"
                style={{ 
                  background: isDark 
                    ? 'linear-gradient(135deg, rgba(255, 75, 114, 0.16) 0%, rgba(234, 63, 211, 0.08) 100%)' 
                    : 'linear-gradient(135deg, rgba(255, 75, 114, 0.08) 0%, rgba(234, 63, 211, 0.03) 100%), #FFFFFF',
                  border: isDark ? '1.5px solid rgba(255, 75, 114, 0.35)' : '1.5px solid rgba(255, 75, 114, 0.22)',
                  boxShadow: isDark ? '0 4px 16px rgba(255, 75, 114, 0.10)' : '0 2px 12px rgba(255, 75, 114, 0.05)'
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isDark ? 'rgba(255, 75, 114, 0.22)' : 'rgba(255, 75, 114, 0.12)' }}
                  >
                    <Heart className="w-5 h-5 fill-pink-500 text-pink-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-pink-500 mb-0.5 truncate">
                      Jouw beste locatie
                    </p>
                    <h3 className={`font-black text-[15px] sm:text-base leading-tight truncate ${textMain}`}>
                      {topMatchVenue.venue_name}
                    </h3>
                    {topMatchVenue.city && (
                      <p className="text-[11px] font-bold text-pink-500/80 mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-pink-500" />
                        <span>{topMatchVenue.city}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div 
                    className="px-2.5 py-1 rounded-full text-[11.5px] sm:text-xs font-black text-white shadow-sm flex items-center gap-1"
                    style={{ background: GRAD }}
                  >
                    <Users className="w-3 h-3" />
                    <span>{topMatchVenue.count} {topMatchVenue.count === 1 ? 'match' : 'matches'}</span>
                  </div>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ) : (
              <div 
                className="rounded-[18px] p-3 px-4 flex items-center gap-3"
                style={{ background: cardBg, border: plainCardBorder, boxShadow: plainCardShadow }}
              >
                <div 
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255, 75, 114, 0.15)' : 'rgba(255, 75, 114, 0.10)' }}
                >
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <div className="min-w-0">
                  <h4 className={`font-bold text-xs ${textMain}`}>Jouw beste locatie</h4>
                  <p className="text-[11px] font-medium truncate mt-0.5" style={{ color: textSub }}>
                    Zodra matches kiezen zie je hier direct de populairste venue
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

