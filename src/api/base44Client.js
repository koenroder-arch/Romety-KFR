import { supabase } from './supabaseClient';
import { authStorage } from '@/lib/authStorage';

const parseOrder = (orderStr, defaultCol = 'created_date') => {
  if (!orderStr) return { column: defaultCol, ascending: false };
  const descending = orderStr.startsWith('-');
  const column = descending ? orderStr.substring(1) : orderStr;
  return { column, ascending: !descending };
};

const createEntityHandler = (tableName) => {
  const defaultTimeCol = (tableName === 'ChatRoom' || tableName === 'ChatMessage') ? 'created_at' : 'created_date';

  return {
    list: async (order, limit) => {
      let query = supabase.from(tableName).select('*');
      if (order) {
        const { column, ascending } = parseOrder(order, defaultTimeCol);
        query = query.order(column, { ascending });
      } else {
        query = query.order(defaultTimeCol, { ascending: false });
      }
      if (limit) {
        query = query.limit(limit);
      }
      let { data, error } = await query;
      if (error) {
        // Fallback without order if column failed
        console.warn(`Initial list order on ${tableName} failed, trying fallback:`, error);
        const retry = await supabase.from(tableName).select('*');
        if (!retry.error) return retry.data || [];
        console.error(`Error listing ${tableName}:`, error);
        throw error;
      }
      return data || [];
    },

    filter: async (filters, order, limit) => {
      let query = supabase.from(tableName).select('*');
      
      if (filters) {
        Object.entries(filters).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            query = query.eq(key, val);
          }
        });
      }
      
      if (order) {
        const { column, ascending } = parseOrder(order, defaultTimeCol);
        query = query.order(column, { ascending });
      } else {
        query = query.order(defaultTimeCol, { ascending: false });
      }
      if (limit) {
        query = query.limit(limit);
      }
      let { data, error } = await query;
      if (error) {
        // Fallback filter without order if column failed
        console.warn(`Initial filter on ${tableName} failed, trying without order:`, error);
        let fallbackQuery = supabase.from(tableName).select('*');
        if (filters) {
          Object.entries(filters).forEach(([key, val]) => {
            if (val !== undefined && val !== null) {
              fallbackQuery = fallbackQuery.eq(key, val);
            }
          });
        }
        if (limit) fallbackQuery = fallbackQuery.limit(limit);
        const retry = await fallbackQuery;
        if (!retry.error) return retry.data || [];
        console.error(`Error filtering ${tableName}:`, error);
        throw error;
      }
      return data || [];
    },

    create: async (data) => {
      const payload = { ...data };
      if (!('created_date' in payload) && !('created_at' in payload)) {
        if (tableName === 'ChatRoom' || tableName === 'ChatMessage') {
          payload.created_at = new Date().toISOString();
        } else {
          payload.created_date = new Date().toISOString();
        }
      }
      let { data: inserted, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        // Retry swapping created_date <-> created_at or removing missing column if column not found
        console.warn(`Create on ${tableName} failed, trying schema fallback:`, error.message);
        const fallbackPayload = { ...data };
        if (error.message?.includes('created_date')) {
          delete fallbackPayload.created_date;
          fallbackPayload.created_at = new Date().toISOString();
        } else if (error.message?.includes('created_at')) {
          delete fallbackPayload.created_at;
          fallbackPayload.created_date = new Date().toISOString();
        }
        const colMatch = error.message?.match(/column "([^"]+)" of relation/);
        if (colMatch && colMatch[1]) {
          delete fallbackPayload[colMatch[1]];
        }
        const retry = await supabase
          .from(tableName)
          .insert([fallbackPayload])
          .select()
          .single();
        
        if (!retry.error) {
          return retry.data;
        }
        console.error(`Error creating ${tableName}:`, retry.error);
        throw retry.error;
      }
      return inserted;
    },

    update: async (id, data) => {
      const { data: updated, error } = await supabase
        .from(tableName)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error(`Error updating ${tableName} with id ${id}:`, error);
        throw error;
      }
      return updated;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error(`Error deleting ${tableName} with id ${id}:`, error);
        throw error;
      }
      return true;
    },

    subscribe: (callback) => {
      const channel = supabase
        .channel(`realtime:${tableName}:${Math.random().toString(36).substring(2, 10)}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          (payload) => {
            let type = '';
            if (payload.eventType === 'INSERT') type = 'create';
            else if (payload.eventType === 'UPDATE') type = 'update';
            else if (payload.eventType === 'DELETE') type = 'delete';

            callback({
              type,
              data: payload.new || payload.old
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  };
};

export const base44 = {
  appLogs: {
    logUserInApp: async (pageName) => {
      console.log(`User navigated to page: ${pageName}`);
    }
  },
  auth: {
    me: async () => {
      const persistentUser = await authStorage.getUserAsync();
      if (persistentUser) return persistentUser;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      const supaUserObj = {
        id: user.id,
        email: user.email,
        ...user.user_metadata
      };
      authStorage.saveUser(supaUserObj);
      return supaUserObj;
    },
    redirectToLogin: (redirectTo) => {
      const redirectParam = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
      window.location.replace(`/Login${redirectParam}`);
    },
    logout: async () => {
      authStorage.clearUser();
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Error logging out:', error);
      window.location.replace('/Login');
    }
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Error uploading file to storage:', error);
          throw error;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        return { file_url: publicUrl };
      },
      DeleteFile: async ({ file_url }) => {
        if (!file_url) return;
        try {
          const fileName = file_url.split('/uploads/').pop();
          if (fileName) {
            await supabase.storage.from('uploads').remove([fileName]);
          }
        } catch (err) {
          console.error('Error deleting file from storage:', err);
        }
      }
    }
  },
  entities: {
    Club: createEntityHandler('Club'),
    Hint: createEntityHandler('Hint'),
    Like: createEntityHandler('Like'),
    Notification: createEntityHandler('Notification'),
    PremiumSubscription: createEntityHandler('PremiumSubscription'),
    SearchHistory: createEntityHandler('SearchHistory'),
    SeenProfiles: createEntityHandler('SeenProfiles'),
    Story: createEntityHandler('Story'),
    UserDestination: createEntityHandler('UserDestination'),
    UserProfile: createEntityHandler('UserProfile'),
    VenueCheckIn: createEntityHandler('VenueCheckIn'),
    GameSession: createEntityHandler('GameSession'),
    CardGameRound: createEntityHandler('CardGameRound'),
    NumberGameState: createEntityHandler('NumberGameState'),
    Report: createEntityHandler('Report'),
    rapportages: createEntityHandler('Report'),
    ChatRoom: createEntityHandler('ChatRoom'),
    ChatMessage: createEntityHandler('ChatMessage'),
  }
};
