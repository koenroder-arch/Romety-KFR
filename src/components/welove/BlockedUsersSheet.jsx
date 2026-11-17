import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { trNow } from '@/lib/LanguageContext';
import { fetchBlockedUsers, unblockUser } from '@/lib/blockUtils';
import ProfilePhotoCarousel, { getProfilePhotos } from '@/components/welove/ProfilePhotoCarousel';

// Alleen de avatar tonen (bijvoorbeeld '🦊 Vos'), nooit de echte naam
const nameOf = (item) => item.avatar || trNow('Gebruiker', 'User');
const avatarEmoji = (item) => (item.avatar ? item.avatar.split(' ')[0] : '👤');
const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/** Klein rond profielfotootje, met de avatar als terugval */
function Thumb({ item }) {
  const photo = getProfilePhotos(item)[0];
  const [broken, setBroken] = useState(false);
  return (
    <div
      className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xl"
      style={{ background: 'linear-gradient(135deg, rgba(255,75,114,0.25), rgba(234,63,211,0.2))' }}
    >
      {photo && !broken
        ? <img src={photo} alt="" className="w-full h-full object-cover" onError={() => setBroken(true)} />
        : <span aria-hidden="true">{avatarEmoji(item)}</span>}
    </div>
  );
}

/** Lijst met geblokkeerde gebruikers (Account). Tik op iemand om het profiel groot te zien en te deblokkeren. */
export default function BlockedUsersSheet({ isDark = true, onClose }) {
  const [items, setItems] = useState(null); // null = laden
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);

  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const softBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const btnBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

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
      setSelected(null);
      toast.success(trNow(`${nameOf(item)} is gedeblokkeerd`, `${nameOf(item)} has been unblocked`));
    } catch (err) {
      console.error('Deblokkeren mislukt:', err);
      toast.error(trNow('Deblokkeren is niet gelukt. Probeer het opnieuw.', 'Could not unblock. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const closeButton = (
    <button
      onClick={() => onClose?.()}
      aria-label={trNow('Sluiten', 'Close')}
      className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
      style={{ color: textMain, background: btnBg }}
    >
      <X className="w-4 h-4" />
    </button>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-5"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busyId) onClose?.(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 flex flex-col max-h-[85vh]"
        style={{ background: isDark ? '#1E1E35' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)' }}
      >
        {selected ? (
          /* ── Vergroot profiel met deblokkeren-knop ── */
          <>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setSelected(null)}
                className="flex items-center gap-1 text-sm font-bold active:opacity-70"
                style={{ color: textMain }}
              >
                <ChevronLeft className="w-4 h-4" />
                {trNow('Terug', 'Back')}
              </button>
              {closeButton}
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 mb-3">
                {getProfilePhotos(selected).length > 0 ? (
                  <ProfilePhotoCarousel
                    profile={selected}
                    isDark
                    dotsClassName="top-3 left-3 z-20"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-7xl"
                    style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)' }}
                    aria-hidden="true"
                  >
                    {avatarEmoji(selected)}
                  </div>
                )}
              </div>

              <h3 className="text-xl font-black" style={{ color: textMain }}>
                {nameOf(selected)}{selected.age ? <span className="font-bold" style={{ color: textSub }}>, {selected.age}</span> : null}
              </h3>
              {selected.bio && (
                <p className="text-sm font-medium mt-1 whitespace-pre-wrap break-words" style={{ color: textSub }}>{selected.bio}</p>
              )}
              {asList(selected.traits).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {asList(selected.traits).slice(0, 5).map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ color: textMain, background: btnBg }}>{t}</span>
                  ))}
                </div>
              )}
              {!selected.display_name && !selected.avatar && (
                <p className="text-xs font-medium mt-2" style={{ color: textSub }}>
                  {trNow('Dit profiel bestaat niet meer.', 'This profile no longer exists.')}
                </p>
              )}
            </div>

            <button
              onClick={() => handleUnblock(selected)}
              disabled={!!busyId}
              className="w-full mt-4 py-3 rounded-xl font-black text-sm text-white active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF4B72 0%, #EA3FD3 100%)' }}
            >
              {busyId === selected.id ? trNow('Bezig...', 'Working...') : trNow('Deblokkeren', 'Unblock')}
            </button>
            <p className="text-[11px] font-medium text-center mt-2" style={{ color: textSub }}>
              {trNow('Jullie kunnen elkaar daarna weer zien. Oude likes en chats komen niet terug.', 'You will be able to see each other again. Old likes and chats will not return.')}
            </p>
          </>
        ) : (
          /* ── Lijst met kleine profielen ── */
          <>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-black text-base" style={{ color: textMain }}>{trNow('Geblokkeerde gebruikers', 'Blocked users')}</h3>
              {closeButton}
            </div>
            <p className="text-[11px] font-medium mb-4" style={{ color: textSub }}>
              {trNow('Tik op een profiel om het te bekijken of te deblokkeren.', 'Tap a profile to view or unblock it.')}
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
                <button
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left active:scale-[0.98] transition-transform"
                  style={{ background: softBg }}
                >
                  <Thumb item={item} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: textMain }}>
                      {nameOf(item)}{item.age ? <span style={{ color: textSub }}>, {item.age}</span> : null}
                    </p>
                    <p className="text-[11px] font-medium" style={{ color: textSub }}>{trNow('Geblokkeerd', 'Blocked')}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: textSub }} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
