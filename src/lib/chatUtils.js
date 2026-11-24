import { supabase } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

const INACTIVITY_TEXT = 'Een chat is beëindigd wegens 7 dagen inactiviteit.';
const inactivityInFlight = new Set();

/**
 * Verwijdert een chatroom en alle daarin verstuurde foto's (zie removeChatRoom).
 *
 * Bij reason 'inactivity' (7 dagen geen berichten) wordt dit vanaf meerdere plekken
 * tegelijk aangeroepen (navigatiebalk, Home, Chat). Daarom gebeurt het hier maar één keer:
 * een chat die al verwijderd is of nu al verwerkt wordt, wordt overgeslagen. Alleen als
 * de chat echt net beëindigd is, krijgen beide deelnemers één melding (notifyFrom = jouw e-mail).
 * Geeft true terug als de chat nu beëindigd is.
 */
export async function deleteChatRoomAndMedia(roomId, options = {}) {
  if (options.reason !== 'inactivity') return removeChatRoom(roomId, options);
  if (!roomId || inactivityInFlight.has(roomId)) return false;
  inactivityInFlight.add(roomId);
  try {
    const { data: room } = await supabase
      .from('ChatRoom')
      .select('status, user_a_email, user_b_email')
      .eq('id', roomId)
      .maybeSingle();
    if (!room || room.status === 'deleted') return false;

    const ok = await removeChatRoom(roomId, options);
    if (ok && options.notifyFrom) {
      const now = new Date().toISOString();
      await Promise.all([room.user_a_email, room.user_b_email].filter(Boolean).map((to_email) =>
        base44.entities.Notification.create({
          to_email,
          from_email: options.notifyFrom,
          type: 'chat_inactive',
          venue_name: INACTIVITY_TEXT,
          is_read: false,
          created_date: now,
        }).catch(() => {})
      ));
    }
    return ok;
  } catch (e) {
    console.warn('[deleteChatRoomAndMedia] Inactiviteit verwerken mislukt:', e);
    return false;
  } finally {
    inactivityInFlight.delete(roomId);
  }
}

/**
 * 1. Zoekt alle berichten met een foto in deze chat.
 * 2. Verwijdert EERST alle mediabestanden uit de Supabase Storage bucket ('chat-uploads' / 'uploads').
 * 3. Verwijdert de berichten uit de database.
 * 4. Markeert de chatroom als verwijderd (of verwijdert deze definitief).
 */
async function removeChatRoom(roomId, { hardDelete = false, deletedBy = null, reason = null } = {}) {
  if (!roomId) return false;
  try {
    const client = supabase;

    // Haal eerst gegevens van de chatroom op om de deelnemers te bepalen
    let userA = null;
    let userB = null;
    try {
      const { data: roomData } = await client
        .from('ChatRoom')
        .select('user_a_email, user_b_email')
        .eq('id', roomId)
        .single();

      if (roomData) {
        userA = (roomData.user_a_email || '').toLowerCase().trim();
        userB = (roomData.user_b_email || '').toLowerCase().trim();
      }
    } catch (e) {
      console.warn('[deleteChatRoomAndMedia] Kon roomData niet vooraf ophalen:', e);
    }

    // 1. Zoek alle berichten van deze chatroom
    const { data: messages } = await client
      .from('ChatMessage')
      .select('id, media_url')
      .eq('room_id', roomId);

    // 2. Verwijder EERST elk fotobestand uit Supabase Storage
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (msg.media_url) {
          try {
            await base44.integrations.Core.DeleteFile({ 
              file_url: msg.media_url, 
              bucket: 'chat-uploads' 
            });
          } catch (err) {
            console.warn(`[deleteChatRoomAndMedia] Kon bestand ${msg.media_url} niet verwijderen:`, err);
          }
        }
      }
    }

    // 3. Verwijder daarna de berichten uit de database
    await client.from('ChatMessage').delete().eq('room_id', roomId);

    // 4. Update of verwijder de chatroom
    if (hardDelete) {
      await client.from('ChatRoom').delete().eq('id', roomId);
      await base44.entities.ChatRoom.delete(roomId).catch(() => {});
      await client.from('Notification').delete().like('venue_name', `%"roomId":"${roomId}"%`);
    } else {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 uur zichtbaar voor de ander (of voor beiden bij inactiviteit)

      const updateData = {
        status: 'deleted',
        chat_closed_at: now.toISOString(),
        deleted_at: expiresAt.toISOString(),
      };

      if (reason === 'inactivity') {
        // Bij inactiviteit hebben beide gebruikers de chat niet verwijderd, dus beiden zien de grijze card 24 uur
        updateData.contact_sent_a = 'inactivity';
        updateData.contact_sent_b = 'inactivity';
        updateData.extension_accepted_a = true;
        updateData.extension_accepted_b = true;
      } else if (deletedBy && userA && userB) {
        const normDeletedBy = deletedBy.toLowerCase().trim();
        if (userA === normDeletedBy) {
          updateData.extension_accepted_a = false; // User A deleted/ended it
          updateData.extension_accepted_b = true;  // User B sees it for 24h
        } else if (userB === normDeletedBy) {
          updateData.extension_accepted_a = true;  // User A sees it for 24h
          updateData.extension_accepted_b = false; // User B deleted/ended it
        }
      }

      await client.from('ChatRoom').update(updateData).eq('id', roomId);
      await base44.entities.ChatRoom.update(roomId, updateData).catch(() => {});
    }

    // 5. Verwijder de wederzijdse likes zodat de supermatch ook weggaat wanneer een chat verwijderd wordt
    if (userA && userB) {
      try {
        await Promise.all([
          client.from('Like').delete().match({ from_email: userA, to_email: userB }),
          client.from('Like').delete().match({ from_email: userB, to_email: userA }),
        ]);
        console.log(`[deleteChatRoomAndMedia] Wederzijdse likes tussen ${userA} en ${userB} succesvol verwijderd (supermatch opgeheven).`);
      } catch (likeErr) {
        console.warn('[deleteChatRoomAndMedia] Fout bij verwijderen van likes:', likeErr);
      }
    }

    try {
      localStorage.removeItem(`chat_read_count_${roomId}`);
    } catch (e) {}

    console.log(`[deleteChatRoomAndMedia] Chat ${roomId} succesvol gemarkeerd/gewist (reason: ${reason || deletedBy || 'default'}).`);
    return true;
  } catch (err) {
    console.error(`[deleteChatRoomAndMedia] Fout bij verwijderen van chat ${roomId}:`, err);
    return false;
  }
}
