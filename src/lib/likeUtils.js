import { base44 } from '@/api/base44Client';

/**
 * Like aanmaken, maar niet dubbel: bij snel dubbeltikken of hartje + dubbeltik
 * kwamen er anders twee dezelfde likes in de database.
 */
export async function createLikeOnce(fromEmail, toEmail) {
  const existing = await base44.entities.Like.filter({ from_email: fromEmail, to_email: toEmail }).catch(() => []);
  if (existing && existing.length > 0) return existing[0];
  try {
    return await base44.entities.Like.create({ from_email: fromEmail, to_email: toEmail });
  } catch (err) {
    // Tegelijk al aangemaakt (de database staat elke like maar één keer toe): die gebruiken
    if (err?.code === '23505') {
      const again = await base44.entities.Like.filter({ from_email: fromEmail, to_email: toEmail }).catch(() => []);
      if (again && again.length > 0) return again[0];
    }
    throw err;
  }
}
