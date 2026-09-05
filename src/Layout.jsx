import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Heart, User, Home, Plus } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useNotifications } from '@/components/welove/useNotifications';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

import { base44 } from '@/api/base44Client';

const NAV_CONFIG = [
  { key: 'navHome', icon: Home, page: 'Home' },
  { key: 'navPinpoint', icon: MapPin, page: 'Pinpoint' },
  { key: 'navHints', icon: Plus, page: 'Hints' },
  { key: 'navMatches', icon: Heart, page: 'Matches' },
  { key: 'navAccount', icon: User, page: 'Account' }
];

export default function Layout({ children, currentPageName }) {
  const showNav = !['Onboarding'].includes(currentPageName);
  const { unreadCount, markAllRead } = useNotifications();
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;
  const [unreadChatCount, setUnreadChatCount] = React.useState(0);
  const NAV_ITEMS = React.useMemo(() => NAV_CONFIG.map((item) => ({ ...item, name: t[item.key] || item.key })), [t]);

  // Poll for unread chat messages every 30s
  React.useEffect(() => {
    let isMounted = true;
    const checkChats = async () => {
      try {
        const email = localStorage.getItem('romety_user_email');
        if (!email) return;
        const [rooms, rooms2] = await Promise.all([
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
          await Promise.all(
            activeRooms.map(async (r) => {
              try {
                const msgs = await base44.entities.ChatMessage.filter({ room_id: r.id });
                const partnerMsgs = (msgs || []).filter(m => !m.is_system && m.sender_email !== email);
                const readCount = parseInt(localStorage.getItem(`chat_read_count_${r.id}`) || '0', 10);
                const unreadInRoom = Math.max(0, partnerMsgs.length - readCount);
                if (unreadInRoom > 0) totalBadge += unreadInRoom;
              } catch (e) {}
            })
          );
        }

        if (isMounted) setUnreadChatCount(totalBadge);
      } catch (e) {}
    };
    checkChats();
    const interval = setInterval(checkChats, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

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

      {showNav &&
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[200]"
          style={{
            background: isDark ? 'rgba(11, 12, 16, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
            boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.5)' : '0 -4px 24px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            willChange: 'transform',
          }}
        >
          <div className="flex justify-around items-center px-2 py-4">
            {NAV_ITEMS.map(({ name, icon: Icon, page }) => {
            const isActive = currentPageName === page;
            const inactiveColor = isDark ? 'rgba(255,255,255,0.5)' : '#888888';
            return (
              <Link key={name} to={createPageUrl(page)} className="px-4 py-0 rounded flex flex-col items-center gap-0.5 active:scale-90 transition-transform duration-200" onClick={() => { if (page === 'Matches') markAllRead(); if (navigator.vibrate) navigator.vibrate(40); }}>
                  <div className="relative">
                    <Icon
                    className="w-6 h-6 transition-all duration-200"
                    style={isActive ? { color: '#FF4B72', filter: 'drop-shadow(0 0 8px rgba(255,75,114,0.8))' } : { color: inactiveColor }} />

                    {page === 'Matches' && unreadCount > 0 &&
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center px-0.5" style={{ boxShadow: '0 2px 6px rgba(236,72,153,0.5)' }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                  }
                    {page === 'Chat' && unreadChatCount > 0 &&
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center px-0.5" style={{ boxShadow: '0 2px 6px rgba(236,72,153,0.5)' }}>
                        {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </div>
                  }
                  </div>
                </Link>);

          })}
          </div>
        </nav>
      }
      <Toaster position="top-center" />
    </div>);

}