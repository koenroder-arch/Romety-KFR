import React, { useId } from 'react';
import { useTheme } from '@/lib/ThemeContext';

// De R uit het app-icoon (vector), met de stam-basislijn op y=196
const R_PATH = 'M-0.5 1.0L1.0 0.1L5.0 0.1L89.0 0.1L100.0 0.8L110.0 2.5L124.0 6.7L139.0 14.6L150.0 24.3L156.4 33.0L162.2 45.0L164.3 52.0L166.2 63.0L166.4 76.0L164.4 89.0L159.5 102.0L152.4 113.0L142.0 123.3L136.0 127.4L129.2 131.0L128.8 132.0L188.3 232.0L191.5 238.0L191.0 238.8L144.0 238.9L86.0 142.4L85.0 141.3L81.0 141.1L66.0 141.1L59.0 141.8L51.0 145.0L46.9 149.0L44.9 153.0L44.0 158.0L43.8 194.0L43.0 195.7L2.0 195.7L-0.2 195.0L-0.2 173.0L0.8 163.0L2.8 153.0L5.8 144.0L9.0 137.0L14.7 128.0L19.6 122.0L24.0 117.7L31.0 112.7L39.0 108.5L46.0 105.8L55.0 103.8L60.0 103.3L91.0 102.6L97.0 101.4L105.0 98.4L112.5 93.0L117.0 87.0L120.2 79.0L121.2 69.0L120.2 61.0L116.3 52.0L111.0 45.7L103.0 40.9L97.0 38.8L87.0 37.1L45.0 36.9L44.0 38.0L43.8 83.0L30.0 87.9L22.0 91.9L14.0 96.8L0.0 108.2L-0.5 103.0Z';

// De staart: volgt het been van de R en loopt in één beweging spits uit onder het woord
// Ruimere, geleidelijke bocht naar rechts (de raaklijnen lopen overal vloeiend door)
const SWASH_PATH = 'M188.3 232C210 268 262 288 360 290C480 292 600 276 712 230C600 290 470 314 352 313C250 312 176 290 144 238.9Z';

// Verloop van oranje (de R uit het app-icoon, #FF765A) via fuchsia (Hints-knop, #F445A3)
// naar magenta (VIP-knop, #EA3FD3). Lichte modus iets dieper, zodat het op wit goed leesbaar blijft.
const STOPS = {
  dark: ['#FF765A', '#F445A3', '#EA3FD3'],
  light: ['#F2603F', '#D83A93', '#C232BE'],
};

/**
 * Het Romety-logo: de R uit het app-icoon, verbonden met "omety" door een vloeiende staart.
 * Past zich automatisch aan de licht/donker-modus aan, tenzij `mode` wordt meegegeven.
 * Grootte via className (bijvoorbeeld "h-12 w-auto").
 */
export default function RometyLogo({ className = 'h-12 w-auto', mode, title = 'Romety' }) {
  const { theme } = useTheme();
  const variant = mode || (theme === 'light' ? 'light' : 'dark');
  const [c1, c2, c3] = STOPS[variant];
  const gradId = `romety-logo-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  return (
    <svg
      viewBox="-6 -6 742 328"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="700" y2="300">
          <stop offset="0" stopColor={c1} />
          <stop offset="0.5" stopColor={c2} />
          <stop offset="1" stopColor={c3} />
        </linearGradient>
      </defs>
      <g fill={`url(#${gradId})`}>
        <path d={R_PATH} />
        <path d={SWASH_PATH} />
        <text
          x="178"
          y="196"
          fontFamily="Nunito, 'Arial Rounded MT Bold', 'Helvetica Rounded', Arial, sans-serif"
          fontWeight="800"
          fontSize="190"
          letterSpacing="-6"
        >
          omety
        </text>
      </g>
    </svg>
  );
}
