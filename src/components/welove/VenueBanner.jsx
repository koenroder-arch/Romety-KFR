import React, { useState } from 'react';
import { Pencil, X, MapPin, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';

export default function VenueBanner({ checkIn, onRemoved }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [showMenu, setShowMenu] = useState(false);

  const handleRemove = async () => {
    try {
      if (checkIn.status !== undefined) {
        // UserDestination
        await base44.entities.UserDestination.update(checkIn.id, { status: 'expired' });
      } else {
        // VenueCheckIn
        await base44.entities.VenueCheckIn.delete(checkIn.id);
      }
    } catch (e) {
      // ignore
    }
    onRemoved();
  };

  if (!checkIn) {
    return (
      <div className="relative z-40 inline-block">
        <Link 
          to="/Pinpoint"
          className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 shadow-sm"
          style={{
            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
          }}
        >
          <MapPin className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          <span className={`text-xs font-bold tracking-wide ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            Kies locatie
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-40 inline-block">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 rounded-full border transition-all active:scale-95 shadow-sm"
        style={{
          background: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.05)',
          borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'
        }}
      >
        <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
        <span className={`text-xs font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>
          {checkIn.venue_name}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${showMenu ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>

      {/* Menu / Actions */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
          <div 
            className={`absolute top-11 w-48 rounded-2xl border shadow-2xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 ${isDark ? 'border-white/10' : 'border-black/5'}`}
            style={{ background: isDark ? '#141521' : '#FFFFFF', backdropFilter: 'blur(20px)' }}
          >
            <Link 
              to="/Pinpoint" 
              onClick={() => setShowMenu(false)} 
              className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-black/5'}`}
            >
              <Pencil className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-550'}`} />
              <span>Wijzig venue</span>
            </Link>
            <div className={`h-px mx-3 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
            <button 
              onClick={() => { handleRemove(); setShowMenu(false); }} 
              className={`w-full text-left flex items-center gap-2.5 px-4 py-3 text-xs font-semibold transition-colors text-red-600 dark:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/20`}
            >
              <X className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
              <span className="text-red-600 dark:text-red-500">Verwijder venue</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}