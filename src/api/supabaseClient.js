import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY') {
  console.warn('Supabase URL or Anon Key is not properly set in .env.local.');
}

export const supabase = createClient(
  supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' ? supabaseUrl : 'https://placeholder.supabase.co',
  supabaseAnonKey && supabaseAnonKey !== 'YOUR_SUPABASE_ANON_KEY' ? supabaseAnonKey : 'placeholder'
);
