import { supabase } from '@/api/supabaseClient';

/**
 * Ongelezen chatberichten, zoals bij WhatsApp.
 *
 * Per chat staat in de database tot wanneer elke deelnemer heeft gelezen
 * (ChatRoom.last_read_a voor user_a, last_read_b voor user_b). Een bericht is
 * ongelezen als het van de ander komt (geen systeembericht) en nieuwer is dan dat moment.
 * Omdat dit in de database staat, klopt het op elk apparaat.
 */

export const CHAT_UNREAD_EVENT = 'romety_chat_unread_changed';

const lower = (s) => (s || '').toLowerCase().trim();

/** Tot wanneer heeft `email` deze chat gelezen? (null = nog nooit geopend) */
export function getReadAt(room, email) {
  if (!room) return null;
  const me = lower(email);
  if (lower(room.user_a_email) === me) return room.last_read_a || null;
  if (lower(room.user_b_email) === me) return room.last_read_b || null;
  return null;
}

const msgTime = (m) => new Date(m.created_at || m.created_date || 0).getTime();

/** Aantal ongelezen berichten van de ander in één chat */
export function countUnread(room, messages, email) {
  const me = lower(email);
  const readAt = getReadAt(room, email);
  const readMs = readAt ? new Date(readAt).getTime() : 0;
  return (messages || []).filter(
    (m) => m && !m.is_system && m.sender_email !== 'system' && lower(m.sender_email) !== me && msgTime(m) > readMs
  ).length;
}

/** Markeer een chat als gelezen tot nu (voor de ingelogde gebruiker) */
export async function markRoomRead(room, email) {
  if (!room?.id) return null;
  const me = lower(email);
  const field = lower(room.user_a_email) === me ? 'last_read_a' : lower(room.user_b_email) === me ? 'last_read_b' : null;
  if (!field) return null;
  const now = new Date().toISOString();
  const { error } = await supabase.from('ChatRoom').update({ [field]: now }).eq('id', room.id);
  if (!error) {
    try { window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT)); } catch (e) {}
  }
  return error ? null : { [field]: now };
}

/**
 * Overzicht voor de ingelogde gebruiker:
 *  - perRoom:      { [roomId]: aantal ongelezen berichten }
 *  - unreadChats:  aantal chats met minstens 1 ongelezen bericht
 *  - pendingInvites: aantal chatuitnodigingen die op jouw antwoord wachten
 *  - total:        unreadChats + pendingInvites (getal voor de chatknop)
 */
export async function fetchChatUnreadSummary(email) {
  const empty = { perRoom: {}, unreadChats: 0, pendingInvites: 0, total: 0 };
  if (!email) return empty;
  const me = lower(email);

  const { data: rooms, error } = await supabase
    .from('ChatRoom')
    .select('id, user_a_email, user_b_email, status, deleted_at, last_read_a, last_read_b')
    .or(`user_a_email.eq."${me}",user_b_email.eq."${me}"`);
  if (error || !rooms) return empty;

  const liveRooms = rooms.filter((r) => r && r.status !== 'deleted' && !r.deleted_at);
  const pendingInvites = liveRooms.filter((r) => r.status === 'pending' && lower(r.user_b_email) === me).length;
  const chatRooms = liveRooms.filter((r) => r.status !== 'pending');
  if (chatRooms.length === 0) return { ...empty, pendingInvites, total: pendingInvites };

  const { data: msgs } = await supabase
    .from('ChatMessage')
    .select('room_id, sender_email, is_system, created_at')
    .in('room_id', chatRooms.map((r) => r.id));

  const byRoom = {};
  (msgs || []).forEach((m) => { (byRoom[m.room_id] = byRoom[m.room_id] || []).push(m); });

  const perRoom = {};
  let unreadChats = 0;
  chatRooms.forEach((r) => {
    const n = countUnread(r, byRoom[r.id], email);
    perRoom[r.id] = n;
    if (n > 0) unreadChats += 1;
  });
  return { perRoom, unreadChats, pendingInvites, total: unreadChats + pendingInvites };
}
