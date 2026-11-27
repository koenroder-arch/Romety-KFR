import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Zwevende navigatiebalk in "glas"-stijl (zoals YouTube/Instagram):
 * - een afgeronde balk die boven de inhoud zweeft, met een doorschijnend wazig vlak;
 * - een lichter vlak achter de actieve pagina dat soepel meeschuift;
 * - tikken op een icoon wisselt van pagina, en je kunt ook met je vinger over de balk
 *   naar links/rechts vegen: het vlak volgt je vinger en bij loslaten ga je naar die pagina.
 */
const PAD = 6; // binnenrand van de balk (px)
const DRAG_START_PX = 8; // pas na zoveel beweging telt het als vegen i.p.v. tikken

export default function BottomNav({ items, currentPageName, isDark, hasActiveVenue, unreadChatCount, lang, markAllRead }) {
  const navigate = useNavigate();
  const barRef = useRef(null);
  const dragRef = useRef({ active: false, startX: 0, moved: false, lastIndex: -1 });
  const suppressClickRef = useRef(false);
  const [dragPos, setDragPos] = useState(null); // positie (0..n-1) tijdens vegen

  const count = items.length;
  const activeIndex = Math.max(0, items.findIndex((it) => it.page === currentPageName));
  const hasActive = items.some((it) => it.page === currentPageName);
  const pos = dragPos ?? activeIndex;
  const highlighted = dragPos !== null ? Math.round(dragPos) : activeIndex;

  // Zelfde regels als voorheen bij een tik: navigatieblokkade, meldingen gelezen, trilling
  const beforeNavigate = (page) => {
    const targetUrl = createPageUrl(page);
    if (typeof window !== 'undefined' && window.__romety_nav_blocker) {
      if (window.__romety_nav_blocker(targetUrl)) return false;
    }
    if (page === 'Matches') markAllRead?.();
    if (navigator.vibrate) navigator.vibrate(40);
    return true;
  };

  const posFromX = (clientX) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return activeIndex;
    const itemW = (rect.width - PAD * 2) / count;
    const p = (clientX - rect.left - PAD) / itemW - 0.5;
    return Math.min(count - 1, Math.max(0, p));
  };

  const onPointerDown = (e) => {
    dragRef.current = { active: true, startX: e.clientX, moved: false, lastIndex: activeIndex };
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d.active) return;
    if (!d.moved) {
      if (Math.abs(e.clientX - d.startX) < DRAG_START_PX) return;
      d.moved = true;
      try { barRef.current?.setPointerCapture?.(e.pointerId); } catch (err) { /* niet erg */ }
    }
    const p = posFromX(e.clientX);
    const idx = Math.round(p);
    if (idx !== d.lastIndex) {
      d.lastIndex = idx;
      if (navigator.vibrate) navigator.vibrate(8);
    }
    setDragPos(p);
  };

  const endDrag = (e, cancelled = false) => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;
    if (!d.moved) return; // gewone tik: de link doet het werk
    suppressClickRef.current = true; // de klik na het vegen niet nog eens laten tellen
    setTimeout(() => { suppressClickRef.current = false; }, 350);
    const target = cancelled ? activeIndex : Math.round(posFromX(e.clientX));
    setDragPos(null);
    const page = items[target]?.page;
    if (!page || target === activeIndex) return;
    if (beforeNavigate(page)) navigate(createPageUrl(page));
  };

  const pillBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.06)';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.62)' : '#7A7A85';

  return (
    <nav
      className="romety-bottom-nav fixed left-1/2 w-full max-w-md z-[200] px-4 pointer-events-none"
      style={{
        bottom: 'max(10px, calc(env(safe-area-inset-bottom, 0px) - 6px))',
        transform: 'translateX(-50%) translateZ(0)',
      }}
    >
      <div
        ref={barRef}
        className="relative flex items-center rounded-full pointer-events-auto select-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e)}
        onPointerCancel={(e) => endDrag(e, true)}
        style={{
          padding: PAD,
          height: 62,
          background: isDark ? 'rgba(22, 22, 32, 0.55)' : 'rgba(255, 255, 255, 0.62)',
          border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.7)',
          boxShadow: isDark
            ? '0 10px 30px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 10px 30px rgba(17,24,39,0.14), inset 0 1px 0 rgba(255,255,255,0.8)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          touchAction: 'none',
        }}
      >
        {/* Lichter vlak achter de actieve pagina; schuift mee (en volgt je vinger bij vegen) */}
        {hasActive && (
          <div
            aria-hidden
            className="absolute rounded-full pointer-events-none"
            style={{
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: `calc((100% - ${PAD * 2}px) / ${count})`,
              transform: `translateX(${pos * 100}%)`,
              transition: dragPos !== null ? 'none' : 'transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1)',
              background: pillBg,
              boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.12)' : 'inset 0 1px 0 rgba(255,255,255,0.9)',
            }}
          />
        )}

        {items.map(({ name, icon: Icon, page }, idx) => {
          const isActive = hasActive && idx === highlighted;
          const targetUrl = createPageUrl(page);
          return (
            <Link
              key={page}
              to={targetUrl}
              aria-label={name}
              draggable={false}
              onClick={(e) => {
                if (suppressClickRef.current) { e.preventDefault(); return; }
                if (!beforeNavigate(page)) e.preventDefault();
              }}
              className="relative z-10 flex-1 h-full flex items-center justify-center rounded-full active:scale-90 transition-transform duration-200"
            >
              <div className="relative">
                <Icon
                  className="w-6 h-6 transition-colors duration-200"
                  style={isActive
                    ? { color: '#FF4B72', filter: 'drop-shadow(0 0 8px rgba(255,75,114,0.6))' }
                    : { color: inactiveColor }}
                />
                {page === 'Matches' && hasActiveVenue && (
                  <span
                    className="absolute top-0 right-0 w-2 h-2 rounded-full"
                    style={{
                      // Goud bolletje: je gaat naar een locatie waar matches zijn
                      background: 'linear-gradient(135deg, #FFE08A 0%, #F2B01E 100%)',
                      boxShadow: `0 0 0 1.5px ${isDark ? '#1A1A26' : '#FFFFFF'}, 0 0 6px rgba(242,176,30,0.7)`,
                    }}
                    aria-label={lang === 'en' ? 'Venue active' : 'Venue actief'}
                  />
                )}
                {page === 'Chat' && unreadChatCount > 0 && (
                  <div className="absolute -top-1 -right-1 min-w-[16px] h-[16px] rounded-full bg-pink-500 text-white text-[9px] font-black flex items-center justify-center px-0.5" style={{ boxShadow: '0 2px 6px rgba(236,72,153,0.5)' }}>
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
