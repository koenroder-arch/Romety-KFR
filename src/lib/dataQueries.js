import { supabase } from '@/api/supabaseClient';

/**
 * Zoekopdrachten die schalen met veel gebruikers.
 *
 * Voorheen haalde elk scherm ALLE locaties en de 500 nieuwste profielen op en filterde
 * daarna op de telefoon. Deze functies vragen de database alleen om wat de schermen
 * daarna toch al overhielden, en lezen in pagina's zodat er geen grens van 500 meer is.
 * De filters op de telefoon blijven gewoon staan, dus de uitkomst is hetzelfde.
 */

const PAGE_SIZE = 1000;

/** Leest alle rijen van een zoekopdracht, pagina voor pagina. */
async function fetchAllPages(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

const nowIso = () => new Date().toISOString();

/** Check-ins die nog niet verlopen zijn (expires_at leeg of in de toekomst). */
export function fetchActiveCheckIns() {
  const now = nowIso();
  return fetchAllPages(() =>
    supabase
      .from('VenueCheckIn')
      .select('*')
      .or(`expires_at.is.null,expires_at.gt."${now}"`)
      .order('created_date', { ascending: false })
  );
}

/** Bestemmingen met status 'active' die nog niet verlopen zijn. */
export function fetchActiveDestinations() {
  const now = nowIso();
  return fetchAllPages(() =>
    supabase
      .from('UserDestination')
      .select('*')
      .eq('status', 'active')
      .or(`expires_at.is.null,expires_at.gt."${now}"`)
      .order('created_date', { ascending: false })
  );
}

/**
 * Profielen uit hetzelfde land (een leeg land telt als 'Nederland', zoals overal in de app),
 * plus de profielen van `extraEmails` uit welk land dan ook (bijv. wie jou liket of je chatpartners).
 * Nieuwste eerst, net als voorheen.
 */
export async function fetchProfilesForCountry(country, extraEmails = []) {
  const myCountry = country || 'Nederland';
  const quoted = `"${myCountry.replace(/"/g, '\\"')}"`;
  const countryFilter = myCountry === 'Nederland'
    ? `country.eq.${quoted},country.is.null,country.eq.""`
    : `country.eq.${quoted}`;

  const [byCountry, extras] = await Promise.all([
    fetchAllPages(() =>
      supabase.from('UserProfile').select('*').or(countryFilter).order('created_date', { ascending: false })
    ),
    fetchProfilesByEmails(extraEmails),
  ]);

  const seen = new Set();
  const merged = [];
  for (const p of [...byCountry, ...extras]) {
    if (!p || seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }
  merged.sort((a, b) => String(b.created_date || '').localeCompare(String(a.created_date || '')));
  return merged;
}

/** Profielen van precies deze e-mailadressen. */
export async function fetchProfilesByEmails(emails) {
  const list = [...new Set((emails || []).filter(Boolean))];
  if (list.length === 0) return [];
  const rows = [];
  for (let i = 0; i < list.length; i += 200) {
    const chunk = list.slice(i, i + 200);
    const { data, error } = await supabase.from('UserProfile').select('*').in('user_email', chunk);
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

/**
 * Berichten van meerdere chats in één keer (in plaats van één verzoek per chat),
 * alleen de kolommen die nodig zijn om ongelezen berichten en de laatste activiteit te bepalen.
 * Geeft { [roomId]: berichten[] } terug.
 */
export async function fetchMessageMetaByRoom(roomIds) {
  const ids = [...new Set((roomIds || []).filter(Boolean))];
  const byRoom = {};
  ids.forEach((id) => { byRoom[id] = []; });
  if (ids.length === 0) return byRoom;
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const rows = await fetchAllPages(() =>
      supabase
        .from('ChatMessage')
        .select('id, room_id, sender_email, is_system, type, created_at')
        .in('room_id', chunk)
        .order('created_at', { ascending: true })
    );
    rows.forEach((m) => { (byRoom[m.room_id] = byRoom[m.room_id] || []).push(m); });
  }
  return byRoom;
}
