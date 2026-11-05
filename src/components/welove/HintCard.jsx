import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, Heart } from 'lucide-react';
import { format } from 'date-fns';
import { nl, enGB } from 'date-fns/locale';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useLang } from '@/lib/LanguageContext';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { useUser } from '@/lib/useUser';

const DOUBLE_TAP_MS = 320;

/** Hetzelfde springende hartje als bij dubbeltikken op de Matches-pagina */
function TapHearts({ hearts, size = 'w-28 h-28' }) {
  return (
    <AnimatePresence>
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ scale: 0, opacity: 0, x: '-50%', y: '-50%' }}
          animate={{ scale: [0, 1.35, 1.15], opacity: [0, 1, 1, 0], y: ['-50%', '-65%', '-80%'] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.85, times: [0, 0.25, 0.7, 1], ease: 'easeOut' }}
          className="absolute pointer-events-none z-50 flex items-center justify-center"
          style={{ left: h.x, top: h.y }}
        >
          <div className="relative flex items-center justify-center">
            <div className={`absolute ${size} rounded-full bg-pink-500/35 blur-xl`} />
            <Heart className={`${size} drop-shadow-[0_8px_30px_rgba(255,75,114,0.85)]`} fill="#FF4B72" color="#FF4B72" strokeWidth={0} />
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  );
}

export default function HintCard({ hint, isDark, onReacted, isSuperMatch }) {
  const [expanded, setExpanded] = useState(false);
  const user = useUser();
  const { tr, isEn } = useLang();
  const reduceMotion = useReducedMotion();

  // Eigen (optimistische) like-status: het hartje reageert direct, de database volgt op de achtergrond
  const serverLiked = !!(user && (hint.heart_reactions || []).includes(user.email));
  const serverCount = (hint.heart_reactions || []).length;
  const [liked, setLiked] = useState(serverLiked);
  const [count, setCount] = useState(serverCount);
  const [hearts, setHearts] = useState([]);       // hartjes op de grote kaart
  const [pulse, setPulse] = useState(0);           // laat de like-knop/teller verend opveren

  const busyRef = useRef(false);
  const likedRef = useRef(serverLiked);
  const lastTapRef = useRef({ t: 0, x: 0, y: 0 });

  useEffect(() => {
    if (busyRef.current) return;
    setLiked(serverLiked);
    setCount(serverCount);
    likedRef.current = serverLiked;
  }, [serverLiked, serverCount]);

  const setLike = async (next) => {
    if (!user || busyRef.current || likedRef.current === next) return;
    busyRef.current = true;
    likedRef.current = next;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    setPulse((p) => p + 1);
    try {
      // Hartje aan/uit via beveiligde databasefunctie (je mag andermans hint niet direct wijzigen)
      const { error: reactError } = await supabase.rpc('toggle_hint_reaction', { p_hint_id: hint.id });
      if (reactError) throw reactError;

      if (next) {
        const myProfs = await base44.entities.UserProfile.filter({ user_email: user.email });
        const myName = myProfs[0]?.display_name || user.email.split('@')[0];
        await base44.entities.Notification.create({
          to_email: hint.from_email,
          from_email: user.email,
          type: 'like',
          from_name: myName,
          venue_name: `Je hint: "${hint.message}"`
        });
      }
    } catch (err) {
      console.error('Error toggling reaction to hint:', err);
      // Terugdraaien als het niet lukte
      likedRef.current = !next;
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      busyRef.current = false;
      if (onReacted) onReacted();
    }
  };

  // Het hartje is feedback op je like, dus altijd tonen (ook als animaties beperkt zijn)
  const spawnHeart = (setter, x, y) => {
    const id = Date.now() + Math.random();
    setter((prev) => [...prev, { id, x, y }]);
    setTimeout(() => setter((prev) => prev.filter((h) => h.id !== id)), 950);
  };

  /** Dubbeltik = altijd liken (nooit unliken), net als op de Matches-pagina */
  const isDoubleTap = (e) => {
    const now = Date.now();
    const last = lastTapRef.current;
    const close = Math.abs(e.clientX - last.x) < 40 && Math.abs(e.clientY - last.y) < 40;
    const dbl = now - last.t < DOUBLE_TAP_MS && close;
    lastTapRef.current = dbl ? { t: 0, x: 0, y: 0 } : { t: now, x: e.clientX, y: e.clientY };
    return dbl;
  };

  const tapPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  // Compacte kaart: direct openen. De tik wordt onthouden, zodat een snelle tweede tik
  // (die op de geopende hint valt) als dubbeltik telt en de hint liket.
  const handleCardTap = (e) => {
    isDoubleTap(e);
    setExpanded(true);
  };

  // Grote kaart: overal dubbeltikken (behalve op knoppen)
  const handleBigTap = (e) => {
    e.stopPropagation();
    if (e.target.closest?.('button')) return;
    if (!isDoubleTap(e)) return;
    const { x, y } = tapPos(e);
    spawnHeart(setHearts, x, y);
    setLike(true);
  };

  const handleHeartButton = (e) => {
    e.stopPropagation();
    if (!liked) {
      const card = e.currentTarget.closest('[data-hint-big]');
      if (card) {
        const r = card.getBoundingClientRect();
        spawnHeart(setHearts, r.width / 2, r.height / 2);
      }
    }
    setLike(!liked);
  };

  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const cardBg = isDark ? '#1E1E35' : '#FFFFFF';
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const timeStr = hint.created_date ? format(new Date(hint.created_date), 'd MMM · HH:mm', { locale: isEn ? enGB : nl }) : '';
  const heartSpring = reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 14 };

  return (
    <>
      {/* Compact card */}
      <button
        onClick={handleCardTap}
        className="relative w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.99] select-none"
        style={{
          background: cardBg,
          border: isSuperMatch ? '1.5px solid #EA3FD3' : `1px solid ${divider}`,
          boxShadow: isSuperMatch ? (isDark ? '0 0 12px rgba(234, 63, 211, 0.35)' : '0 4px 16px rgba(234, 63, 211, 0.15)') : 'none',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Small blurred avatar */}
          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,75,114,0.15)' }}>
            {hint.from_photo_url ? (
              <img src={hint.from_photo_url} alt="" className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg"
                style={hint.from_avatar ? { background: 'linear-gradient(135deg, #FF4B72, #EA3FD3)' } : {}}
              >
                {hint.from_avatar ? hint.from_avatar.split(' ')[0] : '👤'}
              </div>
            )}
          </div>

          {/* Hint message — main focus */}
          <div className="flex-1 min-w-0">
            <div
              className="px-3 py-2 rounded-xl rounded-tl-none text-sm font-black mb-1.5"
              style={{
                background: isDark ? 'linear-gradient(135deg, rgba(255,75,114,0.12), rgba(234,63,211,0.08))' : 'linear-gradient(135deg, rgba(255,75,114,0.08), rgba(234,63,211,0.05))',
                color: textMain,
                border: isDark ? '1px solid rgba(255,75,114,0.25)' : '1px solid rgba(255,75,114,0.15)'
              }}
            >
              {hint.message}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#FF4B72' }} />
              <span className="text-[10px] font-bold" style={{ color: '#FF4B72' }}>{hint.venue_name}</span>
              <span className="text-[10px]" style={{ color: textSub }}>· {timeStr}</span>
            </div>
          </div>
        </div>

        {/* Right side container */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hint.from_avatar && (
            <div className="px-2.5 py-1 rounded-full text-white font-black text-[11px] flex items-center gap-1 shadow-sm" style={{ background: '#FF4B72' }}>
              <span>{hint.from_avatar.split(' ')[0]}</span>
              <span>{hint.from_avatar.split(' ').slice(1).join(' ')}</span>
            </div>
          )}

          <AnimatePresence initial={false}>
            {count > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={heartSpring}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full transition-colors duration-300"
                style={{ background: liked ? 'rgba(255,75,110,0.15)' : 'rgba(255,255,255,0.06)', border: `1px solid ${liked ? 'rgba(255,75,110,0.3)' : 'rgba(255,255,255,0.1)'}` }}
              >
                <motion.span key={`h${pulse}`} initial={{ scale: pulse ? 0.4 : 1 }} animate={{ scale: 1 }} transition={heartSpring} className="flex">
                  <Heart className="w-3 h-3" fill={liked ? '#FF4B6E' : 'none'} style={{ color: liked ? '#FF4B6E' : textSub }} />
                </motion.span>
                <span className="text-[10px] font-black tabular-nums" style={{ color: liked ? '#FF4B6E' : textMain }}>
                  {count}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>

      {/* Popup overlay: via een portal in <body>, zodat hij niet binnen het schuivende Hints-scherm getekend wordt (dat gaf geflikker) */}
      {typeof document !== 'undefined' && createPortal(
      expanded && (
          <motion.div
            className="fixed inset-0 z-[300] flex items-center justify-center px-6"
            // Alleen de achtergrond vervaagt; de kaart zelf animeert niet (opacity/scale op de foto + wazige labels gaf geflikker)
            initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
            animate={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false); }}
          >
            <div
              data-hint-big
              className="w-full max-w-sm rounded-[28px] overflow-hidden relative h-[560px] cursor-pointer select-none"
              style={{
                background: '#0A0E21',
                border: isSuperMatch ? '1.5px solid #EA3FD3' : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSuperMatch ? '0 0 24px rgba(234, 63, 211, 0.4)' : 'none',
                touchAction: 'manipulation',
              }}
              onClick={handleBigTap}
            >
              {/* Background photo */}
              <div className="absolute inset-0 z-0 bg-gray-900">
                {hint.from_photo_url ? (
                  <img src={hint.from_photo_url} alt="" className="w-full h-full object-cover select-none pointer-events-none" />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center relative"
                    style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 50%, #8A2387 100%)' }}
                  >
                    <div className="text-[120px] animate-bounce select-none pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.3)]">
                      {hint.from_avatar ? hint.from_avatar.split(' ')[0] : '👤'}
                    </div>
                    {hint.from_avatar && (
                      <div className="absolute bottom-40 text-center text-white/50 text-xs font-bold tracking-widest uppercase bg-black/30 px-3.5 py-1.5 rounded-full">
                        {hint.from_avatar.split(' ').slice(1).join(' ')}
                      </div>
                    )}
                  </div>
                )}
                {/* Gradient overlay to make text readable */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/60 pointer-events-none" />
              </div>

              {/* Dubbeltik-hartjes (zoals op de Matches-pagina) */}
              <TapHearts hearts={hearts} />

              {/* Top Right Avatar Badge */}
              {hint.from_avatar && (
                <div className="absolute top-4 right-14 z-20 pointer-events-none">
                  <div className="px-3.5 py-1.5 rounded-full text-white font-black text-xs shadow-md tracking-wide bg-pink-500/90 border border-white/20 backdrop-blur-sm flex items-center gap-1">
                    <span>{hint.from_avatar.split(' ')[0]}</span>
                    <span>{hint.from_avatar.split(' ').slice(1).join(' ')}</span>
                  </div>
                </div>
              )}

              {/* Top Close Button */}
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center active:scale-90 transition-transform"
                style={{ border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <X className="w-4 h-4 text-white" />
              </button>

              {/* Foreground Content */}
              <div className="relative z-10 flex flex-col h-full p-6 pointer-events-none">

                {/* Top Section: Hint speech bubble + venue details */}
                <div className="flex flex-col items-start mt-6">
                  <div
                    className="px-4 py-3 rounded-2xl rounded-tl-none text-base font-black border border-white/10 backdrop-blur-sm max-w-[85%] text-white"
                    style={{ background: 'linear-gradient(135deg, rgba(255,75,114,0.35), rgba(234,63,211,0.25))' }}
                  >
                    {hint.message}
                  </div>
                  <div className="flex items-center gap-1.5 mt-2 text-white/80 text-[11px] font-semibold pl-2">
                    <MapPin className="w-3.5 h-3.5" style={{ color: '#FF4B72' }} />
                    <span>{hint.venue_name}</span>
                    <span>·</span>
                    <span>{timeStr}</span>
                  </div>
                </div>

                {/* Bottom Section: Profile Details & Like Action */}
                <div className="mt-auto flex flex-col">
                  {/* Age */}
                  {hint.from_age && (
                    <h2 className="text-[30px] font-black text-white drop-shadow-md leading-none mb-3 tracking-wide">
                      {tr(`${hint.from_age} jaar`, `${hint.from_age} years`)}
                    </h2>
                  )}

                  {/* Traits */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {hint.from_traits?.length > 0 && hint.from_traits.slice(0, 3).map(trait => (
                      <span key={trait} className="px-3.5 py-1.5 rounded-full text-[13px] font-bold text-white bg-black/35 backdrop-blur-[2px] shadow-sm">
                        {trait}
                      </span>
                    ))}
                  </div>

                  {/* Like Button */}
                  <motion.button
                    onClick={handleHeartButton}
                    whileTap={reduceMotion ? undefined : { scale: 0.95 }}
                    className="pointer-events-auto w-full py-3.5 px-4 rounded-full border backdrop-blur-sm flex items-center justify-center gap-2.5 text-white font-bold text-[16px] transition-colors duration-300"
                    style={{
                      background: liked ? 'rgba(255,75,114,0.22)' : 'rgba(0,0,0,0.35)',
                      borderColor: liked ? 'rgba(255,75,114,0.6)' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    <motion.span
                      key={`b${pulse}`}
                      className="flex"
                      initial={{ scale: pulse ? (liked ? 0.3 : 0.8) : 1 }}
                      animate={{ scale: 1 }}
                      transition={heartSpring}
                    >
                      <Heart className="w-5 h-5" color={liked ? '#FF4B72' : 'white'} fill={liked ? '#FF4B72' : 'transparent'} strokeWidth={2.5} />
                    </motion.span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={liked ? 'on' : 'off'}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                      >
                        {liked ? tr('Geliked!', 'Liked!') : tr('Like bericht', 'Like message')}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  <p className="text-center text-[11px] font-semibold text-white/45 mt-2">
                    {tr('Dubbeltik om te liken', 'Double-tap to like')}
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        ),
      document.body)}
    </>
  );
}
