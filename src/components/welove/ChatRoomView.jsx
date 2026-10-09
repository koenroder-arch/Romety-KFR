import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';
import { ChevronLeft, Send, Camera, X, Clock, MoreVertical, AlertTriangle, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import ProfilePhotoCarousel, { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';
import { deleteChatRoomAndMedia, syncChatReadState } from '@/lib/chatUtils';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

// Phase durations in milliseconds
const PHASE_DURATIONS = {
  1: 48 * 60 * 60 * 1000,   // 48 hours
  2: 48 * 60 * 60 * 1000,   // 48 hours
  3: 24 * 60 * 60 * 1000,   // 24 hours
  4: null,                    // No timer, contact exchange
};

const REPORT_REASONS = [
  { id: 'fake', label: 'Nep account / spam', emoji: '🤖' },
  { id: 'inappropriate', label: 'Ongepaste foto\'s of content', emoji: '🔞' },
  { id: 'harassment', label: 'Vervelend of intimiderend gedrag', emoji: '🚫' },
  { id: 'underage', label: 'Minderjarig', emoji: '⚠️' },
  { id: 'other', label: 'Anders...', emoji: '💬' },
];

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
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showWaitingAlert, setShowWaitingAlert] = useState(false);
  const [showPhotoRequiredAlert, setShowPhotoRequiredAlert] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [reportState, setReportState] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [contactInput, setContactInput] = useState('');
  const [contactType, setContactType] = useState(null);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const hasAutoOpenedPromptRef = useRef(false);
  const isInitialScrollDoneRef = useRef(false);
  const prevMsgCountRef = useRef(0);
  const bottomRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const timerRef = useRef(null);
  const optionsMenuRef = useRef(null);

  // Close options menu when clicking anywhere outside
  useEffect(() => {
    if (!showOptionsMenu) return;
    const handlePointerDown = (e) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target)) {
        setShowOptionsMenu(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [showOptionsMenu]);

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
  const isTimeExpired = timeLeft !== null && timeLeft <= 0;
  const isExtensionPending = isActive && isTimeExpired && !myExtAccepted && phase < 4;
  const isWaitingForOther = isActive && isTimeExpired && myExtAccepted && phase < 4;
  const isPhotoRequired = phase === 2 && !myPhotoSent && isActive;

  // Phase 2: chat locked until both sent a camera photo
  const phase2Locked = phase === 2 && (!myPhotoSent || !otherPhotoSent);
  const canChat = isActive && !isDeleted && !isArchived && !isTimeExpired && !phase2Locked && phase !== 4;

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const msgBubbleMe = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';
  const msgBubbleOther = isDark ? 'rgba(255,255,255,0.1)' : '#FFFFFF';
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)';

  const [viewportHeight, setViewportHeight] = useState(null);
  const [isReadyToShow, setIsReadyToShow] = useState(false);

  const scrollToBottom = useCallback((smooth = false) => {
    if (messagesContainerRef.current) {
      if (smooth) {
        messagesContainerRef.current.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'end' });
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

  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;
  const onRoomUpdateRef = useRef(onRoomUpdate);
  onRoomUpdateRef.current = onRoomUpdate;
  const localRoomRef = useRef(localRoom);
  localRoomRef.current = localRoom;
  const timerExpiredTriggeredRef = useRef(false);

  // Sync localRoom if parent room changes to a different room
  useEffect(() => {
    if (room && room.id !== localRoom?.id) {
      setLocalRoom(room);
    }
  }, [room?.id]);

  const loadMessages = useCallback(async () => {
    const rId = room?.id;
    if (!rId) return;
    try {
      const msgs = await base44.entities.ChatMessage.filter({ room_id: rId }, 'created_at', 200);
      setMessages(prev => {
        // Prevent state update if message list has not changed (prevents re-render and scroll jumps)
        if (prev.length === (msgs || []).length && prev.length > 0) {
          const lastPrev = prev[prev.length - 1];
          const lastNew = msgs[msgs.length - 1];
          if (lastPrev?.id === lastNew?.id && lastPrev?.created_at === lastNew?.created_at) {
            return prev;
          }
        }
        return msgs || [];
      });
    } catch (e) {}
  }, [room?.id]);

  const loadRoom = useCallback(async () => {
    const rId = room?.id;
    if (!rId) return;
    try {
      const rooms = await base44.entities.ChatRoom.filter({ id: rId });
      const fetchedRoom = rooms && rooms[0];
      if (fetchedRoom && fetchedRoom.status !== 'deleted') {
        const cur = localRoomRef.current;
        const hasChanged = !cur ||
          cur.status !== fetchedRoom.status ||
          cur.phase !== fetchedRoom.phase ||
          cur.phase_expires_at !== fetchedRoom.phase_expires_at ||
          cur.extension_accepted_a !== fetchedRoom.extension_accepted_a ||
          cur.extension_accepted_b !== fetchedRoom.extension_accepted_b ||
          cur.photo_sent_a !== fetchedRoom.photo_sent_a ||
          cur.photo_sent_b !== fetchedRoom.photo_sent_b ||
          cur.contact_sent_a !== fetchedRoom.contact_sent_a ||
          cur.contact_sent_b !== fetchedRoom.contact_sent_b ||
          cur.deleted_at !== fetchedRoom.deleted_at;

        if (hasChanged) {
          setLocalRoom(fetchedRoom);
          onRoomUpdateRef.current?.(fetchedRoom);
        }
      } else {
        // Room was deleted or rejected
        toast.info('Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.');
        onBackRef.current?.();
      }
    } catch (e) {}
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id) return;
    let isMounted = true;
    setLoading(true);
    Promise.all([loadMessages(), loadRoom()]).finally(() => {
      if (isMounted) setLoading(false);
    });

    // Poll every 5 seconds silently without triggering loading screen
    pollRef.current = setInterval(() => {
      loadMessages();
      loadRoom();
    }, 5000);
    return () => {
      isMounted = false;
      clearInterval(pollRef.current);
    };
  }, [room?.id, loadMessages, loadRoom]);

  // Countdown timer
  useEffect(() => {
    if (!localRoom?.phase_expires_at || !isActive || phase === 4) return;
    timerExpiredTriggeredRef.current = false;
    const update = () => {
      const ms = new Date(localRoom.phase_expires_at) - new Date();
      setTimeLeft(ms);
      if (ms <= 0 && !timerExpiredTriggeredRef.current) {
        timerExpiredTriggeredRef.current = true;
        // Phase expired - reload once to get updated status
        loadRoom();
      }
    };
    update();
    timerRef.current = setInterval(update, 1000);
    return () => clearInterval(timerRef.current);
  }, [localRoom?.phase_expires_at, isActive, phase, loadRoom]);

  // Reset auto-open flag if timer resets/becomes positive or phase updates
  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      hasAutoOpenedPromptRef.current = false;
    }
  }, [timeLeft, phase]);

  // Check if extension prompt should be shown
  useEffect(() => {
    if (
      isActive &&
      timeLeft !== null && timeLeft <= 0 &&
      !myExtAccepted &&
      phase < 4
    ) {
      if (!hasAutoOpenedPromptRef.current) {
        hasAutoOpenedPromptRef.current = true;
        setShowExtensionPrompt(true);
      }
    }
  }, [timeLeft, isActive, myExtAccepted, phase]);

  // Instant auto-scroll on layout pass: sets scroll position to the bottom before browser paint
  useLayoutEffect(() => {
    if (loading || !messages || messages.length === 0) {
      if (!loading) setIsReadyToShow(true);
      return;
    }

    const container = messagesContainerRef.current;
    const isNearBottom = container
      ? (container.scrollHeight - container.scrollTop - container.clientHeight < 200)
      : true;

    const hasNewMessages = messages.length > prevMsgCountRef.current;
    const isInitial = !isInitialScrollDoneRef.current;
    const lastMsg = messages[messages.length - 1];
    const isMyMessage = lastMsg?.sender_email === currentUserEmail;

    if (isInitial || isMyMessage || (hasNewMessages && isNearBottom)) {
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
      bottomRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
      isInitialScrollDoneRef.current = true;
      requestAnimationFrame(() => {
        if (container) container.scrollTop = container.scrollHeight;
        setIsReadyToShow(true);
      });
    } else {
      setIsReadyToShow(true);
    }

    prevMsgCountRef.current = messages.length;

    if (localRoom.id) {
      const partnerMsgs = messages.filter(m => !m.is_system && m.sender_email !== currentUserEmail);
      localStorage.setItem(`chat_read_count_${localRoom.id}`, String(partnerMsgs.length));
      syncChatReadState(currentUserEmail, localRoom.id, partnerMsgs.length);
    }
  }, [loading, messages, localRoom.id, currentUserEmail]);

  const notifyPartner = async (messagePreview) => {
    try {
      const otherEmail = isUserA ? localRoom.user_b_email : localRoom.user_a_email;
      if (!otherEmail) return;

      let senderLabel = 'Je match';
      try {
        const profs = await base44.entities.UserProfile.filter({ user_email: currentUserEmail });
        const myProf = profs && profs[0];
        if (myProf) {
          const avatar = myProf.avatar ? myProf.avatar.trim() : '';
          const age = myProf.age ? `${myProf.age} jaar` : '';
          if (avatar && age) {
            senderLabel = `${avatar} • ${age}`;
          } else if (avatar) {
            senderLabel = avatar;
          } else if (age) {
            senderLabel = age;
          }
        }
      } catch (e) {}

      await base44.entities.Notification.create({
        to_email: otherEmail,
        from_email: currentUserEmail,
        type: 'chat',
        from_name: senderLabel,
        venue_name: JSON.stringify({ roomId: localRoom.id, text: messagePreview }),
        is_read: false,
        created_date: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('[ChatRoomView] Notification dispatch failed:', e);
    }
  };

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
      notifyPartner(content);
      await loadMessages();
      scrollToBottom(true);
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
      const uploadResult = await base44.integrations.Core.UploadFile({ file, bucket: 'chat-uploads' });
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
      notifyPartner('📷 Heeft een foto gestuurd');
      await loadMessages();
      scrollToBottom(true);

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
        // Declined → close chat and delete all photos from Supabase Storage immediately
        localStorage.setItem(`deleted_chat_hidden_${localRoom.id}`, 'true');
        await deleteChatRoomAndMedia(localRoom.id, { deletedBy: currentUserEmail });

        // Send notification to the other user
        const otherEmail = isUserA ? localRoom.user_b_email : localRoom.user_a_email;
        if (otherEmail) {
          await base44.entities.Notification.create({
            to_email: otherEmail,
            from_email: currentUserEmail,
            type: 'chat_rejected',
            message: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
            venue_name: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
            is_read: false,
            created_date: new Date().toISOString(),
          }).catch(() => {});
        }

        toast.info('Chat en foto\'s zijn beëindigd');
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
          const phaseLabels = { 2: '48 uur extra chat! Stuur een foto', 3: 'Nog 24 uur om te chatten!', 4: 'Jullie kunnen nu contactgegevens uitwisselen!' };
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
      setShowDeclineConfirm(false);
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
      notifyPartner(`📱 Contactgegevens gedeeld: ${contactType}`);
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

  // Handle confirm delete chat
  const handleConfirmDeleteChat = async () => {
    if (isDeletingChat) return;
    setIsDeletingChat(true);
    try {
      // Send notification to the other user (same as when chat is not extended)
      const otherEmail = isUserA ? localRoom.user_b_email : localRoom.user_a_email;
      if (otherEmail) {
        await base44.entities.Notification.create({
          to_email: otherEmail,
          from_email: currentUserEmail,
          type: 'chat_rejected',
          message: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
          venue_name: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
          is_read: false,
          created_date: new Date().toISOString(),
        }).catch(() => {});
      }

      localStorage.setItem(`deleted_chat_hidden_${localRoom.id}`, 'true');
      await deleteChatRoomAndMedia(localRoom.id, { deletedBy: currentUserEmail });
      toast.success('Chat en foto\'s definitief verwijderd! 🗑️');
      setShowDeleteConfirm(false);
      onBack?.();
    } catch (err) {
      console.error('Delete chat error:', err);
      toast.error('Kon chat niet verwijderen');
    } finally {
      setIsDeletingChat(false);
    }
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    if (!reportState || !reportState.reason) return;
    setReportLoading(true);
    try {
      const targetEmail = otherProfile?.user_email || otherEmail;
      await base44.entities.Report.create({
        reporter_email: currentUserEmail,
        reported_email: targetEmail,
        reported_name: otherProfile?.display_name || otherProfile?.full_name || targetEmail,
        reason: reportState.reason,
        details: reportState.details || '',
        created_date: new Date().toISOString(),
      }).catch(e => console.warn('Report create error:', e));

      // Send notification to the other user (same as when chat is not extended)
      if (targetEmail) {
        await base44.entities.Notification.create({
          to_email: targetEmail,
          from_email: currentUserEmail,
          type: 'chat_rejected',
          message: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
          venue_name: 'Een chat is beëindigd omdat je match heeft aangegeven niet verder te willen gaan.',
          is_read: false,
          created_date: new Date().toISOString(),
        }).catch(() => {});
      }

      // Also delete the chat and its media as requested
      localStorage.setItem(`deleted_chat_hidden_${localRoom.id}`, 'true');
      await deleteChatRoomAndMedia(localRoom.id, { deletedBy: currentUserEmail });
      setReportState(prev => ({ ...prev, step: 'done' }));
    } catch (err) {
      console.error('Report error:', err);
      toast.error('Kon melding niet versturen');
    } finally {
      setReportLoading(false);
    }
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
    1: { label: 'Fase 1 – 48u chat', color: '#FF4B72' },
    2: { label: myPhotoSent ? 'Fase 2 – 48u chat' : 'Fase 2 – Stuur een foto', color: myPhotoSent ? '#FF4B72' : '#EA3FD3' },
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
        className="relative z-[100] flex-shrink-0 flex items-center gap-3 px-4 pb-3 backdrop-blur-xl"
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
        {/* Profile Info Trigger */}
        <div
          onClick={() => setShowProfileModal(true)}
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-75 transition-opacity"
          title="Profiel bekijken"
        >
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
              <span className="text-[10px] font-bold truncate" style={{ color: isWaitingForOther ? '#EA3FD3' : currentPhaseInfo.color }}>
                {isWaitingForOther ? '⏳ Wachten op de ander...' : currentPhaseInfo.label}
                {isArchived && ' • Gearchiveerd'}
                {isDeleted && ' • Verwijderd'}
              </span>
            </div>
          </div>
        </div>
        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

          {/* Three dots options menu */}
          <div ref={optionsMenuRef} className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOptionsMenu(prev => !prev);
              }}
              className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform border flex-shrink-0"
              style={{
                background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              }}
              title="Opties"
              aria-label="Opties"
            >
              <MoreVertical className={`w-4 h-4 ${isDark ? 'text-white' : 'text-gray-900'}`} />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showOptionsMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-11 right-0 min-w-[200px] rounded-2xl overflow-hidden shadow-2xl border z-50 pointer-events-auto"
                  style={{
                    background: isDark ? '#161724' : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
                    transformOrigin: 'top right',
                    willChange: 'transform, opacity',
                  }}
                >
                  {/* Option: Rapporteer gebruiker */}
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setReportState({ step: 'choose', reason: null, emoji: '', details: '' });
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 active:bg-white/15 transition-colors text-left"
                    style={{ color: '#FF6B6B' }}
                  >
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                    Rapporteer gebruiker
                  </button>

                  <div className="h-px mx-3" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }} />

                  {/* Option: Verwijder chat */}
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-semibold hover:bg-white/10 active:bg-white/15 transition-colors text-left text-red-500"
                  >
                    <Trash2 className="w-4 h-4 flex-shrink-0 text-red-500" />
                    Verwijder chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Waiting for other user extension banner across all phases */}
      {isWaitingForOther && (
        <div
          onClick={() => setShowWaitingAlert(true)}
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 backdrop-blur-md cursor-pointer active:opacity-80 transition-opacity"
          style={{
            background: isDark ? 'rgba(234, 63, 211, 0.15)' : 'rgba(234, 63, 211, 0.08)',
            borderBottom: isDark ? '1px solid rgba(234, 63, 211, 0.25)' : '1px solid rgba(234, 63, 211, 0.15)',
          }}
        >
          <Clock className="w-4 h-4 text-pink-400 flex-shrink-0 animate-spin" style={{ animationDuration: '4s' }} />
          <p className="text-xs font-semibold text-pink-400 truncate">
            Wachten op de ander...
          </p>
        </div>
      )}

      {/* Phase 2 photo requirement banner */}
      {phase === 2 && !myPhotoSent && isActive && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 cursor-pointer active:opacity-80 transition-opacity"
          style={{ background: 'rgba(234,63,211,0.12)', borderBottom: isDark ? '1px solid rgba(234,63,211,0.25)' : '1px solid rgba(234,63,211,0.15)' }}
        >
          <Camera className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <p className="text-xs font-semibold text-purple-400">
            Stuur een foto om te kunnen chatten
          </p>
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 select-text" 
        style={{ 
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          opacity: isReadyToShow ? 1 : 0,
          transition: 'opacity 0.15s ease-out',
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
                ? 'Stuur eerst een foto om te kunnen chatten.'
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
            onClick={() => {
              if (isWaitingForOther) {
                setShowWaitingAlert(true);
                return;
              }
              if (isExtensionPending) {
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
                return;
              }
              fileInputRef.current?.click();
            }}
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
            onChange={e => {
              if (isWaitingForOther) {
                setShowWaitingAlert(true);
                return;
              }
              if (isExtensionPending) {
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
                return;
              }
              if (isPhotoRequired) {
                setShowPhotoRequiredAlert(true);
                return;
              }
              setText(e.target.value);
            }}
            onFocus={(e) => {
              if (isWaitingForOther) {
                e.target.blur();
                setShowWaitingAlert(true);
                return;
              }
              if (isExtensionPending) {
                e.target.blur();
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
                return;
              }
              if (isPhotoRequired) {
                e.target.blur();
                setShowPhotoRequiredAlert(true);
                return;
              }
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
            onClick={() => {
              if (isWaitingForOther) {
                setShowWaitingAlert(true);
              } else if (isExtensionPending) {
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
              } else if (isPhotoRequired) {
                setShowPhotoRequiredAlert(true);
              }
            }}
            onKeyDown={e => {
              if (isWaitingForOther) {
                e.preventDefault();
                setShowWaitingAlert(true);
                return;
              }
              if (isExtensionPending) {
                e.preventDefault();
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
                return;
              }
              if (isPhotoRequired) {
                e.preventDefault();
                setShowPhotoRequiredAlert(true);
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) sendMessage();
            }}
            placeholder={
              isWaitingForOther
                ? "Wachten op de ander..."
                : isExtensionPending
                ? "Verleng de chat om te typen..."
                : isPhotoRequired
                ? "Stuur eerst een foto om te chatten..."
                : "Stuur een bericht..."
            }
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
            onClick={() => {
              if (isWaitingForOther) {
                setShowWaitingAlert(true);
                return;
              }
              if (isExtensionPending) {
                setShowExtensionPrompt(true);
                setShowDeclineConfirm(false);
                return;
              }
              if (isPhotoRequired) {
                setShowPhotoRequiredAlert(true);
                return;
              }
              sendMessage();
            }}
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
              className="relative w-full max-w-sm rounded-[28px] p-6 shadow-2xl"
              style={{ background: isDark ? '#141521' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)' }}
            >
              {/* Top-right close 'X' button to view the chat text */}
              <button
                onClick={() => {
                  setShowExtensionPrompt(false);
                  setShowDeclineConfirm(false);
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90 z-10"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: textSub,
                }}
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>

              {!showDeclineConfirm ? (
                <>
                  <div className="text-center mb-5 mt-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: 'rgba(255,75,114,0.15)' }}>
                      {myExtAccepted ? '⏳' : '💬'}
                    </div>
                    <h3 className="font-black text-lg mb-2" style={{ color: textMain }}>
                      {myExtAccepted ? 'Wachten op de ander' : 'Wil je doorgaan?'}
                    </h3>
                    <p className="text-sm" style={{ color: textSub }}>
                      {myExtAccepted ? (
                        `Je hebt akkoord gegeven om door te gaan. Zodra de ander ook akkoord geeft, start Fase ${phase + 1} direct!`
                      ) : (
                        <>
                          {phase === 1 && 'Jullie chatfase is verlopen. Wil je 48u doorgaan en elkaars foto zien?'}
                          {phase === 2 && 'Wil je nog 24u doorgaan met chatten?'}
                          {phase === 3 && 'Dit is de laatste verlenging! Wil je elkaars contactgegevens uitwisselen?'}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExtension(true)}
                      disabled={extensionLoading || myExtAccepted}
                      className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform disabled:opacity-60"
                      style={{ background: GRAD }}
                    >
                      {myExtAccepted ? 'Je hebt akkoord gegeven, wachten op de ander...' : 'Ja, doorgaan'}
                    </button>
                    <button
                      onClick={() => setShowDeclineConfirm(true)}
                      disabled={extensionLoading || myExtAccepted}
                      className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                      style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textMain }}
                    >
                      Nee, stop de chat
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-5 mt-2">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.15)' }}>
                      ⚠️
                    </div>
                    <h3 className="font-black text-lg mb-2" style={{ color: textMain }}>
                      Weet je het zeker?
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: textSub }}>
                      Als je nu stopt, wordt de chat beëindigd en is deze definitief weg.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleExtension(false)}
                      disabled={extensionLoading}
                      className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform disabled:opacity-60 bg-red-500 hover:bg-red-600 shadow-md shadow-red-500/20"
                    >
                      {extensionLoading ? 'Bezig met beëindigen...' : 'Ja, definitief stoppen'}
                    </button>
                    <button
                      onClick={() => setShowDeclineConfirm(false)}
                      disabled={extensionLoading}
                      className="w-full py-3 rounded-2xl font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
                      style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textMain }}
                    >
                      Annuleren
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System notification modal: Waiting for supermatch */}
      <AnimatePresence>
        {showWaitingAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[450] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-xs rounded-[28px] p-6 text-center shadow-2xl"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {/* Top-right close 'X' button */}
              <button
                onClick={() => setShowWaitingAlert(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: textSub,
                }}
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: 'rgba(255,75,114,0.15)' }}>
                ⏳
              </div>
              <h3 className="font-black text-base mb-2" style={{ color: textMain }}>
                Wacht op supermatch
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: textSub }}>
                Wacht op supermatch voor verder te chatten.
              </p>
              <button
                onClick={() => setShowWaitingAlert(false)}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform shadow-md"
                style={{ background: GRAD }}
              >
                Oké
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* System notification modal: Photo required for Phase 2 */}
      <AnimatePresence>
        {showPhotoRequiredAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[450] flex items-center justify-center p-6"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className="relative w-full max-w-xs rounded-[28px] p-6 text-center shadow-2xl"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
              }}
            >
              {/* Top-right close 'X' button */}
              <button
                onClick={() => setShowPhotoRequiredAlert(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors active:scale-90"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                  color: textSub,
                }}
                aria-label="Sluiten"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mx-auto mb-4" style={{ background: 'rgba(234,63,211,0.15)' }}>
                📸
              </div>
              <h3 className="font-black text-base mb-2" style={{ color: textMain }}>
                Foto vereist
              </h3>
              <p className="text-sm mb-6 leading-relaxed" style={{ color: textSub }}>
                Stuur eerst een foto om te kunnen chatten.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setShowPhotoRequiredAlert(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-sm active:scale-95 transition-transform shadow-md flex items-center justify-center gap-2"
                  style={{ background: GRAD }}
                >
                  <Camera className="w-4 h-4" />
                  Foto maken
                </button>
                <button
                  onClick={() => setShowPhotoRequiredAlert(false)}
                  className="w-full py-2.5 rounded-2xl font-bold text-xs active:scale-95 transition-transform"
                  style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: textSub }}
                >
                  Annuleren
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Profile Details Modal (Opens on header click, dismisses when clicking outside) ── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowProfileModal(false)}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 select-none"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 360 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl flex flex-col"
              style={{
                height: 'min(80vh, 600px)',
                background: isDark ? '#0F1018' : '#FFFFFF',
                border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              }}
            >
              {/* Photo Background / Carousel */}
              <div className="relative w-full flex-1 min-h-0 bg-neutral-900 overflow-hidden">
                <ProfilePhotoCarousel
                  profile={otherProfile}
                  isDark={true}
                  dotsClassName="top-4 left-4 z-30"
                  className="h-full w-full object-cover"
                />

                {/* Close button inside modal (top right) */}
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-90 transition-transform shadow-lg cursor-pointer"
                  title="Sluiten"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Gradient overlay at bottom of photo */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-10" />

                {/* Title inside photo overlay */}
                <div className="absolute bottom-3.5 left-4 right-4 z-20 pointer-events-none">
                  <h3 className="text-2xl font-black text-white drop-shadow-md">
                    {otherProfile?.age ? `${otherProfile.age} jaar` : 'Match'}
                    {otherProfile?.height_cm ? ` • ${otherProfile.height_cm} cm` : ''}
                  </h3>
                  {otherProfile?.city && (
                    <p className="text-xs font-semibold text-white/80 mt-0.5 drop-shadow flex items-center gap-1">
                      <span>📍</span> {otherProfile.city}
                    </p>
                  )}
                </div>
              </div>

              {/* Profile Details (bio, traits, interests) */}
              {(otherProfile?.bio || (otherProfile?.traits && otherProfile.traits.length > 0) || (otherProfile?.interests && otherProfile.interests.length > 0)) && (
                <div
                  className="p-4 overflow-y-auto max-h-[160px] space-y-2 flex-shrink-0"
                  style={{
                    background: isDark ? '#0F1018' : '#F9FAFB',
                    borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  {otherProfile.bio && (
                    <p className="text-xs leading-relaxed font-medium italic" style={{ color: textMain }}>
                      "{otherProfile.bio}"
                    </p>
                  )}

                  {/* Traits & Interests chips */}
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {(otherProfile.traits || []).slice(0, 4).map((t, idx) => (
                      <span
                        key={`trait-${idx}`}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(255,75,114,0.15)', color: '#FF4B72' }}
                      >
                        {t}
                      </span>
                    ))}
                    {(otherProfile.interests || []).slice(0, 4).map((interest, idx) => (
                      <span
                        key={`interest-${idx}`}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ background: 'rgba(234,63,211,0.15)', color: '#EA3FD3' }}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Chat Confirmation Modal ── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="w-full max-w-xs rounded-3xl p-5 text-center shadow-2xl border"
              style={{
                background: isDark ? '#181926' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              }}
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-red-500/15 text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base mb-1" style={{ color: textMain }}>
                Weet je het zeker?
              </h3>
              <p className="text-xs mb-5 font-medium leading-relaxed" style={{ color: textSub }}>
                Weet je zeker dat je deze chat en alle verstuurde foto's wilt verwijderen?
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingChat}
                  className="flex-1 py-3 rounded-2xl font-bold text-xs active:scale-95 transition-all"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    color: textMain,
                  }}
                >
                  Nee
                </button>
                <button
                  onClick={handleConfirmDeleteChat}
                  disabled={isDeletingChat}
                  className="flex-1 py-3 rounded-2xl font-black text-xs text-white shadow-lg active:scale-95 transition-all bg-red-600 hover:bg-red-700"
                  style={{ background: '#EF4444' }}
                >
                  {isDeletingChat ? 'Verwijderen...' : 'Ja'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Report Modal ── */}
      <AnimatePresence>
        {reportState && (
          <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div
              className="w-full max-w-sm rounded-[24px] p-5 shadow-2xl border"
              style={{
                background: isDark ? '#141521' : '#FFFFFF',
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
              }}
            >
              {reportState.step === 'choose' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>
                      Rapporteer gebruiker
                    </h3>
                    <button
                      onClick={() => setReportState(null)}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400 active:scale-90 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs mb-3 font-medium" style={{ color: textSub }}>
                    Kies de reden waarom je deze gebruiker wilt rapporteren:
                  </p>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => setReportState(prev => ({ ...prev, step: 'detail', reason: r.label, emoji: r.emoji }))}
                        className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between border active:scale-[0.98] transition-all"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                          color: isDark ? '#fff' : '#111',
                        }}
                      >
                        <span className="flex items-center gap-2">
                          <span>{r.emoji}</span>
                          <span>{r.label}</span>
                        </span>
                        <span>›</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {reportState.step === 'detail' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-black text-base" style={{ color: isDark ? '#fff' : '#111' }}>
                      Rapporteer gebruiker
                    </h3>
                    <button
                      onClick={() => setReportState(null)}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-gray-500/20 text-gray-400 active:scale-90 transition-transform"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Gekozen reden weergave */}
                  <div
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-3.5 border"
                    style={{
                      background: isDark ? 'rgba(255, 75, 114, 0.12)' : 'rgba(255, 75, 114, 0.08)',
                      borderColor: isDark ? 'rgba(255, 75, 114, 0.3)' : 'rgba(255, 75, 114, 0.2)',
                    }}
                  >
                    <span className="text-base">{reportState.emoji || '⚠️'}</span>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: textSub }}>Gekozen reden</span>
                      <span className="text-xs font-bold truncate" style={{ color: isDark ? '#fff' : '#111' }}>{reportState.reason}</span>
                    </div>
                  </div>

                  <h4 className="font-bold text-xs mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.9)' : '#111' }}>
                    Toelichting (optioneel)
                  </h4>
                  <textarea
                    value={reportState.details}
                    onChange={(e) => setReportState(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Beschrijf waarom je deze gebruiker rapporteert..."
                    className="w-full h-24 p-3 rounded-xl text-xs border resize-none mb-4 outline-none focus:border-pink-500"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                      color: isDark ? '#fff' : '#111',
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setReportState(prev => ({ ...prev, step: 'choose' }))}
                      className="flex-1 py-2.5 rounded-xl font-bold text-xs bg-gray-500/20 text-gray-300 active:scale-95 transition-all"
                    >
                      Terug
                    </button>
                    <button
                      onClick={handleSubmitReport}
                      disabled={reportLoading}
                      className="flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md active:scale-95 transition-all bg-red-600 hover:bg-red-700"
                      style={{ background: '#EF4444' }}
                    >
                      {reportLoading ? 'Rapporteren...' : 'Rapporteren'}
                    </button>
                  </div>
                </div>
              )}

              {reportState.step === 'done' && (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-green-500/20 text-green-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-base mb-1" style={{ color: isDark ? '#fff' : '#111' }}>
                    Bedankt voor je melding
                  </h3>
                  <p className="text-xs mb-4 font-medium" style={{ color: textSub }}>
                    We zullen deze melding zo snel mogelijk beoordelen. De chat is verwijderd.
                  </p>
                  <button
                    onClick={() => {
                      setReportState(null);
                      onBack?.();
                    }}
                    className="w-full py-2.5 rounded-xl font-black text-xs text-white active:scale-95 transition-all"
                    style={{ background: GRAD }}
                  >
                    Sluiten
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
