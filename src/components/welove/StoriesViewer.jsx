import React, { useState, useEffect, useRef } from 'react';
import { X, MoreHorizontal, Download, Trash2, AlertTriangle, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

const REPORT_REASONS = [
  { id: 'ongepaste_foto', label: 'Ongepaste foto', emoji: '🖼️' },
  { id: 'fraude_scam', label: 'Fraude of scam', emoji: '⚠️' },
  { id: 'ai_foto', label: 'AI foto', emoji: '🤖' },
  { id: 'bot_account', label: 'Een Bot account', emoji: '👾' },
  { id: 'stalking', label: 'Stalking', emoji: '🚫' },
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
  const [touchStart, setTouchStart] = useState(null);
  const timerRef = useRef(null);

  // Overlay states
  const [showMenu, setShowMenu] = useState(false);
  const [showBio, setShowBio] = useState(false);
  const [reportState, setReportState] = useState(null);
  const [creatorProfile, setCreatorProfile] = useState(null);
  const [isLoadingAction, setIsLoadingAction] = useState(false);

  const activeStory = group?.items[currentIndex];

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
  }, [group]);

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

  // Handle progress timer — automatically pause when overlays are active
  useEffect(() => {
    if (isPaused || showMenu || showBio || reportState) {
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
  }, [currentIndex, isPaused, showMenu, showBio, reportState, group]);

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
        onClose(null);
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
      
      toast.success('Media opgeslagen op je apparaat! 📥');
      setShowMenu(false);
      setIsPaused(false);
    } catch (e) {
      toast.error('Downloaden mislukt');
      console.error(e);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!activeStory) return;
    const confirmDelete = window.confirm('Weet je zeker dat je dit verhaal wilt verwijderen?');
    if (!confirmDelete) return;

    setIsLoadingAction(true);
    try {
      // 1. Delete from database
      await base44.entities.Story.delete(activeStory.id);
      
      // 2. Delete file from storage
      if (activeStory.media_url) {
        await base44.integrations.Core.DeleteFile({ file_url: activeStory.media_url }).catch(() => {});
      }
      
      toast.success('Verhaal verwijderd! 🗑️');
      
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
      toast.error('Verwijderen mislukt');
      console.error(e);
    } finally {
      setIsLoadingAction(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason || !activeStory) return;
    setIsLoadingAction(true);
    try {
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
      toast.error('Versturen van melding mislukt');
    } finally {
      setIsLoadingAction(false);
    }
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
                      Downloaden naar fotobibliotheek
                    </button>
                    <button
                      onClick={handleDeleteStory}
                      disabled={isLoadingAction}
                      className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold active:scale-[0.98] transition-transform hover:bg-red-500/10 disabled:opacity-50"
                      style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.15)' }}
                    >
                      <Trash2 className="w-5 h-5" />
                      Verhaal verwijderen
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
                      Bio / profiel zien
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
                      Rapporteren
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
                  Annuleren
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
                  <p className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-1.5">Bio / Over mij</p>
                  <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">
                    {creatorProfile?.bio || "Geen bio beschikbaar."}
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
                    {reportState.step === 'done' ? '✅ Melding verstuurd' : `Melding maken van ${activeStory.user_name}`}
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
                  <p className="text-white/60 text-sm mb-3">Kies een reden voor je melding:</p>
                  <div className="flex flex-col gap-2">
                    {REPORT_REASONS.map(r => (
                      <button
                        key={r.id}
                        onClick={() => setReportState(prev => ({ ...prev, step: 'detail', reason: r.label }))}
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
                      onClick={() => setReportState(prev => ({ ...prev, step: 'choose', reason: '' }))}
                      className="text-white/50 text-xs hover:text-white/80 transition-colors"
                    >
                      ← Terug naar redenen
                    </button>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 mb-4 border border-white/10 bg-orange-500/10">
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-orange-300 font-semibold text-sm">{reportState.reason}</span>
                  </div>
                  <p className="text-white/60 text-sm mb-2">Voeg eventueel extra details toe (optioneel):</p>
                  <textarea
                    value={reportState.details}
                    onChange={e => setReportState(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Beschrijf hier wat er aan de hand is..."
                    rows={4}
                    className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 border border-white/15 resize-none outline-none focus:border-pink-500/60 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                  <button
                    onClick={handleSubmitReport}
                    disabled={isLoadingAction}
                    className="mt-4 w-full py-3.5 rounded-2xl font-black text-white text-sm flex items-center justify-center gap-2.5 active:scale-[0.97] transition-transform disabled:opacity-60 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', boxShadow: '0 6px 20px rgba(255,75,114,0.35)' }}
                  >
                    {isLoadingAction ? '⏳ Versturen...' : 'Melding versturen'}
                  </button>
                </div>
              )}

              {reportState.step === 'done' && (
                <div className="px-6 py-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                    <span className="text-3xl">✅</span>
                  </div>
                  <h4 className="text-white font-black text-lg mb-1">Bedankt voor je melding</h4>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">
                    We nemen dit zeer serieus en zullen dit profiel en verhaal zo spoedig mogelijk controleren.
                  </p>
                  <button
                    onClick={() => {
                      setReportState(null);
                      setIsPaused(false);
                    }}
                    className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm active:scale-95 transition-all"
                  >
                    Sluiten
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
