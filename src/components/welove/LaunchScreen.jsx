import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Precies de achtergrondkleur van het app-icoon, zodat de rand van het icoon onzichtbaar is
export const LAUNCH_BG = '#080A09';

/**
 * Opstartscherm: de R in het midden met een laadrad eronder.
 * Wordt gebruikt bij het openen van de app én zolang de inlogcontrole loopt,
 * zodat het voelt als één doorlopend scherm.
 *
 * - animateIn: de R komt zacht tevoorschijn (alleen bij het allereerste scherm)
 * - fadingOut: het hele scherm vervaagt voordat de app verschijnt
 */
export default function LaunchScreen({ animateIn = false, fadingOut = false, onClick }) {
  const reduceMotion = useReducedMotion();
  const enter = animateIn && !reduceMotion;

  return (
    <div
      onClick={onClick}
      className="fixed inset-0 w-full h-[100dvh] flex items-center justify-center select-none"
      style={{
        zIndex: 2147483647,
        background: LAUNCH_BG,
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 280ms ease-out',
        pointerEvents: fadingOut ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Romety wordt geladen</span>
      <div className="flex flex-col items-center">
        {/* De R, met een zachte gloed die rustig ademt */}
        <motion.div
          className="relative"
          initial={enter ? { opacity: 0, scale: 0.9 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {!reduceMotion && (
            <motion.div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(255,75,114,0.28) 0%, rgba(234,63,211,0.12) 35%, transparent 65%)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.6, ease: 'easeInOut', repeat: Infinity, delay: enter ? 0.4 : 0 }}
            />
          )}
          <img
            src="/icon-512.png"
            alt=""
            width={176}
            height={176}
            className="relative w-44 h-44 object-contain"
            draggable={false}
          />
        </motion.div>

        {/* Laadrad onder de R (verschijnt kort na de R, zodat een snelle start rustig blijft) */}
        <motion.div
          className="-mt-7"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: enter ? 0.45 : 0.15 }}
        >
          <div
            // Het laadrad draait altijd, ook als animaties beperkt zijn: anders zie je niet dat de app bezig is
            className="w-7 h-7 rounded-full animate-spin"
            style={{
              background: 'conic-gradient(from 0deg, rgba(255,75,114,0) 0deg, #FF4B72 200deg, #EA3FD3 360deg)',
              WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
              mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
              animationDuration: '0.9s',
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
