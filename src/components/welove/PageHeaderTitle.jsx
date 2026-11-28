import React from 'react';

/**
 * Titel in de header van Home, Matches en Account: witte (of in licht thema zwarte) titel,
 * met optioneel een korte regel eronder. `center` zet de titel in het midden (Home, Account).
 */
export default function PageHeaderTitle({ title, subtitle, isDark, center = false }) {
  return (
    <div className={`min-w-0 ${center ? 'text-center' : ''}`}>
      <h1
        className="font-black text-lg tracking-tight leading-tight truncate"
        style={{ color: isDark ? '#FFFFFF' : '#111827' }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className="text-[11px] font-semibold mt-0.5 truncate"
          style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(17,24,39,0.55)' }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
