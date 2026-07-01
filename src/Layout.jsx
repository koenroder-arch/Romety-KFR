import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { MapPin, Heart, User, Home, Plus } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { useNotifications } from '@/components/welove/useNotifications';
import { useLang } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';
import { T } from '@/lib/translations';

const NAV_CONFIG = [
{ key: 'navHome', icon: Home, page: 'Home' },
{ key: 'navPinpoint', icon: MapPin, page: 'Pinpoint' },
{ key: 'navHints', icon: Plus, page: 'Hints' },
{ key: 'navMatches', icon: Heart, page: 'Matches' },
{ key: 'navAccount', icon: User, page: 'Account' }];


export default function Layout({ children, currentPageName }) {
  const showNav = !['Onboarding'].includes(currentPageName);
  const { unreadCount, markAllRead } = useNotifications();
  const { lang } = useLang();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const t = T[lang] || T.nl;
  const NAV_ITEMS = NAV_CONFIG.map((item) => ({ ...item, name: t[item.key] }));

  return (
    <div className="min-h-[100dvh] w-full flex flex-col" style={{ background: isDark ? '#08090E' : '#F8F9FB', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
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
        }
        
        [data-sonner-toast] {
          border-radius: 20px !important;
          padding: 14px 20px !important;
          font-size: 14px !important;
          font-weight: 600 !important;
          width: calc(100vw - 32px) !important;
          max-width: 400px !important;
          margin: 0 auto !important;
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
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: isDark ? 'rgba(11, 12, 16, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
            boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.5)' : '0 -4px 24px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
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
                  </div>
                </Link>);

          })}
          </div>
        </nav>
      }
      <Toaster position="top-center" />
    </div>);

}