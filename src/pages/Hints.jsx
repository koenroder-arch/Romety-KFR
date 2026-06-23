import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useUser } from '@/lib/useUser';
import { useTheme } from '@/lib/ThemeContext';
import { toast } from 'sonner';
import { X, Send, AlertCircle, Lock } from 'lucide-react';
import { createPageUrl } from '@/utils';

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
    }
    try {
      const constraints = {
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setPermissionError(null);
    } catch (err) {
      console.warn("Failed with audio, trying video-only constraints...", err);
      try {
        const videoOnlyStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
        });
        setStream(videoOnlyStream);
        if (videoRef.current) {
          videoRef.current.srcObject = videoOnlyStream;
        }
        setPermissionError(null);
      } catch (err2) {
        setPermissionError("Camera toegang geweigerd of niet beschikbaar. Geef toestemming in de browser.");
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

  const capturePhoto = () => {
    if (!videoRef.current) return;
    if (navigator.vibrate) navigator.vibrate(50);
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedType('photo');
          setCapturedUrl(url);
          if (stream) {
            stream.getTracks().forEach((t) => t.stop());
          }
        }
      },
      'image/jpeg',
      0.95
    );
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
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedBlob(null);
    setCapturedType(null);
    setCapturedUrl(null);
    initCamera(facingMode);
  };

  const sendToStory = async () => {
    if (!capturedBlob || !myCheckIn) return;
    if (navigator.vibrate) navigator.vibrate(50);
    setIsUploading(true);

    try {
      const ext = capturedType === 'video' ? 'webm' : 'jpg';
      const mime = capturedType === 'video' ? 'video/webm' : 'image/jpeg';
      const file = new File([capturedBlob], `story_${Date.now()}.${ext}`, { type: mime });

      const uploadResult = await base44.integrations.Core.UploadFile({ file });
      const media_url = uploadResult.file_url;

      await base44.entities.Story.create({
        user_email: user.email,
        user_name: myProfile?.display_name || user.email.split('@')[0],
        user_photo_url: myProfile?.photo_url || null,
        media_url,
        media_type: capturedType,
        venue_name: myCheckIn.venue_name,
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
      <div className="fixed inset-0 flex flex-col items-center justify-center p-6 text-center" style={{ background: bg, zIndex: 40 }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(255,75,114,0.12)' }}>
          <Lock className="w-8 h-8 text-pink-500" />
        </div>
        <h2 className={`font-black text-lg mb-2 ${textMain}`}>Camera vergrendeld 🔒</h2>
        <p className="text-sm max-w-xs mb-6" style={{ color: textSub }}>
          Stel eerst een bestemming of check-in in op de <strong>Pinpoint</strong> pagina om verhalen te maken.
        </p>
        <button
          onClick={() => navigate(createPageUrl('Pinpoint'))}
          className="px-6 py-3 rounded-full font-black text-sm text-white shadow-lg shadow-pink-500/20 active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)' }}
        >
          📍 Ga naar Pinpoint
        </button>
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

  return (
    <div className="fixed inset-0 flex flex-col justify-between bg-black text-white" style={{ zIndex: 40 }}>
      <div 
        className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-black"
        onClick={handleDoubleTap}
      >
        {capturedUrl ? (
          capturedType === 'video' ? (
            <video
              src={capturedUrl}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              loop
              controls={false}
            />
          ) : (
            <img src={capturedUrl} alt="Preview" className="w-full h-full object-cover" />
          )
        ) : (
          <>
            {permissionError ? (
              <div className="p-6 text-center flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                <p className="text-sm font-semibold">{permissionError}</p>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
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

        {!capturedUrl && !permissionError && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white/70 tracking-wide text-center bg-black/30 backdrop-blur px-3 py-1.5 rounded-full pointer-events-none z-50">
            Tik voor foto · Houd vast voor video
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 z-50 px-6 pb-28 pt-12 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center gap-10">
        {capturedUrl ? (
          <div className="flex items-center justify-center gap-6 w-full">
            <button
              onClick={resetCamera}
              disabled={isUploading}
              className="px-6 py-3.5 rounded-full font-bold text-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
            >
              <X className="w-4 h-4" /> Opnieuw
            </button>
            <button
              onClick={sendToStory}
              disabled={isUploading}
              className="px-8 py-3.5 rounded-full font-black text-sm text-white shadow-lg flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
                boxShadow: '0 8px 24px rgba(255,75,114,0.4)',
              }}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Versturen...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Versturen naar verhaal
                </>
              )}
            </button>
          </div>
        ) : (
          !permissionError && (
            <button
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              className="w-20 h-20 rounded-full flex items-center justify-center relative cursor-pointer select-none transition-all duration-300"
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '4px solid #FFFFFF',
                boxShadow: isRecording ? '0 0 20px rgba(239, 68, 68, 0.8)' : '0 4px 16px rgba(0,0,0,0.3)',
                transform: isRecording ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              <div
                className={`rounded-full transition-all duration-300 ${
                  isRecording ? 'w-10 h-10 bg-red-500 rounded' : 'w-16 h-16 bg-white'
                }`}
              />
            </button>
          )
        )}
      </div>
    </div>
  );
}