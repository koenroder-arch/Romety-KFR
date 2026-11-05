import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Download, Trash2, AlertTriangle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { addLocalReportedEmail } from '@/lib/reportUtils';
import { trNow } from '@/lib/LanguageContext';
import { dt } from '@/lib/displayText';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', get label() { return trNow('Ongepaste foto', 'Inappropriate photo'); }, emoji: '🖼️' },
  { id: 'fraude_scam', get label() { return trNow('Fraude of scam', 'Fraud or scam'); }, emoji: '⚠️' },
  { id: 'ai_foto', get label() { return trNow('AI foto', 'AI photo'); }, emoji: '🤖' },
  { id: 'bot_account', get label() { return trNow('Een Bot account', 'A bot account'); }, emoji: '👾' },
  { id: 'stalking', get label() { return trNow('Stalking', 'Stalking'); }, emoji: '🚫' },
];

export default function StoriesViewer({ 
  group, 
  allGroups, 
  onClose, 
  isDark, 
  currentUserEmail, 
  onStoryDeleted 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [touchStart, setTouchStart] = useState(null);

  const timerRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const progressRef = useRef(0);
  const videoRef = useRef(null);
  const mediaLoadedRef = useRef(false);

  // Overlay states
  const [showMenu, setShowMenu] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [reportState, setReportState] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const activeStory = group?.items?.[currentIndex];

  // Fetch story creator's profile (for bio and display name details)
  useEffect(() => {
    if (group?.user_email) {
      base44.entities.UserProfile.filter({ user_email: group.user_email })
        .then(profs => {
          if (profs && profs[0]) {
            setCreatorProfile(profs[0]);
          }
        })
        .catch(err => console.warn('Error fetching story creator profile:', err));
    }
  }, [group?.user_email]);

  // Reset index when changing to a different user's story group
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    progressRef.current = 0;
    lastTimestampRef.current = null;
  }, [group?.user_email]);

  // Reset progress and media loaded state whenever active story changes
  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    lastTimestampRef.current = null;
    setMediaLoaded(false);
    mediaLoadedRef.current = false;

    // Safety timeout: if image/video is cached or doesn't trigger event, ensure timer starts after 1.2s
    const fallbackTimer = setTimeout(() => {
      setMediaLoaded(true);
      mediaLoadedRef.current = true;
    }, 1200);

    return () => clearTimeout(fallbackTimer);
  }, [currentIndex, activeStory?.id]);

  useEffect(() => {
    if (activeStory?.id) {
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
  }, [activeStory?.id]);

  const handleNext = () => {
    if (!group?.items) return;
    if (currentIndex < group.items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setProgress(0);
      progressRef.current = 0;
      lastTimestampRef.current = null;
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
    if (!group?.items) return;
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setProgress(0);
      progressRef.current = 0;
      lastTimestampRef.current = null;
    } else {
      if (!allGroups) {
        onClose(null);
        return;
      }
      const currentGroupIdx = allGroups.findIndex(g => g.user_email === group.user_email);
      if (currentGroupIdx > 0) {
        onClose(allGroups[currentGroupIdx - 1]);
      } else {
        onClose(null);
      }
    }
  };

  // Ref to always invoke latest handleNext without stale closures
  const handleNextRef = useRef(handleNext);
  useEffect(() => {
    handleNextRef.current = handleNext;
  });

  // Video pause/play sync
  useEffect(() => {
    if (videoRef.current) {
      if (isPaused || showMenu || showBio || reportState) {
        videoRef.current.pause();
      } else if (mediaLoaded) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isPaused, showMenu, showBio, reportState, mediaLoaded, currentIndex]);

  // Handle progress timer — RAF-based for 60fps smooth Romety progress bar
  useEffect(() => {
    if (!activeStory || group?.loading) return;

    // Stop if paused or overlay opened
    if (isPaused || showMenu || showBio || reportState) {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
      lastTimestampRef.current = null;
      return;
    }

    const DURATION = 5000; // 5 seconds per story

    const tick = (timestamp) => {
      if (isPaused || showMenu || showBio || reportState) return;

      // Wait until media has loaded before progressing the timer
      if (!mediaLoadedRef.current) {
        lastTimestampRef.current = null;
        timerRef.current = requestAnimationFrame(tick);
        return;
      }

      // Video story: sync progress directly with video currentTime
      if (activeStory.media_type === 'video') {
        const v = videoRef.current;
        if (v && v.duration > 0) {
          const p = Math.min((v.currentTime / v.duration) * 100, 100);
          progressRef.current = p;
          setProgress(p);
          if (p >= 100 || v.ended) {
            handleNextRef.current();
            return;
          }
        }
        timerRef.current = requestAnimationFrame(tick);
        return;
      }

      // Image story: smooth linear progression
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }
      const elapsed = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      progressRef.current = Math.min(progressRef.current + (elapsed / DURATION) * 100, 100);
      setProgress(progressRef.current);

      if (progressRef.current >= 100) {
        handleNextRef.current();
      } else {
        timerRef.current = requestAnimationFrame(tick);
      }
    };

    timerRef.current = requestAnimationFrame(tick);

    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, [currentIndex, activeStory?.id, isPaused, showMenu, showBio, reportState, mediaLoaded]);

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
      if (Math.abs(diffY) > 50) {
        onClose(null);
      }
    }
    setTouchStart(null);
  };

  // Actions
  const handleDownloadStory = async () => {
    if (!activeStory) return;
    setIsLoadingAction(true);
    try {
      const response = await fetch(activeStory.media_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = blobUrl;
      const ext = activeStory.media_type === 'video' ? 'mp4' : 'jpg';
      a.download = `romety_story_${Date.now()}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
      
      toast.success(trNow('Media opgeslagen op je apparaat! 📥', 'Media saved to your device! 📥'));
      setShowMenu(false);
      setIsPaused(false);
    } catch (e) {
      toast.error(trNow('Downloaden mislukt', 'Download failed'));
      console.error(e);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!activeStory) return;
    const confirmDelete = window.confirm(trNow('Weet je zeker dat je dit verhaal wilt verwijderen?', 'Are you sure you want to delete this story?'));
    if (!confirmDelete) return;

    setIsLoadingAction(true);
    try {
      // 1. Verwijder eerst het daadwerkelijke bestand uit de Supabase Storage bucket
      if (activeStory.media_url) {
        await base44.integrations.Core.DeleteFile({ file_url: activeStory.media_url });
      }
      
      // 2. Verwijder daarna het bijbehorende record uit de database
      await base44.entities.Story.delete(activeStory.id);
      
      toast.success(trNow('Verhaal verwijderd! 🗑️', 'Story deleted! 🗑️'));
      
      // 3. Callback to parent
      if (onStoryDeleted) {
        onStoryDeleted(activeStory.id);
      }
      
      // 4. Update index or close if it was the last story
      if (group.items.length <= 1) {
        onClose(null);
      } else {
        if (currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
        } else {
          setCurrentIndex(0);
        }
        setProgress(0);
        setShowMenu(false);
        setIsPaused(false);
      }
    } catch (e) {
      toast.error(trNow('Verwijderen mislukt', 'Delete failed'));
      console.error(e);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason || !activeStory) return;
    setIsLoadingAction(true);
    try {
      addLocalReportedEmail(activeStory.user_email);
      let myProf = null;
      if (currentUserEmail) {
        const myProfs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
        myProf = myProfs[0] || null;
      }
      
      await base44.entities.Report.create({
        reporter_email: currentUserEmail || '',
        reporter_name: myProf?.display_name || '',
        reported_email: activeStory.user_email,
        reported_name: activeStory.user_name || '',
        reason: reportState.reason,
        details: reportState.details || '',
        created_date: new Date().toISOString(),
      });
      
      setReportState(prev => ({ ...prev, step: 'done' }));
    } catch (err) {
      console.error('Error submitting report:', err);
      toast.error(trNow('Versturen van melding mislukt', 'Sending report failed'));
    } finally {
      setIsLoadingAction(false);
    }
  };

  if (!activeStory) return null;

  return (
    <div className="fixed inset-0 bg-black z-[3000] flex flex-col justify-between select-none">
      {/* Top bars & Header */}
      <div 
        className="absolute top-0 left-0 right-0 z-50 px-4 pb-10 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none"
        style={{
          paddingTop: 'max(20px, calc(env(safe-area-inset-top, 0px) + 12px))'
        }}
      >
        {/* Romety Brand Progress Bars */}
        <div className="flex gap-1.5 mb-3.5">
          {group.items.map((item, idx) => {
            const isCompleted = idx < currentIndex;
            const isActive = idx === currentIndex;
            const barProgress = isCompleted ? 100 : isActive ? progress : 0;

            return (
              <div 
                key={item.id || idx} 
                className="flex-1 h-1.5 rounded-full overflow-hidden backdrop-blur-sm relative"
                style={{
                  background: 'rgba(255, 255, 255, 0.22)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                }}
              >
                <div 
                  className="h-full rounded-full"
                  style={{ 
                    width: `${barProgress}%`,
                    background: 'linear-gradient(90deg, #FF4B72 0%, #EA3FD3 100%)',
                    boxShadow: isActive 
                      ? '0 0 10px rgba(255, 75, 114, 0.95), 0 0 4px rgba(234, 63, 211, 0.75)' 
                      : isCompleted 
                        ? '0 0 4px rgba(255, 75, 114, 0.35)' 
                        : 'none',
                    transition: 'none'
                  }}
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
          
          <div className="flex items-center gap-2">
            <div className="text-right bg-black/40 px-3.5 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
              <p className="text-white text-xs font-bold drop-shadow-md tracking-wide">{activeStory.venue_name}</p>
            </div>
            
            <button
              onClick={() => {
                setIsPaused(true);
                setShowMenu(true);
              }}
              className="w-9 h-9 rounded-full bg-black/40 border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
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

        {/* Ambient blurred backdrop so non-9:16 photos blend seamlessly without empty black bars */}
        {activeStory.media_url && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {activeStory.media_type === 'video' ? (
              <video
                src={activeStory.media_url}
                className="w-full h-full object-cover blur-3xl opacity-35 scale-125 brightness-75"
                muted
              />
            ) : (
              <img
                src={activeStory.media_url}
                alt=""
                className="w-full h-full object-cover blur-3xl opacity-40 scale-125 brightness-75"
              />
            )}
          </div>
        )}

        {/* Loading Indicator beneath the media */}
        {!mediaLoaded && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
             <div className="w-9 h-9 rounded-full border-3 border-[#FF4B72]/20 border-t-[#FF4B72] animate-spin" />
          </div>
        )}

        {activeStory.media_type === 'video' ? (
          <video 
            key={activeStory.media_url}
            ref={videoRef}
            src={activeStory.media_url} 
            className="w-full h-full max-h-[85vh] object-contain pointer-events-none z-10 relative" 
            autoPlay 
            playsInline 
            muted 
            onLoadedData={() => {
              setMediaLoaded(true);
              mediaLoadedRef.current = true;
            }}
            onEnded={() => {
              handleNextRef.current();
            }}
          />
        ) : (
          <img 
            key={activeStory.media_url}
            src={activeStory.media_url} 
            alt="" 
            className="w-full h-full max-h-[85vh] object-contain pointer-events-none z-10 relative" 
            onLoad={() => {
              setMediaLoaded(true);
              mediaLoadedRef.current = true;
            }}
          />
        )}
      </div>

      {/* ── Options Menu Overlay ── */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-end justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => {
              setShowMenu(false);
              setIsPaused(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md rounded-t-[32px] overflow-hidden pb-8 px-5"
              style={{ background: 'rgba(15, 15, 27, 0.96)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center py-4">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              <div className="flex flex-col gap-3">
                {activeStory.user_email === currentUserEmail ? (
                  <>
                    <button
                      onClick={handleDownloadStory}
                      disabled={isLoadingAction}
                      className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 text-white text-sm font-bold active:scale-[0.98] transition-transform hover:bg-white/5 disabled:opacity-50"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <Download className="w-5 h-5 text-green-400" />
                      {trNow('Downloaden naar fotobibliotheek', 'Download to photo library')}
                    </button>
                    <button
                      onClick={handleDeleteStory}
                      disabled={isLoadingAction}
                      className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold active:scale-[0.98] transition-transform hover:bg-red-500/10 disabled:opacity-50"
                      style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <Trash2 className="w-5 h-5" />
                      {trNow('Verhaal verwijderen', 'Delete story')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowBio(true);
                      }}
                      className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 text-white text-sm font-bold active:scale-[0.98] transition-transform hover:bg-white/5"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <User className="w-5 h-5 text-blue-400" />
                      {trNow('Bio / profiel zien', 'View bio / profile')}
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setReportState({ step: 'choose', reason: '', details: '' });
                      }}
                      className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 text-orange-400 text-sm font-bold active:scale-[0.98] transition-transform hover:bg-orange-500/10"
                      style={{ background: 'rgba(249, 115, 22, 0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
                    >
                      <AlertTriangle className="w-5 h-5" />
                      {trNow('Rapporteren', 'Report')}
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setIsPaused(false);
                  }}
                  className="w-full py-4 px-5 rounded-2xl text-white/50 text-sm font-bold active:scale-[0.98] transition-transform hover:bg-white/5 mt-2"
                >
                  {trNow('Annuleren', 'Cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bio Viewer Overlay ── */}
      <AnimatePresence>
        {showBio && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-end justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => {
              setShowBio(false);
              setIsPaused(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md rounded-t-[32px] overflow-hidden pb-8 px-6 text-white"
              style={{ background: 'rgba(14, 14, 25, 0.98)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center py-4">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <h3 className="font-black text-lg">Profiel van {activeStory.user_name}</h3>
                <button
                  onClick={() => {
                    setShowBio(false);
                    setIsPaused(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                {creatorProfile?.photo_url ? (
                  <img 
                    src={creatorProfile.photo_url} 
                    alt="" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-pink-500/50 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-3xl font-black shadow-lg">
                    {creatorProfile?.avatar ? creatorProfile.avatar.split(' ')[0] : '👤'}
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-black">
                    {creatorProfile?.display_name || activeStory.user_name}
                    {creatorProfile?.age && `, ${creatorProfile.age}`}
                  </h4>
                  {creatorProfile?.city && (
                    <p className="text-xs text-white/50 mt-0.5">{creatorProfile.city}</p>
                  )}
                </div>

                <div className="w-full bg-white/5 border border-white/8 rounded-2xl p-4 text-left mt-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1.5">{trNow('Bio / Over mij', 'Bio / About me')}</p>
                  <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                    {creatorProfile?.bio || trNow('Geen bio beschikbaar.', 'No bio available.')}
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Report Overlay ── */}
      <AnimatePresence>
        {reportState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[200] flex items-end justify-center"
            style={{ background: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(8px)' }}
            onClick={() => {
              setReportState(null);
              setIsPaused(false);
            }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-md rounded-t-[32px] overflow-hidden pb-8 text-white"
              style={{ background: 'rgba(14, 14, 25, 0.98)', borderTop: '1px solid rgba(255,255,255,0.08)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center py-4">
                <div className="w-12 h-1.5 rounded-full bg-white/20" />
              </div>

              <div className="flex items-center justify-between px-6 pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  {reportState.step !== 'done' && (
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    </div>
                  )}
                  <h3 className="font-black text-base">
                    {reportState.step === 'done' ? trNow('✅ Melding verstuurd', '✅ Report sent') : trNow(`Melding maken van ${activeStory.user_name}`, `Report ${activeStory.user_name}`)}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setReportState(null);
                    setIsPaused(false);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {reportState.step === 'choose' && (
                <div className="px-6">
                  <p className="text-white/60 text-sm mb-3">{trNow('Kies een reden voor je melding:', 'Choose a reason for your report:')}</p>
                  <div className="flex flex-col gap-2">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setReportState(prev => ({ ...prev, step: 'detail', reason: r.label, emoji: r.emoji }))}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-white/12 active:scale-[0.98] transition-all text-left"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                      >
                        <span className="text-lg">{r.emoji}</span>
                        <span className="text-white font-semibold text-sm">{r.label}</span>
                        <span className="ml-auto text-white/30 text-lg">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reportState.step === 'detail' && (
                <div className="px-6">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setReportState(prev => ({ ...prev, step: 'choose', reason: '', emoji: '' }))}
                      className="text-white/50 text-xs hover:text-white/80 transition-colors"
                    >
                      ← {trNow('Terug naar redenen', 'Back to reasons')}
                    </button>
                  </div>
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4 border"
                    style={{
                      background: 'rgba(255, 75, 114, 0.12)',
                      borderColor: 'rgba(255, 75, 114, 0.3)',
                    }}
                  >
                    <span className="text-base">{reportState.emoji || '⚠️'}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">{trNow('Gekozen reden', 'Chosen reason')}</span>
                      <span className="text-xs font-bold text-white truncate">{reportState.reason}</span>
                    </div>
                  </div>
                  <p className="text-white/60 text-sm mb-2">{trNow('Toelichting (optioneel):', 'Explanation (optional):')}</p>
                  <textarea
                    value={reportState.details}
                    onChange={e => setReportState(prev => ({ ...prev, details: e.target.value }))}
                    placeholder={trNow('Beschrijf hier wat er aan de hand is...', 'Describe what is going on...')}
                    rows={4}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 border border-white/15 resize-none outline-none focus:border-pink-500/60 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={isLoadingAction}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 shadow-lg bg-red-600 hover:bg-red-700"
                    style={{ background: '#EF4444', boxShadow: '0 6px 20px rgba(239,68,68,0.35)' }}
                  >
                    {isLoadingAction ? trNow('⏳ Rapporteren...', '⏳ Reporting...') : trNow('Rapporteren', 'Report')}
                  </button>
                </div>
              )}

              {reportState.step === 'done' && (
                <div className="px-6 py-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h4 className="text-white font-black text-lg mb-1">{trNow('Bedankt voor je melding', 'Thanks for your report')}</h4>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    {trNow('We nemen dit zeer serieus en zullen dit profiel en verhaal zo spoedig mogelijk controleren.', 'We take this very seriously and will review this profile and story as soon as possible.')}
                  </p>
                  <button
                    onClick={() => {
                      setReportState(null);
                      setIsPaused(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm active:scale-95 transition-all"
                  >
                    {trNow('Sluiten', 'Close')}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
