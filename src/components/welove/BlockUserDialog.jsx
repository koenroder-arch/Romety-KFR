import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban } from 'lucide-react';
import { toast } from 'sonner';
import { trNow } from '@/lib/LanguageContext';
import { blockUser } from '@/lib/blockUtils';

/**
 * Bevestiging voor blokkeren. `target` = { email, name }; null = niet zichtbaar.
 * onBlocked wordt aangeroepen nadat de blokkade is opgeslagen.
 */
export default function BlockUserDialog({ target, isDark = true, onClose, onBlocked }) {
  const [busy, setBusy] = useState(false);
  if (!target) return null;

  const name = target.name || trNow('deze gebruiker', 'this user');
  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';

  const handleBlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await blockUser(target.email);
      toast.success(trNow(`${name} is geblokkeerd`, `${name} has been blocked`));
      onBlocked?.(target);
      onClose?.();
    } catch (err) {
      console.error('Blokkeren mislukt:', err);
      toast.error(trNow('Blokkeren is niet gelukt. Probeer het opnieuw.', 'Could not block. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center px-6"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { e.stopPropagation(); if (e.target === e.currentTarget && !busy) onClose?.(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center"
        style={{ background: isDark ? '#1E1E35' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center bg-red-500/15 text-red-500">
          <Ban className="w-6 h-6" />
        </div>
        <h3 className="font-black text-base mb-2" style={{ color: textMain }}>
          {trNow(`${name} blokkeren?`, `Block ${name}?`)}
        </h3>
        <p className="text-xs font-medium leading-relaxed mb-5" style={{ color: textSub }}>
          {trNow(
            'Jullie zien elkaar niet meer en kunnen geen contact meer opnemen. Bestaande likes en chats worden beëindigd. De ander krijgt hier geen melding van. Je kunt dit later ongedaan maken bij Account.',
            'You will no longer see or be able to contact each other. Existing likes and chats will end. The other person will not be notified. You can undo this later in Account.'
          )}
        </p>
        <button
          onClick={handleBlock}
          disabled={busy}
          className="w-full py-3 rounded-xl font-black text-sm text-white bg-red-500 active:scale-95 transition-transform disabled:opacity-60 mb-2"
        >
          {busy ? trNow('Blokkeren...', 'Blocking...') : trNow('Blokkeren', 'Block')}
        </button>
        <button
          onClick={() => onClose?.()}
          disabled={busy}
          className="w-full py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform"
          style={{ color: textMain, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
        >
          {trNow('Annuleren', 'Cancel')}
        </button>
      </div>
    </div>,
    document.body
  );
}
