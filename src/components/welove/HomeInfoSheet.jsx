import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, AlertCircle, X } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';
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
            background: isDark ? 'rgba(14,14,28,1)' : 'rgba(255,255,255,1)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: isDark ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '28px 28px 0 0',
            boxShadow: isDark ? '0 -8px 40px rgba(142,84,233,0.25), 0 -2px 20px rgba(0,0,0,0.5)' : '0 -4px 30px rgba(0,0,0,0.1)',
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
                  background: isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(240, 253, 244, 1)', 
                  borderColor: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(187, 247, 208, 1)' 
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: isDark ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)' }}>
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
              <div className="rounded-[20px] p-4 border-2" style={{ background: isDark ? 'rgba(251,146,60,0.1)' : 'rgba(251,146,60,0.05)', borderColor: 'rgba(251,146,60,0.3)' }}>
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
                  </div>
                  <div>
                    <h3 className={`font-bold text-sm ${textMain}`}>📍 Vind je match vanavond</h3>
                    <p className="text-xs mt-1" style={{ color: textSub }}>Zet je locatie aan of voer een bestemming in om matches te ontdekken</p>
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

            {/* Potentiële Matches */}
            {highMatches.length > 0 && (
              <div className="rounded-[20px] p-4" style={{ background: cardBg, border: plainCardBorder, boxShadow: plainCardShadow }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className={`font-black text-base ${textMain}`}>Potentiële Matches</h2>
                    <p className="text-xs" style={{ color: textSub }}>Op basis van gedeelde interesses</p>
                  </div>
                  <div className="text-4xl font-black" style={{ background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {highMatches.length}
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {highMatches.slice(0, 10).map(({ profile }) => {
                    const avatarStr = profile.avatar;
                    const emoji = avatarStr ? (avatarStr.includes(' ') ? avatarStr.split(' ')[0] : avatarStr) : '👤';
                    return (
                      <div key={profile.id} className="flex-shrink-0 w-14 h-14 rounded-2xl overflow-hidden border-2" style={{ borderColor: 'rgba(255,75,114,0.4)', background: 'rgba(255,75,114,0.15)' }}>
                        {profile.photo_url ? (
                          <img src={profile.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-xl"
                            style={avatarStr ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : {}}
                          >
                            {emoji}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

