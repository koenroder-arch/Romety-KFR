import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export default function StoriesViewer({ group, allGroups, onClose, isDark }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const timerRef = useRef(null);

  const activeStory = group?.items[currentIndex];

  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
  }, [group]);

  useEffect(() => {
    if (activeStory) {
      try {
        const seenStr = localStorage.getItem('seen_story_ids');
        const seenIds = seenStr ? JSON.parse(seenStr) : [];
        if (!seenIds.includes(activeStory.id)) {
          seenIds.push(activeStory.id);
          localStorage.setItem('seen_story_ids', JSON.stringify(seenIds));
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [activeStory]);

  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 50;
    const step = (intervalTime / 5000) * 100; // 5000ms duration (5s)

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentIndex, isPaused, group]);

  const handleNext = () => {
    if (currentIndex < group.items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      if (!allGroups) {
        onClose(null);
        return;
      }
      const currentGroupIdx = allGroups.findIndex(g => g.user_email === group.user_email);
      if (currentGroupIdx !== -1 && currentGroupIdx < allGroups.length - 1) {
        onClose(allGroups[currentGroupIdx + 1]);
      } else {
        onClose(null);
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    } else {
      if (!allGroups) {
        onClose(null);
        return;
      }
      const currentGroupIdx = allGroups.findIndex(g => g.user_email === group.user_email);
      if (currentGroupIdx > 0) {
        onClose(allGroups[currentGroupIdx - 1]);
      } else {
        onClose(null); // Optional: close or do nothing if on very first story
      }
    }
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    if (e.touches && e.touches.length > 0) {
      setTouchStart(e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e) => {
    setIsPaused(false);
    if (touchStart !== null && e.changedTouches && e.changedTouches.length > 0) {
      const touchEnd = e.changedTouches[0].clientY;
      const diffY = touchStart - touchEnd;
      // If swipe up (>50) or swipe down (<-50)
      if (Math.abs(diffY) > 50) {
        onClose(null);
      }
    }
    setTouchStart(null);
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-[3000] flex flex-col justify-between select-none">
      {/* Top bars & Header */}
      <div className="absolute top-0 left-0 right-0 z-50 px-4 pt-4 pb-10 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex gap-1 mb-4">
          {group.items.map((item, idx) => {
            let barProgress = 0;
            if (idx < currentIndex) barProgress = 100;
            else if (idx === currentIndex) barProgress = progress;
            return (
              <div key={item.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75"
                  style={{ width: `${barProgress}%` }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between mt-2 pointer-events-auto">
          <button
            onClick={() => onClose(null)}
            className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-right bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
              <p className="text-white text-xs font-bold drop-shadow-md tracking-wide">{activeStory.venue_name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Media view area */}
      <div 
        className="flex-1 flex items-center justify-center relative select-none touch-none bg-black"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
      >
        <div className="absolute inset-0 flex z-20">
          <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
          <div className="w-2/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNext(); }} />
        </div>

        {/* Loading Indicator beneath the media */}
        <div className="absolute inset-0 flex items-center justify-center z-0">
           <div className="w-8 h-8 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>

        {activeStory.media_type === 'video' ? (
          <video 
            key={activeStory.media_url}
            src={activeStory.media_url} 
            className="w-full max-h-[85vh] object-contain pointer-events-none z-10 relative" 
            autoPlay 
            playsInline 
            muted 
            loop 
          />
        ) : (
          <img 
            key={activeStory.media_url}
            src={activeStory.media_url} 
            alt="" 
            className="w-full h-full max-h-[100vh] object-cover pointer-events-none z-10 relative" 
          />
        )}
      </div>
    </div>
  );
}
