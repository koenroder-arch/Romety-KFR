import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export function useNotifications() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let unsubscribe = null;

    // Initial unread count
    base44.entities.Notification.filter({ to_email: user.email, is_read: false }).then(notifs => {
      setUnreadCount(notifs.length);
    }).catch(() => {});

    // Real-time subscription
    unsubscribe = base44.entities.Notification.subscribe(async (event) => {
      if (event.type === 'create' && event.data?.to_email === user.email) {
        setUnreadCount(prev => prev + 1);

        let photoUrl = null;
        if (event.data.from_email) {
          try {
            const profiles = await base44.entities.UserProfile.filter({ user_email: event.data.from_email });
            if (profiles && profiles[0]?.photo_url) {
              photoUrl = profiles[0].photo_url;
            }
          } catch (e) {
            console.error("Error fetching notification sender profile:", e);
          }
        }

        let titleText = 'Nieuwe update';
        let bodyText = `Iemand vindt je leuk! 💜`;
        let toastIcon = '👤';
        let toastBorderColor = 'rgba(255, 255, 255, 0.08)';
        let toastBadgeIcon = '💜';
        let routePage = 'Matches';

        const isMatch = event.data.type === 'match';

        if (isMatch) {
          titleText = `Nieuwe match! 🎉`;
          bodyText = `Jij en je match hebben elkaar geliked! 💖`;
          toastIcon = '💖';
          toastBorderColor = '#FF4B72';
          toastBadgeIcon = '💖';
        } else if (event.data.type === 'game_invite') {
          titleText = `🎮 Speluitnodiging`;
          bodyText = `Je match heeft je uitgenodigd voor een game!`;
          toastIcon = '🎮';
          toastBorderColor = '#8B5CF6';
          toastBadgeIcon = '🎮';
          routePage = 'Games';
        } else if (event.data.type === 'game_accepted') {
          titleText = `🎮 Uitnodiging geaccepteerd`;
          bodyText = `Je match heeft je uitnodiging geaccepteerd! 🚀`;
          toastIcon = '🎮';
          toastBorderColor = '#10B981';
          toastBadgeIcon = '🎮';
          routePage = 'Games';
        } else if (event.data.type === 'game') {
          titleText = `🎮 Spel-update`;
          bodyText = `Het is jouw beurt in het spel met je match! 🎲`;
          toastIcon = '🎮';
          toastBorderColor = '#8B5CF6';
          toastBadgeIcon = '🎮';
          routePage = 'Games';
        } else if (event.data.type === 'hint') {
          titleText = `💬 Hint ontvangen`;
          bodyText = `Je hebt een hint gekregen van een match! 💜`;
          toastIcon = '💬';
          toastBorderColor = '#EA3FD3';
          toastBadgeIcon = '💬';
          routePage = 'Home';
        }

        toast.custom((t) => (
          <div 
            className="flex items-center gap-3 p-3 rounded-[20px] shadow-xl w-full max-w-sm border cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
            style={{
              background: isDark ? 'rgba(15, 15, 27, 0.95)' : '#FFFFFF',
              borderColor: isDark ? (isMatch || event.data.type?.startsWith('game') || event.data.type === 'hint' ? toastBorderColor : 'rgba(255, 255, 255, 0.08)') : 'rgba(0, 0, 0, 0.08)',
              boxShadow: isDark ? '0 12px 32px rgba(0, 0, 0, 0.5)' : '0 12px 32px rgba(0, 0, 0, 0.12)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
            onClick={() => {
              toast.dismiss(t);
              window.location.href = createPageUrl(routePage);
            }}
          >
            {/* Left side: Profile Photo / Fallback Avatar */}
            <div className="relative flex-shrink-0">
              {photoUrl ? (
                <img 
                  src={photoUrl} 
                  alt="" 
                  className="w-11 h-11 rounded-full object-cover border" 
                  style={{ borderColor: isMatch ? '#FF4B72' : '#3B82F6' }}
                />
              ) : (
                <div 
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-lg"
                  style={{
                    background: isMatch
                      ? 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)'
                      : 'linear-gradient(135deg, #3B82F6 0%, #8E54E9 100%)'
                  }}
                >
                  {toastIcon}
                </div>
              )}
              {/* WhatsApp Green Notification dot / App Badge */}
              <div 
                className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] border-2 text-white"
                style={{
                  background: isMatch
                    ? 'linear-gradient(135deg, #FF4B72, #EA3FD3)'
                    : event.data.type?.startsWith('game')
                    ? 'linear-gradient(135deg, #8B5CF6, #6366F1)'
                    : 'linear-gradient(135deg, #EA3FD3, #A061FF)',
                  borderColor: isDark ? '#0F0F1B' : '#FFFFFF'
                }}
              >
                {toastBadgeIcon}
              </div>
            </div>

            {/* Middle: WhatsApp style message text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Romety
                </span>
                <span className="text-[10px]" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>nu</span>
              </div>
              <p className="text-sm font-extrabold mt-0.5 truncate" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                {titleText}
              </p>
              <p className="text-xs mt-0.5 truncate" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)' }}>
                {bodyText}
              </p>
            </div>
          </div>
        ), { duration: 5000 });
      }
      if (event.type === 'update' && event.data?.to_email === user.email && event.data?.is_read) {
        base44.entities.Notification.filter({ to_email: user.email, is_read: false }).then(notifs => {
          setUnreadCount(notifs.length);
        }).catch(() => {});
      }
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const notifs = await base44.entities.Notification.filter({ to_email: user.email, is_read: false });
    await Promise.all(notifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    setUnreadCount(0);
  };

  return { unreadCount, markAllRead };
}