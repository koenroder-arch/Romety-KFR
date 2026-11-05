import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { nl, enGB } from 'date-fns/locale';
import { Flag, X } from 'lucide-react';
import { toast } from 'sonner';
import { useLang } from '@/lib/LanguageContext';
import { banUser, listReports, resolveReport } from '@/lib/moderation';

/** Beheerscherm: openstaande en afgehandelde meldingen bekijken en behandelen. */
export default function ModerationSheet({ isDark = true, onClose }) {
  const { tr, isEn } = useLang();
  const [tab, setTab] = useState('open');
  const [reports, setReports] = useState(null); // null = laden
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmBan, setConfirmBan] = useState(null);

  const textMain = isDark ? '#FFFFFF' : '#111827';
  const textSub = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
  const softBtn = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  const load = async (status) => {
    setReports(null);
    setFailed(false);
    try {
      setReports(await listReports(status));
    } catch (err) {
      console.error('Meldingen laden mislukt:', err);
      setReports([]);
      setFailed(true);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleResolve = async (report, resolution) => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      await resolveReport(report.id, resolution);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
      toast.success(resolution === 'warned'
        ? tr('Waarschuwing verstuurd', 'Warning sent')
        : tr('Melding afgesloten', 'Report closed'));
    } catch (err) {
      console.error('Melding afhandelen mislukt:', err);
      toast.error(tr('Dat is niet gelukt. Probeer het opnieuw.', 'That did not work. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleBan = async (report) => {
    if (busyId) return;
    setBusyId(report.id);
    try {
      const { failedFiles } = await banUser(report.reported_email, report.reason);
      setConfirmBan(null);
      await load(tab);
      if (failedFiles.length > 0) {
        toast.warning(tr(
          `Gebruiker verbannen, maar ${failedFiles.length} bestand(en) konden niet worden verwijderd.`,
          `User banned, but ${failedFiles.length} file(s) could not be deleted.`
        ));
      } else {
        toast.success(tr('Gebruiker verbannen en gegevens verwijderd', 'User banned and data deleted'));
      }
    } catch (err) {
      console.error('Verbannen mislukt:', err);
      toast.error(tr('Verbannen is niet gelukt. Probeer het opnieuw.', 'Could not ban the user. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const resolutionLabel = (r) => {
    if (r === 'warned') return tr('Waarschuwing gegeven', 'Warning given');
    if (r === 'banned') return tr('Gebruiker verbannen', 'User banned');
    return tr('Geen overtreding', 'No violation');
  };

  const tabs = [['open', tr('Open', 'Open')], ['resolved', tr('Afgehandeld', 'Resolved')]];

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busyId) onClose?.(); }}
    >
      <div
        className="w-full max-w-md rounded-3xl p-5 flex flex-col max-h-[85vh]"
        style={{ background: isDark ? '#1E1E35' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-base" style={{ color: textMain }}>{tr('Meldingen behandelen', 'Handle reports')}</h3>
          <button
            onClick={() => onClose?.()}
            aria-label={tr('Sluiten', 'Close')}
            className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
            style={{ color: textMain, background: softBtn }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-colors"
              style={tab === key ? { background: '#FF4B72', color: '#FFFFFF' } : { background: softBtn, color: textMain }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 space-y-3">
          {reports === null && (
            <p className="text-xs text-center py-8 font-medium" style={{ color: textSub }}>{tr('Laden...', 'Loading...')}</p>
          )}
          {reports !== null && reports.length === 0 && (
            <div className="text-center py-8">
              <Flag className="w-7 h-7 mx-auto mb-2" style={{ color: textSub }} />
              <p className="text-xs font-medium" style={{ color: textSub }}>
                {failed
                  ? tr('De meldingen konden niet worden geladen.', 'The reports could not be loaded.')
                  : tab === 'open'
                    ? tr('Er zijn geen openstaande meldingen.', 'There are no open reports.')
                    : tr('Er zijn nog geen afgehandelde meldingen.', 'There are no resolved reports yet.')}
              </p>
            </div>
          )}

          {(reports || []).map((r) => (
            <div key={r.id} className="rounded-2xl p-3.5" style={{ background: cardBg }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(255,75,114,0.15)' }}>
                  {r.reported_photo
                    ? <img src={r.reported_photo} alt="" className="w-full h-full object-cover" />
                    : <span className="text-lg">👤</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black truncate" style={{ color: textMain }}>{r.reported_name || tr('Onbekend', 'Unknown')}</p>
                  <p className="text-[11px] font-medium" style={{ color: textSub }}>
                    {r.created_date ? format(new Date(r.created_date), 'd MMM · HH:mm', { locale: isEn ? enGB : nl }) : ''}
                    {' · '}
                    {tr(`${r.reports_about_user}x gemeld`, `Reported ${r.reports_about_user}x`)}
                  </p>
                </div>
              </div>

              <p className="text-xs font-black mb-0.5" style={{ color: '#FF4B72' }}>{r.reason}</p>
              {r.details && <p className="text-xs font-medium mb-1 whitespace-pre-wrap break-words" style={{ color: textMain }}>{r.details}</p>}
              {r.reported_bio && <p className="text-[11px] font-medium mb-1 break-words" style={{ color: textSub }}>{tr('Bio', 'Bio')}: {r.reported_bio}</p>}

              {tab === 'resolved' && (
                <p className="text-[11px] font-bold mt-1" style={{ color: textSub }}>{resolutionLabel(r.resolution)}</p>
              )}

              {tab === 'open' && confirmBan !== r.id && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <button
                    onClick={() => handleResolve(r, 'no_action')}
                    disabled={!!busyId}
                    className="py-2 rounded-xl text-[11px] font-black active:scale-95 transition-transform disabled:opacity-60"
                    style={{ color: textMain, background: softBtn }}
                  >
                    {tr('Geen actie', 'No action')}
                  </button>
                  <button
                    onClick={() => handleResolve(r, 'warned')}
                    disabled={!!busyId}
                    className="py-2 rounded-xl text-[11px] font-black text-orange-400 active:scale-95 transition-transform disabled:opacity-60"
                    style={{ background: 'rgba(249,115,22,0.12)' }}
                  >
                    {tr('Waarschuwen', 'Warn')}
                  </button>
                  <button
                    onClick={() => setConfirmBan(r.id)}
                    disabled={!!busyId}
                    className="py-2 rounded-xl text-[11px] font-black text-red-500 active:scale-95 transition-transform disabled:opacity-60"
                    style={{ background: 'rgba(239,68,68,0.12)' }}
                  >
                    {tr('Verbannen', 'Ban')}
                  </button>
                </div>
              )}

              {tab === 'open' && confirmBan === r.id && (
                <div className="mt-3 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <p className="text-[11px] font-semibold mb-2" style={{ color: textMain }}>
                    {tr(
                      'Dit verwijdert het account, het profiel, de foto\'s, chats en likes definitief. Dit e-mailadres kan daarna geen nieuw profiel meer aanmaken.',
                      'This permanently deletes the account, profile, photos, chats and likes. This email address can no longer create a new profile.'
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmBan(null)}
                      disabled={!!busyId}
                      className="py-2 rounded-xl text-[11px] font-black"
                      style={{ color: textMain, background: softBtn }}
                    >
                      {tr('Annuleren', 'Cancel')}
                    </button>
                    <button
                      onClick={() => handleBan(r)}
                      disabled={!!busyId}
                      className="py-2 rounded-xl text-[11px] font-black text-white bg-red-500 disabled:opacity-60"
                    >
                      {busyId === r.id ? tr('Bezig...', 'Working...') : tr('Definitief verbannen', 'Ban permanently')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
