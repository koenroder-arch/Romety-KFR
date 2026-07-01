import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNotifications } from './useNotifications';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function NotificationBell({ isDark = true }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchesExpanded, setMatchesExpanded] = useState(false);
  const [othersExpanded, setOthersExpanded] = useState(false);
  const { unreadCount, markAllRead } = useNotifications();
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    const notifs = await base44.entities.Notification.filter({ to_email: user.email }, '-created_date', 30);
    setNotifications(notifs);
    setLoading(false);
    markAllRead();
  };

  const handleOpen = () => {
    setOpen(true);
    loadNotifications();
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const panelBg = isDark ? '#08090E' : '#F8F9FB';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const matchNotifs = notifications.filter(n => n.type === 'match');
  const likeNotifs = notifications.filter(n => n.type !== 'match');

  const handleNotificationClick = (n) => {
    setOpen(false);
    if (n.type === 'game_accepted' || n.type === 'game_invite' || n.type === 'game') {
      window.location.href = '/Games';
    } else if (n.type === 'hint') {
      window.location.href = '/Home';
    } else {
      window.location.href = '/Matches';
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full"
        style={{
          background: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.10)'
        }}
      >
        <Bell className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#111827' }} />
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex flex-col" 
              style={{ background: 'rgba(5, 6, 10, 0.8)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            >
              <motion.div
                ref={panelRef}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 350, damping: 32 }}
                className="absolute top-0 left-0 right-0 mx-auto w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden"
                style={{ 
                  background: panelBg, 
                  zIndex: 40,
                  borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)'
                }}
              >
                {/* Glowing background decor */}
                {isDark && (
                  <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none opacity-20 blur-[120px]"
                    style={{ 
                      background: 'radial-gradient(circle, #EA3FD3 0%, #8E54E9 100%)',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Header */}
                <div 
                  className="pb-4 px-4 border-b z-10 relative" 
                  style={{ 
                    borderColor: divider,
                    paddingTop: 'calc(env(safe-area-inset-top, 40px) + 16px)'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setOpen(false)}
                      className="w-10 h-10 rounded-full flex items-center justify-center hover:opacity-80 active:scale-95 transition-all flex-shrink-0"
                      style={{ 
                        background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                        border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)'
                      }}
                    >
                      <ChevronLeft className="w-5 h-5" style={{ color: textMain }} />
                    </button>
                    <div>
                      <h2 className="font-extrabold text-xl tracking-tight" style={{ color: textMain }}>Meldingen</h2>
                      <p className="text-xs font-semibold mt-0.5" style={{ color: textSub }}>{notifications.length} meldingen</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto z-10 relative pt-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="w-8 h-8 rounded-full border-4 border-purple-200 border-t-purple-500 animate-spin" />
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: isDark ? 'rgba(160,97,255,0.12)' : 'rgba(160,97,255,0.08)' }}>
                        <Bell className="w-7 h-7" style={{ color: '#A061FF' }} />
                      </div>
                      <p className="font-bold text-sm" style={{ color: textMain }}>Nog geen meldingen</p>
                      <p className="text-xs mt-1" style={{ color: textSub }}>Je ziet hier likes en supermatches</p>
                    </div>
                  ) : (
                    <div>
                      {/* Supermatches section */}
                      {matchNotifs.length > 0 && (
                        <div className="mb-4">
                          <div className="px-4">
                            <button
                              onClick={() => setMatchesExpanded(!matchesExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 border"
                              style={{ 
                                background: isDark 
                                  ? 'linear-gradient(135deg, rgba(234,63,211,0.08) 0%, rgba(142,84,233,0.08) 100%)' 
                                  : 'linear-gradient(135deg, rgba(234,63,211,0.03) 0%, rgba(142,84,233,0.03) 100%)',
                                borderColor: isDark ? 'rgba(234,63,211,0.18)' : 'rgba(234,63,211,0.1)',
                              }}
                            >
                              <span className="text-sm font-bold" style={{ color: '#EA3FD3' }}>Supermatches ({matchNotifs.length})</span>
                              {matchesExpanded
                                ? <ChevronUp className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                                : <ChevronDown className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                              }
                            </button>
                          </div>

                          {matchesExpanded && (
                            <div className="flex flex-col gap-2 mt-2 px-4">
                              {matchNotifs.map((n) => (
                                <div
                                  key={n.id}
                                  onClick={() => handleNotificationClick(n)}
                                  className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl cursor-pointer hover:brightness-105 active:scale-[0.99] border transition-all duration-200"
                                  style={{ 
                                    background: n.is_read 
                                      ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') 
                                      : (isDark ? 'rgba(234,63,211,0.05)' : 'rgba(234,63,211,0.03)'),
                                    borderColor: n.is_read
                                      ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                      : (isDark ? 'rgba(234,63,211,0.15)' : 'rgba(234,63,211,0.08)')
                                  }}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[15px] font-extrabold text-white">
                                      Nieuwe supermatch! 🎉
                                    </p>
                                    <p className="text-[11px] text-white/40 mt-1">
                                      {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                                    </p>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                                    className="px-3.5 py-2 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition-transform flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)', boxShadow: '0 4px 12px rgba(255,75,114,0.3)' }}
                                  >
                                    Bekijk
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Other notifications section */}
                      {likeNotifs.length > 0 && (
                        <div className="mb-4">
                          <div className="px-4">
                            <button
                              onClick={() => setOthersExpanded(!othersExpanded)}
                              className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 border"
                              style={{ 
                                background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                              }}
                            >
                              <span className="text-sm font-bold" style={{ color: textMain }}>Overige meldingen ({likeNotifs.length})</span>
                              {othersExpanded
                                ? <ChevronUp className="w-4 h-4" style={{ color: textMain }} />
                                : <ChevronDown className="w-4 h-4" style={{ color: textMain }} />
                              }
                            </button>
                          </div>

                          {othersExpanded && (
                            <div className="flex flex-col gap-2.5 mt-2 px-4 pb-28">
                              {likeNotifs.map((n) => {
                                const isGame = n.type === 'game_accepted' || n.type === 'game_invite' || n.type === 'game';
                                const isHint = n.type === 'hint';

                                let titleText = 'Melding';
                                let descText = 'Je hebt een update.';
                                let buttonText = 'Bekijk';
                                let buttonColor = 'bg-gradient-to-r from-purple-500 to-indigo-600';
                                let shadowColor = 'rgba(160,97,255,0.25)';

                                if (n.type === 'game_invite') {
                                  titleText = 'Speluitnodiging';
                                  descText = 'Je match heeft je uitgenodigd voor een game!';
                                  buttonText = 'Naar spel';
                                  buttonColor = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                                  shadowColor = 'rgba(16,185,129,0.25)';
                                } else if (n.type === 'game_accepted') {
                                  titleText = 'Spel geaccepteerd';
                                  descText = 'Je match heeft je speluitnodiging geaccepteerd! 🚀';
                                  buttonText = 'Naar spel';
                                  buttonColor = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                                  shadowColor = 'rgba(16,185,129,0.25)';
                                } else if (n.type === 'game') {
                                  titleText = 'Spel-update';
                                  descText = 'Het is jouw beurt in het spel met je match!';
                                  buttonText = 'Naar spel';
                                  buttonColor = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                                  shadowColor = 'rgba(16,185,129,0.25)';
                                } else if (isHint) {
                                  titleText = 'Hint ontvangen';
                                  descText = 'Je hebt een nieuwe hint gekregen van een match!';
                                  buttonText = 'Bekijk';
                                } else {
                                  titleText = 'Nieuwe like';
                                  descText = 'Iemand vindt je leuk! 💜';
                                }

                                return (
                                  <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className="flex items-center justify-between gap-3 px-5 py-4.5 rounded-2xl cursor-pointer hover:brightness-105 active:scale-[0.99] border transition-all duration-200"
                                    style={{ 
                                      background: n.is_read 
                                        ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') 
                                        : (isDark ? 'rgba(160,97,255,0.05)' : 'rgba(160,97,255,0.02)'),
                                      borderColor: n.is_read
                                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                                        : (isDark ? 'rgba(160,97,255,0.12)' : 'rgba(160,97,255,0.06)')
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[15px] font-extrabold truncate" style={{ color: textMain }}>
                                        {titleText}
                                      </p>
                                      <p className="text-sm mt-0.5 text-white/60">
                                        {descText}
                                      </p>
                                      {n.venue_name && (
                                        <p className="text-sm mt-0.5 text-white/40">📍 {n.venue_name}</p>
                                      )}
                                      <p className="text-[11px] text-white/40 mt-1">
                                        {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                                      </p>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition-transform flex-shrink-0 ${buttonColor}`}
                                      style={{
                                        boxShadow: `0 4px 12px ${shadowColor}`
                                      }}
                                    >
                                      {buttonText}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}