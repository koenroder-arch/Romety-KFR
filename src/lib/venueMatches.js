import { base44 } from '@/api/base44Client';
import { isMatch } from '@/lib/matchUtils';
import { fetchReportedEmails } from '@/lib/reportUtils';

/**
 * Telt hoeveel matches er bij jouw actieve venue zijn, met dezelfde regels als de Matches-pagina:
 * zelfde land, onboarding klaar, niet gerapporteerd, passend volgens isMatch, en actief bij dezelfde venue.
 * Geeft 0 terug als je geen actieve venue hebt.
 */
export async function countVenueMatches(email) {
  if (!email) return 0;
  const now = new Date().toISOString();
  const isActive = (v) => v && (!v.expires_at || v.expires_at > now);

  const [myProfs, myCheckIns, myDests] = await Promise.all([
    base44.entities.UserProfile.filter({ user_email: email }),
    base44.entities.VenueCheckIn.filter({ user_email: email }),
    base44.entities.UserDestination.filter({ user_email: email }),
  ]);
  const myLocation = myCheckIns.find(isActive) || myDests.find((d) => d.status === 'active' && isActive(d));
  if (!myLocation) return 0;
  const myProf = myProfs[0] || null;

  const [allProfiles, allCheckIns, allDestinations, reportedEmails] = await Promise.all([
    base44.entities.UserProfile.list('-created_date', 500),
    base44.entities.VenueCheckIn.list(),
    base44.entities.UserDestination.list(),
    fetchReportedEmails(email),
  ]);

  const myVenueId = myLocation.venue_id;
  const vName = (myLocation.venue_name || '').toLowerCase();
  const sameVenue = (v) => {
    if (myVenueId) return v.venue_id === myVenueId;
    const db = (v.venue_name || '').toLowerCase();
    return !!vName && !!db && (db.includes(vName) || vName.includes(db));
  };
  const presentEmails = new Set([
    ...allCheckIns.filter((c) => isActive(c) && sameVenue(c)).map((c) => c.user_email),
    ...allDestinations.filter((d) => d.status === 'active' && isActive(d) && sameVenue(d)).map((d) => d.user_email),
  ]);

  const userCountry = myProf?.country || 'Nederland';
  return allProfiles.filter((p) =>
    p.user_email !== email &&
    p.onboarding_complete &&
    !reportedEmails.has(p.user_email) &&
    (p.country || 'Nederland') === userCountry &&
    presentEmails.has(p.user_email) &&
    isMatch(myProf, p)
  ).length;
}
