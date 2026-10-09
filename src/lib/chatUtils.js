import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

/**
 * Verwijdert een chatroom en alle daarin verstuurde foto's:
 * 1. Zoekt alle berichten met een foto in deze chat.
 * 2. Verwijdert EERST alle mediabestanden uit de Supabase Storage bucket ('chat-uploads' / 'uploads').
 * 3. Verwijdert de berichten uit de database.
 * 4. Markeert de chatroom als verwijderd (of verwijdert deze definitief).
 */
export async function deleteChatRoomAndMedia(roomId, { hardDelete = false, deletedBy = null, reason = null } = {}) {
  if (!roomId) return false;
  try {
    const client = supabaseAdmin || supabase;

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
    await client.from('ChatMessage').delete().eq('room_id', roomId).catch(() => {});

    // 4. Update of verwijder de chatroom
    if (hardDelete) {
      await client.from('ChatRoom').delete().eq('id', roomId).catch(() => {});
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

      await client.from('ChatRoom').update(updateData).eq('id', roomId).catch(() => {});
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

/**
 * Synchroniseert de gelezen chatstatus tussen apparaten via Supabase Notification table.
 */
export async function syncChatReadState(userEmail, roomId, readCount) {
  if (!userEmail || !roomId) return;
  try {
    const client = supabaseAdmin || supabase;
    const { data: existing } = await client
      .from('Notification')
      .select('id, from_name')
      .eq('to_email', userEmail)
      .eq('type', 'chat_read')
      .eq('venue_name', roomId);

    if (existing && existing.length > 0) {
      const currentStored = parseInt(existing[0].from_name || '0', 10);
      if (readCount >= currentStored) {
        await client.from('Notification').update({
          from_name: String(readCount),
          is_read: true,
          created_date: new Date().toISOString()
        }).eq('id', existing[0].id);
      }
    } else {
      await client.from('Notification').insert([{
        to_email: userEmail,
        from_email: 'system',
        type: 'chat_read',
        venue_name: roomId,
        from_name: String(readCount),
        is_read: true,
        created_date: new Date().toISOString()
      }]);
    }
  } catch (e) {
    console.warn('[syncChatReadState] Sync failed:', e);
  }
}

/**
 * Haalt alle gesynchroniseerde gelezen tellers op voor een gebruiker en synchroniseert deze naar localStorage
 */
export async function getSyncedChatReadCounts(userEmail) {
  if (!userEmail) return {};
  try {
    const client = supabaseAdmin || supabase;
    const { data: records } = await client
      .from('Notification')
      .select('venue_name, from_name')
      .eq('to_email', userEmail)
      .eq('type', 'chat_read');

    const counts = {};
    if (records && records.length > 0) {
      for (const r of records) {
        if (r.venue_name) {
          const serverCount = parseInt(r.from_name || '0', 10);
          const localCount = parseInt(localStorage.getItem(`chat_read_count_${r.venue_name}`) || '0', 10);
          const bestCount = Math.max(serverCount, localCount);
          counts[r.venue_name] = bestCount;
          localStorage.setItem(`chat_read_count_${r.venue_name}`, String(bestCount));
        }
      }
    }
    return counts;
  } catch (e) {
    return {};
  }
}

