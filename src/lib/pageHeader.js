/**
 * Eén header-stijl voor Home, Matches en Account, passend bij de rest van de app:
 * glas zoals de navigatiebalk, met een zachte roze en magenta gloed vanuit de hoeken
 * en een dunne lijn onderaan in het Romety-verloop.
 */
export const headerGlassStyle = (isDark) => ({
  background: isDark
    ? 'radial-gradient(120% 160% at 0% 0%, rgba(255,75,114,0.22) 0%, transparent 55%), radial-gradient(120% 160% at 100% 0%, rgba(234,63,211,0.16) 0%, transparent 55%), rgba(13, 14, 21, 0.78)'
    : 'radial-gradient(120% 160% at 0% 0%, rgba(255,75,114,0.12) 0%, transparent 55%), radial-gradient(120% 160% at 100% 0%, rgba(234,63,211,0.09) 0%, transparent 55%), rgba(255, 255, 255, 0.82)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  // Dunne lijn onderaan in het Romety-verloop, die naar rechts vervaagt
  borderBottom: '1px solid transparent',
  borderImage: 'linear-gradient(90deg, rgba(255,75,114,0.55), rgba(234,63,211,0.35) 55%, transparent) 1',
});

export const headerTitleStyle = {
  background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  color: 'transparent',
};

/** Kleur boven de header (statusbalk en uittrekken bovenaan): gelijk aan de pagina */
export const pageTopColor = (isDark) => (isDark ? '#08090E' : '#F8F9FB');
