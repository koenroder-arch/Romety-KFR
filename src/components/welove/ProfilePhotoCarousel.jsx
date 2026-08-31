import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function getProfilePhotos(profile) {
  if (!profile) return [];
  if (Array.isArray(profile.photos) && profile.photos.length > 0) {
    const valid = profile.photos.filter(Boolean);
    if (valid.length > 0) return valid;
  }
  if (profile.photo_url) return [profile.photo_url];
  return [];
}

export default function ProfilePhotoCarousel({
  profile,
  onDoubleTap,
  onClick,
  className = '',
  dotsClassName = '',
  activeDotColor = 'bg-white',
  inactiveDotColor = 'bg-white/40',
  isDark = true,
  children
}) {
  const photos = getProfilePhotos(profile);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const isDraggingMouse = useRef(false);
  const mouseStartX = useRef(null);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef(null);

  // Reset index when profile changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [profile?.id, profile?.user_email]);

  const totalPhotos = photos.length;
  const hasMultiplePhotos = totalPhotos >= 2;

  const goToNext = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex < totalPhotos - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goToPrev = (e) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // --- TOUCH HANDLERS ---
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = (touchStartY.current || 0) - touchEndY;

    // Trigger swipe if horizontal movement is significant
    if (Math.abs(deltaX) > 25 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swiped Left -> Next
        if (currentIndex < totalPhotos - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else {
        // Swiped Right -> Prev
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // --- MOUSE DRAG HANDLERS (FOR DESKTOP / PREVIEW) ---
  const handleMouseDown = (e) => {
    isDraggingMouse.current = true;
    mouseStartX.current = e.clientX;
  };

  const handleMouseUp = (e) => {
    if (!isDraggingMouse.current || mouseStartX.current === null) return;
    const deltaX = mouseStartX.current - e.clientX;
    if (Math.abs(deltaX) > 30) {
      if (deltaX > 0) {
        goToNext();
      } else {
        goToPrev();
      }
    }
    isDraggingMouse.current = false;
    mouseStartX.current = null;
  };

  // --- TAP / CLICK HANDLER ---
  const handleTap = (e) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;
    const lastTap = lastTapRef.current;

    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : (rect.left + rect.width / 2));
    const clientY = e.clientY || (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : (rect.top + rect.height / 2));
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      if (onDoubleTap) {
        onDoubleTap(x, y, profile);
      }
    } else {
      lastTapRef.current = now;
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      singleTapTimeoutRef.current = setTimeout(() => {
        if (hasMultiplePhotos) {
          if (x < rect.width * 0.3) {
            goToPrev();
          } else if (x > rect.width * 0.7) {
            goToNext();
          } else if (onClick) {
            onClick(e, profile);
          }
        } else if (onClick) {
          onClick(e, profile);
        }
        singleTapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  const currentPhotoUrl = photos[currentIndex] || null;

  return (
    <div 
      className={`absolute inset-0 z-0 bg-gray-900 select-none overflow-hidden cursor-pointer ${className}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleTap}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Background Image / Avatar */}
      <AnimatePresence mode="wait">
        {currentPhotoUrl ? (
          <motion.img
            key={currentPhotoUrl}
            src={currentPhotoUrl}
            alt=""
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.8 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full object-cover select-none pointer-events-none"
            draggable={false}
          />
        ) : (
          <div 
            key="fallback-avatar"
            className="w-full h-full flex flex-col items-center justify-center relative" 
            style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
          >
            <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
              {profile?.avatar ? profile.avatar.split(' ')[0] : '👤'}
            </div>
            {profile?.avatar && (
              <div className="absolute bottom-32 text-center text-white/60 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                {profile.avatar.split(' ').slice(1).join(' ')}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      {/* Gradient Overlay for Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

      {/* ── Indicator Dots (Bolletjes) ── */}
      {/* ONLY RENDERED IF PROFILE HAS 2 OR 3 PHOTOS */}
      {hasMultiplePhotos && (
        <div 
          className={`absolute z-20 flex items-center pointer-events-auto ${dotsClassName || 'top-4 left-4 z-30'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-lg">
            {photos.map((_, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={`transition-all duration-300 rounded-full ${
                    isActive 
                      ? `w-5 h-1.5 ${activeDotColor} shadow-sm` 
                      : `w-1.5 h-1.5 ${inactiveDotColor} hover:bg-white/70`
                  }`}
                  aria-label={`Foto ${idx + 1}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Any nested overlays (e.g. double-tap hearts, etc.) */}
      {children}
    </div>
  );
}
