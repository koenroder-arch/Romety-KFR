import { supabase } from '@/api/supabaseClient';

/**
 * Staat er nog een Supabase-sessie (met vernieuwingssleutel) op dit apparaat?
 * Supabase wist deze zelf zodra de sessie echt ongeldig is, bijvoorbeeld na uitloggen.
 */
export function hasStoredSupabaseSession() {
  try {
    return Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token'));
  } catch (e) {
    return false;
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function waitUntilOnline(maxMs) {
  if (typeof navigator === 'undefined' || navigator.onLine !== false) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { window.removeEventListener('online', done); clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, maxMs);
    window.addEventListener('online', done);
  });
}

/**
 * Haalt de sessie op. Lukt het vernieuwen van een verlopen sessie niet meteen
 * (bijvoorbeeld omdat de telefoon net wakker wordt en het internet nog niet klaar is),
 * dan probeert deze functie het een paar keer opnieuw in plaats van direct uit te loggen.
 */
export async function getSessionWithRetry(attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await supabase.auth.getSession();
    if (data?.session?.user) return data.session;
    // Geen fout en niets opgeslagen: je bent echt niet ingelogd
    if (!error && !hasStoredSupabaseSession()) return null;
    if (i < attempts - 1) {
      await waitUntilOnline(4000);
      await wait(700 * (i + 1));
    }
  }
  if (!hasStoredSupabaseSession()) return null;
  const { data } = await supabase.auth.refreshSession().catch(() => ({ data: null }));
  return data?.session?.user ? data.session : null;
}
