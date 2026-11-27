import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTheme } from '@/lib/ThemeContext';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import { trNow } from '@/lib/LanguageContext';
import { dt } from '@/lib/displayText';

/**
 * Meldingen van gewone chatberichten geven alleen een pop-up (niet als je die chat al open
 * hebt) en komen NOOIT bij het belletje: niet in de lijst en niet in het rode getal.
 *
 * Nieuwe berichten hebben het type 'chat_message'. Oudere versies van de app gebruikten
 * 'chat' voor zowel berichten als uitnodigingen; daarvan blijven alleen de uitnodigingen
 * ("Wil met je chatten!") bij het belletje.
 */
export const CHAT_MESSAGE_TYPE = 'chat_message';
// Deze 'chat'-meldingen gaan over een uitnodiging en blijven dus wél bij het belletje
const CHAT_INVITE_TEXTS = ['Wil met je chatten! 💬', 'Je chat-uitnodiging is geaccepteerd! 🎉'];
export const isChatMessageNotif = (n) => {
  if (!n) return false;
  if (n.type === CHAT_MESSAGE_TYPE) return true;
  if (n.type !== 'chat') return false;
  return !CHAT_INVITE_TEXTS.includes(parseRoomInfo(n.venue_name).text);
};

/**
 * Instelling "Push Notificaties" (Account). Staat die uit, dan krijg je in de app geen
 * meldingen meer als pop-up. Bewaard op dit apparaat.
 */
const NOTIF_PREF_KEY = 'romety_notifications_enabled';
export function getNotificationsEnabled() {
  try { return localStorage.getItem(NOTIF_PREF_KEY) !== 'false'; } catch (e) { return true; }
}
export function saveNotificationsEnabled(enabled) {
  try { localStorage.setItem(NOTIF_PREF_KEY, enabled ? 'true' : 'false'); } catch (e) { /* niet erg */ }
}

/** De chat die nu open staat (gezet door ChatRoomView), zodat je daar geen pop-up van krijgt. */
export function getOpenChatRoomId() {
  try { return window.__romety_open_chat_room_id || null; } catch (e) { return null; }
}

function parseRoomInfo(venueName) {
  if (!venueName) return { roomId: null, text: null };
  try {
    const parsed = JSON.parse(venueName);
    if (parsed?.roomId) return { roomId: parsed.roomId, text: parsed.text || null };
  } catch (e) {
    if (venueName.length > 20 && !venueName.includes(' ')) return { roomId: venueName, text: null };
  }
  return { roomId: null, text: null };
}

const ACCENTS = {
  chat: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
  match: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
  game: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
  hint: 'linear-gradient(135deg, #EA3FD3 0%, #A061FF 100%)',
  warn: 'linear-gradient(135deg, #F97316 0%, #FB923C 100%)',
  default: 'linear-gradient(135deg, #3B82F6 0%, #8E54E9 100%)',
};

function NotificationToast({ isDark, photoUrl, avatarIcon, badgeIcon, accent, title, body, onClick }) {
  return (
    <div
      role="button"
      onClick={onClick}
      className="romety-notif-card w-full flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform duration-200 select-none"
      style={{
        padding: '12px 14px',
        borderRadius: 22,
        background: isDark ? 'rgba(22, 22, 36, 0.94)' : 'rgba(255, 255, 255, 0.96)',
        border: isDark ? '1px solid rgba(255, 255, 255, 0.09)' : '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: isDark ? '0 14px 36px rgba(0, 0, 0, 0.55)' : '0 14px 36px rgba(17, 24, 39, 0.14)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Profielfoto of icoon, met klein type-icoontje */}
      <div className="relative flex-shrink-0" style={{ width: 46, height: 46 }}>
        {photoUrl ? (
          <img src={photoUrl} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-[22px] leading-none"
            style={{ background: accent }}
          >
            {avatarIcon}
          </div>
        )}
        <div
          className="absolute flex items-center justify-center rounded-full text-[10px] leading-none"
          style={{
            right: -3,
            bottom: -3,
            width: 20,
            height: 20,
            background: accent,
            border: `2px solid ${isDark ? '#161624' : '#FFFFFF'}`,
          }}
        >
          {badgeIcon}
        </div>
      </div>

      {/* Tekst */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-extrabold uppercase tracking-[0.08em]"
            style={{
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Romety
          </span>
          <span className="text-[11px] flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.4)' }}>
            {trNow('nu', 'now')}
          </span>
        </div>
        <p className="text-[14px] font-bold leading-snug truncate mt-0.5" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
          {title}
        </p>
        <p
          className="text-[13px] leading-snug mt-0.5"
          style={{
            color: isDark ? 'rgba(255,255,255,0.68)' : 'rgba(17,24,39,0.62)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
          }}
        >
          {body}
        </p>
      </div>
    </div>
  );
}

export function useNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let unsubscribe = null;

    // Initial unread count (chatberichten tellen niet mee bij het belletje)
    base44.entities.Notification.filter({ to_email: user.email, is_read: false }).then(notifs => {
      setUnreadCount(notifs.filter((n) => !isChatMessageNotif(n)).length);
    }).catch(() => {});

    // Real-time subscription
    unsubscribe = base44.entities.Notification.subscribe(async (event) => {
      if (event.type === 'create' && event.data?.to_email === user.email) {
        const type = event.data.type;
        const isChatMessage = isChatMessageNotif(event.data);
        const isMatch = type === 'match';
        const isChat = type === 'chat' || type === 'chat_message' || type === 'chat_invite';
        const { roomId: parsedRoomId, text: parsedMessageText } = parseRoomInfo(event.data.venue_name);

        if (!isChatMessage) setUnreadCount(prev => prev + 1);

        // Meldingen uitgezet op de Account-pagina: geen pop-up tonen
        if (!getNotificationsEnabled()) return;

        // Zit je al in deze chat, dan geen pop-up
        if (isChat && parsedRoomId) {
          const openRoomId = getOpenChatRoomId();
          const urlHasRoom = window.location.pathname.toLowerCase().includes('/chat') && window.location.href.includes(parsedRoomId);
          if (openRoomId === parsedRoomId || urlHasRoom) return;
        }

        let photoUrl = null;
        let senderAvatar = null;
        if (event.data.from_email) {
          try {
            const profiles = await base44.entities.UserProfile.filter({ user_email: event.data.from_email });
            photoUrl = profiles?.[0]?.photo_url || null;
            senderAvatar = profiles?.[0]?.avatar || null;
          } catch (e) {
            console.error("Error fetching notification sender profile:", e);
          }
        }

        let titleText = trNow('Nieuwe update', 'New update');
        let bodyText = trNow('Iemand vindt je leuk! 💜', 'Someone likes you! 💜');
        let avatarIcon = '💜';
        let badgeIcon = '💜';
        let accent = ACCENTS.default;
        let targetUrl = createPageUrl('Home');

        if (isChat) {
          titleText = event.data.from_name ? dt(event.data.from_name) : trNow('Nieuw bericht', 'New message');
          bodyText = dt(parsedMessageText) || dt(event.data.message) || trNow('Heeft je een bericht gestuurd!', 'Sent you a message!');
          // Zonder foto: het dier-emoji van de afzender als avatar
          avatarIcon = (senderAvatar && [...senderAvatar.trim()][0]) || '💬';
          badgeIcon = '💬';
          accent = ACCENTS.chat;
          targetUrl = parsedRoomId
            ? `${createPageUrl('Chat')}?roomId=${encodeURIComponent(parsedRoomId)}`
            : createPageUrl('Chat');
        } else if (isMatch) {
          titleText = trNow('Nieuwe match! 🎉', 'New match! 🎉');
          bodyText = trNow('Jij en je match hebben elkaar geliked! 💖', 'You and your match liked each other! 💖');
          avatarIcon = '💖';
          badgeIcon = '💖';
          accent = ACCENTS.match;
          targetUrl = createPageUrl('Matches');
        } else if (type === 'game_invite') {
          titleText = trNow('Speluitnodiging', 'Game invite');
          bodyText = trNow('Je match heeft je uitgenodigd voor een game!', 'Your match invited you to a game!');
          avatarIcon = '🎮';
          badgeIcon = '🎮';
          accent = ACCENTS.game;
          targetUrl = createPageUrl('Games');
        } else if (type === 'game_accepted') {
          titleText = trNow('Uitnodiging geaccepteerd', 'Invite accepted');
          bodyText = trNow('Je match heeft je uitnodiging geaccepteerd! 🚀', 'Your match accepted your invite! 🚀');
          avatarIcon = '🎮';
          badgeIcon = '✅';
          accent = ACCENTS.game;
          targetUrl = createPageUrl('Games');
        } else if (type === 'game') {
          titleText = trNow('Spel-update', 'Game update');
          bodyText = trNow('Het is jouw beurt in het spel met je match! 🎲', 'It is your turn in the game with your match! 🎲');
          avatarIcon = '🎮';
          badgeIcon = '🎲';
          accent = ACCENTS.game;
          targetUrl = createPageUrl('Games');
        } else if (type === 'hint') {
          titleText = trNow('Hint ontvangen', 'Hint received');
          bodyText = trNow('Je hebt een hint gekregen van een match! 💜', 'You received a hint from a match! 💜');
          avatarIcon = '💬';
          badgeIcon = '💜';
          accent = ACCENTS.hint;
          targetUrl = createPageUrl('Home');
        } else if (type === 'report') {
          titleText = trNow('Nieuwe melding', 'New report');
          bodyText = trNow('Er is een gebruiker gemeld. Tik om te behandelen.', 'A user was reported. Tap to handle it.');
          avatarIcon = '🚩';
          badgeIcon = '🚩';
          accent = ACCENTS.warn;
          targetUrl = `${createPageUrl('Account')}?moderation=1`;
        } else if (type === 'warning') {
          titleText = trNow('Waarschuwing', 'Warning');
          bodyText = trNow('Je gedrag is gemeld. Houd je aan de regels van Romety.', 'Your behaviour was reported. Please follow the Romety rules.');
          avatarIcon = '⚠️';
          badgeIcon = '⚠️';
          accent = ACCENTS.warn;
        }

        // Alleen bij een afzender (chat, match) de profielfoto tonen
        const showPhoto = (isChat || isMatch) ? photoUrl : null;

        toast.custom((t) => (
          <NotificationToast
            isDark={isDark}
            photoUrl={showPhoto}
            avatarIcon={avatarIcon}
            badgeIcon={badgeIcon}
            accent={accent}
            title={titleText}
            body={bodyText}
            onClick={() => {
              toast.dismiss(t);
              if (targetUrl) {
                try {
                  navigate(targetUrl);
                } catch {
                  window.location.href = targetUrl;
                }
              }
            }}
          />
        // Deze hook draait op meerdere plekken tegelijk (navigatiebalk, belletje, Matches).
        // Met een vaste id per melding verschijnt de pop-up maar één keer.
        ), { duration: 5500, ...(event.data.id ? { id: `notif-${event.data.id}` } : {}) });
      }
      if (event.type === 'update' && event.data?.to_email === user.email && event.data?.is_read && !isChatMessageNotif(event.data)) {
        // Decrement locally instead of doing a full DB fetch on every read event
        setUnreadCount(prev => Math.max(0, prev - 1));
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
