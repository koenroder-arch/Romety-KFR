import React, { useState } from 'react';
import { Pencil, X, Navigation, Martini, Music, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTheme } from '@/lib/ThemeContext';

export default function VenueBanner({ checkIn, onRemoved }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const [showMenu, setShowMenu] = useState(false);

  if (!checkIn) return null;

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

  return (
    <div
      className="mx-5 mt-4 mb-2 rounded-[22px] px-5 py-4 flex items-center justify-between relative z-30 border border-l-[4px] border-l-[#10B981] shadow-lg"
      style={{
        background: isDark ? 'rgba(20,21,33,0.95)' : 'rgba(255,255,255,1)',
        borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.15)',
        boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.25)' : '0 8px 32px rgba(0,0,0,0.06)',
      }}
    >
      {/* Background overlapping icons */}
      <div className="absolute right-16 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none flex items-center gap-1 z-0 select-none">
        <Martini className={`w-12 h-12 ${isDark ? 'text-white' : 'text-gray-400'}`} />
        <Music className={`w-9 h-9 -mt-4 ${isDark ? 'text-white' : 'text-gray-400'}`} />
      </div>

      <div className="flex items-center gap-3.5 z-10 flex-1 min-w-0">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
          <Navigation className="w-4 h-4 text-[#10B981] rotate-45 fill-[#10B981]/10" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold tracking-widest text-[#10B981] uppercase">ACTIVE VENUE</p>
          <p className={`text-base font-extrabold truncate mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{checkIn.venue_name}</p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-550'}`}>{checkIn.venue_city || 'Utrecht, NL'}</p>
        </div>
      </div>

      {/* Menu / Actions */}
      <div className="relative z-10 flex-shrink-0">
        <button 
          onClick={() => setShowMenu(!showMenu)} 
          className={`w-9 h-9 rounded-xl border flex items-center justify-center active:scale-95 transition-all ${isDark ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-black/5 border-black/10 text-gray-500 hover:text-gray-900 hover:bg-black/10'}`}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        
        {showMenu && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
            <div 
              className={`absolute right-0 top-11 w-44 rounded-2xl border shadow-2xl z-30 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-100 ${isDark ? 'border-white/10' : 'border-black/5'}`}
              style={{ background: isDark ? '#141521' : '#FFFFFF', backdropFilter: 'blur(20px)' }}
            >
              <Link 
                to="/Pinpoint" 
                onClick={() => setShowMenu(false)} 
                className={`flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors ${isDark ? 'text-gray-200 hover:bg-white/5' : 'text-gray-700 hover:bg-black/5'}`}
              >
                <Pencil className={`w-3.5 h-3.5 ${isDark ? 'text-gray-400' : 'text-gray-550'}`} />
                <span>Wijzig venue</span>
              </Link>
              <div className={`h-px mx-3 ${isDark ? 'bg-white/5' : 'bg-black/5'}`} />
              <button 
                onClick={() => { handleRemove(); setShowMenu(false); }} 
                className={`w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors text-red-600 dark:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/20`}
              >
                <X className="w-3.5 h-3.5 text-red-600 dark:text-red-500" />
                <span className="text-red-600 dark:text-red-500">Verwijder venue</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}