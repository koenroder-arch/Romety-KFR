import { useEffect } from 'react';

/**
 * Zet de pagina op de achtergrond vast zolang `locked` waar is (bijv. als er een sheet of
 * popup open staat). Scrollen binnen de sheet zelf blijft gewoon werken.
 *
 * Alleen `overflow: hidden` is op de iPhone niet genoeg; daarom zetten we de body vast op de
 * huidige scrollpositie en zetten we die bij het sluiten precies terug.
 */
let lockCount = 0;
let savedScrollY = 0;
let savedStyles = null;

function lock() {
  if (lockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    const { body, documentElement: html } = document;
    savedStyles = {
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
  }
  lockCount += 1;
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0 && savedStyles) {
    const { body, documentElement: html } = document;
    body.style.position = savedStyles.bodyPosition;
    body.style.top = savedStyles.bodyTop;
    body.style.width = savedStyles.bodyWidth;
    body.style.overflow = savedStyles.bodyOverflow;
    html.style.overflow = savedStyles.htmlOverflow;
    html.style.overscrollBehavior = savedStyles.htmlOverscroll;
    savedStyles = null;
    window.scrollTo(0, savedScrollY);
  }
}

export function useLockBodyScroll(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    lock();
    return unlock;
  }, [locked]);
}
