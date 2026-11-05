import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Heart, User, Home } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useNotifications } from '@/components/welove/useNotifications';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

import { base44 } from '@/api/base44Client';
import { deleteChatRoomAndMedia } from '@/lib/chatUtils';
import { countUnread, CHAT_UNREAD_EVENT } from '@/lib/chatUnread';

const NAV_CONFIG = [
  { key: 'navHome', icon: Home, page: 'Home' },
  { key: 'navPinpoint', icon: MapPin, page: 'Pinpoint' },
  { key: 'navMatches', icon: Heart, page: 'Matches' },
  { key: 'navAccount', icon: User, page: 'Account' }
];

export default function Layout({ children, currentPageName }) {
  const [hintsPhotoCaptured, setHintsPhotoCaptured] = React.useState(false);

  React.useEffect(() => {
    const handlePhotoState = (e) => {
      setHintsPhotoCaptured(Boolean(e.detail?.captured));
    };
    window.addEventListener('romety_hints_photo_state', handlePhotoState);
    return () => window.removeEventListener('romety_hints_photo_state', handlePhotoState);
  }, []);

  const showNav = !['Onboarding', 'Language', 'Login', 'Hints'].includes(currentPageName);
  const { markAllRead } = useNotifications();
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const NAV_ITEMS = React.useMemo(() => NAV_CONFIG.map((item) => ({ ...item, name: t[item.key] || item.key })), [t]);

  // Synchronize mobile top bar & overscroll canvas color so no black bar appears
  React.useEffect(() => {
    const isTopGradientPage = ['Home', 'Account'].includes(currentPageName);
    const topColor = isDark 
      ? (isTopGradientPage ? '#4D122D' : '#08090E')
      : (isTopGradientPage ? '#FFF0F4' : '#F8F9FB');

    document.documentElement.style.backgroundColor = topColor;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', topColor);
    }
  }, [currentPageName, isDark]);

  // Rood bolletje op het hartje (Matches): verschijnt als je op "Ik ga hierheen" tikt en blijft
  // 1 minuut staan. Verdwijnt eerder als de venue in die minuut wordt verwijderd of verloopt.
  const VENUE_DOT_MS = 60 * 1000;
  const VENUE_DOT_KEY = 'romety_venue_dot_until';
  const [hasActiveVenue, setHasActiveVenue] = React.useState(false);
  React.useEffect(() => {
    let isMounted = true;
    let hideTimer = null;

    const readDotUntil = () => {
      try { return Number(localStorage.getItem(VENUE_DOT_KEY)) || 0; } catch (e) { return 0; }
    };

    const checkVenue = async () => {
      try {
        if (hideTimer) clearTimeout(hideTimer);
        const dotUntil = readDotUntil();
        const msLeft = dotUntil - Date.now();
        const email = localStorage.getItem('romety_user_email');
        if (!email || msLeft <= 0) {
          if (isMounted) setHasActiveVenue(false);
          return;
        }
        const now = new Date().toISOString();
        const [dests = [], checkIns = []] = await Promise.all([
          base44.entities.UserDestination.filter({ user_email: email, status: 'active' }).catch(() => []),
          base44.entities.VenueCheckIn.filter({ user_email: email }).catch(() => []),
        ]);
        const active = [...dests, ...checkIns].filter((v) => v && (!v.expires_at || v.expires_at > now));
        if (!isMounted) return;
        setHasActiveVenue(active.length > 0);
        // Na de minuut automatisch weghalen
        if (active.length > 0) hideTimer = setTimeout(checkVenue, Math.max(0, readDotUntil() - Date.now()) + 50);
      } catch (e) {}
    };

    // "Ik ga hierheen" aangeklikt: bolletje 1 minuut tonen
    const handleActivated = () => {
      try { localStorage.setItem(VENUE_DOT_KEY, String(Date.now() + VENUE_DOT_MS)); } catch (e) {}
      if (isMounted) setHasActiveVenue(true);
      checkVenue();
    };

    checkVenue();
    window.addEventListener('romety_venue_changed', checkVenue);
    window.addEventListener('romety_venue_activated', handleActivated);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkVenue();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('romety_venue_changed', checkVenue);
      window.removeEventListener('romety_venue_activated', handleActivated);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentPageName]);

  // Poll for unread chat messages efficiently (only when tab is visible)
  React.useEffect(() => {
    let isMounted = true;
    const checkChats = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const email = localStorage.getItem('romety_user_email');
        if (!email) return;
        const [rooms = [], rooms2 = []] = await Promise.all([
          base44.entities.ChatRoom.filter({ user_a_email: email }).catch(() => []),
          base44.entities.ChatRoom.filter({ user_b_email: email }).catch(() => [])
        ]);
        const allRooms = [...rooms, ...rooms2].filter(r => r && r.status !== 'deleted' && !r.deleted_at);
        const seenRoomIds = new Set();
        const uniqueRooms = allRooms.filter(r => {
          if (seenRoomIds.has(r.id)) return false;
          seenRoomIds.add(r.id);
          return true;
        });

        let totalBadge = 0;
        const pendingInvites = uniqueRooms.filter(r => r.status === 'pending' && r.user_b_email === email).length;
        totalBadge += pendingInvites;

        const activeRooms = uniqueRooms.filter(r => r.status === 'active');
        if (activeRooms.length > 0) {
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          const nowMs = Date.now();
          await Promise.all(
            activeRooms.map(async (r) => {
              try {
                const msgs = await base44.entities.ChatMessage.filter({ room_id: r.id }).catch(() => []);
                const latestMsgTime = msgs && msgs.length > 0
                  ? Math.max(...msgs.map(m => new Date(m.created_at || m.created_date || 0).getTime()))
                  : new Date(r.created_at || 0).getTime();

                // If inactive for > 7 days, trigger deletion and do NOT count towards badge
                if (nowMs - latestMsgTime > SEVEN_DAYS_MS) {
                  deleteChatRoomAndMedia(r.id, { reason: 'inactivity' }).catch(() => {});
                  return;
                }

                // Telt per chat: aantal chats met ongelezen berichten
                if (countUnread(r, msgs, email) > 0) totalBadge += 1;
              } catch (e) {}
            })
          );
        }

        if (isMounted) setUnreadChatCount(totalBadge);
      } catch (e) {}
    };

    checkChats();
    const interval = setInterval(checkChats, 60000);
    // Direct bijwerken bij een nieuw bericht (Realtime) of als een chat is gelezen
    window.addEventListener(CHAT_UNREAD_EVENT, checkChats);
    const myEmail = (localStorage.getItem('romety_user_email') || '').toLowerCase();
    const unsubscribeMessages = myEmail
      ? base44.entities.ChatMessage.subscribe((event) => {
          // Realtime levert alleen berichten uit je eigen chats (RLS)
          if (event.type === 'create' && (event.data?.sender_email || '').toLowerCase() !== myEmail) {
            try { window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT)); } catch (e) {}
          }
        })
      : null;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkChats();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener(CHAT_UNREAD_EVENT, checkChats);
      if (unsubscribeMessages) unsubscribeMessages();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentPageName]);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: isDark ? '#08090E' : '#F8F9FB', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        * { -webkit-tap-highlight-color: transparent; }
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          transform: translateZ(0);
        }
        
        /* Premium Floating Glassmorphic Toasts (WhatsApp / iOS style) */
        [data-sonner-toaster] {
          font-family: 'Inter', sans-serif !important;
          top: max(16px, env(safe-area-inset-top, 16px)) !important;
          left: 50% !important;
          right: auto !important;
          transform: translateX(-50%) !important;
          width: calc(100vw - 32px) !important;
          max-width: 400px !important;
          display: flex !important;
          justify-content: center !important;
        }
        
        [data-sonner-toast] {
          border-radius: 20px !important;
          padding: 14px 20px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          width: 100% !important;
          margin: 0 !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          box-sizing: border-box !important;
          transition: all 0.3s ease !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }

        .dark [data-sonner-toast] {
          background: rgba(14, 14, 28, 0.93) !important;
          color: #ffffff !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
        }

        html:not(.dark) [data-sonner-toast] {
          background: rgba(255, 255, 255, 0.93) !important;
          color: #111827 !important;
          border: 1px solid rgba(0, 0, 0, 0.06) !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1) !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
        }

        [data-sonner-toast] [data-icon] {
          color: #FF4B72 !important; /* Premium brand pink */
          margin-top: 0 !important;
          flex-shrink: 0 !important;
        }
      `}</style>

      <main className={`flex-1 w-full ${showNav ? 'pb-[72px]' : ''}`}>
        {children}
      </main>

      {showNav && (
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[200]"
          style={{
            transform: 'translateX(-50%) translateZ(0)',
            background: isDark ? 'rgba(11, 12, 16, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
            boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.5)' : '0 -4px 24px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            touchAction: 'none',
          }}
        >
          <div className="flex justify-around items-center px-2 pt-3 pb-2">
            {NAV_ITEMS.map(({ name, icon: Icon, page }) => {
              const isActive = currentPageName === page;
              const inactiveColor = isDark ? 'rgba(255,255,255,0.5)' : '#888888';
              const targetUrl = createPageUrl(page);

              const handleNavClick = (e) => {
                if (typeof window !== 'undefined' && window.__romety_nav_blocker) {
                  const blocked = window.__romety_nav_blocker(targetUrl);
                  if (blocked) {
                    e.preventDefault();
                    return;
                  }
                }
                if (page === 'Matches') markAllRead();
                if (navigator.vibrate) navigator.vibrate(40);
              };

              return (
                <Link
                  key={name}
                  to={targetUrl}
                  className="px-4 py-0 rounded flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-200"
                  onClick={handleNavClick}
                >
                  <div className="relative">
                    <Icon
                      className="w-6 h-6 transition-all duration-200"
                      style={isActive ? { color: '#FF4B72', filter: 'drop-shadow(0 0 8px rgba(255,75,114,0.8))' } : { color: inactiveColor }}
                    />

                    {page === 'Matches' && hasActiveVenue && (
                      <span
                        className="absolute top-0 right-0 w-2 h-2 rounded-full"
                        style={{
                          // Zelfde roze als het actieve hartje op de Matches-pagina
                          background: '#FF4B72',
                          boxShadow: `0 0 0 1.5px ${isDark ? '#08090E' : '#FFFFFF'}, 0 0 5px rgba(255,75,114,0.6)`,
                        }}
                        aria-label={lang === 'en' ? 'Venue active' : 'Venue actief'}
                      />
                    )}
                    {page === 'Chat' && unreadChatCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center px-0.5" style={{ boxShadow: '0 2px 6px rgba(236,72,153,0.5)' }}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
      <Toaster position="top-center" />
    </div>);

}