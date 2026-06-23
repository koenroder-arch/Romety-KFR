import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, CheckCircle2, Navigation, Users, XCircle } from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTheme } from '@/lib/ThemeContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

// Snap positions — translateY relative to the sheet's bottom anchor (80px above nav)
// FULL_Y = 0 → sheet fully open
// PEEK_Y = sheet half-open (only header + CTA visible)
// HIDDEN_Y = sheet off-screen below
// The sheet has a fixed height of SHEET_H.
// translateY=0 → fully visible (full open)
// translateY=PEEK_Y → only top PEEK_VISIBLE px visible
// translateY=SHEET_H → fully hidden below
const SHEET_H = () => Math.round(window.innerHeight * 0.85);
const PEEK_VISIBLE = () => Math.round(window.innerHeight * 0.27); // ~1/4 screen
const FULL_Y = 0;
const getPeekY = () => SHEET_H() - PEEK_VISIBLE();
const getHiddenY = () => SHEET_H() + 40;

export default function VenueBottomSheet({
  venue,
  snapState,          // 'hidden' | 'peek' | 'full'
  onSnapChange,       // (newSnap) => void
  onClose,
  onGoHere,
  onCancelGoing,
  isGoing,
  isCheckedIn = false,
  goingCount = 0,
  matchGoingCount = 0,
  matchGoingProfiles = [],
  matchPotential = 0,
  onShowPremium,
  isPremium = false,
  currentUserEmail,
  onVenueNavigate,
}) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const PEEK_Y = getPeekY();
  const HIDDEN_Y = getHiddenY();
  const sheetHeight = SHEET_H();

  const y = useMotionValue(HIDDEN_Y);
  const sheetRef = useRef(null);

  // Sync motion value when snapState or venue changes
  useEffect(() => {
    const target = snapState === 'full' ? FULL_Y : snapState === 'peek' ? PEEK_Y : HIDDEN_Y;
    animate(y, target, { type: 'spring', stiffness: 400, damping: 38 });
  }, [snapState, venue]);



  const handleGoHere = async (v) => {
    await onGoHere(v);
  };

  const handleDragEnd = (_, info) => {
    const velocity = info.velocity.y;
    const currentY = y.get();
    let targetState;

    if (velocity > 300 || currentY > PEEK_Y - 100) {
      targetState = 'peek';
    } else if (velocity < -300 || currentY < PEEK_Y - 100) {
      targetState = 'full';
    } else {
      targetState = 'peek';
    }

    if (targetState === snapState) {
      const target = targetState === 'full' ? FULL_Y : PEEK_Y;
      animate(y, target, { type: 'spring', stiffness: 400, damping: 38 });
    } else {
      onSnapChange(targetState);
    }
  };

  const bgOpacity = useTransform(y, [FULL_Y, PEEK_Y, HIDDEN_Y], [0.75, 0.15, 0]);

  if (!venue) return null;

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
        dragElastic={0.08}
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
          paddingBottom: 0,
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
          {/* ── Drag handle + header (always visible in peek) ── */}
          <div
            className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none flex-shrink-0"
            onClick={() => onSnapChange(snapState === 'full' ? 'peek' : 'full')}
          >
            <div className="w-10 h-1 rounded-full mb-3" style={{ background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }} />

            <div className="w-full px-5 pb-2 flex items-center justify-between">
              <div>
                <p className="font-black text-xl drop-shadow" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>{venue.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {venue.city && <p className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>{venue.city}</p>}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,107,74,0.15)', color: '#FF6B4A' }}>
                    {matchGoingCount} matches gaan
                  </span>
                </div>

              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
                style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)', border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.1)' }}
              >
                <X className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#555555' }} />
              </button>
            </div>
          </div>

          {/* ── Scrollable full content ── */}
          <div className="flex-1 overflow-y-auto px-5 pb-10 space-y-4">

            {/* CTA */}
            {isCheckedIn ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 py-4 rounded-[18px] flex items-center justify-center gap-2" style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)' }}>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-green-400">Je bent hier live ingecheckt!</span>
                </div>
                {onCancelGoing && (
                  <button
                    onClick={onCancelGoing}
                    className="w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)' }}
                  >
                    <XCircle className="w-5 h-5 text-red-400" />
                  </button>
                )}
              </div>
            ) : isGoing ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 py-4 rounded-[18px] flex items-center justify-center gap-2" style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.35)' }}>
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <span className="text-sm font-bold text-green-300">Je gaat hiernaartoe vanavond!</span>
                </div>
                {onCancelGoing && (
                  <button
                    onClick={onCancelGoing}
                    className="w-12 h-12 rounded-[18px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.35)' }}
                  >
                    <XCircle className="w-5 h-5 text-red-400" />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleGoHere(venue)}
                className="w-full py-4 rounded-[18px] text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: GRAD, boxShadow: '0 8px 24px rgba(255,107,74,0.4)' }}
              >
                <Navigation className="w-4 h-4" />
                Ik ga ook naar {venue.name}
              </button>
            )}

            {/* Match info card */}
            <div
              className="rounded-[20px] px-4 py-4"
              style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                  style={{ background: GRAD, boxShadow: '0 4px 14px rgba(255,107,74,0.4)' }}
                >
                  {matchGoingCount}
                </div>
                <p className="text-sm font-bold leading-snug" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#111827' }}>
                  {matchGoingCount === 0
                    ? 'Er gaan 0 van jouw matches naar deze locatie'
                    : matchGoingCount === 1
                    ? 'Er gaat 1 van jouw matches naar deze locatie'
                    : `Er gaan ${matchGoingCount} van jouw matches naar deze locatie`}
                </p>
              </div>

              {matchPotential > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }}>Match potentieel</p>
                    <p className="text-xs font-black" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>{matchPotential}%</p>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${matchPotential}%`, background: GRAD }} />
                  </div>
                </div>
              )}

              {goingCount > 0 && (
                 <div className="mt-3 flex items-center gap-2">
                   <Users className="w-3.5 h-3.5" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} />
                   <p className="text-xs" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.45)' }}>{goingCount} {goingCount === 1 ? 'persoon gaat' : 'personen gaan'} vanavond in totaal</p>
                 </div>
               )}

               {/* Match profile photos — only if user is going */}
               {isGoing && matchGoingProfiles.length > 0 && (
                 <div className="mt-3 pt-3" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)' }}>
                   <button
                     onClick={() => { navigate('/Matches'); onClose(); }}
                     className="flex items-center gap-3 w-full"
                   >
                     <div className="flex -space-x-2">
                       {matchGoingProfiles.slice(0, 6).map((p, i) => (
                         <div
                           key={p.user_email}
                           className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0"
                           style={{ border: isDark ? '2px solid rgba(14,14,28,0.97)' : '2px solid rgba(255,255,255,0.9)', zIndex: 6 - i }}
                         >
                           {p.photo_url
                             ? <img src={p.photo_url} alt="" className="w-full h-full object-cover" />
                             : <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}>
                                 {p.avatar ? p.avatar.split(' ')[0] : '👤'}
                               </div>
                           }
                         </div>
                       ))}
                     </div>
                     <span className="text-xs font-bold" style={{ color: '#FF4B72' }}>Bekijk matches →</span>
                   </button>
                 </div>
               )}
              </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}