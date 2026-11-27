import React from 'react';
import { ChevronRight } from 'lucide-react';

// Het Romety-kleurverloop (roze naar magenta), zelfde als logo en knoppen
const BRAND_FROM = '#FF4B72';
const BRAND_TO = '#EA3FD3';

/**
 * Knop/kaart op de Home-pagina in dezelfde stijl als de "Beste locaties vanavond"-kaartjes:
 * egaal vlak, dunne rand met het Romety-verloop, zachte gloed in de hoek, icoon in een
 * vakje met het verloop, eventueel een getal, en een vaag groot icoon als watermerk.
 * Alle kaarten delen hetzelfde verloop; het icoon maakt het verschil.
 */
export default function HomeActionCard({
  onClick,
  icon: Icon,
  label,
  title,
  from = BRAND_FROM,
  to = BRAND_TO,
  iconColor = BRAND_FROM, // kleur van het icoon en het vakje eromheen
  badge = null,
  isDark,
  goldRing = false,
  className = '',
}) {
  const surface = isDark ? '#15151F' : '#FFFFFF';
  // Kader in de kleur van het icoon (fel linksboven, zachter naar rechtsonder)
  const border = isDark
    ? `linear-gradient(135deg, ${iconColor}D9 0%, ${iconColor}4D 100%)`
    : `linear-gradient(135deg, ${iconColor}A6 0%, ${iconColor}33 100%)`;

  return (
    <button
      onClick={onClick}
      className={`relative z-30 rounded-[22px] p-[1.5px] text-left transition-transform active:scale-[0.97] duration-200 ${className}`}
      style={{
        background: border,
        boxShadow: isDark ? `0 8px 24px rgba(0,0,0,0.35), 0 4px 18px ${iconColor}1F` : `0 6px 18px ${iconColor}24`,
      }}
    >
      {/* Lichtgoud randje dat rond de kaart draait (VIP) */}
      {goldRing && (
        <div className="gold-ring rounded-[22px]" style={{ zIndex: 2 }}>
          <div className="gold-ring__spin" />
        </div>
      )}

      <div
        className="home-card relative h-full min-h-[139px] rounded-[20.5px] p-4 flex flex-col justify-between overflow-hidden"
        style={{ background: surface }}
      >
        {/* Zachte gloed in de hoek */}
        <div
          aria-hidden
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${to}${isDark ? '33' : '1F'} 0%, transparent 70%)`, zIndex: -1 }}
        />

        <div className="flex items-center justify-between w-full">
          {/* Icoon in een licht getint vakje, in de eigen kleur van de knop */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}${isDark ? '2E' : '1A'}` }}
          >
            <Icon className="w-6 h-6" style={{ color: iconColor }} />
          </div>
          <div className="flex items-center gap-1.5">
            {badge != null && (
              <div
                className="min-w-[26px] h-[26px] px-2 rounded-full text-[11.5px] font-black flex items-center justify-center"
                style={{
                  background: iconColor,
                  color: '#FFFFFF',
                  // Hele melding in de kleur van het kader van de knop
                  border: `1.5px solid ${iconColor}`,
                  boxShadow: `0 3px 10px ${iconColor}59`,
                }}
              >
                {badge}
              </div>
            )}
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'rgba(255,255,255,0.7)' : '#4B5563',
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Titel met daaronder een korte uitleg (label) */}
        <div className="mt-4 min-w-0">
          <p className={`text-[16px] font-black leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {title}
          </p>
          <p
            className="text-[11.5px] font-semibold leading-snug truncate mt-1"
            style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(17,24,39,0.5)' }}
          >
            {label}
          </p>
        </div>

        {/* Watermerk */}
        <Icon aria-hidden="true" className="home-card__mark" style={{ color: to }} />
      </div>
    </button>
  );
}
