import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Heart, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
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

  const panelBg = isDark ? '#1A1A2E' : '#FFFFFF';
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
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
            style={{ background: '#EA3FD3', boxShadow: '0 2px 6px rgba(234,63,211,0.6)' }}
          />
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] flex flex-col" style={{ background: 'rgba(10,14,33,0.85)' }}>
          <div
            ref={panelRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-full flex flex-col shadow-2xl"
            style={{ background: panelBg, zIndex: 100000 }}
          >
            {/* Header */}
            <div className="pt-8 pb-4">
              <div className="px-4 rounded-[12px] flex items-center gap-3" style={{ background: isDark ? 'rgba(160,97,255,0.08)' : 'rgba(160,97,255,0.05)', border: `1px solid ${divider}` }}>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:opacity-70 flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
                >
                  <ChevronLeft className="w-5 h-5" style={{ color: textMain }} />
                </button>
                <div className="py-3 pr-4">
                  <h2 className="font-black text-lg" style={{ color: textMain }}>Meldingen</h2>
                  <p className="text-xs font-semibold mt-1" style={{ color: textSub }}>{notifications.length} meldingen</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
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
                    <div>
                      <button
                        onClick={() => setMatchesExpanded(!matchesExpanded)}
                        className="w-full flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: `1px solid ${divider}`, background: isDark ? 'rgba(234,63,211,0.08)' : 'rgba(234,63,211,0.04)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black" style={{ color: '#EA3FD3' }}>💜 Supermatches ({matchNotifs.length})</span>
                          {matchNotifs.some(n => !n.is_read) && (
                            <span className="w-2 h-2 rounded-full" style={{ background: '#EA3FD3' }} />
                          )}
                        </div>
                        {matchesExpanded
                          ? <ChevronUp className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                          : <ChevronDown className="w-4 h-4" style={{ color: '#EA3FD3' }} />
                        }
                      </button>

                      {matchesExpanded && matchNotifs.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:brightness-110 transition-all"
                          style={{ borderBottom: `1px solid ${divider}`, background: n.is_read ? 'transparent' : (isDark ? 'rgba(234,63,211,0.06)' : 'rgba(234,63,211,0.04)') }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ color: textMain }}>
                              🎉 Supermatch met {n.from_name || 'iemand'}!
                            </p>
                            {n.venue_name && (
                              <p className="text-xs mt-0.5" style={{ color: textSub }}>📍 {n.venue_name}</p>
                            )}
                            <p className="text-xs mt-0.5" style={{ color: textSub }}>
                              {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                            className="px-3 py-1.5 rounded-full text-xs font-black text-white shadow-sm active:scale-95 transition-transform flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' }}
                          >
                            Bekijk match
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Likes and other notifications */}
                  {likeNotifs.map((n) => {
                    const isGame = n.type === 'game_accepted' || n.type === 'game_invite' || n.type === 'game';
                    const isHint = n.type === 'hint';

                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer hover:brightness-110 transition-all"
                        style={{ borderBottom: `1px solid ${divider}`, background: n.is_read ? 'transparent' : (isDark ? 'rgba(160,97,255,0.06)' : 'rgba(160,97,255,0.04)') }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: isGame ? 'rgba(16,185,129,0.15)' : 'rgba(160,97,255,0.15)' }}
                          >
                            {isGame ? (
                              <span className="text-base">🎮</span>
                            ) : (
                              <Heart className="w-5 h-5" style={{ color: '#A061FF' }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" style={{ color: textMain }}>
                              {isGame 
                                ? `🎮 Spel-update van ${n.from_name || 'je match'}` 
                                : isHint 
                                ? `💬 Hint van ${n.from_name || 'iemand'}` 
                                : `💜 ${n.from_name || 'Iemand'} liked jouw profiel`}
                            </p>
                            {n.venue_name && (
                              <p className="text-xs mt-0.5 truncate" style={{ color: textSub }}>📍 {n.venue_name}</p>
                            )}
                            <p className="text-xs mt-0.5" style={{ color: textSub }}>
                              {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleNotificationClick(n); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-black text-white shadow-sm active:scale-95 transition-transform flex-shrink-0 ${
                            isGame ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'
                          }`}
                        >
                          {isGame ? 'Naar spel' : isHint ? 'Bekijk hint' : 'Bekijk'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}