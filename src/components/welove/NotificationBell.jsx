import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Bell, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useNotifications } from './useNotifications';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { createPageUrl } from '@/utils';

export default function NotificationBell({ isDark = true }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [matchesExpanded, setMatchesExpanded] = useState(true);
  const [othersExpanded, setOthersExpanded] = useState(false);
  const { unreadCount, markAllRead } = useNotifications();
  const panelRef = useRef(null);

  // Voorkom scrollen van de onderliggende pagina wanneer de dropdown open staat
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const loadNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const notifs = await base44.entities.Notification.filter({ to_email: user.email }, '-created_date', 30);
      setNotifications(notifs || []);
      setLoading(false);
      markAllRead();

      // Op de achtergrond overtollige meldingen opruimen zonder de interface te laten haperen
      if (notifs && notifs.length > 20) {
        setTimeout(async () => {
          try {
            const all = await base44.entities.Notification.filter({ to_email: user.email }, '-created_date', 100);
            if (all.length > 20) {
              const excess = all.slice(20);
              await Promise.all(excess.map(n => n.id ? base44.entities.Notification.delete(n.id).catch(() => {}) : Promise.resolve()));
            }
          } catch (_) {}
        }, 1500);
      }
    } catch (e) {
      console.error("Error loading notifications:", e);
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadNotifications();
  };

  const handleNotificationClick = async (n) => {
    if (!n.is_read && n.id) {
      await base44.entities.Notification.update(n.id, { is_read: true }).catch(() => {});
      setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, is_read: true } : item));
    }
    setOpen(false);

    let parsedRoomId = null;
    if (n.venue_name) {
      try {
        const parsed = JSON.parse(n.venue_name);
        if (parsed.roomId) parsedRoomId = parsed.roomId;
      } catch (e) {
        if (n.venue_name.length > 20 && !n.venue_name.includes(' ')) {
          parsedRoomId = n.venue_name;
        }
      }
    }

    const isChat = n.type === 'chat' || n.type === 'chat_message' || n.type === 'chat_invite' || n.type === 'chat_accepted';
    if (isChat) {
      if (parsedRoomId) {
        navigate(`${createPageUrl('Chat')}?roomId=${encodeURIComponent(parsedRoomId)}`);
      } else {
        navigate(createPageUrl('Chat'));
      }
    } else if (n.type === 'match') {
      navigate(createPageUrl('Matches'));
    } else if (n.type?.startsWith('game')) {
      navigate(createPageUrl('Games'));
    } else if (n.type === 'hint') {
      navigate(createPageUrl('Home'));
    }
  };

  const panelBg = isDark ? '#08090E' : '#F8F9FB';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const matchNotifs = notifications.filter(n => n.type === 'match');
  const likeNotifs = notifications.filter(n => n.type !== 'match');

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-95"
        style={{
          background: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.10)'
        }}
        title="Meldingen"
      >
        <Bell className="w-4 h-4" style={{ color: isDark ? '#FFFFFF' : '#111827' }} />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 min-w-[17px] h-[17px] rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center px-0.5 shadow-md pointer-events-none"
            style={{ boxShadow: '0 2px 8px rgba(255, 75, 114, 0.6)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[250] flex flex-col pointer-events-auto" 
              style={{ 
                background: 'rgba(5, 6, 10, 0.78)', 
                backdropFilter: 'blur(8px)', 
                WebkitBackdropFilter: 'blur(8px)',
                touchAction: 'none'
              }}
              onClick={() => setOpen(false)}
            >
              <motion.div
                ref={panelRef}
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 34 }}
                className="absolute top-0 right-0 left-0 mx-auto w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden pointer-events-auto"
                style={{ 
                  background: panelBg, 
                  willChange: 'transform',
                  borderLeft: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  borderRight: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)'
                }}
              >
                {/* Header */}
                <div 
                  className="pb-4 px-4 border-b z-20 relative flex-shrink-0" 
                  style={{ 
                    borderColor: divider,
                    paddingTop: 'calc(env(safe-area-inset-top, 40px) + 16px)',
                    background: panelBg
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

                {/* Content - Geoptimaliseerde soepele scrollruimte */}
                <div 
                  className="flex-1 overflow-y-auto overscroll-contain z-10 relative pt-4 px-4"
                  style={{
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    paddingBottom: 'calc(env(safe-area-inset-bottom, 24px) + 100px)'
                  }}
                >
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
                      <p className="text-xs mt-1" style={{ color: textSub }}>Je ziet hier updates, likes en chats</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Supermatches section */}
                      {matchNotifs.length > 0 && (
                        <div className="rounded-2xl overflow-hidden">
                          <button
                            onClick={() => setMatchesExpanded(!matchesExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 border select-none"
                            style={{ 
                              background: isDark 
                                ? 'linear-gradient(135deg, rgba(234,63,211,0.12) 0%, rgba(142,84,233,0.12) 100%)' 
                                : 'linear-gradient(135deg, rgba(234,63,211,0.05) 0%, rgba(142,84,233,0.05) 100%)',
                              borderColor: isDark ? 'rgba(234,63,211,0.25)' : 'rgba(234,63,211,0.14)',
                            }}
                          >
                            <span className="text-sm font-bold" style={{ color: '#EA3FD3' }}>Supermatches ({matchNotifs.length})</span>
                            {matchesExpanded
                              ? <ChevronUp className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                              : <ChevronDown className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                            }
                          </button>

                          <AnimatePresence initial={false}>
                            {matchesExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div className="flex flex-col gap-2 pt-2.5">
                                  {matchNotifs.map((n) => (
                                    <div
                                      key={n.id}
                                      className="flex items-center justify-between gap-3 px-5 py-4 rounded-2xl border transition-all duration-200 select-none cursor-default"
                                      style={{ 
                                        background: n.is_read 
                                          ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)') 
                                          : (isDark ? 'rgba(234,63,211,0.06)' : 'rgba(234,63,211,0.03)'),
                                        borderColor: n.is_read
                                          ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)')
                                          : (isDark ? 'rgba(234,63,211,0.18)' : 'rgba(234,63,211,0.09)')
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
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Other notifications section */}
                      {likeNotifs.length > 0 && (
                        <div className="rounded-2xl overflow-hidden">
                          <button
                            onClick={() => setOthersExpanded(!othersExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-200 border select-none"
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

                          <AnimatePresence initial={false}>
                            {othersExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                                className="overflow-hidden"
                              >
                                <div className="flex flex-col gap-2.5 pt-2.5">
                                  {likeNotifs.map((n) => {
                                    const isHint = n.type === 'hint';
                                    let parsedMessageText = null;
                                    let isVenueJson = false;
                                    if (n.venue_name) {
                                      try {
                                        const parsed = JSON.parse(n.venue_name);
                                        if (parsed.roomId) {
                                          parsedMessageText = parsed.text;
                                          isVenueJson = true;
                                        }
                                      } catch (e) {}
                                    }

                                    const isChat = n.type === 'chat' || n.type === 'chat_message' || n.type === 'chat_invite';

                                    let titleText = 'Melding';
                                    let descText = n.message || 'Je hebt een update.';

                                    if (isChat) {
                                      titleText = n.from_name ? `${n.from_name} 💬` : 'Nieuw bericht 💬';
                                      descText = parsedMessageText || n.message || 'Heeft je een bericht gestuurd.';
                                    } else if (n.type === 'chat_rejected') {
                                      titleText = 'Chat beëindigd ❌';
                                      descText = n.message || n.venue_name || 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.';
                                    } else if (n.type === 'chat_inactive') {
                                      titleText = 'Chat beëindigd ⌛';
                                      descText = n.message || 'Een chat is verwijderd vanwege 7 dagen inactiviteit.';
                                    } else if (n.type === 'chat_accepted') {
                                      titleText = 'Chat geaccepteerd! 💬';
                                      descText = parsedMessageText || n.message || 'Je chat-uitnodiging is geaccepteerd! 🎉';
                                    } else if (n.type === 'game_invite') {
                                      titleText = 'Speluitnodiging';
                                      descText = 'Je match heeft je uitgenodigd voor een game!';
                                    } else if (n.type === 'game_accepted') {
                                      titleText = 'Spel geaccepteerd';
                                      descText = 'Je match heeft je speluitnodiging geaccepteerd! 🚀';
                                    } else if (n.type === 'game') {
                                      titleText = 'Spel-update';
                                      descText = 'Het is jouw beurt in het spel met je match!';
                                    } else if (isHint) {
                                      titleText = 'Hint ontvangen';
                                      descText = 'Je hebt een nieuwe hint gekregen van een match!';
                                    } else if (n.type === 'like') {
                                      titleText = 'Nieuwe like';
                                      descText = 'Iemand vindt je leuk! 💜';
                                    }

                                    return (
                                      <div
                                        key={n.id}
                                        onClick={() => handleNotificationClick(n)}
                                        className="flex items-center justify-between gap-3 px-5 py-4.5 rounded-2xl cursor-pointer hover:brightness-105 active:scale-[0.99] border transition-all duration-200 select-none"
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
                                          {!isVenueJson && !isChat && n.venue_name && (
                                            <p className="text-sm mt-0.5 text-white/40">📍 {n.venue_name}</p>
                                          )}
                                          <p className="text-[11px] text-white/40 mt-1">
                                            {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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