import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';
import { X, Send, AlertCircle, Download, RefreshCw, Zap, ZapOff, Type, MapPin, Trash2, Image as ImageIcon } from 'lucide-react';
import { createPageUrl } from '@/utils';

// Helper component for Drag & Drop (1 finger), Pinch-to-zoom (2 fingers), and Rotate (2 fingers)
function GestureSticker({ transform, onTransformChange, onTap, children, innerRef, stickerType, onDragStart, onDragMove, onDragEnd }) {
  const stateRef = useRef({
    isInteracting: false,
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
    initDist: 0,
    initAngle: 0,
    initScale: 1,
    initRot: 0,
    startTime: 0,
    moved: false,
  });

  const handleTouchStart = (e) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      stateRef.current = {
        isInteracting: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initX: transform.x,
        initY: transform.y,
        initDist: 0,
        initAngle: 0,
        initScale: transform.scale,
        initRot: transform.rotation,
        startTime: Date.now(),
        moved: false,
      };
    } else if (e.touches.length >= 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      stateRef.current = {
        isInteracting: true,
        startX: midX,
        startY: midY,
        initX: transform.x,
        initY: transform.y,
        initDist: dist,
        initAngle: angle,
        initScale: transform.scale,
        initRot: transform.rotation,
        startTime: Date.now(),
        moved: true,
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!stateRef.current.isInteracting) return;
    e.stopPropagation();
    e.preventDefault();

    if (e.touches.length === 1 && stateRef.current.initDist === 0) {
      // 1 finger Drag & Drop
      const dx = e.touches[0].clientX - stateRef.current.startX;
      const dy = e.touches[0].clientY - stateRef.current.startY;
      if (Math.hypot(dx, dy) > 5) {
        if (!stateRef.current.moved) {
          onDragStart?.(stickerType);
        }
        stateRef.current.moved = true;
      }
      onTransformChange(prev => ({
        ...prev,
        x: stateRef.current.initX + dx,
        y: stateRef.current.initY + dy,
      }));
      if (stateRef.current.moved) {
        onDragMove?.(e.touches[0].clientX, e.touches[0].clientY, stickerType);
      }
    } else if (e.touches.length >= 2) {
      // 2 finger Pinch-to-zoom & Rotate
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const angle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const dx = midX - stateRef.current.startX;
      const dy = midY - stateRef.current.startY;

      const scaleFactor = stateRef.current.initDist > 0 ? dist / stateRef.current.initDist : 1;
      const angleDelta = angle - stateRef.current.initAngle;

      stateRef.current.moved = true;
      onTransformChange(prev => ({
        ...prev,
        x: stateRef.current.initX + dx,
        y: stateRef.current.initY + dy,
        scale: Math.min(Math.max(stateRef.current.initScale * scaleFactor, 0.4), 3.5),
        rotation: (stateRef.current.initRot + angleDelta) % 360,
      }));
    }
  };

  const handleTouchEnd = (e) => {
    e.stopPropagation();
    if (e.touches.length === 1) {
      // Transition from 2 fingers down to 1 finger smoothly
      stateRef.current = {
        ...stateRef.current,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initX: transform.x,
        initY: transform.y,
        initDist: 0,
        initAngle: 0,
      };
    } else if (e.touches.length === 0) {
      if (stateRef.current.moved) {
        const lastTouch = e.changedTouches && e.changedTouches[0];
        const clientX = lastTouch ? lastTouch.clientX : stateRef.current.startX;
        const clientY = lastTouch ? lastTouch.clientY : stateRef.current.startY;
        onDragEnd?.(clientX, clientY, stickerType);
      } else if ((Date.now() - stateRef.current.startTime) < 280) {
        onTap?.();
      }
      stateRef.current.isInteracting = false;
    }
  };

  // Mouse drag & wheel zoom fallback for desktop
  const handleMouseDown = (e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = transform.x;
    const initY = transform.y;
    const startTime = Date.now();
    let moved = false;

    const onMouseMove = (moveEvt) => {
      const dx = moveEvt.clientX - startX;
      const dy = moveEvt.clientY - startY;
      if (Math.hypot(dx, dy) > 4) {
        if (!moved) {
          onDragStart?.(stickerType);
        }
        moved = true;
      }
      onTransformChange(prev => ({
        ...prev,
        x: initX + dx,
        y: initY + dy,
      }));
      if (moved) {
        onDragMove?.(moveEvt.clientX, moveEvt.clientY, stickerType);
      }
    };

    const onMouseUp = (upEvt) => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (moved) {
        onDragEnd?.(upEvt.clientX, upEvt.clientY, stickerType);
      } else if ((Date.now() - startTime) < 280) {
        onTap?.();
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleWheel = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    onTransformChange(prev => ({
      ...prev,
      scale: Math.min(Math.max(prev.scale + delta, 0.4), 3.5),
    }));
  };

  return (
    <div
      ref={innerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onWheel={handleWheel}
      className="absolute z-30 select-none cursor-grab active:cursor-grabbing touch-none gesture-sticker-item"
      style={{
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, 0px) rotate(${transform.rotation}deg) scale(${transform.scale})`,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </div>
  );
}

export default function Hints() {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const navigate = useNavigate();
  const user = useUser();

  const [myProfile, setMyProfile] = useState(null);
  const [myCheckIn, setMyCheckIn] = useState(null);
  const [loading, setLoading] = useState(true);

  // Camera settings & stream
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' (front) or 'environment' (back)
  const [permissionError, setPermissionError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Flash & screen flash effect
  const [flashMode, setFlashMode] = useState(false);
  const [screenFlash, setScreenFlash] = useState(false);

  // Text & location stickers on captured photo
  const [storyText, setStoryText] = useState('');
  const [showTextModal, setShowTextModal] = useState(false);
  const [storyLocation, setStoryLocation] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Transform states for movable/resizable/rotatable stickers (Drag, Pinch-to-zoom, Rotate)
  const [textTransform, setTextTransform] = useState({ x: 0, y: 15, scale: 1, rotation: 0 });
  const [locTransform, setLocTransform] = useState({ x: 0, y: -75, scale: 1, rotation: 0 });
  const textRef = useRef(null);
  const locRef = useRef(null);
  const textInputRef = useRef(null);
  const previewContainerRef = useRef(null);

  // Trash can drag-to-delete state
  const trashRef = useRef(null);
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const isOverTrashRef = useRef(false);
  const draggingTypeRef = useRef(null);

  const checkOverTrash = (clientX, clientY) => {
    if (!trashRef.current) return false;
    const rect = trashRef.current.getBoundingClientRect();
    const pad = 30; // Generous drop area
    const isOver = (
      clientX >= rect.left - pad &&
      clientX <= rect.right + pad &&
      clientY >= rect.top - pad &&
      clientY <= rect.bottom + pad
    );
    if (isOver && !isOverTrashRef.current) {
      if (navigator.vibrate) navigator.vibrate(25);
    }
    isOverTrashRef.current = isOver;
    setIsOverTrash(isOver);
    return isOver;
  };

  const handleStickerDragStart = (type) => {
    draggingTypeRef.current = type;
    setIsDraggingSticker(true);
  };

  const handleStickerDragMove = (clientX, clientY) => {
    checkOverTrash(clientX, clientY);
  };

  const handleStickerDragEnd = (clientX, clientY, type) => {
    const droppedInTrash = isOverTrashRef.current || checkOverTrash(clientX, clientY);
    const targetType = type || draggingTypeRef.current;
    
    if (droppedInTrash && targetType) {
      if (targetType === 'text') {
        setStoryText('');
        setTextTransform({ x: 0, y: 15, scale: 1, rotation: 0 });
        toast.success('Tekst verwijderd 🗑️');
      } else if (targetType === 'location') {
        setStoryLocation(null);
        setLocTransform({ x: 0, y: -75, scale: 1, rotation: 0 });
        toast.success('Locatie verwijderd 🗑️');
      }
      if (navigator.vibrate) navigator.vibrate([40, 50, 40]);
    }

    setIsDraggingSticker(false);
    setIsOverTrash(false);
    isOverTrashRef.current = false;
    draggingTypeRef.current = null;
  };

  const handleTrashClick = () => {
    if (storyText && storyLocation) {
      setStoryText('');
      setTextTransform({ x: 0, y: 15, scale: 1, rotation: 0 });
      toast.success('Tekst verwijderd 🗑️');
    } else if (storyText) {
      setStoryText('');
      setTextTransform({ x: 0, y: 15, scale: 1, rotation: 0 });
      toast.success('Tekst verwijderd 🗑️');
    } else if (storyLocation) {
      setStoryLocation(null);
      setLocTransform({ x: 0, y: -75, scale: 1, rotation: 0 });
      toast.success('Locatie verwijderd 🗑️');
    }
    if (navigator.vibrate) navigator.vibrate(40);
  };

  // Auto-focus text input and position cursor at end when text modal opens
  useEffect(() => {
    if (showTextModal) {
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
          textInputRef.current.selectionStart = textInputRef.current.value.length;
          textInputRef.current.selectionEnd = textInputRef.current.value.length;
        }
      }, 50);
    }
  }, [showTextModal]);

  // Capture preview state
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [capturedType, setCapturedType] = useState(null); // 'photo' | 'video'
  const [capturedUrl, setCapturedUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const videoRef = useRef(null);
  const pressTimeoutRef = useRef(null);
  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const videoChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const lastTapRef = useRef(0);

  useEffect(() => {
    if (user !== undefined) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const u = user;
    if (!u) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      const [profiles, checkIns, destinations] = await Promise.all([
        base44.entities.UserProfile.filter({ user_email: u.email }),
        base44.entities.VenueCheckIn.filter({ user_email: u.email }),
        base44.entities.UserDestination.filter({ user_email: u.email }),
      ]);

      const myProf = profiles[0] || null;
      setMyProfile(myProf);

      const activeCheckIn = checkIns.find((c) => !c.expires_at || c.expires_at > now);
      const activeDestination = destinations.find((d) => d.status === 'active' && (!d.expires_at || d.expires_at > now));
      const myCI = activeCheckIn || activeDestination || null;
      setMyCheckIn(myCI);

      if (myCI) {
        initCamera(facingMode);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const initCamera = async (mode) => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setPermissionError(null);
    try {
      const constraints = {
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        try {
          await videoRef.current.play();
        } catch (e) {
          console.warn('Video play error:', e);
        }
      }
    } catch (err) {
      console.warn('Camera access failed:', err.name, err.message);
      // Try video-only as fallback
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
        });
        setStream(videoOnlyStream);
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn('Video play error:', e);
          }
        }
      } catch (err2) {
        if (err2.name === 'NotAllowedError' || err2.name === 'PermissionDeniedError') {
          setPermissionError('blocked');
        } else if (err2.name === 'NotFoundError' || err2.name === 'DevicesNotFoundError') {
          setPermissionError('notfound');
        } else {
          setPermissionError('generic');
        }
      }
    }
  };

  const toggleCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (myCheckIn) {
      initCamera(nextMode);
    }
  };

  const toggleFlash = async () => {
    const next = !flashMode;
    setFlashMode(next);
    if (stream) {
      try {
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const capabilities = track.getCapabilities();
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: next }]
            });
          }
        }
      } catch (err) {
        console.warn('Torch constraint error:', err);
      }
    }
  };

  // Sync photo captured state with Layout to toggle bottom navigation bar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('romety_hints_photo_state', {
      detail: { captured: Boolean(capturedUrl) }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('romety_hints_photo_state', {
        detail: { captured: false }
      }));
    };
  }, [capturedUrl]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, [stream]);

  // Gestures for shutter button
  const handlePressStart = (e) => {
    if (!myCheckIn || permissionError || !stream) return;
    e.preventDefault();
    isRecordingRef.current = false;

    pressTimeoutRef.current = setTimeout(() => {
      startRecording();
    }, 500); // long press threshold 500ms
  };

  const handlePressEnd = (e) => {
    if (!myCheckIn || permissionError || !stream) return;
    e.preventDefault();
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
      pressTimeoutRef.current = null;
    }

    if (isRecordingRef.current) {
      stopRecording();
    } else {
      capturePhoto();
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (navigator.vibrate) navigator.vibrate(50);

    if (flashMode) {
      setScreenFlash(true);
      setTimeout(() => setScreenFlash(false), 260);
    }

    try {
      // 1. Zorg dat de video actief draait
      if (video.paused) {
        try {
          await video.play();
        } catch (e) {}
      }

      // 2. Wacht tot de compositor een actuele frame heeft getekend (voorkomt lege zwarte frames in iOS Safari)
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      // 3. Bepaal afmetingen met veilige fallback
      const width = video.videoWidth || video.clientWidth || 720;
      const height = video.videoHeight || video.clientHeight || 1280;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // 4. Teken frame (tot 3 pogingen mocht het eerste frame nog leeg/zwart zijn)
      let drawn = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) {
          await new Promise((r) => setTimeout(r, 60));
        }

        ctx.save();
        ctx.clearRect(0, 0, width, height);

        if (facingMode === 'user') {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }

        ctx.drawImage(video, 0, 0, width, height);
        ctx.restore();

        try {
          const pixel = ctx.getImageData(Math.floor(width / 2), Math.floor(height / 2), 1, 1).data;
          if (pixel[0] > 0 || pixel[1] > 0 || pixel[2] > 0) {
            drawn = true;
            break;
          }
        } catch (e) {
          drawn = true;
          break;
        }
      }

      // 5. Genereer dataUrl voor directe, foutloze preview in <img>
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setCapturedUrl(dataUrl);
      setCapturedType('photo');

      // 6. Genereer Blob voor latere uploads en stop daarna pas netjes de camera tracks
      canvas.toBlob(
        async (blob) => {
          if (blob) {
            setCapturedBlob(blob);
          } else {
            try {
              const res = await fetch(dataUrl);
              const b = await res.blob();
              setCapturedBlob(b);
            } catch (err) {
              console.warn('Fallback blob error:', err);
            }
          }

          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        },
        'image/jpeg',
        0.95
      );
    } catch (err) {
      console.error('Error in capturePhoto:', err);
      toast.error('Kon foto niet vastleggen, probeer opnieuw');
    }
  };

  const handleGalleryPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith('video');
    const url = URL.createObjectURL(file);
    setCapturedBlob(file);
    setCapturedType(isVideo ? 'video' : 'photo');
    setCapturedUrl(url);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    e.target.value = '';
  };

  const startRecording = () => {
    if (!stream) return;
    if (navigator.vibrate) navigator.vibrate(50);
    try {
      isRecordingRef.current = true;
      setIsRecording(true);
      setRecordingSeconds(0);
      videoChunksRef.current = [];

      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      let options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = '';
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          videoChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(videoBlob);
        setCapturedBlob(videoBlob);
        setCapturedType('video');
        setCapturedUrl(url);

        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      recorder.start();
    } catch (e) {
      console.error(e);
      isRecordingRef.current = false;
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
  };

  const resetCamera = () => {
    if (capturedUrl && capturedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedBlob(null);
    setCapturedType(null);
    setCapturedUrl(null);
    setStoryText('');
    setStoryLocation(null);
    setTextTransform({ x: 0, y: 15, scale: 1, rotation: 0 });
    setLocTransform({ x: 0, y: -75, scale: 1, rotation: 0 });
    setIsDraggingSticker(false);
    setIsOverTrash(false);
    isOverTrashRef.current = false;
    draggingTypeRef.current = null;
    initCamera(facingMode);
  };

  // Helper to compose text & location stickers onto image canvas with position, scale & rotation
  const getComposedImageBlob = async () => {
    if (!capturedUrl || capturedType !== 'photo') return capturedBlob;
    if (!storyText && !storyLocation) return capturedBlob;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 1080;
        canvas.height = img.naturalHeight || 1920;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;

        const previewEl = previewContainerRef.current;
        const pRect = previewEl ? previewEl.getBoundingClientRect() : null;

        // 1. Draw location sticker if present
        if (storyLocation) {
          let posX = w / 2;
          let posY = h * 0.32;
          if (pRect && locRef.current) {
            const lRect = locRef.current.getBoundingClientRect();
            const relX = (lRect.left + lRect.width / 2 - pRect.left) / pRect.width;
            const relY = (lRect.top + lRect.height / 2 - pRect.top) / pRect.height;
            posX = relX * w;
            posY = relY * h;
          }

          ctx.save();
          ctx.translate(posX, posY);
          ctx.rotate((locTransform.rotation * Math.PI) / 180);
          ctx.scale(locTransform.scale, locTransform.scale);

          const locText = `📍 ${storyLocation}`;
          const fontSize = Math.round(w * 0.038);
          ctx.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
          const textMetrics = ctx.measureText(locText);
          const padX = Math.round(w * 0.038);
          const boxW = textMetrics.width + padX * 2;
          const boxH = Math.round(fontSize * 2.1);

          // Draw pill centered at (0, 0)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
          } else {
            ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
          }
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 75, 114, 0.6)';
          ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
          ctx.stroke();

          // Text centered at (0, 0)
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(locText, 0, 0);
          ctx.restore();
        }

        // 2. Draw story text sticker if present
        if (storyText) {
          let posX = w / 2;
          let posY = h * 0.44;
          if (pRect && textRef.current) {
            const tRect = textRef.current.getBoundingClientRect();
            const relX = (tRect.left + tRect.width / 2 - pRect.left) / pRect.width;
            const relY = (tRect.top + tRect.height / 2 - pRect.top) / pRect.height;
            posX = relX * w;
            posY = relY * h;
          }

          ctx.save();
          ctx.translate(posX, posY);
          ctx.rotate((textTransform.rotation * Math.PI) / 180);
          ctx.scale(textTransform.scale, textTransform.scale);

          const fontSize = Math.round(w * 0.046);
          ctx.font = `bold ${fontSize}px Inter, -apple-system, sans-serif`;
          const textMetrics = ctx.measureText(storyText);
          const padX = Math.round(w * 0.05);
          const boxW = Math.min(w * 0.88, textMetrics.width + padX * 2);
          const boxH = Math.round(fontSize * 2.3);

          // Draw backdrop centered at (0, 0)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 18);
          } else {
            ctx.rect(-boxW / 2, -boxH / 2, boxW, boxH);
          }
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = Math.max(2, Math.round(w * 0.003));
          ctx.stroke();

          // Text centered at (0, 0)
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(storyText, 0, 0);
          ctx.restore();
        }

        canvas.toBlob((blob) => {
          resolve(blob || capturedBlob);
        }, 'image/jpeg', 0.95);
      };
      img.onerror = () => resolve(capturedBlob);
      img.src = capturedUrl;
    });
  };

  const sendToStory = async () => {
    if (!capturedBlob || !myCheckIn) return;
    if (navigator.vibrate) navigator.vibrate(50);
    setIsUploading(true);

    try {
      const finalBlob = await getComposedImageBlob();
      const ext = capturedType === 'video' ? 'webm' : 'jpg';
      const mime = capturedType === 'video' ? 'video/webm' : 'image/jpeg';
      const file = new File([finalBlob], `story_${Date.now()}.${ext}`, { type: mime });

      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const media_url = uploadResult.file_url;

      await base44.entities.Story.create({
        user_email: user.email,
        user_name: myProfile?.display_name || user.email.split('@')[0],
        user_photo_url: myProfile?.photo_url || null,
        media_url,
        media_type: capturedType,
        venue_name: storyLocation || myCheckIn.venue_name,
      });

      toast.success("Verhaal succesvol geplaatst! 🚀", { duration: 3000 });
      
      if (capturedUrl) {
        URL.revokeObjectURL(capturedUrl);
      }

      navigate(createPageUrl('Home'));
    } catch (err) {
      console.error("Story creation failed:", err);
      toast.error("Kan verhaal niet uploaden. Probeer het opnieuw.", { duration: 3000 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveMedia = async () => {
    if (!capturedUrl) return;
    const finalBlob = await getComposedImageBlob();
    const url = URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    const ext = capturedType === 'video' ? 'mp4' : 'jpg';
    a.download = `romety_${capturedType === 'video' ? 'video' : 'photo'}_${Date.now()}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success(`${capturedType === 'video' ? 'Video' : 'Foto'} opgeslagen op je apparaat! 📥`);
  };

  const bg = isDark ? '#08090E' : '#F8F9FB';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: bg, zIndex: 40 }}>
        <div className="w-10 h-10 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
      </div>
    );
  }

  if (!myCheckIn) {
    return (
      <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col" style={{ background: bg }}>
        {/* Top close button */}
        <div 
          className="p-4 flex items-center justify-between z-10"
          style={{ paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))' }}
        >
          <button
            onClick={() => navigate(createPageUrl('Home'))}
            className="p-2.5 rounded-full bg-black/5 dark:bg-white/10 active:scale-90 transition-transform"
            aria-label="Sluiten"
          >
            <X className={`w-5 h-5 ${textMain}`} />
          </button>
        </div>

        {/* No location locked state */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 pb-20">
          <div 
            className="w-full max-w-sm p-6 rounded-[28px] text-center flex flex-col items-center border shadow-2xl transition-all"
            style={{
              background: isDark ? 'rgba(14, 15, 25, 0.92)' : 'rgba(255, 255, 255, 0.92)',
              borderColor: isDark ? 'rgba(255, 75, 114, 0.35)' : 'rgba(255, 75, 114, 0.25)',
              boxShadow: isDark 
                ? '0 16px 40px rgba(0, 0, 0, 0.7), 0 0 30px rgba(255, 75, 114, 0.2)' 
                : '0 16px 40px rgba(0, 0, 0, 0.12), 0 0 30px rgba(255, 75, 114, 0.12)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
          >
            <h3 className={`text-base font-black tracking-tight mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Geen bestemming ingesteld
            </h3>
            <p className={`text-xs font-medium leading-relaxed mb-5 max-w-[250px] ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Stel je bestemming van vandaag in om je matches, hints, chat en kortingen te zien!
            </p>
            <button
              onClick={() => navigate(createPageUrl('Pinpoint'))}
              className="w-full py-3.5 px-5 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg active:scale-95 transition-transform text-center"
              style={{
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 6px 20px rgba(255, 75, 114, 0.4)',
              }}
            >
              Ga naar Pinpoint
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      toggleCamera();
    }
    lastTapRef.current = now;
  };

  // Snapchat-style: tap anywhere on the captured photo to place text right there
  const handlePhotoClick = (e) => {
    if (!capturedUrl) {
      handleDoubleTap();
      return;
    }
    // If click happened on an interactive sticker (location or text), let the sticker handle its own tap/drag
    if (e.target.closest?.('.gesture-sticker-item')) return;

    const container = previewContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;

    const centerY = rect.top + rect.height / 2;
    const rawOffsetY = clientY - centerY;

    // Constrain Y so the text sticker doesn't clip beyond top bar or bottom action bar
    const minY = -Math.round(rect.height * 0.36);
    const maxY = Math.round(rect.height * 0.30);
    const clampedY = Math.max(minY, Math.min(maxY, rawOffsetY));

    setTextTransform(prev => ({
      ...prev,
      x: 0,
      y: Math.round(clampedY),
    }));
    setShowTextModal(true);
  };

  return (
    <div className="fixed inset-y-0 left-1/2 -translate-x-1/2 w-full max-w-md flex flex-col justify-between bg-black text-white" style={{ zIndex: 40 }}>
      {/* ── TOP CONTROLS BAR ── */}
      <div 
        className="absolute left-0 right-0 z-50 px-4 flex items-center justify-between pointer-events-auto"
        style={{
          top: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))',
        }}
      >
        {/* Left: Close or Discard */}
        <button
          type="button"
          onClick={() => {
            if (capturedUrl) {
              resetCamera();
            } else {
              navigate(createPageUrl('Home'));
            }
          }}
          className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 active:scale-90 transition-transform cursor-pointer hover:bg-black/60 shadow-lg"
          aria-label={capturedUrl ? 'Foto verwerpen' : 'Sluiten'}
          title={capturedUrl ? 'Foto verwerpen' : 'Sluiten'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Right side controls */}
        {!capturedUrl ? (
          /* VOOR HET MAKEN VAN EEN FOTO: Flits & Camera draaien */
          <div className="flex items-center gap-2">
            {/* Flits (Flash) */}
            <button
              type="button"
              onClick={toggleFlash}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-90 cursor-pointer shadow-lg ${
                flashMode
                  ? 'bg-amber-400 text-gray-900 border-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.65)]'
                  : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
              title={flashMode ? 'Flits aan' : 'Flits uit'}
              aria-label="Flits"
            >
              {flashMode ? (
                <Zap className="w-5 h-5 fill-current text-gray-950" />
              ) : (
                <ZapOff className="w-5 h-5 text-white/80" />
              )}
            </button>

            {/* Camera draaien (Switch Camera) */}
            <button
              type="button"
              onClick={toggleCamera}
              className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/20 active:scale-90 transition-all hover:bg-black/60 cursor-pointer shadow-lg"
              title="Camera draaien"
              aria-label="Camera draaien"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        ) : (
          /* NADAT EEN FOTO IS GEMAAKT: Locatie & Tekst */
          <div className="flex items-center gap-2">
            {/* Locatie (Location) */}
            <button
              type="button"
              onClick={() => setShowLocationModal(true)}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-90 cursor-pointer shadow-lg ${
                storyLocation
                  ? 'bg-pink-500 text-white border-pink-400 shadow-[0_0_16px_rgba(236,72,153,0.65)]'
                  : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
              title="Locatie toevoegen"
              aria-label="Locatie toevoegen"
            >
              <MapPin className={`w-5 h-5 ${storyLocation ? 'fill-current' : ''}`} />
            </button>

            {/* Tekst (Text) */}
            <button
              type="button"
              onClick={() => setShowTextModal(true)}
              className={`p-2.5 rounded-full backdrop-blur-md border transition-all active:scale-90 cursor-pointer shadow-lg ${
                storyText
                  ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white border-pink-400 shadow-[0_0_16px_rgba(236,72,153,0.65)]'
                  : 'bg-black/40 text-white border-white/20 hover:bg-black/60'
              }`}
              title="Tekst toevoegen"
              aria-label="Tekst toevoegen"
            >
              <Type className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* ── CAMERA / PREVIEW DISPLAY ── */}
      <div 
        ref={previewContainerRef}
        className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-black select-none touch-none"
        onClick={handlePhotoClick}
      >
        {/* Full-screen flash illumination effect */}
        {screenFlash && (
          <div className="absolute inset-0 bg-white z-[80] pointer-events-none transition-opacity duration-200" />
        )}

        {capturedUrl ? (
          <>
            {capturedType === 'video' ? (
              <video
                src={capturedUrl}
                className="w-full h-full object-cover pointer-events-none"
                autoPlay
                playsInline
                loop
                controls={false}
              />
            ) : (
              <img src={capturedUrl} alt="Preview" className="w-full h-full object-cover pointer-events-none" />
            )}

            {/* Overlays: Movable, resizable & rotatable Location sticker */}
            {storyLocation && (
              <GestureSticker
                innerRef={locRef}
                transform={locTransform}
                onTransformChange={setLocTransform}
                onTap={() => setShowLocationModal(true)}
                stickerType="location"
                onDragStart={() => handleStickerDragStart('location')}
                onDragMove={handleStickerDragMove}
                onDragEnd={handleStickerDragEnd}
              >
                <div className="bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-pink-500/50 text-white font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-1.5 hover:bg-black/80 ring-1 ring-pink-500/30">
                  <MapPin className="w-3.5 h-3.5 text-pink-500 fill-pink-500 flex-shrink-0" />
                  <span className="truncate max-w-[220px] pointer-events-none">{storyLocation}</span>
                </div>
              </GestureSticker>
            )}

            {/* Overlays: Movable, resizable & rotatable Text sticker */}
            {storyText && (
              <GestureSticker
                innerRef={textRef}
                transform={textTransform}
                onTransformChange={setTextTransform}
                onTap={() => setShowTextModal(true)}
                stickerType="text"
                onDragStart={() => handleStickerDragStart('text')}
                onDragMove={handleStickerDragMove}
                onDragEnd={handleStickerDragEnd}
              >
                <div className="bg-black/75 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/25 text-white font-black text-sm sm:text-base text-center shadow-2xl max-w-[280px] break-words hover:bg-black/85 ring-1 ring-white/20">
                  <span className="pointer-events-none">{storyText}</span>
                </div>
              </GestureSticker>
            )}
          </>
        ) : (
          <>
            {permissionError ? (
              <div className="p-6 text-center flex flex-col items-center gap-4">
                <AlertCircle className="w-14 h-14 text-red-400 mb-1" />
                {permissionError === 'blocked' && (
                  <>
                    <p className="text-base font-bold text-white">Cameratoegang vereist 🚫</p>
                    <p className="text-sm text-white/70 max-w-xs">
                      Ga naar instellingen om Romety toegang tot je camera te geven om foto's en verhalen te kunnen maken.
                    </p>
                  </>
                )}
                {permissionError === 'notfound' && (
                  <>
                    <p className="text-base font-bold text-white">Geen camera gevonden 📷</p>
                    <p className="text-sm text-white/70 max-w-xs">
                      Er is geen camera beschikbaar op dit toestel of de camera is in gebruik door een andere app.
                    </p>
                  </>
                )}
                {permissionError === 'generic' && (
                  <>
                    <p className="text-base font-bold text-white">Camera niet beschikbaar</p>
                    <p className="text-sm text-white/70 max-w-xs">
                      Cameratoegang is niet ingeschakeld. Geef toestemming in je instellingen en probeer opnieuw.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => initCamera(facingMode)}
                  className="mt-2 px-6 py-3 rounded-full font-bold text-sm text-white active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)', boxShadow: '0 6px 20px rgba(255,75,114,0.4)' }}
                >
                  🔄 Opnieuw proberen
                </button>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
            )}
          </>
        )}

        {isRecording && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-500/80 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 animate-pulse z-50">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            REC {recordingSeconds}s
          </div>
        )}
      </div>

      {/* ── VOOR HET MAKEN VAN EEN FOTO: APPLE-STYLE ZWARTE DOORZICHTIGE BALK MET SHUTTER ── */}
      {!capturedUrl && !permissionError && (
        <div 
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 select-none flex items-center justify-between px-8"
          style={{
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: '16px',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
          }}
        >
          {/* Linker knop: Galerij / Upload knop (zoals foto-thumbnail bij Apple) */}
          <div className="w-14 flex items-center justify-center">
            <label 
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center cursor-pointer border border-white/20 shadow-md"
              title="Foto of video kiezen uit galerij"
            >
              <ImageIcon className="w-5 h-5 text-white/90" />
              <input 
                type="file" 
                accept="image/*,video/*" 
                className="hidden" 
                onChange={handleGalleryPick}
              />
            </label>
          </div>

          {/* Midden: Apple Camera Shutter Button */}
          <div className="flex items-center justify-center">
            <button
              type="button"
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              className="w-[78px] h-[78px] rounded-full flex items-center justify-center relative cursor-pointer select-none transition-all duration-200 active:scale-95"
              style={{
                background: 'transparent',
                border: '4px solid #FFFFFF',
                boxShadow: isRecording 
                  ? '0 0 24px rgba(239, 68, 68, 0.9)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.4)',
                transform: isRecording ? 'scale(1.12)' : 'scale(1)',
              }}
              aria-label="Foto maken of video opnemen"
            >
              <div
                className={`transition-all duration-200 ${
                  isRecording 
                    ? 'w-8 h-8 bg-red-500 rounded-lg shadow-sm' 
                    : 'w-[62px] h-[62px] rounded-full bg-white active:bg-white/90 shadow-sm'
                }`}
              />
            </button>
          </div>

          {/* Rechter knop: Camera omdraaien (zoals flip camera bij Apple) */}
          <div className="w-14 flex items-center justify-center">
            <button
              type="button"
              onClick={toggleCamera}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 transition-all flex items-center justify-center cursor-pointer border border-white/20 shadow-md"
              title="Camera draaien"
              aria-label="Camera draaien"
            >
              <RefreshCw className="w-5 h-5 text-white/90" />
            </button>
          </div>
        </div>
      )}

      {/* ── NADAT EEN FOTO IS GEMAAKT: NAVIGATIEBALK ONDERAAN (Zelfde stijl & kleur als normale navigatiebalk) ── */}
      {capturedUrl && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[200] select-none transition-all duration-200"
          style={{
            transform: 'translateX(-50%) translateZ(0)',
            background: isDark ? 'rgba(11, 12, 16, 0.92)' : 'rgba(255, 255, 255, 0.92)',
            borderTop: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
            boxShadow: isDark ? '0 -4px 24px rgba(0,0,0,0.5)' : '0 -4px 24px rgba(0,0,0,0.06)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
            paddingTop: '12px',
            paddingLeft: '16px',
            paddingRight: '16px',
            touchAction: 'none',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Opslaan (Save) */}
            <button
              type="button"
              onClick={handleSaveMedia}
              disabled={isUploading}
              className={`flex-1 py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shadow-xs border ${
                isDark 
                  ? 'bg-white/10 hover:bg-white/15 border-white/10 text-white' 
                  : 'bg-black/5 hover:bg-black/10 border-black/5 text-gray-800'
              }`}
            >
              <Download className="w-4.5 h-4.5 text-[#FF4B72]" />
              <span>Opslaan</span>
            </button>

            {/* Naar Story (Add to Story) */}
            <button
              type="button"
              onClick={sendToStory}
              disabled={isUploading}
              className="flex-1 py-3.5 px-4 rounded-2xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 4px 18px rgba(255, 75, 114, 0.45)',
              }}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Plaatsen...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Naar Story</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── PRULLENBAK RECHTSONDERIN (Drag text or location to delete) ── */}
      {capturedUrl && (storyText || storyLocation) && (
        <div
          ref={trashRef}
          onClick={handleTrashClick}
          className={`fixed z-[210] flex items-center justify-center rounded-full transition-all duration-200 cursor-pointer select-none ${
            isOverTrash
              ? 'w-14 h-14 bg-red-600 scale-125 shadow-[0_0_30px_rgba(239,68,68,0.95)] border-2 border-white text-white'
              : isDraggingSticker
              ? 'w-13 h-13 bg-red-500/30 backdrop-blur-md border border-red-500/80 text-red-400 scale-110 animate-pulse shadow-[0_4px_20px_rgba(239,68,68,0.4)]'
              : 'w-11 h-11 bg-black/60 backdrop-blur-md border border-white/20 text-white/80 hover:text-red-400 hover:border-red-500/50 hover:bg-black/80 shadow-lg active:scale-90'
          }`}
          style={{
            bottom: 'calc(max(20px, env(safe-area-inset-bottom, 20px)) + 74px)',
            right: 'calc(50% - min(50vw, 224px) + 16px)',
          }}
          title="Sleep hierheen om te verwijderen"
          aria-label="Sleep tekst of locatie hierheen om te verwijderen"
        >
          <Trash2
            className={`transition-all duration-200 ${
              isOverTrash
                ? 'w-6 h-6 text-white scale-120 rotate-[-12deg]'
                : isDraggingSticker
                ? 'w-5 h-5 text-red-300'
                : 'w-4.5 h-4.5'
            }`}
          />
        </div>
      )}

      {/* ── MODAL: STORY TEXT EDITOR (Snapchat-style inline floating caption) ── */}
      {showTextModal && (
        <div 
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm flex flex-col justify-between select-none animate-fadeIn"
          style={{
            paddingTop: 'max(16px, calc(env(safe-area-inset-top, 0px) + 12px))',
            paddingBottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
          }}
          onClick={() => setShowTextModal(false)}
        >
          {/* Top Controls Bar */}
          <div 
            className="w-full px-5 flex items-center justify-between z-10"
            onClick={e => e.stopPropagation()}
          >
            {storyText ? (
              <button
                type="button"
                onClick={() => {
                  setStoryText('');
                  setShowTextModal(false);
                }}
                className="py-1.5 px-3.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs hover:bg-red-500/25 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wissen</span>
              </button>
            ) : (
              <div className="w-16" />
            )}

            <span className="text-white/60 text-xs font-semibold tracking-wide">
              {storyText.length > 0 ? `${storyText.length}/80` : 'Tik om te typen'}
            </span>

            <button
              type="button"
              onClick={() => setShowTextModal(false)}
              className="py-1.5 px-5 rounded-full font-black text-xs text-white shadow-lg active:scale-95 transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 4px 16px rgba(255, 75, 114, 0.45)',
              }}
            >
              Klaar
            </button>
          </div>

          {/* Positioned Text Input at the tapped Y location */}
          <div className="flex-1 w-full max-w-md mx-auto flex items-center justify-center relative pointer-events-none px-4">
            <div
              className="w-full max-w-[320px] pointer-events-auto flex flex-col items-center"
              style={{
                transform: `translate3d(0px, ${Math.max(-180, Math.min(100, textTransform.y))}px, 0px)`,
                transition: 'transform 0.15s ease-out',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div 
                className="w-full bg-black/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border text-white font-black shadow-2xl transition-all"
                style={{
                  borderColor: 'rgba(255, 75, 114, 0.7)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 75, 114, 0.25)',
                }}
              >
                <textarea
                  ref={textInputRef}
                  rows={2}
                  autoFocus
                  maxLength={80}
                  value={storyText}
                  onChange={e => setStoryText(e.target.value)}
                  placeholder="Typ een bericht..."
                  className="w-full bg-transparent text-center text-white font-black text-base sm:text-lg outline-none resize-none placeholder-white/40 leading-snug"
                  style={{
                    caretColor: '#FF4B72',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowTextModal(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Bottom Hint */}
          <div className="w-full text-center text-white/40 text-[11px] pointer-events-none pb-2">
            Tik buiten het vak of op Klaar om te bevestigen
          </div>
        </div>
      )}

      {/* ── MODAL: STORY LOCATION PICKER ── */}
      {showLocationModal && (
        <div 
          className="fixed inset-0 z-[250] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none"
          onClick={() => setShowLocationModal(false)}
        >
          <div 
            className="w-full max-w-sm rounded-[28px] bg-[#141521] border border-white/15 p-5 text-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/20 text-pink-500 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black">Locatie toevoegen</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick chips if venue exists */}
            {myCheckIn?.venue_name && (
              <div className="mb-3">
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1.5">
                  Jouw huidige hotspot:
                </p>
                <button
                  type="button"
                  onClick={() => setStoryLocation(myCheckIn.venue_name)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between text-xs font-bold transition-all active:scale-98 cursor-pointer ${
                    storyLocation === myCheckIn.venue_name
                      ? 'border-pink-500 bg-pink-500/15 text-pink-400'
                      : 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                    <span className="truncate">{myCheckIn.venue_name}</span>
                  </span>
                  {storyLocation === myCheckIn.venue_name && (
                    <span className="text-[11px] text-pink-400 font-bold">Gekozen</span>
                  )}
                </button>
              </div>
            )}

            {/* Custom Location input */}
            <div className="mb-4">
              <label className="text-[11px] font-bold text-white/50 uppercase tracking-wider block mb-1.5">
                Of typ een eigen locatie:
              </label>
              <input
                type="text"
                value={storyLocation || ''}
                onChange={e => setStoryLocation(e.target.value)}
                placeholder="Bijv. Amsterdam Centrum, Club Air..."
                maxLength={40}
                className="w-full rounded-2xl bg-white/5 border border-white/15 px-3.5 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-pink-500"
              />
            </div>

            <div className="flex gap-2.5">
              {storyLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setStoryLocation(null);
                    setShowLocationModal(false);
                  }}
                  className="py-2.5 px-3.5 rounded-xl border border-red-500/30 text-red-400 bg-red-500/10 font-bold text-xs hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  Verwijderen
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-pink-500 to-rose-600 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Opslaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}