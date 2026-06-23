import { supabase } from './supabaseClient';

const parseOrder = (orderStr) => {
  if (!orderStr) return { column: 'created_date', ascending: false };
  const descending = orderStr.startsWith('-');
  const column = descending ? orderStr.substring(1) : orderStr;
  return { column, ascending: !descending };
};

const createEntityHandler = (tableName) => {
  return {
    list: async (order, limit) => {
      let query = supabase.from(tableName).select('*');
      if (order) {
        const { column, ascending } = parseOrder(order);
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (error) {
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
        const { column, ascending } = parseOrder(order);
        query = query.order(column, { ascending });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (error) {
        console.error(`Error filtering ${tableName}:`, error);
        throw error;
      }
      return data || [];
    },

    create: async (data) => {
      const payload = {
        ...data,
        created_date: new Date().toISOString()
      };
      const { data: inserted, error } = await supabase
        .from(tableName)
        .insert([payload])
        .select()
        .single();
      
      if (error) {
        console.error(`Error creating ${tableName}:`, error);
        throw error;
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
      const mockUserStr = localStorage.getItem('romety_mock_user');
      if (mockUserStr) {
        try {
          return JSON.parse(mockUserStr);
        } catch (e) {
          localStorage.removeItem('romety_mock_user');
        }
      }
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;
      return {
        id: user.id,
        email: user.email,
        ...user.user_metadata
      };
    },
    redirectToLogin: (redirectTo) => {
      const redirectParam = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : '';
      window.location.replace(`/Login${redirectParam}`);
    },
    logout: async () => {
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
  }
};
