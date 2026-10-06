import { supabase, supabaseAdmin } from '@/api/supabaseClient';
import { base44 } from '@/api/base44Client';

/**
 * Verwijdert een chatroom en alle daarin verstuurde foto's:
 * 1. Zoekt alle berichten met een foto in deze chat.
 * 2. Verwijdert EERST alle mediabestanden uit de Supabase Storage bucket ('chat-uploads' / 'uploads').
 * 3. Verwijdert de berichten uit de database.
 * 4. Markeert de chatroom als verwijderd (of verwijdert deze definitief).
 */
export async function deleteChatRoomAndMedia(roomId, { hardDelete = false, deletedBy = null } = {}) {
  if (!roomId) return false;
  try {
    const client = supabaseAdmin || supabase;

    // 1. Zoek alle berichten van deze chatroom
    const { data: messages } = await client
      .from('ChatMessage')
      .select('id, media_url')
      .eq('room_id', roomId);

    // 2. Verwijder EERST elk fotobestand uit Supabase Storage
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (msg.media_url) {
          await base44.integrations.Core.DeleteFile({ 
            file_url: msg.media_url, 
            bucket: 'chat-uploads' 
          }).catch(err => {
            console.warn(`[deleteChatRoomAndMedia] Kon bestand ${msg.media_url} niet verwijderen:`, err);
          });
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
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 uur zichtbaar voor de ander

      const updateData = {
        status: 'deleted',
        chat_closed_at: now.toISOString(),
        deleted_at: expiresAt.toISOString(),
      };

      if (deletedBy) {
        try {
          const { data: roomData } = await client
            .from('ChatRoom')
            .select('user_a_email, user_b_email')
            .eq('id', roomId)
            .single();

          if (roomData) {
            if (roomData.user_a_email === deletedBy) {
              updateData.extension_accepted_a = false; // User A deleted/ended it
              updateData.extension_accepted_b = true;  // User B sees it for 24h
            } else if (roomData.user_b_email === deletedBy) {
              updateData.extension_accepted_a = true;  // User A sees it for 24h
              updateData.extension_accepted_b = false; // User B deleted/ended it
            }
          }
        } catch (e) {
          console.warn('[deleteChatRoomAndMedia] Kon deletedBy rol niet bepalen:', e);
        }
      }

      await base44.entities.ChatRoom.update(roomId, updateData).catch(() => {});
    }

    console.log(`[deleteChatRoomAndMedia] Chat ${roomId} en bijbehorende foto's succesvol gewist.`);
    return true;
  } catch (err) {
    console.error(`[deleteChatRoomAndMedia] Fout bij verwijderen van chat ${roomId}:`, err);
    return false;
  }
}
