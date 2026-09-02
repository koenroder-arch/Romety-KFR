import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import { 
  ArrowLeft, ChevronLeft, Send, Camera, X, Check, CheckCheck,
  Clock, AlertTriangle, Heart, Instagram, Phone, 
  MessageSquare, Image, Lock, Unlock, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

// Phase durations in milliseconds
const PHASE_DURATIONS = {
  1: 24 * 60 * 60 * 1000,   // 24 hours
  2: 48 * 60 * 60 * 1000,   // 48 hours
  3: 24 * 60 * 60 * 1000,   // 24 hours
  4: null,                    // No timer, contact exchange
};

const INACTIVITY_LIMIT = 7 * 24 * 60 * 60 * 1000; // 7 days

function formatTime(ms) {
  if (ms <= 0) return '00:00:00';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}u ${String(m).padStart(2, '0')}m`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

function formatMessageTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return 'Vandaag';
  if (diff < 172800000) return 'Gisteren';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' });
}

export default function ChatRoomView({ room, currentUserEmail, otherProfile, onBack, onRoomUpdate }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [localRoom, setLocalRoom] = useState(room);
  const [showExtensionPrompt, setShowExtensionPrompt] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactInput, setContactInput] = useState('');
  const [contactType, setContactType] = useState(null);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);

  const isUserA = currentUserEmail === localRoom.user_a_email;
  const myRole = isUserA ? 'a' : 'b';
  const otherRole = isUserA ? 'b' : 'a';
  const myPhotoSent = isUserA ? localRoom.photo_sent_a : localRoom.photo_sent_b;
  const otherPhotoSent = isUserA ? localRoom.photo_sent_b : localRoom.photo_sent_a;
  const myContactSent = isUserA ? localRoom.contact_sent_a : localRoom.contact_sent_b;
  const otherContactSent = isUserA ? localRoom.contact_sent_b : localRoom.contact_sent_a;
  const myExtAccepted = isUserA ? localRoom.extension_accepted_a : localRoom.extension_accepted_b;

  const phase = localRoom.phase || 1;
  const status = localRoom.status;
  const isActive = status === 'active';
  const isArchived = status === 'archived';
  const isDeleted = status === 'deleted' || !!localRoom.deleted_at;

  // Phase 2: chat locked until both sent a camera photo
  const phase2Locked = phase === 2 && (!myPhotoSent || !otherPhotoSent);
  const canChat = isActive && !isDeleted && !isArchived && phase !== 4 && !(phase === 2 && !myPhotoSent);

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const msgBubbleMe = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
  const msgBubbleOther = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const [viewportHeight, setViewportHeight] = useState(null);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      if (smooth) {
        messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    // Lock body and html to prevent page bounce/drag on mobile
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyWidth = document.body.style.width;
    const prevBodyHeight = document.body.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    document.documentElement.style.overflow = 'hidden';

    const handleViewport = () => {
      if (typeof window !== 'undefined' && window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
        window.scrollTo(0, 0);
      }
    };

    if (typeof window !== 'undefined' && window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewport);
      window.visualViewport.addEventListener('scroll', handleViewport);
      handleViewport();
    }

    const preventScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener('scroll', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.width = prevBodyWidth;
      document.body.style.height = prevBodyHeight;
      document.documentElement.style.overflow = '';
      if (typeof window !== 'undefined' && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewport);
        window.visualViewport.removeEventListener('scroll', handleViewport);
      }
      window.removeEventListener('scroll', preventScroll);
    };
  }, []);

  const loadMessages = useCallback(async () => {
    if (!localRoom?.id) return;
    try {
      const msgs = await base44.entities.ChatMessage.filter({ room_id: localRoom.id }, 'created_at', 200);
      setMessages(msgs || []);
    } catch (e) {}
  }, [localRoom?.id]);

  const loadRoom = useCallback(async () => {
    if (!localRoom?.id) return;
    try {
      const rooms = await base44.entities.ChatRoom.filter({ id: localRoom.id });
      if (rooms && rooms[0]) {
        setLocalRoom(rooms[0]);
        onRoomUpdate?.(rooms[0]);
      }
    } catch (e) {}
  }, [localRoom?.id]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadMessages(), loadRoom()]).finally(() => setLoading(false));

    // Poll every 5 seconds
    pollRef.current = setInterval(() => {
      loadMessages();
      loadRoom();
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [loadMessages, loadRoom]);

  // Countdown timer
  useEffect(() => {
    if (!localRoom.phase_expires_at || !isActive || phase === 4) return;
    const update = () => {
      const ms = new Date(localRoom.phase_expires_at) - new Date();
      setTimeLeft(ms);
      if (ms <= 0) {
        // Phase expired - reload to get updated status
        loadRoom();
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [localRoom.phase_expires_at, isActive, phase]);

  // Check if extension prompt should be shown
  useEffect(() => {
    if (
      isActive &&
      timeLeft !== null && timeLeft <= 0 &&
      !myExtAccepted &&
      phase < 4
    ) {
      setShowExtensionPrompt(true);
    }
  }, [timeLeft, isActive, myExtAccepted, phase]);

  // Scroll to bottom & mark messages as read
  useEffect(() => {
    scrollToBottom(false);
    if (messages && messages.length > 0 && localRoom.id) {
      const partnerMsgs = messages.filter(m => !m.is_system && m.sender_email !== currentUserEmail);
      localStorage.setItem(`chat_read_count_${localRoom.id}`, String(partnerMsgs.length));
    }
  }, [messages, localRoom.id, currentUserEmail, scrollToBottom]);

  const sendMessage = async () => {
    if (!text.trim() || sending || !canChat) return;
    setSending(true);
    const content = text.trim();
    setText('');
    try {
      await base44.entities.ChatMessage.create({
        room_id: localRoom.id,
        sender_email: currentUserEmail,
        content,
        type: 'text',
        is_system: false,
      });
      await loadMessages();
    } catch (e) {
      toast.error('Bericht kon niet worden verstuurd');
      setText(content);
    }
    setSending(false);
  };

  const sendPhoto = async (file) => {
    if (!file || sending) return;
    setSending(true);
    try {
      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const mediaUrl = uploadResult?.file_url;
      if (!mediaUrl) throw new Error('Upload failed');

      await base44.entities.ChatMessage.create({
        room_id: localRoom.id,
        sender_email: currentUserEmail,
        content: null,
        media_url: mediaUrl,
        type: 'photo',
        is_system: false,
      });

      // Mark photo as sent for phase 2
      if (phase === 2 && !myPhotoSent) {
        const updates = isUserA ? { photo_sent_a: true } : { photo_sent_b: true };
        await base44.entities.ChatRoom.update(localRoom.id, updates);
        await loadRoom();
      }
      await loadMessages();
      toast.success('Foto verstuurd! 📸');
    } catch (e) {
      toast.error('Foto kon niet worden verstuurd');
    }
    setSending(false);
  };

  const handleCameraCapture = (e) => {
    const file = e.target.files?.[0];
    if (file) sendPhoto(file);
    e.target.value = '';
  };

  const handleExtension = async (accept) => {
    setExtensionLoading(true);
    try {
      const updates = isUserA
        ? { extension_accepted_a: accept }
        : { extension_accepted_b: accept };
      await base44.entities.ChatRoom.update(localRoom.id, updates);

      if (!accept) {
        // Declined → close chat
        await base44.entities.ChatRoom.update(localRoom.id, {
          status: 'archived',
          chat_closed_at: new Date().toISOString(),
          deleted_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        });
        await base44.entities.ChatMessage.create({
          room_id: localRoom.id,
          sender_email: currentUserEmail,
          content: `Chat beëindigd. De ander wil niet doorgaan.`,
          type: 'system',
          is_system: true,
        });
        toast.info('Chat is beëindigd');
        onBack?.();
      } else {
        // Check if other also accepted → advance phase
        const refreshed = await base44.entities.ChatRoom.filter({ id: localRoom.id });
        const r = refreshed?.[0];
        const otherAccepted = isUserA ? r?.extension_accepted_b : r?.extension_accepted_a;
        if (otherAccepted) {
          const nextPhase = phase + 1;
          const dur = PHASE_DURATIONS[nextPhase];
          const phaseUpdates = {
            phase: nextPhase,
            extension_accepted_a: false,
            extension_accepted_b: false,
            extension_requested_at: null,
            ...(dur ? { phase_expires_at: new Date(Date.now() + dur).toISOString() } : { phase_expires_at: null }),
          };
          if (nextPhase >= 4) phaseUpdates.status = 'active'; // phase 4 = contact exchange
          await base44.entities.ChatRoom.update(localRoom.id, phaseUpdates);
          const phaseLabels = { 2: '48 uur extra chat! Stuur nu een selfie 📸', 3: 'Nog 24 uur om te chatten! 💬', 4: 'Jullie kunnen nu contactgegevens uitwisselen! 🎉' };
          await base44.entities.ChatMessage.create({
            room_id: localRoom.id,
            sender_email: 'system',
            content: phaseLabels[nextPhase] || 'Chat verlengd!',
            type: 'system',
            is_system: true,
          });
          toast.success('Chat verlengd! 🎉');
        } else {
          toast.success('Je akkoord is opgeslagen! Wachten op de ander...');
        }
        await loadRoom();
        await loadMessages();
      }
      setShowExtensionPrompt(false);
    } catch (e) {
      toast.error('Er ging iets mis, probeer opnieuw');
    }
    setExtensionLoading(false);
  };

  const sendContact = async () => {
    if (!contactInput.trim() || !contactType) return;
    setSending(true);
    try {
      const content = `${contactType}: ${contactInput.trim()}`;
      const updates = isUserA
        ? { contact_sent_a: content }
        : { contact_sent_b: content };
      await base44.entities.ChatRoom.update(localRoom.id, updates);
      await base44.entities.ChatMessage.create({
        room_id: localRoom.id,
        sender_email: currentUserEmail,
        content,
        type: 'system',
        is_system: true,
      });
      // Check if both sent → archive
      const refreshed = await base44.entities.ChatRoom.filter({ id: localRoom.id });
      const r = refreshed?.[0];
      const otherSent = isUserA ? r?.contact_sent_b : r?.contact_sent_a;
      if (otherSent) {
        await base44.entities.ChatRoom.update(localRoom.id, {
          status: 'archived',
          chat_closed_at: new Date().toISOString(),
          deleted_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        });
        await base44.entities.ChatMessage.create({
          room_id: localRoom.id,
          sender_email: 'system',
          content: '🎉 Beide contactgegevens zijn uitgewisseld! De chat wordt over 5 dagen verwijderd.',
          type: 'system',
          is_system: true,
        });
        toast.success('Contactgegevens uitgewisseld! 🎉');
      } else {
        toast.success('Jouw gegevens zijn verstuurd! Wachten op de ander...');
      }
      setContactInput('');
      setContactType(null);
      setShowContactPicker(false);
      await loadRoom();
      await loadMessages();
    } catch (e) {
      toast.error('Kon niet versturen, probeer opnieuw');
    }
    setSending(false);
  };

  // Group messages by date
  const messageGroups = [];
  let lastDate = null;
  for (const msg of messages) {
    const dateLabel = formatDate(msg.created_at || msg.created_date);
    if (dateLabel !== lastDate) {
      messageGroups.push({ type: 'date', label: dateLabel });
      lastDate = dateLabel;
    }
    messageGroups.push({ type: 'msg', msg });
  }

  const otherPhotos = getProfilePhotos(otherProfile);
  const otherAvatar = otherPhotos[0] || null;

  const phaseLabels = {
    1: { label: 'Fase 1 – 24u chat', color: '#FF4B72' },
    2: { label: 'Fase 2 – 48u + selfie vereist', color: '#EA3FD3' },
    3: { label: 'Fase 3 – Laatste 24u', color: '#8B5CF6' },
    4: { label: 'Fase 4 – Contactgegevens uitwisselen', color: '#10B981' },
  };
  const currentPhaseInfo = phaseLabels[phase] || phaseLabels[1];

  return (
    <div
      className="fixed inset-x-0 top-0 z-[300] flex flex-col max-w-md mx-auto overflow-hidden select-none"
      style={{
        background: bg,
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
        position: 'fixed',
        top: 0,
        bottom: 'auto',
        overscrollBehavior: 'none',
      }}
    >
      
      {/* Header */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 pb-3 backdrop-blur-xl"
        onTouchMove={(e) => e.stopPropagation()}
        style={{
          paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
          background: isDark ? 'rgba(8,9,14,0.95)' : 'rgba(255,255,255,0.95)',
          borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center pointer-events-auto active:scale-90 transition-transform border flex-shrink-0"
          style={{ 
            background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)'
          }}
          title="Terug"
        >
          <ChevronLeft className={`w-5 h-5 ${isDark ? 'text-white' : 'text-gray-900'}`} />
        </button>
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2" style={{ borderColor: currentPhaseInfo.color }}>
          {otherAvatar
            ? <img src={otherAvatar} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-lg" style={{ background: GRAD }}>{otherProfile?.avatar?.split(' ')[0] || '💜'}</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-sm truncate" style={{ color: textMain }}>
            {otherProfile?.age ? `${otherProfile.age} jaar` : 'Supermatch'}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold truncate" style={{ color: currentPhaseInfo.color }}>
              {currentPhaseInfo.label}
              {isArchived && ' • Gearchiveerd'}
              {isDeleted && ' • Verwijderd'}
            </span>
            <span className="text-[10px] font-semibold opacity-60 truncate" style={{ color: textMain }}>
              • {messages.filter(m => !m.is_system).length} {messages.filter(m => !m.is_system).length === 1 ? 'appje' : 'appjes'}
            </span>
          </div>
        </div>
        {/* Timer pill */}
        {timeLeft !== null && timeLeft > 0 && isActive && phase < 4 && (
          <div
            className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ background: timeLeft < 3600000 ? 'rgba(255,75,114,0.2)' : 'rgba(255,255,255,0.08)', color: timeLeft < 3600000 ? '#FF4B72' : textMain }}
          >
            <Clock className="w-3 h-3" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>

      {/* Phase 2 photo requirement banner */}
      {phase === 2 && !myPhotoSent && isActive && (
        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5"
          style={{ background: 'rgba(234,63,211,0.15)', borderBottom: '1px solid rgba(234,63,211,0.3)' }}
        >
          <Camera className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-purple-300 flex-1">
            Stuur een selfie om te kunnen chatten. Kies een foto uit de camera.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold text-white active:scale-95 transition-transform"
            style={{ background: GRAD }}
          >
            Selfie sturen
          </button>
        </div>
      )}
      {phase === 2 && myPhotoSent && !otherPhotoSent && isActive && (
        <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2" style={{ background: 'rgba(255,75,114,0.1)' }}>
          <Clock className="w-3.5 h-3.5 text-pink-400" />
          <p className="text-xs font-medium text-pink-300">Wachten op selfie van de ander...</p>
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 select-text" 
        style={{ 
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 rounded-full border-4 border-pink-300 border-t-pink-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: 'rgba(255,75,114,0.15)' }}>
              💬
            </div>
            <p className="font-bold text-sm" style={{ color: textMain }}>Begin met chatten!</p>
            <p className="text-xs" style={{ color: textSub }}>
              {phase === 2 && !myPhotoSent
                ? 'Stuur eerst een selfie om te kunnen chatten.'
                : 'Stuur een bericht om de conversatie te starten.'}
            </p>
          </div>
        ) : (
          messageGroups.map((item, i) => {
            if (item.type === 'date') {
              return (
                <div key={`date-${i}`} className="flex items-center justify-center my-4">
                  <span className="text-[10px] font-semibold px-3 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: textSub }}>
                    {item.label}
                  </span>
                </div>
              );
            }
            const msg = item.msg;
            const isMe = msg.sender_email === currentUserEmail;
            const isSystem = msg.is_system || msg.type === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex items-center justify-center my-3">
                  <span className="text-[11px] font-semibold text-center px-4 py-2 rounded-2xl max-w-[280px]" style={{ background: isDark ? 'rgba(255,75,114,0.15)' : 'rgba(255,75,114,0.08)', color: '#FF4B72' }}>
                    {msg.content}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex mb-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mr-2 self-end">
                    {otherAvatar
                      ? <img src={otherAvatar} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-sm" style={{ background: GRAD }}>💜</div>
                    }
                  </div>
                )}
                <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                  {msg.type === 'photo' && msg.media_url ? (
                    <div className={`rounded-2xl overflow-hidden shadow-lg ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`} style={{ maxWidth: 220 }}>
                      <img src={msg.media_url} alt="Foto" className="w-full object-cover" style={{ maxHeight: 280 }} />
                    </div>
                  ) : (
                    <div
                      className={`px-4 py-2.5 rounded-2xl shadow-sm ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                      style={{
                        background: isMe ? msgBubbleMe : msgBubbleOther,
                        border: isMe ? 'none' : (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)'),
                      }}
                    >
                      <p className="text-sm leading-relaxed" style={{ color: isMe ? '#FFFFFF' : textMain }}>
                        {msg.content}
                      </p>
                    </div>
                  )}
                  <span className="text-[9px] px-1" style={{ color: textSub }}>
                    {formatMessageTime(msg.created_at || msg.created_date)}
                    {isMe && ' ✓✓'}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Phase 4: Contact exchange UI */}
      {phase === 4 && isActive && (
        <div
          className="flex-shrink-0 px-4 py-4 border-t"
          style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', background: isDark ? 'rgba(16,21,33,0.95)' : '#FFFFFF' }}
        >
          {myContactSent ? (
            <div className="text-center py-2">
              <p className="text-xs font-semibold" style={{ color: textSub }}>
                ✅ Jouw gegevens zijn verstuurd!
                {otherContactSent ? ' Jullie hebben allebei contact uitgewisseld. 🎉' : ' Wachten op de ander...'}
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold text-center mb-3" style={{ color: textMain }}>
                📱 Stuur je contactgegevens
              </p>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[{ type: 'Snapchat', icon: '👻' }, { type: 'Instagram', icon: '📸' }, { type: 'Nummer', icon: '📞' }].map(({ type, icon }) => (
                  <button
                    key={type}
                    onClick={() => { setContactType(type); setShowContactPicker(true); }}
                    className="flex flex-col items-center gap-1 py-3 rounded-2xl border font-bold text-xs active:scale-95 transition-transform"
                    style={{
                      background: contactType === type ? 'rgba(255,75,114,0.2)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                      borderColor: contactType === type ? '#FF4B72' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      color: textMain,
                    }}
                  >
                    <span className="text-xl">{icon}</span>
                    <span>{type}</span>
                  </button>
                ))}
              </div>
              {showContactPicker && (
                <div className="flex gap-2">
                  <input
                    value={contactInput}
                    onChange={e => setContactInput(e.target.value)}
                    placeholder={contactType === 'Nummer' ? '+31 6 ...' : `@${contactType?.toLowerCase()}`}
                    className="flex-1 px-4 py-2.5 rounded-2xl text-sm font-medium focus:outline-none"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      color: textMain,
                      border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.1)',
                    }}
                    onKeyDown={e => e.key === 'Enter' && sendContact()}
                  />
                  <button
                    onClick={sendContact}
                    disabled={!contactInput.trim() || sending}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
                    style={{ background: GRAD }}
                  >
                    <Send className="w-5 h-5 text-white" />
                  </button>
                </div>
              )}
            </>
          )}
          {otherContactSent && !myContactSent && (
            <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <p className="text-xs font-bold text-green-400">✅ {otherProfile?.display_name || 'De ander'} heeft zijn/haar gegevens al gestuurd!</p>
            </div>
          )}
        </div>
      )}

      {/* Input bar (phases 1-3) */}
      {canChat && phase < 4 && !isArchived && (
        <div
          className="flex-shrink-0 sticky bottom-0 z-20 flex items-center gap-2 px-3 py-2.5"
          onTouchMove={(e) => e.stopPropagation()}
          style={{
            paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
            background: isDark ? 'rgba(8,9,14,0.98)' : '#FFFFFF',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 -2px 10px rgba(0,0,0,0.08)',
          }}
        >
          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
            style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <Camera className="w-5 h-5" style={{ color: '#FF4B72' }} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleCameraCapture}
          />
          {/* Text input */}
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onFocus={() => {
              window.scrollTo(0, 0);
              setTimeout(() => {
                window.scrollTo(0, 0);
                scrollToBottom(true);
              }, 120);
              setTimeout(() => {
                window.scrollTo(0, 0);
                scrollToBottom(true);
              }, 300);
            }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Stuur een bericht..."
            className="flex-1 px-4 py-2.5 rounded-full text-base sm:text-sm focus:outline-none"
            style={{
              fontSize: '16px',
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: textMain,
              border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            }}
          />
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-40"
            style={{ background: text.trim() ? GRAD : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)') }}
          >
            <Send className="w-5 h-5" style={{ color: text.trim() ? '#FFFFFF' : textSub }} />
          </button>
        </div>
      )}

      {/* Archived/deleted state */}
      {(isArchived || isDeleted) && (
        <div className="flex-shrink-0 px-4 py-4 text-center" style={{ borderTop: '1px solid rgba(255,75,114,0.2)' }}>
          <p className="text-xs font-semibold" style={{ color: textSub }}>
            {isDeleted ? '🗑️ Deze chat is verwijderd.' : '📁 Chat gearchiveerd — wordt binnenkort verwijderd.'}
          </p>
        </div>
      )}

      {/* Extension prompt modal */}
      <AnimatePresence>
        {showExtensionPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="w-full max-w-sm rounded-[28px] p-6 shadow-2xl"
              style={{ background: isDark ? '#141521' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)' }}
            >
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: 'rgba(255,75,114,0.15)' }}>
                  💬
                </div>
                <h3 className="font-black text-lg mb-2" style={{ color: textMain }}>
                  Wil je doorgaan?
                </h3>
                <p className="text-sm" style={{ color: textSub }}>
                  {phase === 1 && 'Jullie chatfase is verlopen. Wil je 48u doorgaan en elkaars selfie zien?'}
                  {phase === 2 && 'Wil je nog 24u doorgaan met chatten?'}
                  {phase === 3 && 'Dit is de laatste verlenging! Wil je elkaars contactgegevens uitwisselen?'}
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => handleExtension(true)}
                  disabled={extensionLoading || myExtAccepted}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform disabled:opacity-60"
                  style={{ background: GRAD }}
                >
                  {myExtAccepted ? '✅ Je hebt akkoord gegeven, wachten op de ander...' : '✅ Ja, doorgaan!'}
                </button>
                <button
                  onClick={() => handleExtension(false)}
                  disabled={extensionLoading || myExtAccepted}
                  className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                  style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textMain }}
                >
                  ❌ Nee, stop de chat
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
