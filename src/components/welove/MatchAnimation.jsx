import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import confetti from 'canvas-confetti';
import { Heart, MessageCircle, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { trNow } from '@/lib/LanguageContext';
import { useTheme } from '@/lib/ThemeContext';

export default function MatchAnimation({ myProfile, matchedProfile, onDone, onClose, onSendHint }) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [unlockingChat, setUnlockingChat] = useState(false);

  const handleDone = () => {
    if (onDone) onDone();
    if (onClose) onClose();
  };

  const handleUnlockChat = async (e) => {
    e?.stopPropagation();
    if (unlockingChat || !matchedProfile?.user_email || !myProfile?.user_email) return;
    setUnlockingChat(true);

    try {
      const myEmail = myProfile.user_email;
      const partnerEmail = matchedProfile.user_email;

      // Controleer of er al een chatroom bestaat tussen deze twee
      const [roomsA, roomsB] = await Promise.all([
        base44.entities.ChatRoom.filter({ user_a_email: myEmail, user_b_email: partnerEmail }).catch(() => []),
        base44.entities.ChatRoom.filter({ user_a_email: partnerEmail, user_b_email: myEmail }).catch(() => []),
      ]);
      const existing = [...(roomsA || []), ...(roomsB || [])].find(r => r && r.status !== 'deleted' && !r.deleted_at);

      if (existing) {
        handleDone();
        navigate(createPageUrl('Chat'));
        return;
      }

      // Maak nieuwe chatroom aan met status 'pending'
      const newRoom = await base44.entities.ChatRoom.create({
        user_a_email: myEmail,
        user_b_email: partnerEmail,
        status: 'pending',
        phase: 1,
        extension_accepted_a: false,
        extension_accepted_b: false,
        photo_sent_a: false,
        photo_sent_b: false,
      });

      // Stuur chat uitnodiging notificatie
      try {
        const avatar = myProfile?.avatar ? myProfile.avatar.trim() : '';
        const age = myProfile?.age ? `${myProfile.age} jaar` : '';
        const senderLabel = (avatar && age) ? `${avatar} • ${age}` : (avatar || age || 'Je match');

        await base44.entities.Notification.create({
          to_email: partnerEmail,
          from_email: myEmail,
          from_name: senderLabel,
          type: 'chat',
          venue_name: JSON.stringify({ roomId: newRoom?.id, text: 'Wil met je chatten! 💬' }),
          is_read: false,
          created_date: new Date().toISOString(),
        }).catch(() => {});
      } catch (notifErr) {
        console.warn('Chat notification error in MatchAnimation:', notifErr);
      }

      handleDone();
      navigate(createPageUrl('Chat'));
    } catch (err) {
      console.error('Error unlocking chat in MatchAnimation:', err);
      handleDone();
      navigate(createPageUrl('Chat'));
    } finally {
      setUnlockingChat(false);
    }
  };

  const [visible, setVisible] = useState(false);
  const [hasSentToday, setHasSentToday] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [myTodayHint, setMyTodayHint] = useState(null);
  const [showLimitPopup, setShowLimitPopup] = useState(false);

  useEffect(() => {
    if (!myProfile?.user_email) return;
    
    const fetchRecentHint = async () => {
      try {
        const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString();
        const hints = await base44.entities.Hint.filter({ from_email: myProfile.user_email });
        const recentHints = hints.filter(h => h.created_date >= nineHoursAgo);
        if (recentHints.length > 0) {
          setHasSentToday(true);
          recentHints.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          setMyTodayHint(recentHints[0]);
        } else {
          setHasSentToday(false);
          setMyTodayHint(null);
        }
      } catch (e) {
        console.error("Error checking hint limit in MatchAnimation:", e);
      }
    };

    fetchRecentHint();
  }, [myProfile?.user_email]);

  useEffect(() => {
    if (!hasSentToday || !myTodayHint) return;
    const calcTime = () => {
      const now = new Date();
      const created = new Date(myTodayHint.created_date);
      const expiry = new Date(created.getTime() + 9 * 60 * 60 * 1000);
      const diff = expiry - now;
      if (diff <= 0) {
        setTimeLeft(trNow('Nu beschikbaar', 'Available now'));
        setHasSentToday(false);
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}u ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
    };
    calcTime();
    const interval = setInterval(calcTime, 1000);
    return () => clearInterval(interval);
  }, [hasSentToday, myTodayHint]);

  useEffect(() => {
    const show = setTimeout(() => {
      setVisible(true);
      fireConfetti();
    }, 30);
    return () => clearTimeout(show);
  }, []);

  const fireConfetti = () => {
    // Eén rustig confettiwolkje vanuit het midden
    const myCanvas = document.createElement('canvas');
    Object.assign(myCanvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '10000', pointerEvents: 'none' });
    document.body.appendChild(myCanvas);
    const myConfetti = confetti.create(myCanvas, { resize: true, useWorker: true });
    myConfetti({
      particleCount: 60,
      spread: 70,
      startVelocity: 30,
      origin: { x: 0.5, y: 0.4 },
      colors: ['#FF4B72', '#EA3FD3', '#8E54E9', '#FFB84D'],
      shapes: ['circle'],
      scalar: 0.85,
      ticks: 110,
      disableForReducedMotion: true,
    });
    setTimeout(() => { if (myCanvas.parentNode) myCanvas.parentNode.removeChild(myCanvas); }, 2500);
  };

  const myPhoto = myProfile?.photo_url;
  const theirPhoto = matchedProfile?.photo_url;
  const emojiOf = (p) => (p?.avatar ? p.avatar.split(' ')[0] : '👤');
  const cardBorder = isDark ? '#1B1622' : '#FFFFFF';

  const PhotoBubble = ({ photo, profile, tilt, grad }) => (
    <div
      className="w-[104px] h-[104px] rounded-full overflow-hidden flex items-center justify-center text-[44px]"
      style={{
        transform: `rotate(${tilt}deg)`,
        border: `4px solid ${cardBorder}`,
        boxShadow: '0 10px 28px rgba(255,75,114,0.3)',
        background: grad,
      }}
    >
      {photo ? <img src={photo} alt="" className="w-full h-full object-cover" draggable={false} /> : emojiOf(profile)}
    </div>
  );

  const content = (
    <div
      onClick={handleDone}
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* De kaart */}
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[340px] rounded-[32px] px-6 pt-8 pb-5 text-center"
        style={{
          background: isDark ? 'linear-gradient(180deg, #1F1726 0%, #131219 100%)' : 'linear-gradient(180deg, #FFF1F6 0%, #FFFFFF 70%)',
          border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,75,114,0.12)',
          boxShadow: '0 30px 70px rgba(0,0,0,0.45)',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(14px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1), opacity 0.3s ease',
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); handleDone(); }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }}
          aria-label={trNow('Sluiten', 'Close')}
        >
          <X className="w-4 h-4" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }} />
        </button>

        {/* Jullie twee foto's, licht overlappend met een hartje */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="-mr-4 z-10"><PhotoBubble photo={myPhoto} profile={myProfile} tilt={-6} grad="linear-gradient(135deg,#8E54E9,#FF4B72)" /></div>
          <div className="-ml-4"><PhotoBubble photo={theirPhoto} profile={matchedProfile} tilt={6} grad="linear-gradient(135deg,#FF4B72,#EA3FD3)" /></div>
          <div
            className="absolute z-20 w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              bottom: -8,
              background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
              border: `4px solid ${cardBorder}`,
              boxShadow: '0 6px 14px rgba(255,75,114,0.45)',
            }}
          >
            <Heart className="w-4 h-4 text-white" fill="white" strokeWidth={0} />
          </div>
        </div>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] mb-1.5" style={{ color: '#FF4B72' }}>
          {trNow('Nieuwe match', 'New match')}
        </p>
        <h1 className="text-[30px] font-black leading-none tracking-tight" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
          It's a Match!
        </h1>
        <p
          className="text-[19px] mt-2 mb-6"
          style={{
            color: isDark ? 'rgba(255,215,140,0.9)' : '#D9930B',
            fontFamily: "'Brush Script MT', 'Dancing Script', 'Caveat', cursive",
          }}
        >
          Let the good times roll
        </p>

        {/* Chat ontgrendelen */}
        <button
          onClick={handleUnlockChat}
          disabled={unlockingChat}
          className="w-full py-3.5 rounded-full flex items-center justify-center gap-2 font-bold text-[15px] text-white active:scale-95 transition-transform disabled:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
            boxShadow: '0 10px 24px rgba(255,75,114,0.4)',
          }}
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          {unlockingChat ? trNow('Ontgrendelen...', 'Unlocking...') : trNow('Chat ontgrendelen', 'Unlock chat')}
        </button>

        {/* Doorgaan zonder chat */}
        <button
          onClick={(e) => { e.stopPropagation(); handleDone(); }}
          className="w-full mt-2 py-2.5 rounded-full text-[14px] font-semibold active:scale-95 transition-transform"
          style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(17,24,39,0.5)' }}
        >
          {trNow('Later', 'Later')}
        </button>
      </div>

      {/* Daily limit modal popup overlay */}
      {showLimitPopup && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-6 cursor-default animate-fade-in"
          onClick={(e) => {
            e.stopPropagation(); // Prevent closing MatchAnimation when clicking the overlay background
          }}
        >
          <div 
            className="w-full max-w-sm rounded-[28px] p-6 text-center border border-white/10 flex flex-col items-center justify-center"
            style={{
              background: 'rgba(30, 20, 40, 0.95)',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
              animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
            }}
          >
            {/* Visual element / Locked message icon */}
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 75, 114, 0.2) 0%, rgba(234, 63, 211, 0.2) 100%)',
                border: '1.5px solid rgba(255, 75, 114, 0.4)'
              }}
            >
              <MessageCircle className="w-8 h-8 text-pink-500" strokeWidth={1.5} />
              <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center border-2 border-[#1E1428]">
                ⏱️
              </div>
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Hint limiet bereikt</h3>
            
            <p className="text-[15px] leading-relaxed text-white/80 mb-6">
              Je hebt al eerder een hint gestuurd vandaag, na <span className="font-extrabold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20">{timeLeft || '...'}</span> kan je weer een hint sturen.
            </p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLimitPopup(false);
              }}
              className="w-full py-3.5 rounded-full font-bold text-[16px] text-white active:scale-95 transition-transform"
              style={{
                background: 'linear-gradient(90deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 4px 15px rgba(255, 75, 114, 0.4)'
              }}
            >
              {trNow('Oke', 'OK')}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}