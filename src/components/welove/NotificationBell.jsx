import React, { useState, useEffect, useRef } from 'react';
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

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(10,14,33,0.85)' }}>
          <div
            ref={panelRef}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-md h-full flex flex-col"
            style={{ background: panelBg }}
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
                          className="flex items-start gap-3 px-5 py-4"
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
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#EA3FD3' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Likes */}
                  {likeNotifs.map((n) => (
                    <div
                      key={n.id}
                      className="flex items-start gap-3 px-5 py-4"
                      style={{ borderBottom: `1px solid ${divider}`, background: n.is_read ? 'transparent' : (isDark ? 'rgba(160,97,255,0.06)' : 'rgba(160,97,255,0.04)') }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'rgba(160,97,255,0.15)' }}
                      >
                        <Heart className="w-5 h-5" style={{ color: '#A061FF' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: textMain }}>
                          💜 {n.from_name || 'Iemand'} liked jouw profiel
                        </p>
                        {n.venue_name && (
                          <p className="text-xs mt-0.5" style={{ color: textSub }}>📍 {n.venue_name}</p>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: textSub }}>
                          {n.created_date ? format(new Date(n.created_date), 'd MMM · HH:mm', { locale: nl }) : ''}
                        </p>
                      </div>
                      {!n.is_read && (
                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: '#A061FF' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}