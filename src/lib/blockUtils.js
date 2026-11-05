import { supabase } from '@/api/supabaseClient';
import { CHAT_UNREAD_EVENT } from '@/lib/chatUnread';

/**
 * Blokkeren: twee gebruikers zien en bereiken elkaar niet meer, in beide richtingen.
 * De regels staan in de database (zie migratie 20261105_04_block_users.sql), dus ze
 * gelden ook als iemand de app omzeilt.
 */

export const BLOCK_EVENT = 'romety_block_changed';

/** Blokkeert iemand en verbreekt likes, meldingen, spellen en chats. Gooit een fout als het mislukt. */
export async function blockUser(email) {
  const { error } = await supabase.rpc('block_user', { p_email: email });
  if (error) throw error;
  try {
    window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT));
    window.dispatchEvent(new CustomEvent(BLOCK_EVENT));
  } catch (e) {}
}

/** Jouw lijst met geblokkeerde gebruikers, nieuwste eerst. */
export async function fetchBlockedUsers() {
  const { data, error } = await supabase
    .from('BlockedUser')
    .select('id, blocked_name, created_date')
    .order('created_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Heft een blokkade op. Oude likes en chats komen hiermee niet terug. */
export async function unblockUser(id) {
  const { error } = await supabase.from('BlockedUser').delete().eq('id', id);
  if (error) throw error;
}
