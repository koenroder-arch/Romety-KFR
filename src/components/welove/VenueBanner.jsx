import React, { useState } from 'react';
import { Pencil, X, MapPin } from 'lucide-react';
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
          title="Kies locatie"
          className="relative flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-95 shadow-sm"
          style={{
            background: isDark ? 'rgba(255,255,255,0.12)' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(0,0,0,0.10)'
          }}
        >
          <MapPin className={`w-4 h-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`} />
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-40 inline-block">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        title={checkIn.venue_name}
        className="relative flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-95 shadow-sm"
        style={{
          background: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)',
          border: isDark ? '1.5px solid rgba(16,185,129,0.45)' : '1.5px solid rgba(16,185,129,0.35)'
        }}
      >
        <MapPin className="w-4 h-4 text-[#10B981]" />
        {/* Active green indicator badge */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white dark:border-[#141521]" />
      </button>

      {/* Menu / Actions */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
          <div 
            className={`absolute right-0 top-11 w-52 rounded-2xl border shadow-2xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 ${isDark ? 'border-white/10' : 'border-black/5'}`}
            style={{ background: isDark ? '#141521' : '#FFFFFF', backdropFilter: 'blur(20px)' }}
          >
            <div className="px-4 py-2.5 border-b border-black/5 dark:border-white/5">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Actieve locatie</p>
              <p className="text-xs font-bold truncate text-gray-900 dark:text-white mt-0.5">{checkIn.venue_name}</p>
            </div>
            <Link 
              to="/Pinpoint" 
              onClick={() => setShowMenu(false)} 
              className={`flex items-center gap-2.5 px-4 py-3 text-xs font-semibold transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-black/5'}`}
            >
              <Pencil className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
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