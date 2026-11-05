import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, X } from 'lucide-react';
import { toast } from 'sonner';
import { trNow } from '@/lib/LanguageContext';
import { fetchBlockedUsers, unblockUser } from '@/lib/blockUtils';

/** Lijst met geblokkeerde gebruikers (Account), met de mogelijkheid om te deblokkeren. */
export default function BlockedUsersSheet({ isDark = true, onClose }) {
  const [items, setItems] = useState(null); // null = laden
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';

  useEffect(() => {
    let active = true;
    fetchBlockedUsers()
      .then((rows) => { if (active) setItems(rows); })
      .catch((err) => {
        console.error('Blokkeerlijst laden mislukt:', err);
        if (active) { setItems([]); setFailed(true); }
      });
    return () => { active = false; };
  }, []);

  const handleUnblock = async (item) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await unblockUser(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success(trNow('Blokkade opgeheven', 'User unblocked'));
    } catch (err) {
      console.error('Deblokkeren mislukt:', err);
      toast.error(trNow('Deblokkeren is niet gelukt. Probeer het opnieuw.', 'Could not unblock. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 flex flex-col max-h-[75vh]"
        style={{ background: isDark ? '#1E1E35' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-base" style={{ color: textMain }}>{trNow('Geblokkeerde gebruikers', 'Blocked users')}</h3>
          <button
            onClick={() => onClose?.()}
            aria-label={trNow('Sluiten', 'Close')}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ color: textMain, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] font-medium mb-4" style={{ color: textSub }}>
          {trNow('Na deblokkeren kunnen jullie elkaar weer zien. Oude likes en chats komen niet terug.', 'After unblocking you can see each other again. Old likes and chats will not return.')}
        </p>

        <div className="overflow-y-auto flex-1 space-y-2">
          {items === null && (
            <p className="text-xs text-center py-6 font-medium" style={{ color: textSub }}>{trNow('Laden...', 'Loading...')}</p>
          )}
          {items !== null && items.length === 0 && (
            <div className="text-center py-6">
              <Ban className="w-7 h-7 mx-auto mb-2" style={{ color: textSub }} />
              <p className="text-xs font-medium" style={{ color: textSub }}>
                {failed
                  ? trNow('De lijst kon niet worden geladen.', 'The list could not be loaded.')
                  : trNow('Je hebt niemand geblokkeerd.', 'You have not blocked anyone.')}
              </p>
            </div>
          )}
          {(items || []).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl"
              style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
            >
              <span className="text-sm font-bold truncate" style={{ color: textMain }}>
                {item.blocked_name || trNow('Gebruiker', 'User')}
              </span>
              <button
                onClick={() => handleUnblock(item)}
                disabled={!!busyId}
                className="px-3 py-1.5 rounded-full text-xs font-black flex-shrink-0 active:scale-95 transition-transform disabled:opacity-60"
                style={{ color: '#FF4B72', background: 'rgba(255,75,114,0.12)' }}
              >
                {busyId === item.id ? trNow('Bezig...', 'Working...') : trNow('Deblokkeren', 'Unblock')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
