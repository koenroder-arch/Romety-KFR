import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, Crosshair, Search, Globe, Check as CheckIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_COUNTRY } from '@/lib/countries';
import { trNow } from '@/lib/LanguageContext';

const GRAD = 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)';

export default function LocationFilterModal({
  isOpen,
  onClose,
  isDark = true,
  useNearbyFilter = false,
  activeLocationLabel = null,
  isGpsActive = false,
  onSelectGps,
  onSelectCity,
  onClearFilter,
  userCountry = null,
}) {
  const [cityQuery, setCityQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setCityQuery('');
      setSuggestions([]);
      setLoading(false);
      setSearchFocused(false);
    }
  }, [isOpen]);

  const handleSearchCity = (q) => {
    setCityQuery(q);
    clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const countryCode = userCountry?.code || DEFAULT_COUNTRY.code;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q.trim()
          )}&countrycodes=${countryCode}&limit=1&addressdetails=1`,
          { headers: { 'Accept-Language': 'nl' } }
        );
        const data = await res.json();
        const results = Array.isArray(data)
          ? data.slice(0, 1).map((item) => {
              const roadPart = item.display_name.split(',').slice(1, 3).join(',').trim();
              const cityPart =
                item.address?.city ||
                item.address?.town ||
                item.address?.village ||
                item.address?.municipality ||
                '';
              let sublabel = roadPart;
              if (cityPart && !roadPart.toLowerCase().includes(cityPart.toLowerCase())) {
                sublabel = `${roadPart}, ${cityPart}`;
              }
              return {
                id: item.place_id,
                label: item.display_name.split(',')[0],
                sublabel,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
              };
            })
          : [];
        setSuggestions(results);
      } catch (e) {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const safeDismissModal = () => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    onClose();
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 50);
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 200);
      setTimeout(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }, 400);
    }
  };

  const handleCitySelect = (s) => {
    if (document.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    onSelectCity(s);
    safeDismissModal();
  };

  const bgModal = isDark ? '#12121B' : '#FFFFFF';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const subColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(17,24,39,0.5)';
  const sectionColor = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(17,24,39,0.45)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : '#F7F7FA';
  const rowBorder = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.05)';
  const divider = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const countryName = userCountry?.name || DEFAULT_COUNTRY?.name || 'Nederland';
  const activeCity = useNearbyFilter && !isGpsActive ? activeLocationLabel : null;

  // Vinkje rechts in een optie
  const Check = ({ on }) => (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
      style={on
        ? { background: GRAD, boxShadow: '0 3px 10px rgba(255,75,114,0.4)' }
        : { border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}` }}
    >
      {on && <CheckIcon className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[2500] flex items-start justify-center p-4 sm:p-6 overflow-y-auto"
          style={{ paddingTop: 'max(16px, env(safe-area-inset-top, 16px))' }}
        >
          {/* Backdrop */}
          <motion.div
            key="location-filter-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={safeDismissModal}
            className="fixed inset-0 bg-black/60"
            style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          />

          {/* Dialog Container */}
          <motion.div
            key="location-filter-modal-dialog"
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-[28px] p-5 sm:p-6 overflow-visible z-10 mt-2 sm:mt-4"
            style={{
              background: bgModal,
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 30px 70px rgba(0,0,0,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Kop */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className={`font-black text-[20px] leading-tight ${textMain}`}>{trNow('Locatie', 'Location')}</h3>
                <p className="text-[12.5px] font-medium mt-1" style={{ color: subColor }}>
                  {trNow('Kies waar je hotspots en matches wilt zien', 'Choose where to see hotspots and matches')}
                </p>
              </div>
              <button
                onClick={safeDismissModal}
                aria-label={trNow('Sluiten', 'Close')}
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 cursor-pointer"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
              >
                <X className="w-4 h-4" style={{ color: subColor }} />
              </button>
            </div>

            {/* Snelle keuzes */}
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] mb-2 px-1" style={{ color: sectionColor }}>
              {trNow('Snel kiezen', 'Quick pick')}
            </p>
            <div className="rounded-[20px] overflow-hidden mb-5" style={{ background: rowBg, border: rowBorder }}>
              {/* Huidige locatie (GPS) */}
              <button
                type="button"
                onClick={() => { onSelectGps(); safeDismissModal(); }}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors active:bg-pink-500/10 cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: GRAD }}>
                  <Crosshair className="w-[18px] h-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[14.5px] font-bold truncate ${textMain}`}>{trNow('Mijn huidige locatie', 'My current location')}</p>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: subColor }}>
                    {isGpsActive && activeLocationLabel ? activeLocationLabel : trNow('Gebruik je live GPS-positie', 'Use your live GPS position')}
                  </p>
                </div>
                <Check on={isGpsActive} />
              </button>

              <div className="h-px mx-4" style={{ background: divider }} />

              {/* Geen filter: heel het land */}
              <button
                type="button"
                onClick={() => { if (useNearbyFilter) onClearFilter(); safeDismissModal(); }}
                className="w-full px-4 py-3.5 flex items-center gap-3 text-left transition-colors active:bg-pink-500/10 cursor-pointer"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                  <Globe className="w-[18px] h-[18px]" style={{ color: '#FF4B72' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[14.5px] font-bold truncate ${textMain}`}>{trNow(`Heel ${countryName}`, `All of ${countryName}`)}</p>
                  <p className="text-[12px] truncate mt-0.5" style={{ color: subColor }}>{trNow('Geen filter, toon alles', 'No filter, show everything')}</p>
                </div>
                <Check on={!useNearbyFilter} />
              </button>
            </div>

            {/* Een stad of plaats zoeken */}
            <p className="text-[10.5px] font-black uppercase tracking-[0.14em] mb-2 px-1" style={{ color: sectionColor }}>
              {trNow('Andere plaats', 'Other place')}
            </p>
            <div className="rounded-[20px] overflow-hidden" style={{ background: rowBg, border: rowBorder }}>
              <div
                className="flex items-center gap-3 px-4 transition-colors"
                style={{ height: 50, boxShadow: searchFocused ? 'inset 0 0 0 1.5px rgba(255,75,114,0.55)' : 'none', borderRadius: 20 }}
              >
                <Search className="w-[18px] h-[18px] flex-shrink-0" style={{ color: '#FF4B72' }} />
                <input
                  // Geen automatische suggesties (zoals een locatie/adres) boven het toetsenbord
                  type="search"
                  name="romety-city-search"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  data-form-type="other"
                  value={cityQuery}
                  onChange={(e) => handleSearchCity(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder={trNow('Zoek een stad of plaats', 'Search a city or place')}
                  className={`flex-1 bg-transparent focus:outline-none ${textMain} placeholder-gray-400`}
                  style={{ fontSize: '16px' }}
                />
                {loading && <div className="w-4 h-4 rounded-full border-2 border-pink-500/30 border-t-pink-500 animate-spin flex-shrink-0" />}
                {!loading && cityQuery.length > 0 && (
                  <button
                    onClick={() => { setCityQuery(''); setSuggestions([]); }}
                    aria-label={trNow('Wissen', 'Clear')}
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <X className="w-3 h-3" style={{ color: subColor }} />
                  </button>
                )}
              </div>

              {/* Gekozen stad (als die actief is en je niet aan het zoeken bent) */}
              {activeCity && cityQuery.length === 0 && (
                <>
                  <div className="h-px mx-4" style={{ background: divider }} />
                  <div className="w-full px-4 py-3.5 flex items-center gap-3">
                    <MapPin className="w-[18px] h-[18px] text-pink-500 flex-shrink-0" />
                    <p className={`flex-1 min-w-0 text-[14.5px] font-bold truncate ${textMain}`}>{activeCity}</p>
                    <Check on />
                  </div>
                </>
              )}

              {/* Zoekresultaten */}
              {cityQuery.length > 0 && suggestions.slice(0, 3).map((sug, idx) => (
                <React.Fragment key={sug.id || idx}>
                  <div className="h-px mx-4" style={{ background: divider }} />
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCitySelect(sug);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleCitySelect(sug);
                    }}
                    className="w-full px-4 py-3.5 text-left flex items-center gap-3 active:bg-pink-500/10 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-[18px] h-[18px] text-pink-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14.5px] font-bold truncate ${textMain}`}>{sug.label}</p>
                      {sug.sublabel && <p className="text-[12px] truncate mt-0.5" style={{ color: subColor }}>{sug.sublabel}</p>}
                    </div>
                  </button>
                </React.Fragment>
              ))}

              {cityQuery.trim().length >= 2 && !loading && suggestions.length === 0 && (
                <>
                  <div className="h-px mx-4" style={{ background: divider }} />
                  <p className="px-4 py-3.5 text-[12.5px]" style={{ color: subColor }}>{trNow('Geen plaats gevonden', 'No place found')}</p>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


