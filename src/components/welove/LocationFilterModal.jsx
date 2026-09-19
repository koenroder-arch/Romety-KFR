import React, { useState, useRef, useEffect } from 'react';
import { X, MapPin, Crosshair, Search, Check, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DEFAULT_COUNTRY } from '@/lib/countries';

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

  const bgModal = isDark ? '#11131F' : '#FFFFFF';
  const borderModal = isDark ? '1.5px solid rgba(255,255,255,0.14)' : '1.5px solid rgba(0,0,0,0.10)';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const searchBarBg = isDark ? 'rgba(13,14,21,0.88)' : 'rgba(255,255,255,0.92)';
  const searchBarBorder = (focused) => focused
    ? 'rgba(255, 75, 114, 0.55)'
    : isDark ? 'rgba(255, 75, 114, 0.28)' : 'rgba(255, 75, 114, 0.20)';
  const dropdownBg = isDark ? '#181A29' : '#FFFFFF';
  const dropdownBorder = isDark ? '1.5px solid rgba(255,255,255,0.2)' : '1.5px solid rgba(0,0,0,0.14)';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2500] flex items-center justify-center p-4 sm:p-6">
          {/* Lightweight Backdrop */}
          <motion.div
            key="location-filter-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60"
          />

          {/* Dialog Container */}
          <motion.div
            key="location-filter-modal-dialog"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-[32px] p-6 sm:p-7 shadow-2xl overflow-visible z-10"
            style={{
              background: bgModal,
              border: borderModal,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl flex items-center justify-center shadow-md" style={{ background: GRAD }}>
                  <MapPin className="w-4.5 h-4.5 text-white" />
                </div>
                <h3 className={`font-black text-lg leading-tight ${textMain}`}>Locatiefilter</h3>
              </div>
              <button
                onClick={onClose}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                  isDark ? 'bg-white/10 text-white/70 hover:bg-white/15' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Active Filter Indicator */}
            {useNearbyFilter && (
              <div
                className="mb-3.5 p-3 px-3.5 rounded-[20px] flex items-center justify-between gap-2.5 shadow-sm"
                style={{
                  background: isDark ? 'rgba(255, 75, 114, 0.12)' : 'rgba(255, 75, 114, 0.08)',
                  border: '1.5px solid rgba(255, 75, 114, 0.45)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse flex-shrink-0" />
                  <p className={`text-xs sm:text-sm font-bold truncate ${textMain}`}>
                    Actief: <span className="text-pink-500 font-extrabold">{activeLocationLabel || 'Gekozen stad'}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClearFilter();
                    onClose();
                  }}
                  className="text-xs font-bold text-pink-500 hover:underline px-2.5 py-1 rounded-xl flex items-center gap-1 flex-shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" /> Wis
                </button>
              </div>
            )}

            {/* GPS Button (Same gradient & style as venue CTA button) */}
            <button
              onClick={() => {
                onClose();
                onSelectGps();
              }}
              className="w-full rounded-[20px] p-3.5 sm:p-4 flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer text-white"
              style={{
                background: GRAD,
                boxShadow: isGpsActive
                  ? '0 8px 26px rgba(255, 75, 114, 0.5), 0 0 0 2px rgba(255,255,255,0.45)'
                  : '0 8px 24px rgba(255, 75, 114, 0.35)',
                border: 'none',
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-md shadow-sm"
                >
                  <Crosshair className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-black truncate text-white">Filter op huidige locatie</span>
              </div>
              {isGpsActive ? (
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Check className="w-3.5 h-3.5 text-pink-600 font-black" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Crosshair className="w-3.5 h-3.5 text-white/80" />
                </div>
              )}
            </button>

            {/* "of" Divider */}
            <div className="flex items-center gap-3 my-3.5 px-1 select-none">
              <div
                className="flex-1 h-[1px]"
                style={{
                  background: isDark
                    ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14))'
                    : 'linear-gradient(90deg, transparent, rgba(0,0,0,0.10))',
                }}
              />
              <span
                className="text-xs font-medium tracking-wide lowercase"
                style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)' }}
              >
                of
              </span>
              <div
                className="flex-1 h-[1px]"
                style={{
                  background: isDark
                    ? 'linear-gradient(90deg, rgba(255,255,255,0.14), transparent)'
                    : 'linear-gradient(90deg, rgba(0,0,0,0.10), transparent)',
                }}
              />
            </div>

            {/* Search Input Container with Overlapping Suggestions */}
            <div className="relative mb-3.5 z-40">
              <div
                className="flex items-center gap-3 px-4 rounded-[20px] transition-all duration-200"
                style={{
                  height: 52,
                  background: searchBarBg,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1.5px solid ${searchBarBorder(searchFocused)}`,
                  boxShadow: searchFocused
                    ? '0 4px 18px rgba(255,75,114,0.18)'
                    : isDark ? '0 4px 20px rgba(0,0,0,0.35)' : '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-pink-400 border-t-pink-600 animate-spin flex-shrink-0" />
                ) : (
                  <Search className="w-5 h-5 flex-shrink-0" style={{ color: '#FF4B72' }} />
                )}
                <input
                  value={cityQuery}
                  onChange={(e) => handleSearchCity(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Typ bijvoorbeeld Amsterdam..."
                  className={`flex-1 bg-transparent text-sm sm:text-base focus:outline-none ${textMain} placeholder-gray-400`}
                />
                {cityQuery.length > 0 && (
                  <button
                    onClick={() => { setCityQuery(''); setSuggestions([]); }}
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer"
                    style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
                  >
                    <X className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>

              {/* Overlapping Suggestions Dropdown (Max 1 result) */}
              {suggestions.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-2 rounded-[22px] shadow-2xl z-[100] overflow-hidden"
                  style={{
                    background: dropdownBg,
                    border: dropdownBorder,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                  }}
                >
                  {suggestions.slice(0, 1).map((s, idx) => (
                    <button
                      key={s.id || idx}
                      onClick={() => {
                        onSelectCity(s);
                        onClose();
                      }}
                      className="w-full px-4 py-3.5 text-left flex items-center gap-3 hover:bg-pink-500/15 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4.5 h-4.5 text-pink-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-bold truncate ${textMain}`}>{s.label}</p>
                        {s.sublabel && <p className="text-xs text-gray-400 truncate mt-0.5">{s.sublabel}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clear Filter Button */}
            {useNearbyFilter && (
              <button
                onClick={() => {
                  onClearFilter();
                  onClose();
                }}
                className="w-full py-3 rounded-[20px] text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                style={{
                  background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
                  color: '#EF4444',
                  border: isDark ? '1.5px solid rgba(239, 68, 68, 0.35)' : '1.5px solid rgba(239, 68, 68, 0.25)',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Filter wissen</span>
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


